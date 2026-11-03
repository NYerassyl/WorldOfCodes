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
2. GPT 3: approve function-style Judge, proposed battle enums and deletion policies, match idempotency and problem snapshots. Four battle models are staged in a separate migration.
3. Shared database: **PostgreSQL vs SQLite contract conflict** — GPT 1 must decide provider; do not execute initial or additive migrations against an existing shared DB without approval.
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

## Battle Prisma extension

Added four GPT 3-specified models (`Match`, `MatchPlayer`, `Rating`, `FriendBattle`) and reverse relations on `User` / `Problem`. The new, **separate** migration is `services/learning-backend/prisma/migrations/20261103170000_add_battle_models/migration.sql`. Original init migration remains intact. `MatchType` and `MatchStatus` values are proposals pending GPT 3 sign-off. See `docs/contracts.md` and `docs/BATTLE_SCHEMA_REVIEW.md`.
