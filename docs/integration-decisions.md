# GPT 1 integration decisions

Reviewed against local frontend `ae7fbed` and fetched learning backend `e5f48eb`.
These are architecture and interface decisions, not a merge or migration approval.
No branches have been merged and no database migration has been executed during this review.

## Decisions and ownership

1. **Database:** PostgreSQL + Prisma is the shared database stack. This supersedes the
   earlier SQLite proposal. GPT 2 remains the owner of the shared schema and migrations
   in services/learning-backend/prisma. No competing User, Problem, Match or Rating models.
   GPT 1 owns database connection wiring, environment examples and integration setup.
   Production provisioning still requires a chosen runtime and database credentials;
   no paid resource is assumed provisioned. DATABASE_URL stays server-side.
2. **Server:** Node.js + Express, preserving the backend's current Express major.
   All REST routes are mounted once under /api. GPT 1 owns the main server, exported-router
   mounting, request body limits, CORS, rate limiting and centralized error handling.
   Prefer one production origin with /api routed to Express. If origins differ, use an
   explicit configurable origin allowlist. Auth and judge routes need separate limits.
   Existing Vite /api -> 127.0.0.1:4001 proxy remains suitable for local integration.
3. **Auth:** Accept opaque Bearer sessions. Send Authorization: Bearer <token> to the
   application's API only; do not interpret these tokens as JWTs. Existing frontend
   register/login/logout/me/profile code is retained and completed, not rewritten.
   On 401, clear the invalid session and return to sign-in; an ordinary permission-denied
   403 must not automatically invalidate a valid session. Production logout must revoke
   the session server-side; local-only sign-out during an outage is not proof of revocation.
   GPT 1 owns frontend account integration. GPT 3 must validate Socket.IO sessions using
   the same session store and derive userId server-side, never from a client userId.
4. **Language:** Python is the first server-graded language. Retain the six frontend
   learning tracks as practice content, with a clear separation from authenticated,
   server-graded progress. Existing public-runner stdin/stdout exercises cannot be sent
   unchanged to the Python function judge. Consume backend lesson/problem IDs and seed
   content for the server-backed Python flow. Do not infer correctness from client results.
5. **Progress:** Backend lesson completion means all required published problems accepted.
   Local quiz unlock rules remain preview-only; they cannot authorize server progression.
   Server XP and coins are authoritative. Approve server level floor(xp / 100) + 1 for
   week one; frontend must render server level rather than its legacy demo /200 formula.
   Duel rating is independent. Friendly battles do not alter rating or learning rewards.
6. **Migration gate:** GPT 1 will review the shared schema/migrations and GPT 3 must confirm
   battle enums, deletion behavior, snapshots and exactly-once rating settlement.
   Check an existing database's migration history before applying anything. No reset or
   destructive migration. Run reviewed migrations and seed against an isolated test DB
   first. Do not merge branches until contracts and real integration tests agree.
7. **Testing:** GPT 1 owns end-to-end integration with real test PostgreSQL and the isolated
   Python judge: registration, login, refresh/session restoration, logout/revocation,
   profile authorization, lesson start/progress, accepted/wrong submissions, XP/coins,
   concurrent duplicate reward attempts and judge failure without rewards. Current stubs
   and unit tests do not establish real database/worker integration success.

## Accepted REST contracts

Preserve the implemented response shapes; do not wrap all routes in a new data envelope.
All paths below include the /api prefix.

| Method/path | Input | Success |
| --- | --- | --- |
| POST /api/auth/register | {email,password,nickname} | 201 {token,user} |
| POST /api/auth/login | {email,password} | 200 {token,user} |
| POST /api/auth/logout | Bearer auth | 204, session revoked |
| GET /api/users/me | Bearer auth | private user object |
| PATCH /api/users/me | {nickname?,avatarUrl?} | private user object |
| GET /api/users/:nickname | public | public profile, no email/session/coins |
| GET /api/learning/courses | public | {courses} |
| GET /api/learning/lessons/:id | public | {lesson} |
| POST /api/learning/lessons/:id/start | Bearer auth | {lessonId,state,startedAt,completedAt} |
| GET /api/learning/progress | Bearer auth | {lessons,completedProblems} |
| GET /api/problems?topic=sorting&difficulty=EASY | public | {problems} |
| GET /api/problems/:id | public | {problem} |
| POST /api/problems/:id/submit | Bearer auth, {code} | submission result below |
| GET /api/problems/my-submissions | Bearer auth | {submissions} |
| GET /api/copy-exercises | public | keep existing response shape |
| GET /api/copy-exercises/:id | public | keep existing response shape |
| POST /api/copy-exercises/:id/submit | Bearer auth, {code} | {attemptId,isExact,rewarded,earnedXp,earnedCoins,note} |
| GET /api/copy-exercises/progress | Bearer auth | keep existing response shape |

Submission result: {submissionId,status,passedCases,totalCases,rewarded,earnedXp,earnedCoins}.
Statuses: ACCEPTED, WRONG_ANSWER, RUNTIME_ERROR, TIME_LIMIT.
Difficulty: EASY, MEDIUM, HARD. Language identifier: python.
Errors: {error:{code,message}}; optional validation details must not expose secrets or hidden cases.
Keep 402 NICKNAME_CHANGE_PAYMENT_REQUIRED for additional normalized nickname changes.
503 JUDGE_UNAVAILABLE is infrastructure failure, not a wrong answer or a match defeat.
After a submission, refresh /users/me and /learning/progress for authoritative totals.

## Changes / clarification requested from GPT 2 and GPT 3

- Document response DTOs for every public route, including copy routes, examples and IDs.
- Provide public starterCode or an explicit function signature with argument names, so the
  editor can show the exact function expected by the Python judge. functionName alone
  is not enough to reliably build arbitrary signatures. Never include hidden cases.
- Include a deterministic seed with at least one full Python lesson flow and copy exercise.
  Existing seeds will be reviewed; do not invent a second curriculum-to-ID mapping.
- GPT 3 must finalize match deadline persistence, problem/test snapshot or immutable
  version identity, reconnection rules and exactly-once settlement before migration signoff.
- The staged four battle models are not blanket-approved by accepting PostgreSQL.
- Keep PRs unmerged until the above boundaries and real integration checks are satisfied.

## Current verification limits

Git fetch succeeded. Source/contracts were read; no live database, Docker judge or real
end-to-end auth/reward tests were run as part of this decision review. GitHub connector
transport failed, so this review used fetched Git refs. Do not report deployment-ready.
