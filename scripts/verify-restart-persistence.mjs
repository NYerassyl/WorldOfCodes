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

console.log("PASS restart persistence: profiles, chat messages, ranked ratings and settled match");
