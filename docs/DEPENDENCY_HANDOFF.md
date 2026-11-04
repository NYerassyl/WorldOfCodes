# Battle backend dependency and Prisma integration handoff

Updated on GPT 2 branch `feat/learning-backend` after reviewing GPT 3's `feat/battle-backend-hardening` and GPT 1's `feat/backend-integration`.

## 1. Provider and Prisma Client

**Confirmed shared provider: PostgreSQL + Prisma** (GPT 1 approved; SQLite draft superseded).

The canonical schema is `services/learning-backend/prisma/schema.prisma`. It already defines:

- `Match`: `MatchType RANKED|FRIENDLY`, `MatchStatus PENDING|ACTIVE|COMPLETED|CANCELLED|EXPIRED`
- `MatchPlayer`: PK `[matchId,userId]`, unique `[matchId,seat]`, index `[userId]`
- `Rating`: PK `userId`, `points @default(1000)`
- `FriendBattle`: unique `matchId` and `inviteCode`, index `expiresAt`
- Existing `User` / `Problem` relations; `Problem.starterCode` for GPT 1's editor.

The new `.github/workflows/learning-backend-validation.yml` validates and generates the actual Prisma Client, then asserts these model delegates exist. This is a build-time check, **not a live PostgreSQL integration test**.

## 2. Socket.IO 4 runtime dependency

Added `"socket.io": "^4.8.4"` to **`services/learning-backend/package.json`**, required by the dynamic import in `src/battle/socket.js`. GPT 3's source files remain owned by GPT 3 and should be merged from its branch, not duplicated in ours.

**Lockfile ownership / workspace integration:** GPT 1's `feat/backend-integration` has a root `package.json` with npm workspaces `frontend` and `services/learning-backend`, plus a **root `package-lock.json`**. That root lockfile is the authoritative one; no separate nested service lockfile is created. GPT 1 must regenerate the root lock after incorporating this service manifest change:

```sh
# Run in the root of GPT 1's integrated workspace branch:
npm install --package-lock-only --ignore-scripts --workspace=services/learning-backend
npm ci
npm run db:validate
npm run db:generate
```

Then commit root `package-lock.json` **on GPT 1's integration branch**, and run the integration test suite. Do not hand-edit dependency integrity hashes or create a conflicting nested lockfile. Until the root lockfile is regenerated, `npm ci` in the integrated workspace may fail or omit Socket.IO.

## 3. One shared queue and HTTP server (GPT 1 owner)

Read `docs/BATTLE_INTEGRATION.md` from GPT 3's hardening branch. Use **one** `MatchmakingQueue` instance and **one** Prisma Client for both Battle REST router and Socket.IO:

```js
import { createServer } from 'node:http';
import { createBattleRouter, MatchmakingQueue, attachBattleSocket }
  from './services/learning-backend/src/battle/index.js';

// Use GPT 1's existing app, prisma, and makeRequireAuth(prisma).
const auth = makeRequireAuth(prisma);
const queue = new MatchmakingQueue(prisma);
app.use('/api', createBattleRouter(prisma, auth, { queue }));
const httpServer = createServer(app);
const io = await attachBattleSocket(httpServer, prisma, {
  queue,
  cors: { origin: allowedOrigins, credentials: true }
});
httpServer.listen(port);
```

**Only a wiring sketch**; GPT 1 must adapt to existing server/app initialization, rate limiting, API 404, and centralized error handling. Mount Battle routes before API 404 middleware. Do **not** create a second HTTP server, queue or PrismaClient. The current GPT 1 `server/app.js` mounts learning routers and installs an API 404 catch-all; Battle routes must be mounted before that catch-all.

Authentication: Socket.IO handshake `auth:{token}`, verified against the existing hashed `AuthSession` record with expiry/revocation. Follow the same allowed origins and production TLS policy as REST.

## 4. Immutable migration history

Four existing ordered PostgreSQL migrations in GPT 2 branch:

1. `20261103000000_init`
2. `20261103170000_add_battle_models`
3. `20261103220000_match_status_type_index`
4. `20261103230000_problem_starter_code`

Do not edit earlier migration files. Apply to an **isolated PostgreSQL test DB** first, compare generated Prisma Client and actual data. No shared DB migration or reset authorized. GPT 1 owns connection and migration execution, GPT 2 owns schema edits, GPT 3 owns battle logic.

## 5. Provenance and limits

- GPT 3 hardening branch has a successful GitHub Actions run for its current head. It is not an end-to-end proof for the full combined stack.
- GPT 1's current `feat/backend-integration` root workspace lockfile predates the socket.io dependency. Regenerate it as described above.
- Production Socket.IO matchmaking queue is in-memory, single-process, per GPT 3; horizontal scaling requires a distributed queue.
- Isolated Docker judge runtime and PostgreSQL transactional/race tests still require the integration environment. Do not grant XP, coins or rating on judge failure.

## Dedicated GPT 2 isolated integration CI
A second GitHub Actions job in `learning-backend-validation.yml` executes the four PostgreSQL migrations twice, the seed twice, and exercises HTTP + real Docker Judge through `integration/pg-docker.integration.test.js` against an ephemeral `worldofcodes_integration_test` PostgreSQL service. It refuses other DB URL targets. It is not a replacement for GPT 1's combined frontend/Battle end-to-end checks.

## Latest verification evidence

GPT 2's `feat/learning-backend` CI on `50a809c41b0c59ad81f78f4fa5a1edbb87d975ab`: https://github.com/NYerassyl/WorldOfCodes/actions/runs/41780676514 — **39 backend tests passed** and **12 isolated PostgreSQL/Docker test results passed**, including migration redeploy, seed idempotency, ESM Socket.IO import, FK RESTRICT/CASCADE checks and session revocation. This validates GPT 2's component boundaries, not full combined GPT 3 Socket.IO runtime behavior.
