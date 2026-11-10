# WorldOfCodes integration report — 2026-11-03

Integration branch: `feat/backend-integration`. Includes the existing frontend history and GPT 2 backend commit `8df21e9e6277019aafa7f479517eb33238f2b0b1`. No changes merged into main. No shared/production database reset, migration or deployment.

## Working with real PostgreSQL

- Registration, login, session restoration, server-revoked logout, own-profile editing and private/public profile separation.
- Six Python topics with theory and two verified practices each; all 16 seeded function-style problems expose starterCode and execute in Docker.
- Python challenges with topic/difficulty filters; three exact-code-copy exercises.
- Persisted lesson/problem/copy progress, XP, coins and calculated levels. First completion only; duplicate and concurrent submissions do not duplicate rewards.
- Existing English frontend, responsive shell, profiles, six language curricula and lab implementation retained. Python uses the real backend; other five language tracks remain local practice without account rewards. Old local XP/coins are ignored and no longer awarded.
- One shared Express application mounts the account/learning/problem/copy routers under `/api`. CORS allowlist, auth and submission IP rate limits, request-size limit, bounded judge queue and central error responses are configured at the entrypoint.

## Database verification

Prisma 6.19.3 validate passed. All four unchanged migrations applied to a separate PostgreSQL 17 test cluster on localhost:55432, database worldofcodes_integration_test. A second migrate deploy reported no pending migrations. SHA-256 checksums of all migration files matched PostgreSQL migration records. No reset commands used. Seed ran twice successfully and maintained one course, six lessons, sixteen problems and three copying exercises. Existing test accounts and earned progress persisted.

## Test evidence

- Frontend unit tests: 22 passed.
- GPT 2 backend unit/contract tests: 32 passed.
- Shared server boundary/queue/socket-auth helper tests: 3 passed.
- Real HTTP/PostgreSQL/Docker integration: 11 scenarios (plus parent test): migrations, auth/privacy, starters/hidden tests, incorrect/runtime error, duplicate/concurrent rewards, six topics/all algorithms, exact copy, submission rate limits, unavailable judge, prompt timeout cleanup and relogin persistence.
- Browser E2E: real registration, reload restoration, six-topic listing, wrong/correct solution, lesson completion, exact copy, persisted XP/coins, revoked logout and relogin. Local-storage balance tampering cannot change displayed account balances. Desktop 1440px and mobile 390px checked with no browser exceptions or horizontal overflow.
- Frontend TypeScript and production Vite build passed. Vite reports a >500kB entry bundle warning; splitting the retained curricula can be future work.
- Judge image: python:3.12-alpine, digest sha256:e6dae589c1c05976188fd3bd019afd091445fc533ed2ea29001beddc7368a9c8. An infinite loop returns TIME_LIMIT in about 1.6 seconds with a 1.5-second test limit; no test container remains. Missing image returns 503 and creates no submission or reward.

## Remaining blockers / limitations

- GPT 3 branch `44c24257583cbbacbd01559f79fdb4db39396717` was reviewed, not merged. Two lifecycle failures were reproduced with real PostgreSQL: ranked remains PENDING and rejects submissions; fresh friendly invitations cannot be joined. Socket session revalidation after logout and event/origin limits also require changes. See battle-integration-review.md. The frontend Arena remains an explicitly labeled rehearsal.
- Production DATABASE_URL/hosting are not configured. Local test infrastructure is not a public deployment. Use a separately provisioned PostgreSQL database and a Docker-capable worker host before deployment. The current judge queue/rate-limit stores are single-process.
- npm audit reports three high-severity entries stemming from one transitive Prisma CLI configuration dependency, deepmerge-ts <8 (GHSA-ggr8-5vv4-36mx). npm audit fix dry-run did not resolve this within current constraints. No unreviewed major Prisma upgrade was applied. Review/update this dependency before production.
- No live Battle Socket.IO, match settlement or rating E2E pass is claimed. The session helper tests do not substitute for Battle runtime tests.

Keep the integration PR in draft until Battle fixes, dependency review and remaining contract reviews are complete.
