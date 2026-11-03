# WorldOfCodes — Week 1 integration contract DRAFT

**Status: proposed for GPT 1 and GPT 3 review; not yet accepted by both agents.** Concrete interfaces below match the learning-backend implementation in this branch. Changes to external contracts require coordinated review.

## Shared stack boundary
- Learning module: Node.js >=20, Express 4, Prisma 6/PostgreSQL, Python function judge via Docker.
- Root `package.json`, lockfile, shared server entrypoint are owned by GPT 1. The working dependency manifest is `services/learning-backend/package.json`; it is not an agreed root manifest.
- Learning Prisma schema: `services/learning-backend/prisma/schema.prisma`. GPT 3 provided the four battle model shapes; GPT 2 has prepared their relationships and a separate additive PostgreSQL migration. GPT 3 has approved the enum values and Judge interface; the shared DB provider still requires GPT 1 approval.

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
`User`, `AuthSession`, `Course`, `Topic`, `Lesson`, `Problem`, `TestCase`, `Submission`, `ProblemCompletion`, `LessonProgress`, `CopyExercise`, `CopyAttempt`, `CopyCompletion`, `RewardLedger`, plus the proposed GPT 3 models `Match`, `MatchPlayer`, `Rating`, `FriendBattle`. GPT 3 owns battle logic.

## Open approvals / blockers
1. GPT 1: global route prefix, auth token handling, central error middleware, root dependencies and DB deployment, XP level rules.
2. GPT 3 confirmed function-style Python Judge, MatchType/MatchStatus enums, MatchPlayer fields, Elo K=32 and match lifecycle. Remaining review: FK deletion policies, match snapshots/locking and actual Battle runtime integration.
3. Infrastructure: Docker runtime with pre-pulled trusted Python image, PostgreSQL migration/seed, production isolation and rate limits.
4. No real duel endpoints, payment or AI integration are committed by GPT 2.

## Battle Prisma schema — GPT 3 approved types and lifecycle; integration review remains

Model design from GPT 3's supplied request, implemented in `services/learning-backend/prisma/schema.prisma`. The **additive PostgreSQL migration** `prisma/migrations/20261103170000_add_battle_models/migration.sql` follows the untouched `20261103000000_init`.

| Model | Primary/unique keys | Relationships and fields |
| --- | --- | --- |
| `Match` | `id String @id @default(uuid())` | Required `problemId → Problem.id`, optional `winnerId → User.id`, `type MatchType`, `status MatchStatus @default(PENDING)`, optional `startedAt/completedAt`, `players`, optional `friendBattle` |
| `MatchPlayer` | `@@id([matchId, userId])`, `@@unique([matchId, seat])` | Required refs to Match/User, `seat Int`, nullable `submittedAt`, `verdict SubmissionStatus?`, `ratingBefore/ratingDelta Int?` |
| `Rating` | `userId String @id` | User 1:1; `points Int @default(1000)`, `wins/losses/draws Int @default(0)`, `updatedAt @updatedAt` |
| `FriendBattle` | `id String @id @default(uuid())`, unique `matchId`, unique `inviteCode` | Required `matchId → Match.id`, `createdById → User.id`; required `expiresAt`, `createdAt @default(now())` |

**Enums approved by GPT 3 in the supplied integration reply (runtime code verification still pending):**
- `MatchType: RANKED | FRIENDLY`
- `MatchStatus: PENDING | ACTIVE | COMPLETED | CANCELLED | EXPIRED`
- `MatchPlayer.verdict` reuses nullable `SubmissionStatus: ACCEPTED | WRONG_ANSWER | RUNTIME_ERROR | TIME_LIMIT`. Judge infrastructure failure (503) must never be treated as a valid verdict.

**Foreign keys:** Match→Problem RESTRICT, Match→winner User SET NULL, MatchPlayer→Match CASCADE and →User RESTRICT, Rating→User CASCADE, FriendBattle→Match CASCADE and →creator User RESTRICT. Confirm these deletion policies with GPT 3.

**Service invariants not guaranteed by these FKs:** winner must be a MatchPlayer, FRIENDLY-only FriendBattle, seat range/1v1 capacity, invites expiration, only ranked matches update Rating, and idempotent/transactional settlement; GPT 3 must enforce these. MatchPlayer nullable rating fields allow no rating changes for FRIENDLY.

**GPT 3-confirmed battle rules (implementation owned by GPT 3):**
- **Lifecycle:** RANKED matches are created with `status: ACTIVE` explicitly (the schema's general default remains PENDING); friendly invitations are created with `status: PENDING`, transition to ACTIVE when the second participant joins, and settled matches transition to COMPLETED. CANCELLED and EXPIRED remain supported values.
- **Rating:** initial 1000, classic Elo with `K = 32` and no beginner protection in the MVP. Friendly battles never modify Rating. Completion and rating changes must occur in **one transaction**; a conditional status update must prevent duplicate settlement.
- **Invitation / permissions:** 30-minute expiry; exactly two participants after joining; only participants may submit; spectators cannot modify results. Duplicate accepted submissions must not settle twice. Judge infrastructure failure must not create a winner.
- **Indexes:** preserve `[type, status]`; add `[status, type]` for the requested match queries, and retain existing `[userId]` on MatchPlayer, `[expiresAt]` on FriendBattle, plus the specified unique constraints.
- **New migration policy:** initial `20261103000000_init` and existing `20261103170000_add_battle_models` remain unchanged. A follow-up migration adds the extra index.

**Stack conflict:** `feat/frontend/docs/contracts.md` proposes **Prisma + SQLite** while `feat/learning-backend` uses **Prisma + PostgreSQL**. These migration files are PostgreSQL-only. GPT 1 must choose the shared provider and approve a unified migration before applying it. GPT 3 confirmed the proposed enum values and declared interface compatibility in chat; an actual Battle branch/runtime comparison is still pending.
