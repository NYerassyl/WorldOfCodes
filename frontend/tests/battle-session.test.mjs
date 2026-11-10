// Mocked-API contract tests for the REST-first Arena session. No server or judge.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const frontend = fileURLToPath(new URL("..", import.meta.url));
const temp = mkdtempSync(join(process.env.JCODE_SCRATCH_DIR || tmpdir(), "woc-battle-session-"));
const entry = join(temp, "entry.ts");
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(frontend, "src/lib/battle-session.ts"))}; export { ApiError } from ${JSON.stringify(join(frontend, "src/lib/api.ts"))};`,
);
execFileSync(join(frontend, "node_modules/.bin/esbuild"), [
  entry, "--bundle", "--format=esm", "--platform=node", `--outfile=${join(temp, "session.mjs")}`, "--log-level=warning",
]);
const { BattleSession, battleErrorMessage, ApiError } = await import(
  pathToFileURL(join(temp, "session.mjs")).href
);
after(() => rmSync(temp, { recursive: true, force: true }));

const flush = async (rounds = 8) => {
  for (let index = 0; index < rounds; index += 1) await new Promise((resolve) => setImmediate(resolve));
};
const clone = (data) => structuredClone(data);
const player = (userId, seat, overrides = {}) => ({
  userId, seat, submittedAt: null, verdict: null, ratingDelta: null,
  user: { nickname: seat ? "Grace" : "Ada", avatarUrl: null }, ...overrides,
});
const activeMatch = {
  id: "m1", type: "RANKED", status: "ACTIVE", problemId: "p1", winnerId: null,
  startedAt: "2026-11-10T00:00:00Z", completedAt: null, players: [player("u1", 0), player("u2", 1)],
};
const pendingMatch = {
  id: "f1", type: "FRIENDLY", status: "PENDING", problemId: "p1", winnerId: null,
  startedAt: null, completedAt: null, players: [player("u1", 0)],
};
const completedMatch = {
  ...activeMatch, status: "COMPLETED", winnerId: "u1", completedAt: "2026-11-10T00:05:00Z",
  players: [player("u1", 0, { verdict: "ACCEPTED", submittedAt: "2026-11-10T00:04:00Z" }), player("u2", 1, { verdict: "WRONG_ANSWER" })],
};
const problem = {
  id: "p1", title: "Double", statement: "Double n.", difficulty: "EASY", functionName: "double",
  starterCode: "def double(n):\n    pass\n", examples: [{ args: [2], expected: 4 }],
};
const rating = { points: 1000, wins: 0, losses: 0, draws: 0 };

function memoryStorage(seed) {
  const values = new Map(seed ? Object.entries(seed) : []);
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    dump: () => Object.fromEntries(values),
  };
}

function setup(t, overrides = {}) {
  const calls = [];
  const api = {
    getBattleState: async () => ({ match: null, queue: { status: "NOT_QUEUED" } }),
    getBattleMatch: async (id) => clone(activeMatch.id === id ? activeMatch : pendingMatch),
    getBattleProblem: async () => clone(problem),
    getBattleRating: async () => clone(rating),
    createBattleInvite: async () => ({ matchId: "f1", inviteCode: "ABC12345", expiresInSeconds: 1800 }),
    joinBattleInvite: async () => clone(pendingMatch),
    joinRankedQueue: async () => ({ status: "QUEUED", ticketId: "ticket-1" }),
    leaveRankedQueue: async () => ({ status: "LEFT_QUEUE" }),
    submitBattleCode: async () => ({ status: "WRONG_ANSWER", passedCases: 0, totalCases: 3, matchCompleted: false, winnerId: null }),
    ...overrides,
  };
  const storage = memoryStorage();
  let expired = 0;
  const session = new BattleSession({
    userId: "u1",
    api,
    storage,
    pollMs: 1_000_000,
    onExpired: () => { expired += 1; },
  });
  t.after(() => session.stop());
  return { session, api, storage, calls, expired: () => expired };
}

test("start restores the active match and queue from GET /battle/state", async (t) => {
  const { session, storage } = setup(t, {
    getBattleState: async () => ({ match: clone(activeMatch), queue: { status: "NOT_QUEUED" } }),
  });
  session.start();
  await flush();
  const state = session.getSnapshot();
  assert.equal(state.connection, "synced");
  assert.equal(state.match?.id, "m1");
  assert.equal(state.problem?.functionName, "double");
  assert.equal(state.code, problem.starterCode);
  assert.equal(state.rating?.points, 1000);
  assert.deepEqual(state.queue, "idle");
  assert.equal(storage.dump()["worldofcodes-battle-v1:u1"], undefined);
});

test("a pending friendly invitation is restored from the local hint", async (t) => {
  const { session, storage } = setup(t, {
    getBattleMatch: async () => clone(pendingMatch),
  });
  storage.setItem(
    "worldofcodes-battle-v1:u1",
    JSON.stringify({ matchId: "f1", invite: { matchId: "f1", inviteCode: "ABC12345", expiresInSeconds: 1800 } }),
  );
  session.start();
  await flush();
  const state = session.getSnapshot();
  assert.equal(state.match?.status, "PENDING");
  assert.equal(state.invite?.inviteCode, "ABC12345");
  assert.equal(state.matchId, "f1");
});

test("a missing saved invitation is cleared with a readable notice", async (t) => {
  const { session, storage } = setup(t, {
    getBattleMatch: async () => { throw new ApiError(404, "BATTLE_NOT_FOUND", "Battle not found"); },
  });
  storage.setItem("worldofcodes-battle-v1:u1", JSON.stringify({ matchId: "gone" }));
  session.start();
  await flush();
  assert.match(session.getSnapshot().notice ?? "", /no longer available/i);
  assert.equal(storage.dump()["worldofcodes-battle-v1:u1"], undefined);
});

test("an expired invitation code shows a clear error and clears the busy flag", async (t) => {
  const { session } = setup(t, {
    joinBattleInvite: async () => { throw new ApiError(404, "INVITE_NOT_FOUND", "Invite is invalid or expired"); },
  });
  session.start();
  await flush();
  await session.joinInvite("ZZZZZZZZ");
  await flush();
  const state = session.getSnapshot();
  assert.match(state.error ?? "", /invalid, expired, or has already been used/i);
  assert.equal(state.busy, null);
  assert.equal(state.matchId, null);
});

test("joining the ranked queue can be cancelled", async (t) => {
  const { session } = setup(t);
  session.start();
  await flush();
  await session.joinRanked();
  await flush();
  assert.equal(session.getSnapshot().queue, "queued");
  await session.leaveRanked();
  await flush();
  assert.equal(session.getSnapshot().queue, "idle");
  assert.match(session.getSnapshot().notice ?? "", /left the ranked queue/i);
});

test("a matched ranked ticket transitions into the shared match on refresh", async (t) => {
  let joinReply = { status: "QUEUED", ticketId: "ticket-1" };
  let stateReply = { match: null, queue: { status: "NOT_QUEUED" } };
  const { session } = setup(t, {
    joinRankedQueue: async () => joinReply,
    getBattleState: async () => clone(stateReply),
  });
  session.start();
  await flush();
  await session.joinRanked();
  await flush();
  assert.equal(session.getSnapshot().queue, "queued");

  stateReply = { match: clone(activeMatch), queue: { status: "NOT_QUEUED" } };
  await session.refresh();
  await flush();
  const state = session.getSnapshot();
  assert.equal(state.matchId, "m1");
  assert.equal(state.match?.status, "ACTIVE");
  assert.equal(state.queue, "idle");
  assert.equal(state.problem?.title, "Double");
  assert.equal(joinReply.status, "QUEUED");
});

test("queue recovery after a reload reads the server queue", async (t) => {
  const { session } = setup(t, {
    getBattleState: async () => ({ match: null, queue: { status: "QUEUED", ticketId: "ticket-9", position: 1, joinedAt: "2026-11-10T00:00:00Z" } }),
  });
  session.start();
  await flush();
  assert.equal(session.getSnapshot().queue, "queued");
});

test("an accepted submission records the verdict and the settled result", async (t) => {
  let stateReply = { match: clone(activeMatch), queue: { status: "NOT_QUEUED" } };
  let matchReply = clone(activeMatch);
  const { session } = setup(t, {
    getBattleState: async () => clone(stateReply),
    getBattleMatch: async () => clone(matchReply),
    submitBattleCode: async () => {
      matchReply = clone(completedMatch);
      stateReply = { match: clone(completedMatch), queue: { status: "NOT_QUEUED" } };
      return { status: "ACCEPTED", passedCases: 3, totalCases: 3, matchCompleted: true, winnerId: "u1" };
    },
  });
  session.start();
  await flush();
  session.setCode("def double(n):\n    return n * 2\n");
  await session.submit();
  await flush();
  const state = session.getSnapshot();
  assert.equal(state.verdict?.status, "ACCEPTED");
  assert.equal(state.match?.status, "COMPLETED");
  assert.equal(state.match?.winnerId, "u1");
});

test("a rejected submission keeps the match active", async (t) => {
  const { session } = setup(t, {
    getBattleState: async () => ({ match: clone(activeMatch), queue: { status: "NOT_QUEUED" } }),
  });
  session.start();
  await flush();
  session.setCode("def double(n):\n    return 'nope'\n");
  await session.submit();
  await flush();
  const state = session.getSnapshot();
  assert.equal(state.verdict?.status, "WRONG_ANSWER");
  assert.equal(state.match?.status, "ACTIVE");
});

test("an expired session notifies the runtime exactly once", async (t) => {
  const { session, expired } = setup(t, {
    getBattleState: async () => { throw new ApiError(401, "SESSION_INVALID", "Session expired"); },
  });
  session.start();
  await flush();
  assert.equal(expired(), 1);
  assert.match(session.getSnapshot().error ?? "", /session has expired/i);
});

test("unfinished matches cannot be abandoned from the client", async (t) => {
  const { session } = setup(t, {
    getBattleState: async () => ({ match: clone(activeMatch), queue: { status: "NOT_QUEUED" } }),
  });
  session.start();
  await flush();
  session.clearMatch();
  assert.equal(session.getSnapshot().matchId, "m1");
  assert.match(session.getSnapshot().error ?? "", /cannot be abandoned/i);
});

test("friendly error messages stay readable for unknown codes", () => {
  assert.match(battleErrorMessage(new ApiError(409, "CANNOT_JOIN_OWN_INVITE", "raw")), /share the code/i);
  assert.match(battleErrorMessage(new ApiError(404, "INVITE_NOT_FOUND", "raw")), /invalid, expired/i);
  assert.match(battleErrorMessage(new Error("boom")), /boom/);
});
