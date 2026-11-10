// Mock-fetch contract tests only. These do not exercise a real backend or judge.
import test, { after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const frontend = fileURLToPath(new URL("..", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "woc-battle-api-"));
// One entry preserves the shared opaque-token module instance in the bundle.
const entry = join(dir, "entry.ts");
writeFileSync(entry, `export * from ${JSON.stringify(join(frontend, "src/lib/battle-api.ts"))};\nexport { ApiError, getToken, setToken } from ${JSON.stringify(join(frontend, "src/lib/api.ts"))};`);
execFileSync(join(frontend, "node_modules/.bin/esbuild"), [entry, "--bundle", "--format=esm", "--platform=node", `--outfile=${join(dir, "client.mjs")}`, "--log-level=warning"], { stdio: "inherit" });
const api = await import(pathToFileURL(join(dir, "client.mjs")).href);
const originalFetch = globalThis.fetch;
const originalTimeout = AbortSignal.timeout;
let requests;
let payload;
let status;
beforeEach(() => {
  api.configureBattleApi({ baseUrl: "/api" });
  api.setToken("opaque-session");
  requests = [];
  payload = {};
  status = 200;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(status === 204 ? null : JSON.stringify(payload), { status });
  };
});
after(() => {
  globalThis.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
  api.setToken(null);
  rmSync(dir, { recursive: true, force: true });
});
const match = {
  id: "m1", type: "RANKED", status: "ACTIVE", problemId: "p1", winnerId: null,
  startedAt: "2026-11-04T00:00:00.000Z", completedAt: null,
  players: [{ userId: "u1", seat: 0, submittedAt: null, verdict: null, ratingDelta: null,
    user: { nickname: "Ada", avatarUrl: null } }],
};

test("match is raw, IDs are encoded, auth uses the shared opaque token", async () => {
  payload = match;
  assert.deepEqual(await api.getBattleMatch("m/ 1"), match);
  assert.equal(requests[0].url, "/api/battle/matches/m%2F%201");
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].headers.get("Authorization"), "Bearer opaque-session");
  assert.equal(requests[0].headers.get("Accept"), "application/json");
});
test("public problem unwraps only the documented problem envelope", async () => {
  const problem = { id: "p1", lessonId: null, title: "Sort", statement: "Sort values", language: "python",
    topicSlug: "sorting", difficulty: "EASY", functionName: "solve", starterCode: "def solve(nums):\n    pass\n",
    rewardXp: 10, rewardCoins: 2, examples: [{ args: [[2, 1]], expected: [1, 2] }] };
  payload = { problem };
  assert.deepEqual(await api.getBattleProblem("p/1"), problem);
  assert.equal(requests[0].url, "/api/problems/p%2F1");
});
test("rating remains server-authoritative and base URL is configurable", async () => {
  api.configureBattleApi({ baseUrl: "https://example.test/api/" });
  payload = { points: 1021, wins: 1, losses: 0, draws: 0 };
  assert.deepEqual(await api.getBattleRating(), payload);
  assert.equal(requests[0].url, "https://example.test/api/battle/rating/me");
});
test("friendly create and join preserve raw response contracts", async () => {
  payload = { matchId: "m1", inviteCode: "ABC", expiresInSeconds: 1800 };
  assert.deepEqual(await api.createBattleInvite(), payload);
  assert.equal(requests[0].url, "/api/battle/friendly");
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].body, undefined);
  payload = { ...match, type: "FRIENDLY" };
  assert.deepEqual(await api.joinBattleInvite("A/B ?"), payload);
  assert.equal(requests[1].url, "/api/battle/friendly/A%2FB%20%3F/join");
  assert.equal(requests[1].method, "POST");
});
test("queue handles queued, matched and leave contracts", async () => {
  status = 202;
  payload = { status: "QUEUED", ticketId: "ticket" };
  assert.deepEqual(await api.joinRankedQueue(), payload);
  status = 201;
  payload = { status: "MATCHED", match };
  assert.deepEqual(await api.joinRankedQueue(), payload);
  status = 200;
  payload = { status: "LEFT_QUEUE" };
  assert.deepEqual(await api.leaveRankedQueue(), payload);
  assert.deepEqual(requests.map(r => [r.url, r.method]), [
    ["/api/battle/ranked/queue", "POST"], ["/api/battle/ranked/queue", "POST"], ["/api/battle/ranked/queue", "DELETE"],
  ]);
});
test("submit sends code only to battle endpoint and returns raw verdict with 60s timeout", async () => {
  const durations = [];
  AbortSignal.timeout = ms => { durations.push(ms); return new AbortController().signal; };
  try {
    payload = { status: "ACCEPTED", passedCases: 3, totalCases: 3, matchCompleted: true, winnerId: "u1", settled: true };
    assert.deepEqual(await api.submitBattleCode("m/1", "def solve(a): return a"), payload);
    assert.deepEqual(durations, [60000]);
    assert.equal(requests[0].url, "/api/battle/matches/m%2F1/submit");
    assert.equal(requests[0].method, "POST");
    assert.equal(requests[0].headers.get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(requests[0].body), { code: "def solve(a): return a" });
  } finally { AbortSignal.timeout = originalTimeout; }
});
for (const code of [401, 403, 503]) {
  test(`${code} is ApiError, only 401 clears shared token`, async () => {
    status = code;
    payload = { error: { code: code === 503 ? "JUDGE_UNAVAILABLE" : "DENIED", message: "Server refusal" } };
    await assert.rejects(api.submitBattleCode("m1", "pass"), error => {
      assert.ok(error instanceof api.ApiError);
      assert.equal(error.status, code);
      assert.equal(error.code, payload.error.code);
      assert.equal(error.message, "Server refusal");
      return true;
    });
    assert.equal(api.getToken(), code === 401 ? null : "opaque-session");
  });
}
test("non-JSON HTTP failure has status fallback", async () => {
  globalThis.fetch = async () => new Response("bad gateway", { status: 502 });
  await assert.rejects(api.getBattleRating(), e => e instanceof api.ApiError && e.code === "HTTP_502");
});
test("network failure is not a verdict", async () => {
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(api.submitBattleCode("m1", "pass"), e => e instanceof api.ApiError && e.code === "NETWORK_ERROR");
});
test("caller cancellation propagates through combined signal", async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
  const pending = api.getBattleMatch("m1", controller.signal);
  controller.abort();
  await assert.rejects(pending, e => e instanceof api.ApiError && e.code === "REQUEST_CANCELLED");
  await assert.rejects(api.getBattleProblem("p1", controller.signal), e => e.code === "REQUEST_CANCELLED");
});
test("timeout reports NETWORK_TIMEOUT without waiting 60 seconds", async () => {
  AbortSignal.timeout = () => AbortSignal.abort(new DOMException("Timed out", "TimeoutError"));
  globalThis.fetch = async (_url, { signal }) => { throw signal.reason; };
  try {
    await assert.rejects(api.submitBattleCode("m1", "pass"), e => e instanceof api.ApiError && e.code === "NETWORK_TIMEOUT");
  } finally { AbortSignal.timeout = originalTimeout; }
});
test("non-winning verdict has no fabricated settlement or rating", async () => {
  payload = { status: "WRONG_ANSWER", passedCases: 1, totalCases: 3, matchCompleted: false, winnerId: null };
  assert.deepEqual(await api.submitBattleCode("m1", "pass"), payload);
  assert.equal("settled" in payload, false);
});
test("every endpoint accepts caller cancellation", async () => {
  const signal = AbortSignal.abort();
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.signal.aborted, true);
    throw options.signal.reason;
  };
  const calls = [
    () => api.getBattleMatch("m1", signal), () => api.getBattleProblem("p1", signal),
    () => api.getBattleRating(signal), () => api.createBattleInvite(signal),
    () => api.joinBattleInvite("ABC", signal), () => api.joinRankedQueue(signal),
    () => api.leaveRankedQueue(signal), () => api.submitBattleCode("m1", "pass", signal),
  ];
  for (const call of calls) await assert.rejects(call(), e => e.code === "REQUEST_CANCELLED");
});
test("anonymous reads do not invent credentials", async () => {
  api.setToken(null);
  payload = { problem: { id: "p1" } };
  await api.getBattleProblem("p1");
  assert.equal(requests[0].headers.has("Authorization"), false);
});
