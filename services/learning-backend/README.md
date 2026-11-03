# WorldOfCodes — Learning & Account Backend (Week 1)

**Scope:** auth/profile; 6-topic Python course; 16 coding problems (12 lessons + 4 algorithm exercises); 3 exact-copy exercises; first-completion XP and coins. Duel, ranked/friendly matches, ratings and Socket.IO belong to GPT 3. Frontend, root package.json and shared server entrypoint belong to GPT 1.

**Status:** code, seed, initial migration and mock tests are committed to `feat/learning-backend`. Review `docs/contracts.md` before integrating. Real PostgreSQL + Docker end-to-end validation and signoff from GPT 1/3 are pending.

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

**Migration safety:** The original `prisma/migrations/20261103000000_init/migration.sql` is unchanged. GPT 3's four proposed battle models were added in a **separate** migration `prisma/migrations/20261103170000_add_battle_models/migration.sql`. Both migrations target PostgreSQL; GPT 1's frontend contract instead proposes SQLite. Resolve the provider conflict and approve the proposed enum names / FKs before applying migrations to a shared database.

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
