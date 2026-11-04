import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const frontend = fileURLToPath(new URL("..", import.meta.url));
const temp = mkdtempSync(join(process.env.JCODE_SCRATCH_DIR || tmpdir(), "woc-battle-session-"));
const entry = join(temp, "entry.ts");
writeFileSync(entry, `export * from ${JSON.stringify(join(frontend, "src/lib/battle-session.ts"))}; export { ApiError } from ${JSON.stringify(join(frontend, "src/lib/api.ts"))};`);
execFileSync(join(frontend, "node_modules/.bin/esbuild"), [entry, "--bundle", "--format=esm", "--platform=node", `--outfile=${join(temp, "session.mjs")}`, "--log-level=warning"]);
const { BattleSession, ApiError, battleErrorMessage } = await import(pathToFileURL(join(temp, "session.mjs")).href);
after(() => rmSync(temp, { recursive: true, force: true }));
const tick = () => new Promise(resolve => setImmediate(resolve));
const clone = data => structuredClone(data);
const activeMatch = { id: "m1", type: "RANKED", status: "ACTIVE", problemId: "p1", winnerId: null, startedAt: "2026-11-04T00:00:00Z", completedAt: null,
  players: ["u1", "u2"].map((userId, seat) => ({ userId, seat, submittedAt: null, verdict: null, ratingDelta: null, user: { nickname: seat ? "Grace" : "Ada", avatarUrl: null } })) };
const problem = { id: "p1", title: "Double", statement: "Double n.", difficulty: "EASY", functionName: "double", starterCode: "def double(n):\n    pass\n", testCases: [{ argsJson: "[2]", expectedJson: "4" }] };
class Socket {
  connected = false;
  events = new Map();
  emitted = [];
  queueReply = { ok: true, status: "QUEUED", ticketId: "ticket" };
  on(event, fn) { if (!this.events.has(event)) this.events.set(event, new Set()); this.events.get(event).add(fn); }
  off(event, fn) { this.events.get(event)?.delete(fn); }
  fire(event, ...args) { for (const fn of this.events.get(event) ?? []) fn(...args); }
  connect() { this.connected = true; this.fire("connect"); }
  disconnect() { this.connected = false; this.fire("disconnect", "io client disconnect"); }
  timeout() { return { emit: (event, payload, ack) => {
    this.emitted.push({ event, payload });
    ack(this.ackError ?? null, event === "ranked:join" ? this.queueReply : { ok: true });
  } }; }
}
function setup(t, overrides = {}) {
  const socket = new Socket();
  const calls = [];
  const saved = new Map();
  let match = clone(activeMatch);
  let expired = 0;
  const methods = {
    getBattleMatch: async (id, signal) => { calls.push(["match", id, signal]); return clone(match); },
    getBattleProblem: async id => { calls.push(["problem", id]); return clone(problem); },
    getBattleRating: async () => ({ points: 1000, wins: 0, losses: 0, draws: 0 }),
    createBattleInvite: async () => ({ matchId: "m1", inviteCode: "INVITE_1", expiresInSeconds: 1800 }),
    joinBattleInvite: async code => { calls.push(["join", code]); return clone(match); },
    leaveRankedQueue: async () => { calls.push(["leave"]); return { status: "LEFT_QUEUE" }; },
    submitBattleCode: async (id, code) => { calls.push(["submit", id, code]); return { status: "WRONG_ANSWER", passedCases: 0, totalCases: 2, matchCompleted: false, winnerId: null }; },
    ...overrides,
  };
  const options = { userId: "u1", socket, api: methods, onExpired: () => expired++, pollMs: 60000,
    storage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) } };
  const session = new BattleSession(options);
  t.after(() => session.stop());
  return { session, socket, calls, saved, methods, options, expired: () => expired, setMatch: value => { match = clone(value); } };
}
test("start registers one listener per event, reconnect does not multiply listeners, stop removes all", async t => {
  const { session, socket } = setup(t);
  session.start(); session.start();
  socket.fire("connect"); socket.fire("connect");
  assert.equal(socket.events.get("battle:matched").size, 1);
  session.stop();
  assert.equal(socket.connected, false);
  for (const listeners of socket.events.values()) assert.equal(listeners.size, 0);
});
test("ranked queue join and REST cancellation use the shared protocol", async t => {
  const { session, socket, calls } = setup(t);
  session.start(); await tick();
  await session.joinRanked();
  assert.equal(session.getSnapshot().queue, "queued");
  assert.equal(socket.emitted.find(x => x.event === "ranked:join").payload.constructor, Object);
  await session.leaveRanked();
  assert.equal(session.getSnapshot().queue, "idle");
  assert.ok(calls.some(x => x[0] === "leave"));
});
test("disconnect while queued becomes uncertain, never a fabricated match or victory", async t => {
  const { session, socket } = setup(t);
  session.start(); await tick(); await session.joinRanked(); socket.disconnect();
  assert.equal(session.getSnapshot().queue, "uncertain");
  assert.equal(session.getSnapshot().match, null);
  assert.equal(session.getSnapshot().connection, "reconnecting");
});
test("lost queue acknowledgement cannot be retried as an idle queue", async t => {
  const { session, socket } = setup(t); session.start(); await tick(); socket.ackError = new Error("timeout");
  await session.joinRanked();
  assert.equal(session.getSnapshot().queue, "uncertain");
  assert.match(session.getSnapshot().error, /acknowledgement was lost/);
});
test("matching event fetches server match and public starter, not event winner data", async t => {
  const { session, socket } = setup(t); session.start(); await tick();
  socket.fire("battle:matched", { ...activeMatch, winnerId: "u2", status: "COMPLETED" }); await tick();
  assert.equal(session.getSnapshot().match.status, "ACTIVE");
  assert.equal(session.getSnapshot().match.winnerId, null);
  assert.equal(session.getSnapshot().code, problem.starterCode);
  assert.equal(session.getSnapshot().problem.functionName, "double");
});
test("duplicate matching event preserves typed code", async t => {
  const { session, socket } = setup(t); session.start(); await tick(); socket.fire("battle:matched", activeMatch); await tick();
  session.setCode("def double(n):\n    return n*2"); socket.fire("battle:matched", activeMatch); await tick();
  assert.match(session.getSnapshot().code, /return n\*2/);
});
test("matching events for another user are ignored", async t => {
  const { session, socket } = setup(t); session.start(); await tick();
  socket.fire("battle:matched", { ...activeMatch, players: [] }); await tick();
  assert.equal(session.getSnapshot().matchId, null);
});
test("friendly creator saves invite and waits, then sees REST-activated match by refresh", async t => {
  const { session, setMatch, saved } = setup(t); setMatch({ ...activeMatch, type: "FRIENDLY", status: "PENDING", players: activeMatch.players.slice(0, 1) });
  session.start(); await tick(); await session.createInvite();
  assert.equal(session.getSnapshot().match.status, "PENDING");
  assert.equal(session.getSnapshot().invite.inviteCode, "INVITE_1");
  assert.equal(JSON.parse(saved.get("worldofcodes-battle-v1:u1")).invite.inviteCode, "INVITE_1");
  setMatch({ ...activeMatch, type: "FRIENDLY" }); await session.refresh();
  assert.equal(session.getSnapshot().match.status, "ACTIVE"); assert.equal(session.getSnapshot().invite, null);
});
test("invite join trims code and reloads authoritative match", async t => {
  const { session, calls } = setup(t); session.start(); await tick(); await session.joinInvite("  FRIEND_2  ");
  assert.deepEqual(calls.find(x => x[0] === "join"), ["join", "FRIEND_2"]);
  assert.equal(session.getSnapshot().match.id, "m1");
});
for (const [code, message] of [["CANNOT_JOIN_OWN_INVITE", /own invitation/], ["INVITE_NOT_FOUND", /expired/], ["INVITE_ALREADY_USED", /already been used/], ["MATCH_FULL", /two players/]]) {
  test(`friendly ${code} remains actionable and does not create a match`, async t => {
    const { session } = setup(t, { joinBattleInvite: async () => { throw new ApiError(409, code, "backend"); } }); session.start(); await tick(); await session.joinInvite("CODE");
    assert.match(session.getSnapshot().error, message); assert.equal(session.getSnapshot().match, null); assert.equal(session.getSnapshot().busy, null);
  });
}
test("reload uses account-scoped saved reference and re-fetches, never saved winner/rating", async t => {
  const { session, saved, calls, socket } = setup(t);
  saved.set("worldofcodes-battle-v1:u1", JSON.stringify({ matchId: "m1", winnerId: "u2" }));
  session.start(); await tick();
  assert.equal(session.getSnapshot().match.winnerId, null);
  assert.ok(calls.some(x => x[0] === "match" && x[1] === "m1"));
  socket.disconnect(); socket.connect(); await tick();
  assert.ok(socket.emitted.filter(x => x.event === "match:watch").length >= 2);
});
test("a second account never restores the first account reference", async t => {
  const { session, saved } = setup(t); saved.set("worldofcodes-battle-v1:u2", JSON.stringify({ matchId: "private" }));
  session.start(); await tick(); assert.equal(session.getSnapshot().matchId, null);
});
test("submit sends full Python function and client does not settle winner or rating", async t => {
  const { session, socket, calls } = setup(t); session.start(); await tick(); socket.fire("battle:matched", activeMatch); await tick();
  const code = "def double(n):\n    return n*2\n"; session.setCode(code); await session.submit();
  assert.deepEqual(calls.find(x => x[0] === "submit"), ["submit", "m1", code]);
  assert.equal(session.getSnapshot().verdict.status, "WRONG_ANSWER"); assert.equal(session.getSnapshot().match.winnerId, null); assert.equal(session.getSnapshot().rating.points, 1000);
});
test("duplicate in-flight submit is suppressed", async t => {
  let resolve; let count = 0;
  const { session, socket } = setup(t, { submitBattleCode: () => { count++; return new Promise(done => resolve = done); } });
  session.start(); await tick(); socket.fire("battle:matched", activeMatch); await tick();
  const first = session.submit(); await session.submit(); assert.equal(count, 1); assert.equal(session.getSnapshot().busy, "submit");
  resolve({ status: "WRONG_ANSWER", passedCases: 0, totalCases: 2 }); await first; assert.equal(session.getSnapshot().busy, null);
});
for (const [code, status, pattern] of [["JUDGE_UNAVAILABLE", 503, /No win or rating change/], ["RATE_LIMITED", 429, /Wait a moment/], ["ACTIVE_MATCH_NOT_FOUND", 404, /no longer active/], ["NETWORK_ERROR", 0, /Network down/]]) {
  test(`${code} does not fabricate accepted verdict`, async t => {
    const { session, socket } = setup(t, { submitBattleCode: async () => { throw new ApiError(status, code, "Network down"); } });
    session.start(); await tick(); socket.fire("battle:matched", activeMatch); await tick(); await session.submit();
    assert.match(session.getSnapshot().error, pattern); assert.equal(session.getSnapshot().verdict, null); assert.equal(session.getSnapshot().match.winnerId, null);
  });
}
test("settled server snapshot supplies both result and rating deltas", async t => {
  const { session, socket, setMatch } = setup(t); session.start(); await tick(); socket.fire("battle:matched", activeMatch); await tick();
  setMatch({ ...activeMatch, status: "COMPLETED", winnerId: "u2", players: activeMatch.players.map(p => ({ ...p, ratingDelta: p.userId === "u2" ? 13 : -13 })) });
  socket.fire("battle:completed", { matchId: "m1", winnerId: "u1" }); await tick();
  assert.equal(session.getSnapshot().match.winnerId, "u2"); assert.equal(session.getSnapshot().match.players[0].ratingDelta, -13);
  session.clearMatch(); assert.equal(session.getSnapshot().matchId, null);
});
test("expired REST session aborts polling, disconnects, and requests auth restoration", async t => {
  const { session, socket, expired } = setup(t, { getBattleRating: async () => { throw new ApiError(401, "UNAUTHORIZED", "expired"); } });
  session.start(); await tick(); assert.equal(expired(), 1); assert.equal(socket.connected, false); assert.match(session.getSnapshot().error, /session has expired/);
});
test("stop aborts in-flight requests and late response cannot update the state", async t => {
  let finish; let signal;
  const { session, saved } = setup(t, { getBattleMatch: (_id, s) => { signal = s; return new Promise(resolve => finish = resolve); } });
  saved.set("worldofcodes-battle-v1:u1", JSON.stringify({ matchId: "m1" })); session.start(); await tick();
  session.stop(); assert.equal(signal.aborted, true); finish(activeMatch); await tick(); assert.equal(session.getSnapshot().match, null);
});
test("error mapping distinguishes judge outages from runtime verdicts", () => {
  assert.match(battleErrorMessage(new ApiError(503, "JUDGE_UNAVAILABLE", "fail")), /No win/);
  assert.equal(battleErrorMessage(new Error("offline")), "offline");
});
