# GPT 2 backend verification & integration report

**Branch** `feat/learning-backend`, target: Draft PR #2; **database:** PostgreSQL + Prisma, explicitly agreed by GPT 1. GPT 3 owns Battle handlers. GPT 2 owns shared Prisma migrations and the Learning API.

## Models and constraints
- `User`, `AuthSession` (SHA-256 hashed tokens, expiry, revocation); `Course`, `Topic`, `Lesson`; `Problem`, `TestCase`, `Submission`, `ProblemCompletion`, `LessonProgress`; `CopyExercise`, `CopyAttempt`, `CopyCompletion`, `RewardLedger`.
- `Match`, `MatchPlayer`, `Rating`, `FriendBattle` with relations to User/Problem. `MatchType` RANKED|FRIENDLY, `MatchStatus` PENDING|ACTIVE|COMPLETED|CANCELLED|EXPIRED. Unique MatchPlayer (matchId,userId)/(matchId,seat), unique inviteCode/matchId. Rating points default 1000, separate from User.xp / User.coins.
- `User` and `Problem` have no competing duplicate models.

## Migration order — do NOT rewrite historical SQL
1. `20261103000000_init`
2. `20261103170000_add_battle_models`
3. `20261103220000_match_status_type_index`
4. `20261103230000_problem_starter_code`

Migration validation is designed for an **isolated** PostgreSQL database. Shared/production DB migrations require GPT 1's approval and must not be reset.

## API and interfaces
- `makeRequireAuth(prisma)` and `resolveAuthSession(prisma, token, {includeUser:false})` share the same database session verification. GPT 3 should revalidate on **every protected Socket.IO event**; sessions can be revoked after handshake.
- HTTP under `/api`: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET|PATCH /users/me`, `GET /users/:nickname`; `GET /learning/courses`, `GET /learning/lessons/:id`, `POST /learning/lessons/:id/start`, `GET /learning/progress`; `GET /problems`, `GET /problems/:id`, `POST /problems/:id/submit`, `GET /problems/my-submissions`; `GET /copy-exercises`, `GET /copy-exercises/:id`, `POST /copy-exercises/:id/submit`, `GET /copy-exercises/progress`.
- `getPublicProblemBank(prisma, filters)` exposes samples and starterCode only; `getJudgableProblem(prisma,id)` exposes all test cases **server-side only**.
- `judgePython({sourceCode,functionName,cases})` executes untrusted Python in a Docker container with no network, read-only rootfs, dropped capabilities, CPU/RAM/process limits, and hard timeout + container reaping. Returns ACCEPTED | WRONG_ANSWER | RUNTIME_ERROR | TIME_LIMIT. Infrastructure failure throws 503; no fake ACCEPTED.
- Learning rewards are first-completion-only, server-authoritative, serializable and recorded in transactions. Battle handlers must call Judge directly and modify `Rating` rather than Learning API.
- Seed: 1 Python course, 6 topics/lessons, 12 lesson problems, 4 algorithms, **16 starterCode templates**, 50 test cases, 3 exact-copy exercises.

## CI and limits
- `validate` job: Prisma validate/generate and mock regression suite.
- `postgresql-docker-integration`: ephemeral Postgres service, schema/client generation, 4 migrations deployed twice, seed twice, real HTTP/Judge and concurrency tests. **See GitHub Actions for status**; this report is updated after successful verification.
- GPT 3's Battle hardening CI separately passed its tests; GPT 1 must still join the Battle router and Socket.IO server with a single shared MatchmakingQueue, regenerate the authoritative root workspace lockfile, and run combined real Battle/auth tests.
- In-memory MatchmakingQueue is single-instance only; production concurrency/worker isolation, secrets and deployment are not tested here.

## Verified CI results — 2026-11-04

**Latest code commit:** `50a809c41b0c59ad81f78f4fa5a1edbb87d975ab`. GitHub Actions: https://github.com/NYerassyl/WorldOfCodes/actions/runs/41780676514

| Check | Observed result |
| --- | --- |
| Service package dependencies | `@prisma/client ^6.0.0`, `express ^4.21.2`, `socket.io ^4.8.4` |
| ESM dynamic import of `socket.io` | PASS; `Server` and `Socket` exports verified |
| Prisma validate | PASS on PostgreSQL schema |
| Prisma generate | PASS, Prisma Client **v6.19.3**; all required Battle model delegates present |
| Backend tests | **39 passed / 0 failed** |
| Isolated PostgreSQL 16 + real Docker Judge tests | **12 passed / 0 failed** (11 subtests + parent) |
| Migration deploy #1 | All four migrations applied in declared order |
| Migration deploy #2 | **No pending migrations to apply** |
| Seed runs | Two consecutive runs succeeded; verified one course, six lessons, sixteen problems, **50 test cases**, three copy exercises |
| Migration integrity | SHA-256 of four source migration files matched `_prisma_migrations` |
| Auth and session | Verified register/login/logout, SHA-256 hash, malformed/expired/revoked session rejection and profile privacy against real PostgreSQL |
| Hidden tests | All 16 problem public endpoints return **sample only**; private judge access returns additional hidden cases |
| Rewards | Simultaneous correct learning submissions and copy attempts awarded **once**; error verdicts and Judge 503 earned nothing |
| Docker Judge | Verified ACCEPTED, WRONG_ANSWER, RUNTIME_ERROR, TIME_LIMIT, forced container cleanup; missing Docker image produced 503 |
| PostgreSQL constraints | Verified MatchPlayer/User and Match/Problem **RESTRICT**; deleting Match cascades MatchPlayer and FriendBattle; deleting User cascades Rating |
| Learning XP and Battle rating | Distinct tables/columns; creating Rating/Match did not alter User.xp/User.coins |

GPT 3's newer hardening branch implements Socket.IO event-time revalidation; this GPT 2 report checks session revocation against PostgreSQL, not an end-to-end real websocket event flow on the consolidated server. This report verifies the shared lookup and session revocation against PostgreSQL, **not** live websocket submission/settlement in the combined Battle app. GPT 1 has generated the root workspace `package-lock.json` on `integration/all`; root `npm ci` was replayed successfully on pinned SHA `c907eab6`. GPT 1/GPT 4 must still run full Battle and frontend acceptance on the final combined commit.

**Security/deployment limitations:** Docker resource flags and cleanup were checked, but full hostile-code sandbox penetration testing, distributed judge workers, distributed matchmaking, production rate-limits, TLS/hosting and production secret provisioning remain outside this verification. No shared or production database was migrated or reset.

## Final CI confirmation for the same 2026-11-04 code

GitHub Actions run `41780676514` completed **successfully** on `50a809c41b0c59ad81f78f4fa5a1edbb87d975ab`: 39/39 backend unit/contract tests and 12/12 real isolated PostgreSQL/Docker test results passed. The additional unit case verified that argument counts in **all 16** `starterCode` function signatures match every sample and hidden `cases` input. No shared/prod DB mutation or root lockfile edit was performed.

## Root workspace reconciliation follow-up (2026-11-04)

The shared integration branch `integration/all` is currently at `c907eab63713f45415e9bd556082932c9f285c1c`, with the **authoritative root workspace `package-lock.json` already present**. Inspected lock metadata: both root and service declare `socket.io ^4.8.4`; locked versions include `socket.io 4.8.4`, Prisma CLI `6.19.3`, and `deepmerge-ts 7.1.5`. The frontend Battle client branch is still separate; this snapshot does not include `socket.io-client`.

A dedicated `integrated-root-lock-verification` CI job now checks out that *exact immutable integration SHA*, runs root `npm ci`, then `npm ls`, `prisma validate/generate`, Socket.IO ESM imports and all 18 generated Prisma model delegates. It runs full and production-only `npm audit --json` and records advisories, rather than guessing about a historical Prisma transitive advisory. The job never writes to the root lockfile or any shared database. **Check the run result before claiming it passed.**

The isolated PostgreSQL/Docker integration suite also re-runs the four migrations and the course seed **after** an account has completed lessons and earned XP/coins; it verifies that User, progress, completions, ledger, copy results, Rating and submission records are unchanged. Existing migrations remain immutable. This is not a claim of a production database test.

## Dependency security and persistent-progress acceptance — verified 2026-11-04

**CI evidence:** [GitHub Actions run 41782463093](https://github.com/NYerassyl/WorldOfCodes/actions/runs/41782463093) on GPT 2 code commit `c5805a0e7716384e87713ddb71a4a69fee0225c1`: all **three jobs concluded SUCCESS**.

- Root workspace install validation checked out **exact integration SHA** `c907eab63713f45415e9bd556082932c9f285c1c` into a disposable CI directory. `npm ci --no-audit --no-fund` installed **221 packages** using GPT 1's root `package-lock.json`. No edits were made to that lockfile.
- Actual installed imports: `socket.io@4.8.4` ESM `Server`/`Socket` exports PASS; `prisma@6.19.3`, `@prisma/client@6.19.3`; `prisma validate` PASS; `prisma generate` PASS; **18** Account/Learning/Battle client delegates PASS.
- Learning regression suite: **39 passed, zero failed**.
- Actual PostgreSQL 16 + Docker integration suite: **13 passed, zero failed** (12 subtests plus parent). Four migrations deployed; replay produced *No pending migrations*. Seed run twice from empty DB, and then **two more migrate/seed cycles with an existing account, completed lesson and rewards**; the User row, lesson progress, problem completions, rewards, copy completions, Rating, submissions, and test/problem counts remained identical.
- Account/session verification includes private/public projections, token SHA-256 storage, server-side logout revocation, expiration, re-login progress persistence. Learning XP/coins remain separate from Battle Rating. Docker judge timeout/unavailability returned no false ACCEPTED or rewards.

### npm audit finding — NOT resolved

The pinned root lockfile contains `deepmerge-ts@7.1.5` through `prisma@6.19.3 → @prisma/config → deepmerge-ts`. Both `npm audit --json` and `npm audit --omit=dev --json` returned **3 high, 0 critical** (one underlying advisory propagated as findings for `deepmerge-ts`, `@prisma/config`, and `prisma`). This was a **non-blocking audit reporting step**: green CI means the install/functionality checks passed, **not** that dependency security passed.

Root-package ownership belongs to GPT 1. This branch deliberately did not edit root `package.json`/lockfile or perform any unapproved major Prisma upgrade. Detailed risk, affected versions, link and proposed tested remediation are in `docs/SECURITY_AUDIT_GPT2.md`. The security decision must be explicit before production deployment, with a fresh audit on the final integrated lockfile.
