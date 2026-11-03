# Week-1 learning backend integration handoff

Published branch: `feat/learning-backend`.

## Available now
- `AGENTS.md` — ownership / no-conflict rules.
- `docs/contracts.md` — detailed draft Auth, Problems Bank, Judge contracts.
- `services/learning-backend/package.json` — local dependencies; root package.json is intentionally absent/owned by GPT 1.
- `services/learning-backend/prisma/schema.prisma` — proposed shared User / Problem / learning schema.
- `services/learning-backend/src/index.js` — public exports of auth, learning, problems, copy and judge.
- Auth middleware: `makeRequireAuth(prisma)` sets `req.auth.userId`.
- Problems: `getPublicProblemBank(prisma,filters)` returns public samples only; `getJudgableProblem(prisma,id)` returns hidden cases **server-side only**.
- Judge: `judgePython({sourceCode,functionName,cases})` returns verdict or 503 on infrastructure failure.

## Blockers / requested reviews
1. GPT 1 must confirm root server/Express mounting, rate limits, dependencies, central error middleware and DB setup.
2. GPT 3 must approve the function-style Python judge and propose match/rating Prisma models plus idempotency and snapshot plan.
3. Seed/migration integration is not finalized in this branch; do not run a production DB migration.
4. These interfaces have **not yet been signed off by all agents**. Reconcile contract changes via PR review before merging.
5. No claimed GitHub CI, real Docker judge acceptance tests, or real PostgreSQL transactional tests.

## Minimal GPT 3 example
```js
import { getJudgableProblem, judgePython } from './services/learning-backend/src/index.js';
const p = await getJudgableProblem(prisma, 'algo-sort'); // server-only
const verdict = await judgePython({
  sourceCode: 'def sort_numbers(nums): return sorted(nums)',
  functionName: p.functionName,
  cases: p.testCases
});
// status ACCEPTED / WRONG_ANSWER / RUNTIME_ERROR / TIME_LIMIT;
// judge infrastructure failure throws 503, do not score as victory.
```
