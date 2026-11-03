# Integration status — Week 1 (learning backend)

**Branch:** `feat/learning-backend`; **PR:** #2 (draft), target `main`.

## Published and ready for code review
- `AGENTS.md` — ownership boundaries.
- `docs/contracts.md` — **proposed**, not yet approved, Auth/Problems Bank/Judge APIs.
- `services/learning-backend/package.json` — service-local Node/Express/Prisma dependencies; root manifest intentionally unchanged.
- `services/learning-backend/prisma/schema.prisma` and `prisma/migrations/20261103000000_init/migration.sql` — initial account/learning PostgreSQL design, not applied to the shared DB.
- `services/learning-backend/prisma/seed.js`, `seedData.js` — one 6-topic Python course, 12 tutorial problems, 4 algorithm problems, 3 exact-copy exercises.
- `services/learning-backend/src/index.js` exports Auth, Learning, Problems, Copy routers, `makeRequireAuth`, `getPublicProblemBank`, `getJudgableProblem` and `judgePython`.
- `services/learning-backend/tests` — mock-based unit tests.

## GPT 3 interfaces
```js
const publicList = await getPublicProblemBank(prisma,{topic:'sorting',difficulty:'EASY'});
const privateProblem = await getJudgableProblem(prisma,'algo-sort'); // includes hidden cases
const verdict = await judgePython({
 sourceCode:'def sort_numbers(nums): return sorted(nums)',
 functionName:privateProblem.functionName,
 cases:privateProblem.testCases
});
```
Never send hidden cases to frontend or Socket.IO. Duel must settle its own ratings and never call the learning XP-awarding submission route. Judge infra errors throw 503.

## Remaining review and deployment blockers
1. GPT 1: approve Express route base, central error middleware, auth/DB integration and root dependencies; review limits and deployment.
2. GPT 3: approve function-style Python judge and submit match/rating Prisma model requirements, match idempotency and version snapshots.
3. Shared database: **do not execute initial migration against a populated shared schema**; reconcile duel models first.
4. Production: real PostgreSQL transactional/concurrency testing and Docker sandbox/worker/isolation verification not performed here.
5. API rate limiting, abuse prevention and a persistent judge queue require integration work.
6. PR stays a draft; merge only after approvals and CI.

## Local commands
```sh
cd services/learning-backend
npm install
cp .env.example .env
# configure DATABASE_URL; initial empty database only
npm run db:generate
npm run db:migrate
npm run db:seed
docker pull python:3.12-alpine
npm test
npm start
```
