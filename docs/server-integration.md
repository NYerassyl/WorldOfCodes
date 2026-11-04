# Shared server integration (GPT 1)

Status: the shared entrypoint is implemented on `integration/all` and verified with
wiring tests and a live smoke start. No database migration has been executed and
nothing is deployed. This document is the GPT 1 answer to the three integration
items raised with the battle handoff.

## 1. Server integration

The shared entrypoint lives at `server/` and is owned by GPT 1:

- `server/app.js` — `buildApp()` and `startServer()`.
- `server/main.js` — the production entrypoint (`npm start`).
- `server/prisma.js` — resolves the Prisma client generated from the learning
  service schema, so learning and battle code use one client.
- `server/app.test.js` — wiring tests (`npm test`).

All routers are mounted exactly once under `/api`:

```text
/api  auth, learning, problems, copy, battle
```

The battle router comes from
`services/learning-backend/src/battle/index.js`; its REST paths start with
`/battle/...`. Socket.IO is attached to the same `http.createServer(app)` instance.
Unmatched `/api` routes return `{error:{code:"NOT_FOUND"}}`, and the shared
`errorMiddleware` stays last. JSON bodies are limited to 32 KB.

### Shared matchmaking queue

`buildApp()` creates one `MatchmakingQueue`, passes it to `createBattleRouter()`,
and `startServer()` passes the same instance to `attachBattleSocket()`. REST and
Socket.IO therefore share one in-memory queue. A test asserts that an injected
queue receives both the HTTP and Socket.IO operations.

### Socket.IO authentication

Socket clients send `auth: { token }` in the handshake. The adapter hashes the
token with the same helper as HTTP sessions and rejects missing, expired or
revoked sessions. Client-supplied user IDs are never trusted.

### CORS

- `CORS_ORIGINS` is a comma-separated allowlist. Empty means same-origin only.
- When empty, Socket.IO is configured with `origin: false`; it does not reflect
  arbitrary origins.
- With an allowlist, both REST and Socket.IO use the same origin list.
- The Vite dev proxy keeps local development same-origin.

## 2. Socket.IO dependency

- The shared entrypoint declares `socket.io` 4.x in the root `package.json`.
- `services/learning-backend/package.json` still does **not** declare `socket.io`.
  This is GPT 2's service manifest. It must add `socket.io` 4.x (and update the
  service lockfile) before the service's own `standalone.js` is expected to run
  Socket.IO. The shared entrypoint resolves the dependency from the root install.
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
  been executed, and no database was provisioned.
- Apply migrations only after review, against an isolated test database first.
  Never reset a shared database.

## Run locally

```bash
npm install
npm run db:generate        # delegates to the service package
DATABASE_URL=... npm start # defaults to 127.0.0.1:4001
```

Optional environment:

- `PORT` — defaults to `4001`.
- `HOST` — defaults to `127.0.0.1`.
- `CORS_ORIGINS` — comma-separated allowlist for a split-origin deployment.

## Remaining blockers

- No real PostgreSQL or Docker judge was available here, so auth, rewards and
  battle settlement were not exercised end to end.
- Auth and submission rate limits are not implemented yet.
- `MatchmakingQueue` is in-memory and single-process; do not scale horizontally
  without a shared queue.
- Judge execution is synchronous inside the submission request; move it to an
  isolated worker before production traffic.
