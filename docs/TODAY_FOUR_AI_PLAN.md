# Today's four-agent plan

Date: 2026-11-10

## Current baseline

Use `integration/all` at `c907eab` as the shared baseline. PR #3 is open and targets `main`. PR #7 (`feat/battle-state-recovery`, latest `70dd6d1`) is open but its latest Learning and Battle CI runs are failing, so do not merge it yet. PR #6 is closed. `main` is unchanged.

The repository already contains the Node.js/Express application, PostgreSQL/Prisma schema, Python judge, learning API, Battle REST/Socket.IO code, and frontend. Today's FastAPI assignment is an additional Python REST API requirement; it is not satisfied by the existing Express server.

## Shared rules

- PostgreSQL + Prisma remains the real app's database choice.
- Keep the current Express server and add FastAPI as a clearly named educational service; do not replace working production routes.
- Use separate branches and worktrees. Never push directly to `main`.
- Every completed slice must be tested, committed and pushed immediately.
- Report the full commit SHA, changed files, test command/results and remaining blockers.
- Do not edit another agent's owned files without agreement.

## GPT 1 — integration owner

Owns root package files, `server/`, shared configuration, `integration/all` and final merge coordination.

Today:

1. Inspect the latest pushes before editing: `git fetch origin`, then verify `c907eab` and the failing PR #7 head.
2. Preserve the existing one-server Express wiring: one HTTP server, one PrismaClient, one MatchmakingQueue, one battle notifier and one bounded judge queue.
3. Integrate the completed GPT 4 learning/frontend work already present in `c907eab`; do not reintroduce the superseded PR #4 as a separate merge.
4. Add a new `services/fastapi-backend/` service for today's FastAPI assignment. Keep it independent from the production Prisma service and document that its in-memory data is educational/demo data.
5. Add a root command such as `npm run dev:fastapi` and a README section explaining both servers and their ports.
6. Resolve package/lockfile conflicts after GPT 2 and GPT 4 changes. Run a clean `npm ci`, root tests and frontend build.

Acceptance: clean checkout starts Express and FastAPI using documented commands; existing routes still work; no duplicate router or database client is introduced; commit and push immediately.

## GPT 2 — FastAPI data and validation owner

Owns `services/fastapi-backend/schemas.py`, `storage.py`, FastAPI user/lesson/problem schemas and their services. Do not change Battle or root server files.

Today:

1. Implement Pydantic request/response models for User, Lesson, Problem, Submission and progress.
2. Add in-memory collections with seeded WorldOfCodes examples: at least two users, three lessons and three Python problems.
3. Implement business rules: unique email, nickname length, password validation, missing-resource errors, no duplicate problem reward, correct solution gives XP/coins, wrong solution gives no reward, and only the owner can edit/delete a profile.
4. Keep service logic outside route handlers. Return structured JSON and meaningful status codes (`201`, `400`, `404`, `409`, `422`).
5. Add unit tests for valid/invalid Pydantic input and reward/progress rules.

Acceptance: all schema/storage/service tests pass; no database or external judge is required for the FastAPI assignment; commit and push immediately.

## GPT 3 — Battle and real-server verification owner

Owns `services/learning-backend/src/battle/**`, Battle tests and the Battle integration review.

Today:

1. Diagnose the latest PR #7 CI failure before adding features. Publish the exact error and fix only the cause.
2. Verify ranked queue recovery and active-match recovery against the shared `c907eab` server contract.
3. Test event-time socket session revalidation after logout/expiry, stale queue tickets, duplicate queue joins and reconnects.
4. Verify REST and Socket.IO use the same MatchmakingQueue and notifier. Ensure Battle judge calls use the shared bounded judge path.
5. Add or repair focused tests for unauthorized participants, duplicate accepted submissions, concurrent settlement, friendly zero Elo changes and no winner on judge failure.
6. Do not claim spectator mode, beginner rating protection or algorithm-specific matchmaking unless implemented and tested.

Acceptance: Battle CI passes on the pushed commit; PR #7 is updated with the actual failure/fix and only then is it eligible for integration review.

## GPT 4 — FastAPI routes, QA and Swagger owner

Owns `services/fastapi-backend/main.py`, `routers/`, FastAPI tests and the final QA report.

Today:

1. Build FastAPI routers for three substantial workflows: users/profiles, lessons/progress, and problems/submissions. Use resource-oriented `GET`, `POST`, `PATCH` and `DELETE` routes.
2. Add `app = FastAPI()` and include routers under `/api`. Ensure `/docs` and `/redoc` work.
3. Test every endpoint through `TestClient` and manually through Swagger: success, Pydantic `422`, nonexistent resource `404`, duplicate/conflict `409`, incorrect submission and repeated reward.
4. Add a FastAPI-specific README with exact Mac commands: `/usr/local/bin/python3 -m uvicorn main:app --reload`, Swagger URL and port explanation.
5. Run a final audit of the real app and FastAPI assignment separately. Report which parts use PostgreSQL/Prisma and which parts intentionally use in-memory data.

Acceptance: FastAPI tests pass without unhandled exceptions; `/docs` visibly exposes all required endpoints; commit and push immediately.

## Delivery order

1. GPT 1 publishes the current baseline confirmation and creates the FastAPI service skeleton.
2. GPT 2 lands schemas/storage/services and tests.
3. GPT 4 lands routers/Swagger/TestClient tests and documentation.
4. GPT 3 fixes PR #7 CI and verifies Battle separately.
5. GPT 1 runs clean install, all tests and build, then updates PR #3. Do not merge `main` until all four agents' acceptance checks pass.
