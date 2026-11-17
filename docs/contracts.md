# WorldOfCodes — Week 1 integration contract DRAFT

**Status:** GPT 1 has confirmed PostgreSQL, Express, `/api`, Bearer auth, route shapes and the XP level formula; GPT 3 confirmed Battle enums, Judge API and match lifecycle. PostgreSQL + Prisma is the shared provider and the earlier SQLite proposal is superseded. Integration, production deployment, schema approval, battle sign-off and real integration testing still require review before merge or migration. See [integration-decisions.md](integration-decisions.md) for GPT 1 decisions and the accepted route shapes. Do not scaffold conflicting stacks independently.

Shared stack decision: React + TypeScript, Node.js + Express, Socket.IO, PostgreSQL + Prisma.

## Shared rules

- Learning XP, coins and competitive rating are separate values.
- Server verifies progress, rewards and match results.
- Rewards and rating updates are idempotent and transactional.
- Friendly matches never change rating.
- Week one supports solo 1v1 only.
- A working code judge must isolate submissions and enforce resource limits.
- No guilds, team battles, AI subscriptions, payments or world editor this week.

## Shared stack boundary
- Learning module: Node.js >=20, Express 4, Prisma 6/PostgreSQL, Python function judge via Docker.
- Root `package.json`, lockfile and shared server entrypoint are owned by GPT 1, who confirmed Node.js + Express, REST prefix `/api` mounted once, PostgreSQL + Prisma, CORS allowlist, auth/submission rate limits, body limits and central error handler. The service-local manifest is `services/learning-backend/package.json`. Production DB credentials remain server-side.
- Learning Prisma schema: `services/learning-backend/prisma/schema.prisma`. GPT 3 provided the four battle model shapes; GPT 2 has prepared their relationships and a separate additive PostgreSQL migration. GPT 3 approved enum values and Judge interface; GPT 1 confirmed PostgreSQL as the shared DB provider. GPT 1 will own connection wiring, CORS, limits, server mounting and integration testing.

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
- XP/coins belong to learning only; do not treat `User.xp` as duel rating. GPT 1 approved `level = floor(xp / 100) + 1` for Week 1; frontend displays the server-provided level.

## Problems Bank (GPT 2 → GPT 3)
```js
import { getPublicProblemBank, getJudgableProblem } from './services/learning-backend/src/index.js';
const publicList = await getPublicProblemBank(prisma, { topic: 'sorting', difficulty: 'MEDIUM' });
const problem = await getJudgableProblem(prisma, problemId); // server only!
```
- `getPublicProblemBank(prisma, {topic?, difficulty?})` returns published problems with public **sample** cases only, sorted by difficulty and id. DB difficulty: `EASY | MEDIUM | HARD`. Public problem objects now contain `starterCode` (complete Python `def functionName(argumentNames):\n    pass\n` template).
- `getJudgableProblem(prisma, problemId)` returns `{ id, language, topicSlug, difficulty, functionName, testCases }`; every test case has `argsJson` and `expectedJson` strings, including **hidden** tests. This object is strictly server-only, NEVER emit to frontend/Socket.IO.
- Public API: `GET /api/problems?topic=sorting&difficulty=MEDIUM` → `{problems:[...]}`, `GET /api/problems/:id` → `{problem:{...}}`. Both return `starterCode` and `functionName`. `GET /api/learning/lessons/:id` also supplies those two fields for each exercise. Submission: `POST /api/problems/:id/submit` `{code}` → `{submissionId,status,passedCases,totalCases,rewarded,earnedXp,earnedCoins}`. **Duel must not use the learning submission endpoint**, because it changes learning XP.
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

**Database provider resolved:** GPT 1 explicitly confirmed **PostgreSQL + Prisma**, superseding the older SQLite proposal on the frontend branch. The migrations remain PostgreSQL-only; applying them to an existing database still requires schema review and isolated integration testing. GPT 3 confirmed the enum values and Judge interfaces; actual Battle runtime code integration is still pending.

## GPT 1 confirmed integration contract (2026-11-03)

- **Provider:** PostgreSQL + Prisma; the earlier SQLite proposal on the frontend branch is **superseded** by GPT 1's explicit confirmation. GPT 2 owns shared Prisma models and migrations; GPT 1 owns DB wiring, environment, root configuration and review of migrations before applying.
- **Server:** Node.js + Express; mount all routers exactly once under `/api`. GPT 1 owns CORS origin allowlist, authentication/submission rate limits, request-body limits, central error middleware and production configuration. Existing development proxy to port 4001 is acceptable.
- **Authentication:** Bearer opaque session token; `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/users/me` and `/api/users/:nickname` shapes remain unchanged. Logout revokes server-side session. GPT 3 must validate Socket.IO auth against the same session state.
- **Learning:** Python is the **only Week-1 server-graded language**. Other frontend language labs are for practice and must not earn authoritative server XP, coins or duel rating. Our judge is function-return based, not stdin/stdout.
- **Editor:** the previously missing `starterCode` is now stored on `Problem` and exposed through problem-list/detail and lesson-detail reads; each of the 16 seeded problems contains an explicit Python signature and named arguments. For example `def rectangle_area(width, height):\n    pass\n`.
- **Rewards and progress:** server-authoritative, never import unverified local preview state; no XP for opening theory. GPT 1 approved `Math.floor(xp / 100) + 1` for frontend display.
- **Verification/ownership:** GPT 1 will run full integration tests against real PostgreSQL and Docker judge, including register/login/logout/session restore, authorization, learning progress, duplicated/concurrent submissions, and judge failures. The server database must never be reset as a shortcut. GPT 2 can validate schema and unit tests; these do **not** substitute for end-to-end checks.
- **Additive migration:** `20261103230000_problem_starter_code` adds the new `Problem.starterCode` field, defaulting to empty for pre-existing problems. Rerun `npm run db:seed` after approved migrations to populate all 16 published seeded problem templates. The original migrations remain unchanged.

## Still open with the integrator

- New-player protection thresholds and rating formula.
- Time limit, tie, disconnect and judge outage rules.

Session authentication, socket authentication, user/public profile schemas, problem/submission/judge result schemas, API route names and socket event names are now recorded in [battle contract](BATTLE_INTEGRATION.md) and the shared server.

## GPT 1 integration review

The stack and REST/auth decisions are accepted as recorded in
[integration-decisions.md](integration-decisions.md). Integration work is isolated on
feat/backend-integration and merged into integration/all. Main is not merged. Deployment
and Battle runtime sign-off remain separate from local learning integration verification.

## Canonical AuthSession lookup for GPT 3 and GPT 1

Export `resolveAuthSession(prisma, token, { includeUser?: boolean })` from `services/learning-backend/src/index.js`.

- Validates the opaque token syntax, hashes it using `hashSessionToken` (SHA-256), looks up `AuthSession`, and returns `null` if missing, expired or revoked.
- If `includeUser:false` (default), returns `{ userId, sessionId }`; if true, returns `{userId,sessionId,user}` from a single query (same shape used by `makeRequireAuth`).
- Database errors propagate; callers must reject/abort rather than authorize.
- **Socket.IO:** use the same helper at handshake **and before every protected event**, passing the raw opaque token from `socket.handshake.auth.token`, then verify the returned `userId` still matches the socket identity. Do not trust a supplied userId. GPT 3 owns the changes in its Socket.IO module; GPT 2 does not rewrite it.
- Logout changes `revokedAt` in PostgreSQL. An already connected socket must not retain access after revocation; revalidation is required.
