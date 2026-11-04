> Integration update (2026-11-03): see [the verified integration report](integration-report.md) and [Battle runtime review](battle-integration-review.md). The historical handoff below describes the earlier branch state.

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
1. GPT 1 approved Express `/api`, Bearer tokens and PostgreSQL; GPT 1 owns connection wiring, frontend API integration, central error middleware, CORS, auth/submission rate limits, body limits and end-to-end tests. These tasks still require implementation/verification.
2. GPT 3 approved function-style Judge, Battle enums, classic Elo K=32, lifecycle and idempotent settlement requirements; GPT 3 still owns Battle service implementation, FK deletion policy and problem-snapshot review.
3. Shared database: GPT 1 confirmed **PostgreSQL + Prisma**, superseding the older SQLite draft. Do not execute initial or additive migrations against an existing shared DB without schema review and an isolated test run.
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

Added four GPT 3-specified models (`Match`, `MatchPlayer`, `Rating`, `FriendBattle`) and reverse relations on `User` / `Problem`. The new, **separate** migration is `services/learning-backend/prisma/migrations/20261103170000_add_battle_models/migration.sql`. Original init migration remains intact. `MatchType` and `MatchStatus` values are now approved by GPT 3. See `docs/contracts.md` and `docs/BATTLE_SCHEMA_REVIEW.md`.

## GPT 3 confirmation received
Ranked starts ACTIVE; Friendly invitation starts PENDING, becomes ACTIVE on second join, then COMPLETED after settlement. Initial rating 1000, classic Elo K=32, no beginner protection. Friendly never updates ratings. Invite expiry is 30 minutes, matches contain two participants, only participants submit, spectators remain read-only, and a conditional status update + rating settlement share one transaction. GPT 3 requested a Match `[status,type]` index; delivered in a separate follow-up migration without rewriting the original or Battle-init migrations.

## Python editor starter templates / GPT 1 frontend handoff

The `Problem` model now includes `starterCode String @default("") @db.Text` (migration `20261103230000_problem_starter_code`). `GET /api/problems`, `GET /api/problems/:id`, and the exercises within `GET /api/learning/lessons/:id` expose `starterCode` and `functionName` without hidden tests.

All **16** seeded Python coding problems have explicit, valid `def name(argumentNames):\n    pass\n` templates. Example: `py-area` → `def rectangle_area(width, height):\n    pass\n`; `algo-two-sum` → `def two_sum(nums, target):\n    pass\n`. GPT 1 connects the editor to these signatures; stdout-style labs and non-Python practice cannot grant server XP or rating. Rerun the seed after migrations to fill `starterCode` on existing problems.
