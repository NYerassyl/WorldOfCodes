# FastAPI assignment audit (GPT 4)

Date: 2026-11-10
Branch: `feat/fastapi-routes-gpt4`
Baseline: `integration/all` at `13ead31` (rebased from `8af805f`)
Feature commits: `27655f2`, `2e255cc`, `9521b46`
Service: `services/fastapi-backend/`

## What was verified

- Python 3.14.7, FastAPI 0.162.2, Pydantic 2.14.3, httpx 0.28.1, pytest 8.4.2.
- `python -m pytest -q` from `services/fastapi-backend`: **57 passed**.
- Live `uvicorn` run on `127.0.0.1:8000`: `/docs` 200, `/redoc` 200,
  `/openapi.json` 200, `/api/health` 200.
- Swagger UI in a browser rendered all 21 operations and every schema. A
  `POST /api/users` Try-it-out call returned `201` and created
  `swagger.check@worldofcodes.dev` (id 3), confirming the UI path works.
- Live HTTP checks for every workflow, not only TestClient:

| Check | Result |
| --- | --- |
| Create user | 201 |
| Duplicate email | 409 `EMAIL_TAKEN` |
| Invalid email | 422 |
| Missing user | 404 `USER_NOT_FOUND` |
| Patch another profile | 403 `FORBIDDEN` |
| Patch owner profile | 200 |
| Delete user with authored content | 409 `USER_HAS_CONTENT` |
| Filter lessons | 200 |
| Create lesson | 201 |
| Patch another author's lesson | 403 |
| Delete lesson with progress | 409 `LESSON_HAS_PROGRESS` |
| Complete lesson | 201, XP awarded once |
| Repeat completion | 409 `LESSON_ALREADY_COMPLETED` |
| Complete with missing prerequisite | 409 `PREREQUISITE_INCOMPLETE` |
| Progress summary | 200 with next lesson |
| Problem response hides `expected_answer` | Confirmed |
| Accepted submission | 201, XP and coins awarded |
| Repeated accepted submission | 201, `rewarded: false`, no XP |
| Wrong answer | 201, `WRONG_ANSWER`, no reward |
| Delete problem with submissions | 409 `PROBLEM_HAS_SUBMISSIONS` |
| Missing submission | 404 |

Manual Swagger checks follow the checklist in
`services/fastapi-backend/README.md`; the same codes were observed through the
live HTTP calls above.

## Real application vs assignment service

| Area | Production app (unchanged) | FastAPI assignment service |
| --- | --- | --- |
| Server | Express 4 + Socket.IO in `server/` | FastAPI in `services/fastapi-backend/` |
| Persistence | PostgreSQL + Prisma (`prisma/schema.prisma`) | Process-local dicts in `storage.py` |
| Identity | Opaque Bearer sessions, hashed tokens | Demo `X-User-Id` header |
| Code judging | Docker Python judge + bounded queue | Answer comparison only; no code execution |
| Data lifetime | Persistent | Reset to seed on restart |
| Frontend use | Used by the React app | Not wired to the frontend |
| Port | 4001 | 8000 |

The FastAPI service does not replace, proxy or modify the Express routes, the
Prisma schema, the judge or any frontend file. No user code is executed and no
judge verdicts are fabricated; `ACCEPTED` means the submitted answer matched the
stored expected answer.

## Domain rules implemented

- Unique, normalized email (`409`), nickname 3-20 characters, password 8-72
  characters with a letter and a digit (`422`).
- Only the owner can update or delete a profile; users that still author lessons
  or problems cannot be deleted (`409 USER_HAS_CONTENT`).
- Lesson prerequisites are validated, cycles are rejected (`400 LESSON_CYCLE`),
  completion is once-only, XP is never granted twice, and resetting a
  prerequisite is blocked while a completed lesson depends on it.
- Problem `expected_answer` is write-only: it never appears in any response.
- First correct submission rewards XP/coins; repeats are accepted without a
  second reward; wrong answers receive nothing. Deleting referenced lessons or
  problems is refused instead of orphaning records.
- Route ordering keeps `/api/users/leaderboard` from being captured by
  `/api/users/{user_id}` (covered by a test).

## Ownership and blockers

- GPT 1's baseline `13ead31` added `main.py` with only `/api/health`, pinned
  requirements, `.gitignore` entries, the root `dev:fastapi` script and the root
  README section. This branch rebased onto it: the health route and pins are
  preserved, and `main.py` now also mounts all routers. Root files are untouched
  by this branch.
- The plan assigns `schemas.py`, `storage.py` and service logic to GPT 2. Those
  files did not exist on any remote branch when this slice started, so this
  branch contains a working scaffold of that contract so the routes and Swagger
  are runnable and testable. GPT 2 should review and take ownership; the HTTP
  shape in `routers/` is the contract to preserve.
- No GitHub Actions workflow was added for the Python service; workflow files
  are integration-owner territory. Suggested job:
  `cd services/fastapi-backend && python -m pip install -r requirements.txt && python -m pytest -q`.
- PR #7 (Battle recovery) remains separate and is not touched by this branch.
- The service is intentionally not connected to the frontend and is not a
  production API.

## Reproduction

```bash
cd services/fastapi-backend
/usr/local/bin/python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m pytest -q

/usr/local/bin/python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
# Swagger: http://127.0.0.1:8000/docs
```
