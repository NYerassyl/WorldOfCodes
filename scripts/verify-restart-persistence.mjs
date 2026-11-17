import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.BASE_URL || "http://127.0.0.1:4001";
const statePath = process.env.GPT4_QA_STATE_FILE || "/tmp/gpt4-qa-state.json";
const state = JSON.parse(await readFile(statePath, "utf8"));

async function get(path, token) {
  const response = await fetch(`${base}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  assert.equal(response.status, 200, `${path}: expected 200 after Express restart, got ${response.status}`);
  return body;
}

for (const account of [state.alice, state.bob]) {
  const profile = await get("/users/me", account.token);
  const user = profile.user ?? profile;
  assert.equal(user.id, account.id, "canonical account profile survives restart");
}

const aliceThread = await get(`/chat/${state.bob.id}/messages`, state.alice.token);
assert.deepEqual(
  (aliceThread.messages ?? []).map((message) => message.body),
  state.expectedMessages,
  "chat messages survive Express restart",
);

for (const [key, account] of [["alice", state.alice], ["bob", state.bob]]) {
  const rating = await get("/battle/rating/me", account.token);
  assert.equal(rating.points, state.expectedRatings[key], `${key} ranked rating survives restart`);
}

const match = await get(`/battle/matches/${state.rankedMatchId}`, state.bob.token);
assert.equal(match.status, "COMPLETED", "ranked match settlement survives restart");
assert.equal(match.players.length, 2, "both ranked players remain associated after restart");

const fastApiBase = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000";
async function fastGet(path, token) {
  const response = await fetch(`${fastApiBase}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try { body = await response.json(); } catch {}
  assert.equal(response.status, 200, `FastAPI ${path}: expected 200 after coordinated restart, got ${response.status}`);
  return body;
}

const fastProfile = await fastGet(`/users/me`, state.alice.token);
assert.equal(fastProfile.displayName, state.expectedProfile.displayName, "profile edit survives both service restarts");
assert.equal(fastProfile.bio, state.expectedProfile.bio, "profile bio survives both service restarts");

const progress = await fastGet(`/users/${state.alice.id}/progress`, state.alice.token);
assert.ok(
  (progress.lessons ?? []).some((item) => item.lessonId === state.lessonId && item.completedAt),
  "completed lesson progress survives Express and FastAPI restarts",
);

const comments = await fastGet(`/problems/${state.problemId}/comments`);
assert.ok(
  comments.comments.some((item) => item.id === state.expectedCommentId && item.body === "GPT4 QA two-account persistence comment"),
  "problem comment survives Express and FastAPI restarts",
);

const activity = await fastGet(`/players/${state.alice.id}/activity`, state.alice.token);
assert.ok(activity.year.submissions >= 1 && activity.year.solved >= 1,
  "analytics view still reads the accepted submission after restart");

console.log("PASS restart persistence: profiles, learning progress, comments, analytics, chat, ratings and settled match");
