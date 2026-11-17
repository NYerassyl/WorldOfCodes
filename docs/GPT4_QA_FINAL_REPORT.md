# GPT4 QA and local-run handoff

Date: 2026-11-17  
Target integration branch: `integration/nov17-combined`  
Target integration commit: `cad6db18df4ad7d09350e33b9e879f84fcd25dd1` (includes four newer commits adding the Arena editor wiring and two-account Arena verification script)  
QA branch: `qa/gpt4-integration-testing`

## Executive result

**Status: NOT SIGNED OFF.** The integration snapshot is inspectable and contains the React/Vite frontend, Express + Socket.IO server, Prisma/PostgreSQL learning and battle services, Docker Python judge adapter, FastAPI assignment service, social/chat/notifications, comments and analytics. However, the complete requested two-account workflow has not yet been executed against this exact combined SHA in a clean local runtime.

This report distinguishes source inspection and historical CI evidence from tests executed against the current QA head. A green result on a different PR head is not evidence that the same code is present in this integration commit.

## Work completed by GPT4

1. Read the integration ownership rules, root run instructions, shared contracts, integration status, Battle review, FastAPI handoff and current service entrypoints.
2. Inspected the exact integration ref and compared its source with the pending FastAPI and Arena PRs.
3. Fixed the brittle migration-history assertion in `tests/integration.test.mjs`: it now discovers timestamped Prisma migration directories and compares the database history against that set, rather than assuming a fixed count of four.
4. Added `.github/workflows/gpt4-integration-qa.yml` on this QA branch. It provisions disposable PostgreSQL 16, installs locked Node workspaces and Python dependencies, validates/generates Prisma, applies Prisma migrations twice, seeds twice, runs unit/contract tests, builds the frontend, runs the PostgreSQL + Docker Judge integration suite, checks live Express REST auth boundary and Socket.IO Engine.IO handshake, serves the Vite frontend, runs FastAPI unit tests plus real shared-PostgreSQL comment/analytics tests, applies the additive Alembic analytics migration against a Prisma-backed disposable schema, and verifies Swagger/OpenAPI/health.
5. Kept all changes on `qa/gpt4-integration-testing`. No main merge, production deployment, shared database migration or shared database reset was performed.

## Exact integration-snapshot observations

### Core stack

- Root scripts use Node.js >=22.12, npm workspaces, Prisma 6, Express on port 4001, Vite on 5173 and FastAPI on 8000.
- The Express entrypoint creates one Prisma client, starts the shared HTTP server and attaches Socket.IO.
- Express mounts auth, learning, problems, copy, trace and battle routes under `/api`; the same bounded judge queue is injected into learning and Battle.
- The Battle source in this integration ref already creates ranked matches as ACTIVE and starts friendly invites as PENDING, with a transactional join transition. Socket handlers revalidate the hashed AuthSession on each protected event.
- Chat messages and notifications are written through Prisma transactions; follow notifications are deduplicated. Problem comments have a FastAPI bridge.
- The Alembic migration `001_profile_activity` creates a read-only activity view over the Prisma `Submission` and `Problem` tables.

### Blocker A — FastAPI identity/storage split (GPT2, integration dependency GPT1)

On the exact integration SHA, `services/fastapi-backend/main.py` mounts the educational routers and imports the in-memory `storage.store`. For example, `routers/users.py` calls `create_user(store, ...)`, `list_users(store, ...)`, and `update_user(store, ...)`; the assignment README documents demo `X-User-Id` identity and explicitly says a restart resets its records. The separate `database.py` / Alembic activity-view path does not make those routers canonical.

**Impact:** the requested promise that site accounts, learning data, profile updates and FastAPI data share one persistent identity is not satisfied by this integration snapshot. The FastAPI assignment service remains separate from the React/Express account path. PR #27 proposes the canonical Bearer AuthSession/Prisma integration, but it is not part of the target integration commit and its own PR description says CI evidence is pending.

**Owner:** GPT2 for Fastapi routers/storage/identity; GPT1 for the integration merge and environment wiring.

### Blocker B — one combined two-account acceptance path is missing (GPT1/GPT2/GPT3)

The integration ref has separate tests for battle, chat, notifications, comments, learning, browser flows and database persistence. The root `tests/integration.test.mjs` exercises HTTP/PostgreSQL/Docker learning and auth scenarios, but the evidence reviewed does not establish one uninterrupted two-account journey covering registration → profile edit → follow → notification → chat → lesson → judged problem → analytics → comment → ranked duel, followed by a coordinated restart and re-read of every resource.

The current integration base now includes the Arena editor wiring and `scripts/verify-arena-two-account.mjs` from the newer integration commits. PR #28's historical 15/15 and 9/9 results were recorded on head `07d7bdd`; the new GPT4 workflow now invokes the two-account script against the current integration base rather than transferring that historical result.

**Owners:** GPT1 owns the complete browser/integration orchestration; GPT2 owns learning/FastAPI/profile analytics/comments; GPT3 owns chat/notifications/ranked duel runtime.

### Blocker C — integration branch vs pending PRs

- PR #27 (FastAPI canonical identity/storage) is still separate from this integration SHA.
- PR #28 (Arena shared editor + Chat/Ranked acceptance) is still separate from this integration SHA.
- PR #26's description says migration checks discover migration directories, but the integration snapshot's prior assertion was hard-coded to four; GPT4 replaced that assertion with dynamic discovery on the QA branch.

## Verification evidence and limitations

### Evidence attached to other refs, not a sign-off for this SHA

- Earlier recorded CI on `872ba52...`: 8/8 workflows passed (Battle backend, FastAPI contract, trace, learning, shared editor/comments and browser acceptance workflows). This is historical evidence for the integration commit and is not a substitute for the new clean-stack workflow.
- PR #28 reports 76/76 frontend, 91/91 learning backend, 16/16 server tests, 15/15 two-account Battle/chat checks and 9/9 browser checks on head `07d7bdd`; this is a different branch/head.
- PR #27 reports unit/contract results but states its CI evidence is pending.

### Current QA head — green on the QA branch

**QA head:** `3d43ea74e910b44125f590f2481c8096a3aba447`  
**Push run:** [44140216483 — success](https://github.com/NYerassyl/WorldOfCodes/actions/runs/44140216483)  
**PR run:** [44140226798 — success](https://github.com/NYerassyl/WorldOfCodes/actions/runs/44140226798)

Both jobs passed on the exact QA head:
- Clean PostgreSQL / Prisma / Express / Docker Judge / frontend: success.
- FastAPI contract suite + shared PostgreSQL Alembic view: success.

The clean-stack job now proves the migration-history/checksum guard, idempotent seed, unit/contract suites, production frontend build, real PostgreSQL + Docker Python Judge integration, 28 Python catalog submissions with authored reference solutions, progress/reward persistence through logout/relogin, Express REST authentication boundary, Socket.IO polling handshake, a real two-account friendly/ranked Arena run (including rating boundaries, settlement idempotency, follow notification, chat history/unread and third-account isolation), and Vite frontend serving. The FastAPI job provisions Prisma tables first, applies the additive Alembic view migration, and passes the real PostgreSQL-backed FastAPI regression suite plus Swagger/OpenAPI/health checks.

CI findings fixed on this QA branch:
- Replaced the hard-coded four-migration assumption with timestamped migration discovery plus checksum verification.
- Corrected seed/catalog assumptions; distinguished Python-judge problems from SQL catalog entries and theory-only lessons.
- Used the learning pack's authored reference solutions for advanced Python lesson and Arena problem fixtures.
- Corrected reward-ledger and progress assertions to count the actual persisted problem/copy completions.
- Fixed Vite workspace argument forwarding in the smoke workflow.

This is strong green evidence for the separate suites on this QA head, **not yet final integration sign-off**. The target `integration/nov17-combined` branch remains at `cad6db18df4ad7d09350e33b9e879f84fcd25dd1`. GPT2 PR #27 now contains the canonical FastAPI Bearer/Prisma/shared-public-schema implementation at `6f5d997bfba49cf97e1248b86798cb49f66d1ffa`, but it remains open and is based on `feat/profile-insights`, not the target integration branch. The requested single uninterrupted end-to-end flow spanning profile → follow → notification → chat → lesson → judged problem → analytics → comment → ranked duel, followed by coordinated Express + FastAPI restart and all post-restart reads, still needs GPT1 integration/orchestration.

### Local runtime

The current execution container has not provided a usable local Docker daemon or PostgreSQL server, and the earlier uploaded repository archive was incomplete. Therefore no claim is made that the stack was started locally in this container. The new GitHub Actions workflow provisions disposable PostgreSQL and Docker on a clean GitHub-hosted runner so these checks can run without using a shared or production database.

## Required defect handoff

| Priority | Finding | Reproduction / evidence | Expected | Actual | Owner |
|---|---|---|---|---|---|
| P0 | FastAPI user/lesson/problem assignment routers use process memory and demo integer identity | On `integration/nov17-combined@cad6db..., inspect `services/fastapi-backend/main.py` and `routers/users.py`; start service, create/update a user using documented `X-User-Id`, restart FastAPI, re-read records | FastAPI mutations use canonical Bearer AuthSession + Prisma IDs and survive restart | Assignment routers use `storage.store`; README explicitly documents process-local data and reset-on-restart | GPT2 (GPT1 integrates) |
| P1 | Full requested two-account workflow has no single current-SHA acceptance result | Run the listed workflow across all named features on exact `cad6db...`, then restart Express/FastAPI and repeat reads | Every step and all persisted state pass on one exact SHA | Evidence is split across suites and different PR heads; no combined result established | GPT1/GPT2/GPT3 |
| P1 | New dynamic migration assertion and clean-stack workflow | QA branch `3d43ea74e910b44125f590f2481c8096a3aba447`; push run 44140216483 and PR run 44140226798 | Prisma migration history, seed, Node tests, build, real Docker judge, FastAPI/Alembic and service smoke checks all green | PASS on QA head; must be rerun on GPT1's final integrated SHA | GPT4 / GPT1 integration |

## Deployment configuration checklist (do not deploy yet)

- Provision a dedicated production PostgreSQL database and keep `DATABASE_URL` server-only; use the same database identity for Express/Prisma and FastAPI only after PR #27's shared-auth/storage design is reviewed and merged.
- Apply reviewed Prisma migrations in order; verify checksums and back up the database first. Run the Alembic profile-activity view migration only after the Prisma `User`/`Submission`/`Problem` tables exist.
- Configure Node.js >=22.12, npm lockfile install, `HOST`, `PORT`, strict `CORS_ORIGINS`, trusted proxy hops, auth/submission rate limits, request body limit and judge queue bounds.
- Provision a Docker-capable isolated judge worker with the pinned Python image pre-pulled; do not run untrusted code in the API process. Plan for queue persistence/worker separation before horizontal scaling.
- Configure FastAPI `DATABASE_URL` / `FASTAPI_DATABASE_URL` to the reviewed shared PostgreSQL target; remove demo `X-User-Id` identity before production.
- Configure frontend origin, Express API proxy/same-origin routing, Socket.IO websocket/polling routing, TLS, secrets, backups, monitoring and log retention.
- Review the outstanding Prisma CLI transitive npm audit advisory before production; do not force an unreviewed major upgrade.
- Confirm that Vercel preview/static hosting routes `/api` and `/socket.io` to the Node service; a static SPA fallback is not an API deployment.

## Sign-off

**GPT4 QA status: QA branch green; final integration / production not approved.** The clean-stack and FastAPI jobs pass on QA head `3d43ea74e910b44125f590f2481c8096a3aba447`. The full task is not complete until GPT1 rebases/integrates GPT2 PR #27, the final integration SHA receives the same green checks, and the requested one-path two-account acceptance plus coordinated Express/FastAPI restart replay is recorded. No merge to `main` or production deployment was performed.
