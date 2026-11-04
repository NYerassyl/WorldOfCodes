# Shared server integration (GPT 1)

Status: the shared entrypoint is implemented on `integration/all`, merging GPT 1's
Battle runtime with GPT 4's server protections. Wiring tests and a live smoke start
pass; no database migration has been executed and nothing is deployed.

## 1. Server integration

The shared entrypoint lives at `server/` and is owned by GPT 1:

- `server/app.js` — `createApp()` (production/test), `buildApp()` (wiring) and
  `startServer()` (HTTP + Socket.IO).
- `server/index.js` — the single production entrypoint (`npm start`).
- `server/config.js` — ports, CORS allowlist, body limit, rate limits, judge queue.
- `server/judge-queue.js` — bounded in-process judge queue.
- `server/socket-auth.js` — reusable session/origin checks for socket tests.
- `server/prisma.js` — resolves the Prisma client generated from the learning
  service schema, so learning and battle code use one client.
- `server/app.test.js`, `tests/server.test.mjs` — wiring tests (`npm test`).

All routers are mounted exactly once under `/api`:

```text
/api/health  auth, learning, problems, copy, battle
```

The battle router comes from
`services/learning-backend/src/battle/index.js`; its REST paths start with
`/battle/...`. Socket.IO is attached to the same `http.createServer(app)` instance.
Unmatched `/api` routes return `{error:{code:"NOT_FOUND"}}`, and the shared
`errorMiddleware` stays last. JSON bodies are limited by `REQUEST_BODY_LIMIT`
(32 KB by default). When `frontend/dist` exists it is served with an SPA fallback.

### Protections

- Login/register are rate limited by `AUTH_RATE_LIMIT` per `AUTH_WINDOW_MS`.
- Learning, copy and battle submissions share `SUBMISSION_RATE_LIMIT` per
  `SUBMISSION_WINDOW_MS`; socket submissions also keep the per-match cooldown.
- The CORS allowlist applies to REST (including `DELETE`) and rejects unknown
  origins with 403. WebSocket handshakes are checked against the same allowlist;
  Socket.IO never reflects arbitrary origins.
- One Express app, one HTTP server, one Prisma client, one `MatchmakingQueue` and
  one bounded judge queue serve both REST and Socket.IO.

### Shared judge queue

`startServer()` builds one `createJudgeQueue(judgePython, {concurrency,
maxQueued})` and passes it to both `createProblemsRouter()` and
`createBattleRouter()`/`attachBattleSocket()`. REST and realtime submissions
therefore share `JUDGE_CONCURRENCY` slots; overflow returns `JUDGE_BUSY` (503).
Hidden tests never leave the server.

### Shared matchmaking and notifications

`startServer()` creates one `MatchmakingQueue` and one `createBattleNotifier()`.
The queue is passed to both `createBattleRouter()` and `attachBattleSocket()`;
the notifier forwards REST match events to Socket.IO rooms, so a player queued
over REST also receives the realtime `battle:matched` update. `buildApp()` still
accepts an injected queue so wiring tests can assert both transports share it.

### Socket.IO authentication

Socket clients send `auth: { token }` in the handshake. The adapter hashes the
token with the same helper as HTTP sessions and rejects missing, expired or
revoked sessions. Protected events revalidate the session and verify the socket
identity, so logout revokes an already-connected socket. Client-supplied user
IDs are never trusted. Origin checks run in `allowRequest` against the same
`CORS_ORIGINS` allowlist for polling and WebSocket upgrades.

## 2. Socket.IO dependency

- The root `package.json` declares `socket.io` 4.x.
- GPT 2 added `socket.io` 4.x to `services/learning-backend/package.json` in
  `ea2bd0c`, so the standalone service can also run Socket.IO.
- The battle Prisma models are present in
  `services/learning-backend/prisma/schema.prisma`: `Match`, `MatchPlayer`,
  `Rating`, `FriendBattle`, with the approved enums.

## 3. Shared database and migrations

- The shared database is **PostgreSQL + Prisma**, as recorded in
  `docs/integration-decisions.md`. The earlier SQLite proposal is superseded.
- Migrations remain in `services/learning-backend/prisma/migrations` and are
  untouched by this integration:
  `20261103000000_init`, `20261103170000_add_battle_models`,
  `20261103220000_match_status_type_index`, `20261103230000_problem_starter_code`.
- The schema validates with `prisma validate`. No migration, reset or seed has
  been executed here, and no database was provisioned.
- Apply migrations only after review, against an isolated test database first.
  Never reset a shared database.

## Run locally

```bash
npm ci                     # workspaces install + prisma generate
npm run db:validate
DATABASE_URL=... npm start # defaults to 127.0.0.1:4001
```

Optional environment (see `.env.example`):

- `PORT` — defaults to `4001`.
- `HOST` — defaults to `127.0.0.1`.
- `CORS_ORIGINS` — comma-separated allowlist for a split-origin deployment.
- `TRUST_PROXY_HOPS`, `REQUEST_BODY_LIMIT`, `AUTH_*`, `SUBMISSION_*`,
  `JUDGE_CONCURRENCY`, `JUDGE_QUEUE_LIMIT`.

## Remaining blockers

- No real PostgreSQL or Docker judge was available here, so auth, rewards and
  battle settlement were not exercised end to end.
- `MatchmakingQueue` and the judge queue are in-process and single-instance; do
  not scale horizontally without a shared queue.
- Judge execution still runs inside the submission request path; move it to an
  isolated worker before production traffic.
