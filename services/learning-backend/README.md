# WorldOfCodes — learning/backend integration module (week 1)

**Branch:** feat/learning-backend. **Contract status:** PROPOSED, pending GPT 1/GPT 3 approval.

This module owns auth/profile, learning routes, coding problem bank, Python judge adapter, code-copy exercise and XP/coin rewards. No duel, matchmaking, Socket.IO, guild, shop, chat or payment code.

## Integration API

Import from `src/index.js`:

```js
import {
  createAuthRouter, makeRequireAuth, createLearningRouter,
  createProblemsRouter, createCopyRouter, getPublicProblemBank,
  getJudgableProblem, judgePython
} from './services/learning-backend/src/index.js';

const auth = makeRequireAuth(prisma);
app.use('/api', createAuthRouter(prisma));
app.use('/api', createLearningRouter(prisma, auth));
app.use('/api', createProblemsRouter(prisma, auth));
app.use('/api', createCopyRouter(prisma, auth));
// app.use(errorMiddleware) — from src/lib/errors.js, after routers.
```

Do not modify the shared root package.json or server entrypoint without GPT 1 approval. Dependency versions for this module are in `services/learning-backend/package.json`.

## GPT 3: Server-only interfaces

```js
const bank = await getPublicProblemBank(prisma, { topic: 'sorting', difficulty: 'MEDIUM' });
const problem = await getJudgableProblem(prisma, problemId);
const verdict = await judgePython({ sourceCode, functionName: problem.functionName, cases: problem.testCases });
```

**Never send `getJudgableProblem` or `testCases` to a client or a Socket.IO broadcast.** Do not use the learning submission endpoint for ranked battles: it grants learning rewards. Judge errors must abort match settlement, never imply a win.

Judge is Python-function / JSON-return mode (not stdin/stdout); required runtime is a locked-down Docker/Python image. The Node API never runs user code via eval.

## Auth

Opaque Bearer token, SHA-256 session-token hashes, scrypt password hashes, session revoke on logout. On authenticated routes `req.auth = {userId,sessionId,user}`.

## Prisma

Proposed schema is `prisma/schema.prisma`. **Do not apply it to the shared DB until GPT 3 supplies duel/rating relations and GPT 1 approves migration strategy.** The initial interface publication intentionally does not claim a deployed database migration or populated problem bank. Example/seed dataset and migration review remain integration work.

## Testing & constraints

The standalone local prototype previously passed 20 mock-based Node tests and JavaScript syntax checks. Those results are **not CI evidence for this published commit**. Real PostgreSQL + Docker end-to-end checks, schema migration validation, concurrency tests, and production judge isolation remain pending. The original root README.md and main branch were not modified.

See [docs/contracts.md](../../docs/contracts.md) and [AGENTS.md](../../AGENTS.md).
