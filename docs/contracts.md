# WorldOfCodes — Week 1 integration contract DRAFT

**Status: proposed for GPT 1 and GPT 3 review; not yet accepted by both agents.** Concrete interfaces below match the learning-backend implementation in this branch. Changes to external contracts require coordinated review.

## Shared stack boundary
- Learning module: Node.js >=20, Express 4, Prisma 6/PostgreSQL, Python function judge via Docker.
- Root `package.json`, lockfile, shared server entrypoint are owned by GPT 1. The working dependency manifest is `services/learning-backend/package.json`; it is not an agreed root manifest.
- Learning Prisma schema: `services/learning-backend/prisma/schema.prisma`. GPT 3 must propose additional match/rating models **before a shared schema migration is merged**.

## Authentication and account interface (GPT 2 → GPT 1 / GPT 3)
- Middleware factory: `makeRequireAuth(prisma)` from `services/learning-backend/src/index.js`; on success writes `req.auth = { userId, sessionId, user }`.
- Authentication: `Authorization: Bearer <opaqueToken>`. Stored token is SHA-256 hash with expiry/revocation. Never trust `userId` sent by client.
- Error JSON: `{ "error": { "code": "...", "message": "..." } }`.
- Routes mounted under `/api`:
  - `POST /auth/register` {email,password,nickname} → 201 {token,user}
  - `POST /auth/login` {email,password} → 200 {token,user}
  - `POST /auth/logout` (auth) → 204
  - `GET /users/me`, `PATCH /users/me` {nickname?,avatarUrl?} (auth)
  - `GET /users/:nickname` (public; never returns email/password/session/coins).
- First distinct normalized nickname change free; later changes blocked with `402 NICKNAME_CHANGE_PAYMENT_REQUIRED`. No payment integration.
- XP/coins belong to learning only; do not treat `User.xp` as duel rating. Proposed level formula `floor(xp / 100) + 1` requires product signoff.

## Problems Bank (GPT 2 → GPT 3)
```js
import { getPublicProblemBank, getJudgableProblem } from './services/learning-backend/src/index.js';
const publicList = await getPublicProblemBank(prisma, { topic: 'sorting', difficulty: 'MEDIUM' });
const problem = await getJudgableProblem(prisma, problemId); // server only!
```
- `getPublicProblemBank(prisma, {topic?, difficulty?})` returns published problems with public **sample** cases only, sorted by difficulty and id. DB difficulty: `EASY | MEDIUM | HARD`.
- `getJudgableProblem(prisma, problemId)` returns `{ id, language, topicSlug, difficulty, functionName, testCases }`; every test case has `argsJson` and `expectedJson` strings, including **hidden** tests. This object is strictly server-only, NEVER emit to frontend/Socket.IO.
- Public API: `GET /api/problems?topic=sorting&difficulty=MEDIUM`, `GET /api/problems/:id`. Submission: `POST /api/problems/:id/submit` {code}. **Duel must not use submission endpoint**, because it changes learning XP.
- Stable problem IDs may be persisted in match records. GPT 3 should decide whether to snapshot problem/test version at match start; discuss before introducing mutable content.

## Judge interface (GPT 2 → GPT 3)
```js
import { judgePython } from './services/learning-backend/src/index.js';
const verdict = await judgePython({
  sourceCode: 'def solve(nums): return sorted(nums)',
  functionName: 'solve',
  cases: [{ argsJson: '[[3,1,2]]', expectedJson: '[1,2,3]' }]
});
```
- Contract: Python function `def functionName(*args)` that returns JSON-serializable output. This is **not stdin/stdout judging**.
- Result: `{ status: 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT', passedCases: number, totalCases: number }`.
- On Docker/image/infrastructure failure **throws** `AppError` 503 `JUDGE_UNAVAILABLE` (no match victory and no learning rewards).
- The judge runs code in an isolated Docker process, never `eval` inside the Node process. Production deployment must isolate Docker in a separate worker; review resource/time limits and concurrency.
- Duel service owns authentication, match-state locking, results, rating settlement and idempotency. Do not call learning reward services for duels.

## Learning / copy APIs (GPT 2 → GPT 1)
- `GET /api/learning/courses` and `GET /api/learning/lessons/:id`: public.
- `POST /api/learning/lessons/:id/start` and `GET /api/learning/progress`: authenticated.
- `GET /api/problems/my-submissions`: authenticated.
- `GET /api/copy-exercises`, `GET /api/copy-exercises/:id`: public.
- `POST /api/copy-exercises/:id/submit` {code} and `GET /api/copy-exercises/progress`: authenticated.
- Lessons complete only on successful code submissions; rewards are once per problem. Code-copy success has independent completion and reward ledger.
- Progress and rewards use transactions + unique DB constraints for replay protection.

## Prisma models owned by GPT 2
`User`, `AuthSession`, `Course`, `Topic`, `Lesson`, `Problem`, `TestCase`, `Submission`, `ProblemCompletion`, `LessonProgress`, `CopyExercise`, `CopyAttempt`, `CopyCompletion`, `RewardLedger`. GPT 3's match and ranking models are **not yet included**; propose relationships and unique constraints first.

## Open approvals / blockers
1. GPT 1: global route prefix, auth token handling, central error middleware, root dependencies and DB deployment, XP level rules.
2. GPT 3: Python-function judge shape, queue/concurrency/fairness, match snapshotting, match/rating Prisma models.
3. Infrastructure: Docker runtime with pre-pulled trusted Python image, PostgreSQL migration/seed, production isolation and rate limits.
4. No real duel endpoints, payment or AI integration are committed by GPT 2.
