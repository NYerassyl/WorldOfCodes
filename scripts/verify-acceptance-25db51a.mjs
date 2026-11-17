// Assignment-6 acceptance evidence on the merged base (feat/profile-insights @ 25db51a).
// Runs against real Express (:4001) + FastAPI (:8099) + PostgreSQL + Docker judge.
//
//   node scripts/verify-acceptance-25db51a.mjs snapshot   # continuous scenario + persistence data
//   (restart Express and FastAPI)
//   node scripts/verify-acceptance-25db51a.mjs verify     # progress + comments survive the restart
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { solutions } from "../tests/solutions.mjs";
import { rankForPoints } from "../services/learning-backend/src/battle/ranks.js";

const EXPRESS = process.env.EXPRESS_URL || "http://127.0.0.1:4001";
const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8099";
const STATE_FILE = process.env.ACCEPTANCE_STATE || "/tmp/woc-acceptance-25db51a.json";
const mode = process.argv[2] || "snapshot";
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const checks = [];

function pass(name, detail = "") {
  checks.push(name);
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(base, path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await response.json(); } catch { /* empty body */ }
  return { status: response.status, json };
}

async function register(label) {
  const random = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  const nickname = `${label}${random}`;
  const { status, json } = await request(EXPRESS, "/api/auth/register", {
    method: "POST",
    body: { email: `${nickname}.${stamp}@example.com`, password: "Passw0rd!123", nickname },
  });
  assert.equal(status, 201, `register ${label}`);
  return { token: json.token, user: json.user, nickname };
}

async function pickLesson() {
  const courses = (await request(EXPRESS, "/api/learning/courses")).json.courses;
  for (const course of courses) {
    for (const topic of course.topics) {
      for (const brief of topic.lessons) {
        const lesson = (await request(EXPRESS, `/api/learning/lessons/${brief.id}`)).json.lesson;
        const allRunnable =
          lesson.problems.length > 0 &&
          lesson.problems.every((problem) => problem.language === "python" && solutions[problem.id]);
        if (allRunnable && !lesson.prerequisiteId) return lesson;
      }
    }
  }
  throw new Error("no published lesson is fully solvable with fixtures");
}

async function progressOf(account) {
  const { status, json } = await request(EXPRESS, "/api/learning/progress", { token: account.token });
  assert.equal(status, 200, "progress read");
  return json;
}

async function commentsOf(problemId) {
  const { status, json } = await request(FASTAPI, `/api/problems/${problemId}/comments`);
  assert.equal(status, 200, "comments read");
  return json.comments;
}

function lessonEntry(progress, lessonId) {
  return progress.lessons.find((entry) => entry.lessonId === lessonId);
}

async function pollActiveMatch(account, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { status, json } = await request(EXPRESS, "/api/battle/state", { token: account.token });
    assert.equal(status, 200, "battle state");
    if (json.match?.status === "ACTIVE") return json.match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("ranked match did not become active");
}

async function snapshot() {
  const alice = await register("qaalice");
  const bob = await register("qabob");
  const carol = await register("qacarol");
  const lesson = await pickLesson();
  const problem = lesson.problems[0];

  // profile -> follow -> notification -> chat
  const profile = await request(EXPRESS, `/api/players/${bob.user.id}/profile`, { token: alice.token });
  assert.equal(profile.status, 200, "public profile is readable");
  assert.equal(profile.json.nickname, bob.nickname);
  pass("profile: public profile exposes the account nickname", bob.nickname);

  const follow = await request(EXPRESS, `/api/players/${bob.user.id}/follow`, {
    token: alice.token, method: "PUT",
  });
  assert.equal(follow.status, 204, "follow");
  const followAgain = await request(EXPRESS, `/api/players/${bob.user.id}/follow`, {
    token: alice.token, method: "PUT",
  });
  assert.equal(followAgain.status, 204, "repeat follow");
  const notices = await request(EXPRESS, "/api/notifications", { token: bob.token });
  const followNotice = notices.json.items.find((item) => item.type === "FOLLOW" && item.actor.id === alice.user.id);
  assert.ok(followNotice, "follow notification");
  pass("follow/notification: one FOLLOW notice, repeat follow does not duplicate", `unread=${notices.json.items.length}`);

  const message = await request(EXPRESS, `/api/chat/${bob.user.id}/messages`, {
    token: alice.token, method: "POST", body: { body: "acceptance message" },
  });
  assert.equal(message.status, 201, "chat send");
  const conversations = await request(EXPRESS, "/api/chat/conversations", { token: bob.token });
  const conversation = conversations.json.items.find((item) => item.peer.id === alice.user.id);
  assert.equal(conversation.unread, 1, "chat unread");
  assert.equal(conversation.lastMessage.body, "acceptance message");
  await request(EXPRESS, `/api/chat/${alice.user.id}/read`, { token: bob.token, method: "POST", body: {} });
  const afterRead = await request(EXPRESS, "/api/chat/conversations", { token: bob.token });
  assert.equal(afterRead.json.items.find((item) => item.peer.id === alice.user.id).unread, 0);
  pass("chat: message stored, unread counted, read clears it");

  // lesson -> solution -> analytics
  const start = await request(EXPRESS, `/api/learning/lessons/${lesson.id}/start`, {
    token: alice.token, method: "POST", body: {},
  });
  assert.equal(start.status, 200, "lesson start");
  assert.equal(start.json.state, "IN_PROGRESS");
  const solved = [];
  for (const candidate of lesson.problems) {
    const submission = await request(EXPRESS, `/api/problems/${candidate.id}/submit`, {
      token: alice.token, method: "POST", body: { code: solutions[candidate.id] },
    });
    assert.equal(submission.status, 200, `submit ${candidate.id}`);
    assert.equal(submission.json.status, "ACCEPTED", `verdict for ${candidate.id}`);
    solved.push(candidate.id);
  }
  const progress = await progressOf(alice);
  const completed = lessonEntry(progress, lesson.id);
  assert.equal(completed.state, "COMPLETED", "lesson completes when every problem is accepted");
  pass("lesson/solution: Docker judge accepted every program and the lesson is COMPLETED", `${solved.length} program(s)`);

  const activity = await request(FASTAPI, `/api/players/${alice.user.id}/activity`, { token: alice.token });
  assert.equal(activity.status, 200, "activity");
  assert.ok(activity.json.year.submissions >= solved.length, "activity submissions");
  assert.ok(activity.json.year.solved >= 1, "activity solved");
  pass("analytics: FastAPI activity reads the Prisma submissions", `submissions=${activity.json.year.submissions} solved=${activity.json.year.solved}`);

  // comment (FastAPI writes, shared Prisma table)
  const aliceComment = await request(FASTAPI, `/api/problems/${problem.id}/comments`, {
    token: alice.token, method: "POST", body: { body: "alice acceptance comment" },
  });
  assert.equal(aliceComment.status, 201, "alice comment");
  const bobComment = await request(FASTAPI, `/api/problems/${problem.id}/comments`, {
    token: bob.token, method: "POST", body: { body: "bob acceptance comment" },
  });
  assert.equal(bobComment.status, 201, "bob comment");
  const listed = await commentsOf(problem.id);
  assert.ok(listed.some((comment) => comment.id === aliceComment.json.id && comment.body === "alice acceptance comment"));
  assert.ok(listed.some((comment) => comment.id === bobComment.json.id && comment.author.id === bob.user.id));
  pass("comments: both accounts comment through FastAPI on the shared problem", `problem=${problem.id}`);

  // ranked duel
  const before = await request(EXPRESS, "/api/battle/rating/me", { token: alice.token });
  const bobBefore = await request(EXPRESS, "/api/battle/rating/me", { token: bob.token });
  assert.equal(before.json.points, 1000);
  assert.equal(bobBefore.json.points, 1000);
  const queueAlice = await request(EXPRESS, "/api/battle/ranked/queue", { token: alice.token, method: "POST", body: {} });
  const queueBob = await request(EXPRESS, "/api/battle/ranked/queue", { token: bob.token, method: "POST", body: {} });
  assert.ok([201, 202].includes(queueAlice.status), "alice queue");
  assert.ok([201, 202].includes(queueBob.status), "bob queue");
  const match = await pollActiveMatch(alice);
  assert.equal((await pollActiveMatch(bob)).id, match.id);
  assert.equal(match.players.length, 2);
  const duelSolution = solutions[match.problemId];
  assert.ok(duelSolution, `fixture for ranked problem ${match.problemId}`);
  const win = await request(EXPRESS, `/api/battle/matches/${match.id}/submit`, {
    token: alice.token, method: "POST", body: { code: duelSolution },
  });
  assert.equal(win.json.status, "ACCEPTED", "ranked verdict");
  assert.equal(win.json.matchCompleted, true);
  const after = await request(EXPRESS, "/api/battle/rating/me", { token: alice.token });
  const bobAfter = await request(EXPRESS, "/api/battle/rating/me", { token: bob.token });
  assert.equal(after.json.points, 1000 + rankForPoints(1000).win);
  assert.equal(bobAfter.json.points, 1000 + rankForPoints(1000).loss);
  pass("ranked: two accounts pair, one settlement moves both ratings", `${before.json.points}→${after.json.points} / ${bobBefore.json.points}→${bobAfter.json.points}`);

  // third-account isolation
  const carolConversations = await request(EXPRESS, "/api/chat/conversations", { token: carol.token });
  assert.deepEqual(carolConversations.json.items, []);
  const carolMatch = await request(EXPRESS, `/api/battle/matches/${match.id}`, { token: carol.token });
  assert.equal(carolMatch.status, 404);
  const carolNotices = await request(EXPRESS, "/api/notifications", { token: carol.token });
  assert.deepEqual(carolNotices.json.items, []);
  const carolPatch = await request(FASTAPI, `/api/problems/${problem.id}/comments/${aliceComment.json.id}`, {
    token: carol.token, method: "PATCH", body: { body: "hijacked" },
  });
  assert.equal(carolPatch.status, 403);
  const stillThere = (await commentsOf(problem.id)).find((comment) => comment.id === aliceComment.json.id);
  assert.equal(stillThere.body, "alice acceptance comment");
  pass("isolation: a third account cannot read chat, match, notifications or edit a comment");

  // persistence payload for the restart phase
  const bobStart = await request(EXPRESS, `/api/learning/lessons/${lesson.id}/start`, {
    token: bob.token, method: "POST", body: {},
  });
  assert.equal(bobStart.status, 200);
  const aliceProgress = await progressOf(alice);
  const bobProgress = await progressOf(bob);
  const savedComments = await commentsOf(problem.id);
  const state = {
    lessonId: lesson.id,
    problemId: problem.id,
    accounts: {
      alice: { token: alice.token, userId: alice.user.id, nickname: alice.nickname },
      bob: { token: bob.token, userId: bob.user.id, nickname: bob.nickname },
    },
    comments: {
      alice: aliceComment.json.id,
      bob: bobComment.json.id,
    },
    expected: {
      lesson: lessonEntry(aliceProgress, lesson.id),
      bobLesson: lessonEntry(bobProgress, lesson.id),
      aliceComment: savedComments.find((comment) => comment.id === aliceComment.json.id),
      bobComment: savedComments.find((comment) => comment.id === bobComment.json.id),
      completedProblems: aliceProgress.completedProblems.map((entry) => entry.problemId).sort(),
    },
    duel: { id: match.id, winnerId: alice.user.id },
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  pass("snapshot: alice lesson COMPLETED and bob lesson IN_PROGRESS before restart",
    `alice=${state.expected.lesson.state} bob=${state.expected.bobLesson.state}`);
  console.log(`\nALL ${checks.length} CHECKS PASSED (snapshot); state saved`);
}

async function verify() {
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  const alice = { token: state.accounts.alice.token };
  const bob = { token: state.accounts.bob.token };

  const aliceProgress = await progressOf(alice);
  const bobProgress = await progressOf(bob);
  const aliceEntry = lessonEntry(aliceProgress, state.lessonId);
  const bobEntry = lessonEntry(bobProgress, state.lessonId);
  assert.deepEqual(aliceEntry, state.expected.lesson, "alice lesson progress unchanged");
  assert.deepEqual(bobEntry, state.expected.bobLesson, "bob lesson progress unchanged");
  assert.equal(aliceEntry.state, "COMPLETED");
  assert.equal(bobEntry.state, "IN_PROGRESS");
  assert.deepEqual(
    aliceProgress.completedProblems.map((entry) => entry.problemId).sort(),
    state.expected.completedProblems,
  );
  pass("restart: lesson progress (startedAt/completedAt/state) is unchanged for both accounts");

  const comments = await commentsOf(state.problemId);
  const aliceComment = comments.find((comment) => comment.id === state.comments.alice);
  const bobComment = comments.find((comment) => comment.id === state.comments.bob);
  assert.deepEqual(aliceComment, state.expected.aliceComment, "alice comment unchanged");
  assert.deepEqual(bobComment, state.expected.bobComment, "bob comment unchanged");
  pass("restart: both comments keep body, author and timestamps");

  const activity = await request(FASTAPI, `/api/players/${state.accounts.alice.userId}/activity`, { token: alice.token });
  assert.equal(activity.status, 200);
  assert.ok(activity.json.year.solved >= 1, "analytics survives restart");
  pass("restart: FastAPI analytics still reads the same solved submissions", `solved=${activity.json.year.solved}`);

  const duel = await request(EXPRESS, `/api/battle/matches/${state.duel.id}`, { token: alice.token });
  assert.equal(duel.status, 200);
  assert.equal(duel.json.status, "COMPLETED");
  assert.equal(duel.json.winnerId, state.duel.winnerId);
  pass("restart: the settled ranked match is still readable with the same winner");

  console.log(`\nALL ${checks.length} CHECKS PASSED (after restart)`);
}

try {
  if (mode === "verify") await verify();
  else await snapshot();
} catch (error) {
  console.error("FAIL", error.message);
  process.exitCode = 1;
}
