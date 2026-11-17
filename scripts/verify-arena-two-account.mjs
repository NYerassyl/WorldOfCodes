// Two-account verification for the integrated Chat + Ranked Arena build.
// Requires the API (with real Docker judge) and PostgreSQL:
//   npm run dev:api
//   node --env-file=.env scripts/verify-arena-two-account.mjs
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { PrismaClient } from "../server/prisma.js";
import { solutions } from "../tests/solutions.mjs";
import { rankForPoints } from "../services/learning-backend/src/battle/ranks.js";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4001";
const prisma = new PrismaClient();
const learningPack = JSON.parse(
  await readFile("services/learning-backend/prisma/learning-pack.json", "utf8"),
);
const referenceSolutions = Object.fromEntries(
  learningPack.lessons.flatMap((lesson) =>
    lesson.problems.map((problem) => [problem.id, problem.referenceCode]),
  ),
);
const solutionFor = (problemId) => solutions[problemId] ?? referenceSolutions[problemId];
const results = [];
const pass = (name, detail = "") => {
  results.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${BASE}/api${path}`, {
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

const letters = (length) =>
  Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const stamp = Date.now();

async function register(label) {
  const nickname = `${label}${letters(6)}`;
  const { status, json } = await request("/auth/register", {
    method: "POST",
    body: { email: `${nickname}.${stamp}@example.com`, password: "Passw0rd!123", nickname },
  });
  assert.equal(status, 201, `register ${label}`);
  return { token: json.token, user: json.user, nickname };
}

async function state(account) {
  const { status, json } = await request("/battle/state", { token: account.token });
  assert.equal(status, 200);
  return json;
}

async function pollActiveMatch(account, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await state(account);
    if (current.match?.status === "ACTIVE") return current.match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("match did not become active");
}

async function rating(account) {
  const { json } = await request("/battle/rating/me", { token: account.token });
  return json;
}

async function setPoints(userId, points) {
  await prisma.rating.upsert({
    where: { userId },
    create: { userId, points },
    update: { points },
  });
}

async function playMatch(first, second, label) {
  const queuedFirst = await request("/battle/ranked/queue", { token: first.token, method: "POST", body: {} });
  const queuedSecond = await request("/battle/ranked/queue", { token: second.token, method: "POST", body: {} });
  assert.ok([201, 202].includes(queuedFirst.status), `${label}: first queue accepted`);
  assert.ok([201, 202].includes(queuedSecond.status), `${label}: second queue accepted`);
  const matchFirst = await pollActiveMatch(first);
  const matchSecond = await pollActiveMatch(second);
  assert.equal(matchFirst.id, matchSecond.id, `${label}: both accounts hold the same match`);
  assert.equal(matchFirst.type, "RANKED");
  assert.equal(matchFirst.players.length, 2);
  pass(`${label}: two queued accounts pair without a third player`, matchFirst.id);
  return matchFirst;
}

try {
  const alice = await register("alice");
  const bob = await register("bob");
  const eve = await register("eve");
  const aliceProfileEdit = await request("/users/me", {
    token: alice.token, method: "PATCH",
    body: { displayName: "GPT4 QA Alice", bio: "Two-account integration acceptance" },
  });
  assert.equal(aliceProfileEdit.status, 200, "Alice can edit her canonical profile");
  assert.equal(aliceProfileEdit.json.displayName, "GPT4 QA Alice");
  pass("profile: Alice updates display name and bio");

  // --- Friendly match: wrong verdict, accepted verdict, reload restore -----
  const invite = await request("/battle/friendly", { token: alice.token, method: "POST", body: {} });
  assert.equal(invite.status, 201);
  const joined = await request(`/battle/friendly/${invite.json.inviteCode}/join`, { token: bob.token, method: "POST" });
  assert.equal(joined.status, 200);
  assert.equal(joined.json.status, "ACTIVE");
  assert.equal(joined.json.type, "FRIENDLY");
  pass("friendly: invite joined and becomes an active match", joined.json.id);

  const beforeRestore = await state(alice);
  const afterReload = await state(alice);
  assert.equal(afterReload.match?.id, joined.json.id, "friendly: active match survives a fresh state read");
  assert.equal(afterReload.match.status, beforeRestore.match.status);
  pass("friendly: reload restores the same active match", afterReload.match.id);

  const friendlyProblem = await request(`/problems/${joined.json.problemId}`);
  assert.equal(friendlyProblem.status, 200);
  const correctFriendly = solutionFor(joined.json.problemId);
  assert.ok(correctFriendly, `solution fixture exists for ${joined.json.problemId}`);
  const wrongFriendly = friendlyProblem.json.problem.starterCode.replace(/\n\s*pass\s*$/, "\n    return None");

  const bobWrong = await request(`/battle/matches/${joined.json.id}/submit`, {
    token: bob.token, method: "POST", body: { code: wrongFriendly },
  });
  assert.equal(bobWrong.status, 200);
  assert.equal(bobWrong.json.status, "WRONG_ANSWER");
  assert.equal(bobWrong.json.matchCompleted, false);
  assert.equal((await state(bob)).match.status, "ACTIVE");
  pass("friendly: wrong answer keeps the match active");

  const aliceWin = await request(`/battle/matches/${joined.json.id}/submit`, {
    token: alice.token, method: "POST", body: { code: correctFriendly },
  });
  assert.equal(aliceWin.status, 200);
  assert.equal(aliceWin.json.status, "ACCEPTED");
  assert.equal(aliceWin.json.matchCompleted, true);
  assert.equal(aliceWin.json.winnerId, alice.user.id);
  const friendlyDone = await request(`/battle/matches/${joined.json.id}`, { token: bob.token });
  assert.equal(friendlyDone.json.status, "COMPLETED");
  assert.equal(friendlyDone.json.winnerId, alice.user.id);
  assert.equal(friendlyDone.json.players[0].ratingDelta, null, "friendly matches do not change rating");
  const friendlyRatings = [await rating(alice), await rating(bob)];
  assert.deepEqual(friendlyRatings.map((value) => value.points), [1000, 1000]);
  pass("friendly: accepted verdict completes the match without a rating change");

  const aliceAgain = await request(`/battle/matches/${joined.json.id}/submit`, {
    token: alice.token, method: "POST", body: { code: correctFriendly },
  });
  assert.equal(aliceAgain.status, 404, "completed friendly matches reject new submissions");
  pass("friendly: a completed match cannot be submitted again");

  // --- Ranked: 1099 -> 1123 crosses into Bronze; Novice loser stays put ----
  await setPoints(alice.user.id, 1099);
  await setPoints(bob.user.id, 1090);
  const rankedOne = await playMatch(alice, bob, "ranked 1099/1090");
  const snapshots = await prisma.matchPlayer.findMany({
    where: { matchId: rankedOne.id }, select: { ratingBefore: true },
  });
  assert.deepEqual(
    snapshots.map((player) => player.ratingBefore).sort((a, b) => a - b),
    [1090, 1099],
    "pre-match rating snapshot is stored",
  );

  const rankedProblem = await request(`/problems/${rankedOne.problemId}`);
  const wrongRanked = rankedProblem.json.problem.starterCode.replace(/\n\s*pass\s*$/, "\n    return None");
  const bobWrongRanked = await request(`/battle/matches/${rankedOne.id}/submit`, {
    token: bob.token, method: "POST", body: { code: wrongRanked },
  });
  assert.equal(bobWrongRanked.json.status, "WRONG_ANSWER");
  assert.equal((await rating(alice)).points, 1099, "wrong answers do not settle ranked");
  assert.equal((await rating(bob)).points, 1090);
  pass("ranked: wrong answers leave both ratings unchanged");

  const aliceRankedWin = await request(`/battle/matches/${rankedOne.id}/submit`, {
    token: alice.token, method: "POST", body: { code: solutionFor(rankedOne.problemId) },
  });
  assert.equal(aliceRankedWin.json.status, "ACCEPTED");
  assert.equal(aliceRankedWin.json.matchCompleted, true);
  assert.equal(aliceRankedWin.json.winnerId, alice.user.id);
  const aliceAfter = await rating(alice);
  const bobAfter = await rating(bob);
  assert.equal(aliceAfter.points, 1099 + rankForPoints(1099).win, "1099 + 24 = 1123");
  assert.equal(aliceAfter.points, 1123);
  assert.equal(aliceAfter.rank, "Bronze", "1099 win crosses into Bronze");
  assert.equal(bobAfter.points, 1090, "Novice loss is 0");
  assert.equal(bobAfter.rank, "Novice");
  const settled = await request(`/battle/matches/${rankedOne.id}`, { token: bob.token });
  const deltas = new Map(settled.json.players.map((player) => [player.userId, player.ratingDelta]));
  assert.equal(deltas.get(alice.user.id), 24);
  assert.equal(deltas.get(bob.user.id), 0);
  pass("ranked: Novice loss is 0 and 1099+24=1123 crosses to Bronze", `rankedProblem=${rankedProblem.json.problem.functionName}`);

  const bobReplay = await request(`/battle/matches/${rankedOne.id}/submit`, {
    token: bob.token, method: "POST", body: { code: solutionFor(rankedOne.problemId) },
  });
  assert.equal(bobReplay.status, 404, "a settled match rejects the second submission");
  assert.deepEqual([(await rating(alice)).points, (await rating(bob)).points], [1123, 1090]);
  assert.equal((await rating(alice)).wins, 1, "settlement happened exactly once");
  pass("ranked: settlement is claimed exactly once");

  // --- Ranked boundary: 1249 + 22 = 1271 crosses into Silver ---------------
  await setPoints(alice.user.id, 1249);
  await setPoints(bob.user.id, 1248);
  const rankedTwo = await playMatch(alice, bob, "ranked 1249/1248");
  const secondWin = await request(`/battle/matches/${rankedTwo.id}/submit`, {
    token: alice.token, method: "POST", body: { code: solutionFor(rankedTwo.problemId) },
  });
  assert.equal(secondWin.json.status, "ACCEPTED");
  const aliceCrossed = await rating(alice);
  const bobDropped = await rating(bob);
  assert.equal(aliceCrossed.points, 1249 + rankForPoints(1249).win, "1249 + 22 = 1271");
  assert.equal(aliceCrossed.points, 1271);
  assert.equal(aliceCrossed.rank, "Silver", "1249 win crosses into Silver");
  assert.equal(bobDropped.points, 1248 + rankForPoints(1248).loss, "Bronze loss is -16");
  assert.equal(bobDropped.points, 1232);
  assert.equal(aliceCrossed.wins, 2, "second settlement applied once");
  pass("ranked: 1249+22=1271 crosses to Silver", `loser ${bobDropped.points}`);

  // --- Chat: history, unread, notifications, isolation ----------------------
  const follow = await request(`/players/${bob.user.id}/follow`, { token: alice.token, method: "PUT" });
  assert.equal(follow.status, 204);
  const followAgain = await request(`/players/${bob.user.id}/follow`, { token: alice.token, method: "PUT" });
  assert.equal(followAgain.status, 204);
  const unreadAfterFollow = await request("/notifications/unread-count", { token: bob.token });
  assert.equal(unreadAfterFollow.json.unreadCount, 1, "repeat follow does not duplicate notifications");
  const bobNotifications = await request("/notifications", { token: bob.token });
  const followNotice = bobNotifications.json.items.find((item) => item.type === "FOLLOW");
  assert.ok(followNotice, "follow notification exists");
  assert.equal(followNotice.actor.id, alice.user.id);
  pass("chat: follow notification is deduplicated", JSON.stringify(unreadAfterFollow.json));

  const firstMessage = await request(`/chat/${bob.user.id}/messages`, {
    token: alice.token, method: "POST", body: { body: "Hello from the arena check" },
  });
  assert.equal(firstMessage.status, 201);
  const secondMessage = await request(`/chat/${bob.user.id}/messages`, {
    token: alice.token, method: "POST", body: { body: "Second message for history" },
  });
  assert.equal(secondMessage.status, 201);

  const bobConversations = await request("/chat/conversations", { token: bob.token });
  const conversation = bobConversations.json.items.find((item) => item.peer.id === alice.user.id);
  assert.ok(conversation, "Bob has a conversation with Alice");
  assert.equal(conversation.unread, 2, "two unread messages");
  assert.equal(conversation.lastMessage.body, "Second message for history");
  const bobThread = await request(`/chat/${alice.user.id}/messages`, { token: bob.token });
  assert.deepEqual(bobThread.json.messages.map((message) => message.body),
    ["Hello from the arena check", "Second message for history"]);
  pass("chat: history and unread count are correct", `unread=${conversation.unread}`);

  await request(`/chat/${alice.user.id}/read`, { token: bob.token, method: "POST", body: {} });
  const afterRead = await request("/chat/conversations", { token: bob.token });
  assert.equal(afterRead.json.items.find((item) => item.peer.id === alice.user.id).unread, 0);
  const unreadAfterMessages = await request("/notifications/unread-count", { token: bob.token });
  assert.equal(unreadAfterMessages.json.unreadCount, 3, "follow + two message notifications");
  await request("/notifications/read", { token: bob.token, method: "POST", body: { all: true } });
  const unreadCleared = await request("/notifications/unread-count", { token: bob.token });
  assert.equal(unreadCleared.json.unreadCount, 0);
  pass("chat: unread messages clear, notification list stays readable");

  const eveConversations = await request("/chat/conversations", { token: eve.token });
  assert.deepEqual(eveConversations.json.items, [], "third account sees no conversations");
  const eveMatch = await request(`/battle/matches/${rankedTwo.id}`, { token: eve.token });
  assert.equal(eveMatch.status, 404, "third account cannot read the ranked match");
  const eveNotifications = await request("/notifications", { token: eve.token });
  assert.deepEqual(eveNotifications.json.items, [], "third account sees no notifications");
  const eveRating = await request("/battle/rating/me", { token: eve.token });
  assert.equal(eveRating.json.points, 1000, "third account rating untouched");
  pass("chat: another account cannot read match, chat or notifications data");

  // --- One continuous learning -> judged submission -> analytics -> comment path ----
  const lessonCandidates = await prisma.lesson.findMany({
    where: {
      prerequisiteId: null,
      topic: { course: { isPublished: true } },
      problems: { some: { isPublished: true } },
    },
    include: { problems: { where: { isPublished: true }, select: { id: true } } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  const lessonFixture = lessonCandidates.find((lesson) =>
    lesson.problems.some((problem) => solutionFor(problem.id)),
  );
  assert.ok(lessonFixture, "seeded catalog has a prerequisite-free lesson with a reference solution");
  const lessonId = lessonFixture.id;
  const lessonResponse = await request(`/learning/lessons/${lessonId}`);
  assert.equal(lessonResponse.status, 200, "lesson is readable through the canonical API");
  const problemFixture = lessonFixture.problems.find((problem) => solutionFor(problem.id));
  const problemId = problemFixture.id;
  const started = await request(`/learning/lessons/${lessonId}/start`, {
    token: alice.token, method: "POST",
  });
  assert.equal(started.status, 200);
  assert.equal(started.json.state, "IN_PROGRESS");
  pass("learning: Alice starts a seeded lesson", lessonId);

  const judged = await request(`/problems/${problemId}/submit`, {
    token: alice.token, method: "POST", body: { code: solutionFor(problemId) },
  });
  assert.equal(judged.status, 200, `judge submission: ${JSON.stringify(judged.json)}`);
  assert.equal(judged.json.status, "ACCEPTED", "real judge accepts the authored reference solution");
  pass("learning: real Docker judge accepts a lesson problem", problemId);

  const fastApiBase = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000";
  async function fastApi(path, { token, method = "GET", body } = {}) {
    const response = await fetch(`${fastApiBase}/api${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await response.json(); } catch {}
    return { status: response.status, json };
  }

  const completed = await fastApi(`/users/${alice.user.id}/progress`, {
    token: alice.token, method: "POST", body: { lesson_id: lessonId },
  });
  assert.equal(completed.status, 200, `lesson completion: ${JSON.stringify(completed.json)}`);
  const progressBeforeRestart = await fastApi(`/users/${alice.user.id}/progress`, { token: alice.token });
  assert.equal(progressBeforeRestart.status, 200);
  assert.ok(
    (progressBeforeRestart.json.lessons ?? []).some((item) => item.lessonId === lessonId && item.completedAt),
    "lesson completion is persisted in canonical PostgreSQL",
  );
  pass("learning: judged completion is recorded in canonical progress", lessonId);

  const analytics = await fastApi(`/players/${alice.user.id}/activity`, { token: alice.token });
  assert.equal(analytics.status, 200, `activity analytics: ${JSON.stringify(analytics.json)}`);
  assert.ok(analytics.json.year.submissions >= 1, "accepted submission appears in activity analytics");
  assert.ok(analytics.json.year.solved >= 1, "accepted problem appears in solved analytics");
  pass("analytics: accepted lesson submission appears in FastAPI activity view");

  const comment = await fastApi(`/problems/${problemId}/comments`, {
    token: alice.token, method: "POST", body: { body: "GPT4 QA two-account persistence comment" },
  });
  assert.equal(comment.status, 201, `comment create: ${JSON.stringify(comment.json)}`);
  const commentsBeforeRestart = await fastApi(`/problems/${problemId}/comments`);
  assert.ok(
    commentsBeforeRestart.json.comments.some((item) => item.id === comment.json.id),
    "comment is visible from a fresh FastAPI request",
  );
  pass("comments: authenticated comment is stored in shared PostgreSQL", comment.json.id);

  // Final ranked duel comes after profile, follow, chat, lesson, analytics and comment.
  await setPoints(alice.user.id, 1300);
  await setPoints(bob.user.id, 1290);
  const finalRanked = await playMatch(alice, bob, "post-learning/comment ranked duel");
  const finalRankedProblem = await request(`/problems/${finalRanked.problemId}`);
  assert.equal(finalRankedProblem.status, 200);
  const finalRankedWin = await request(`/battle/matches/${finalRanked.id}/submit`, {
    token: alice.token, method: "POST",
    body: { code: solutionFor(finalRanked.problemId) },
  });
  assert.equal(finalRankedWin.json.status, "ACCEPTED");
  assert.equal(finalRankedWin.json.matchCompleted, true);
  const finalRatings = { alice: (await rating(alice)).points, bob: (await rating(bob)).points };
  pass("ranked: duel completes after learning, analytics and comments", finalRanked.id);

  if (process.env.GPT4_QA_STATE_FILE) {
    await writeFile(process.env.GPT4_QA_STATE_FILE, JSON.stringify({
      alice: { id: alice.user.id, token: alice.token },
      bob: { id: bob.user.id, token: bob.token },
      eve: { id: eve.user.id, token: eve.token },
      rankedMatchId: finalRanked.id,
      expectedMessages: ["Hello from the arena check", "Second message for history"],
      expectedRatings: finalRatings,
      lessonId,
      problemId,
      expectedCommentId: comment.json.id,
      expectedProfile: { displayName: "GPT4 QA Alice", bio: "Two-account integration acceptance" },
    }, null, 2));
  }
  console.log(`\nALL ${results.length} CHECKS PASSED`);
} catch (error) {
  console.error("FAIL", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
