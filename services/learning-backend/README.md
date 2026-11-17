# WorldOfCodes — Learning & Account Backend (Week 1)

**Scope:** auth/profile; 6-topic Python course; 16 coding problems (12 lessons + 4 algorithm exercises); 3 exact-copy exercises; first-completion XP and coins. Duel, ranked/friendly matches, ratings and Socket.IO belong to GPT 3. Frontend, root package.json and shared server entrypoint belong to GPT 1.

**Status:** code, seed, migrations and mock tests are committed to `feat/learning-backend`. GPT 1 confirmed PostgreSQL + Prisma, Express `/api`, Bearer auth, Python-first grading and the level formula. Real PostgreSQL + Docker end-to-end integration tests, schema migration approvals and Battle runtime verification are still pending.

## Local setup (Node >=20, PostgreSQL, Docker)

```sh
cd services/learning-backend
npm install
cp .env.example .env
# Edit DATABASE_URL and PORT in .env
npm run db:generate
npm run db:migrate
npm run db:seed
docker pull python:3.12-alpine
npm test
npm start
```

**GPT 3 confirmation:** Battle enums accepted; Ranked starts ACTIVE, friendly invite PENDING then ACTIVE on second join, settled state COMPLETED. Rating starts at 1000 with classic Elo K=32, no beginner protection; friendly is unranked. Invite expiry 30 minutes; only participants submit; spectators are read-only. Match `[status, type]` index is included in a new follow-up migration `20261103220000_match_status_type_index` (both previous migrations unchanged). Judge outages never produce a winner. GPT 3 owns match lifecycle, transactional conditional status updates and Elo settlement.

**Migration safety:** The original `prisma/migrations/20261103000000_init/migration.sql` is unchanged. GPT 3's four proposed battle models were added in a **separate** migration `prisma/migrations/20261103170000_add_battle_models/migration.sql`. These migrations target PostgreSQL, which GPT 1 explicitly confirmed (superseding the frontend's earlier SQLite draft). A fourth additive migration `20261103230000_problem_starter_code` adds `starterCode`; existing migrations remain untouched. Review the complete shared schema and run migrations against an isolated test database before any shared environment.

Docker is required for grading: no Docker/image → HTTP 503 `JUDGE_UNAVAILABLE`, no fictitious Accepted verdict or rewards. The Docker daemon must not be exposed to users. Production code execution needs a dedicated isolated worker, concurrency limits and ops review.

## Mounting in shared Express server (GPT 1 only)
```js
import { createAuthRouter, makeRequireAuth, createLearningRouter, createProblemsRouter, createCopyRouter } from './services/learning-backend/src/index.js';
import { errorMiddleware } from './services/learning-backend/src/lib/errors.js';
const auth = makeRequireAuth(prisma);
app.use('/api', createAuthRouter(prisma));
app.use('/api', createLearningRouter(prisma, auth));
app.use('/api', createProblemsRouter(prisma, auth));
app.use('/api', createCopyRouter(prisma, auth));
app.use(errorMiddleware);
```

The optional standalone `npm start` listens on PORT (default 4001). Do not modify the root entrypoint without GPT 1 approval.

## HTTP example
```sh
curl -s http://localhost:4001/api/learning/courses
curl -s 'http://localhost:4001/api/problems?topic=sorting&difficulty=EASY'
curl -s -X POST http://localhost:4001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"strong-pass-123","nickname":"Alice123"}'
curl -s -X POST http://localhost:4001/api/problems/py-double/submit \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{"code":"def double(n):\n    return n * 2"}'
```
Do not supply XP, coins, or completion flags from the client. The server derives rewards from persisted problem or copy-exercise definitions.

## GPT 3 imports (server only)
```js
import { getPublicProblemBank, getJudgableProblem, judgePython } from './services/learning-backend/src/index.js';
const bank = await getPublicProblemBank(prisma, { topic: 'sorting', difficulty: 'EASY' });
const p = await getJudgableProblem(prisma, 'algo-sort'); // includes hidden cases; never return to clients
const verdict = await judgePython({ sourceCode:'def sort_numbers(nums): return sorted(nums)', functionName:p.functionName, cases:p.testCases });
```

The judge accepts **Python functions with JSON-serializable arguments and return values**, not stdin/stdout. Duel rating and rewards must never use the learning submission endpoint. Any 503 judge failure must abort settlement.

## Tests and limitations
`npm test` runs mock-based tests for password hashing, sessions, private profile data, nickname payment gate, seed structure, false/duplicate submissions, account isolation and exact copy. Previous independent prototype passed 20/20 local tests; do **not** treat that result as CI validation of this GitHub commit. PostgreSQL migrations/seed and Docker-based judging have **not** been verified end-to-end in this environment. Concurrent reward locking and runtime isolation require staging tests and review.

See `../../docs/contracts.md` (proposed integration contract), `../../docs/INTEGRATION_STATUS.md` and `../../AGENTS.md`.

## GPT 1 Python editor contract

`GET /api/problems/:id` returns `{problem:{id,title,statement,language,topicSlug,difficulty,functionName,starterCode,examples,...}}`. The problem list uses `{problems:[...]}` and lesson detail includes `problems` with `functionName` and `starterCode`. Each seeded Python problem has an explicit function signature and named parameters, for example:

```json
{"problem":{"id":"py-area","functionName":"rectangle_area","starterCode":"def rectangle_area(width, height):\n    pass\n"}}
```

The editor should submit the **complete Python function source** via `POST /api/problems/:id/submit` with `{"code":"def rectangle_area(width, height):\n    return width * height"}`, not stdin/stdout. The judge calls the function with server-side hidden tests. Other frontend languages must not grant server-verified XP, coins or rating. Apply the reviewed `20261103230000_problem_starter_code` migration and run `npm run db:seed` to backfill seeded problem templates.

## Socket.IO and npm workspaces
Battle hardening uses the Socket.IO 4 runtime dependency now declared in this service manifest. GPT 1's shared server/HTTP wiring and shared `MatchmakingQueue` are described in `docs/DEPENDENCY_HANDOFF.md`. GPT 1's root npm workspace manages its own authoritative root `package-lock.json`. Do not create a second service lockfile; GPT 1 must regenerate the root workspace lock after incorporating this manifest change.

## Real integration verification workflow
The `.github/workflows/learning-backend-validation.yml` job `postgresql-docker-integration` runs a separate **ephemeral PostgreSQL 16 service** with database `worldofcodes_integration_test`, validates/generates Prisma Client, executes all four migrations **twice** (second run must be a no-op), seeds **twice** (unique counts checked), and pulls `python:3.12-alpine` to run real function-style Docker judge tests. The integration test refuses to connect unless the DB URL points to local `worldofcodes_integration_test`. It checks token auth/revocation/expiry, HTTP privacy, real hidden tests, concurrent reward idempotency, copy, snapshot-independent rating/XP separation and Docker timeout/unavailable handling. It does not mutate shared or production databases, and is separate from the `npm test` mock suite.

Local opt-in command (only after you have provisioned a disposable PostgreSQL database and Docker image):

```sh
# Working directory: services/learning-backend
# DATABASE_URL must target localhost/worldofcodes_integration_test (never production)
npm run db:generate
npm run db:migrate
npm run db:migrate
npm run db:seed
npm run db:seed
docker pull python:3.12-alpine
npm run test:integration
```

This workflow verifies learning/account and schema boundaries, **not a deployed combined GPT 3 Battle socket**. GPT 3 owns its actual battle event and rating settlement tests. Production readiness still requires GPT 1's shared app, real worker isolation and review.
