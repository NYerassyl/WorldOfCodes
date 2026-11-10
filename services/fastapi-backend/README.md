# WorldOfCodes FastAPI learning API

Educational FastAPI + Pydantic REST API for today's assignment. It is a
separate Python service for the WorldOfCodes project; the production app stays
on Express, PostgreSQL and Prisma, and the two services do not share data.

All data lives in memory. Restarting the process restores the seeded demo
records, so this service never touches PostgreSQL and never executes user code.

## Run it on macOS

```bash
cd services/fastapi-backend

# One-time setup
/usr/local/bin/python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt

# Start with auto-reload
/usr/local/bin/python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If the packages were installed globally instead of into `.venv`, the same
command without the venv path works:

```bash
/usr/local/bin/python3 -m uvicorn main:app --reload
```

From the repository root you can also use the integrated script after
activating the virtual environment (or installing the requirements globally):

```bash
source services/fastapi-backend/.venv/bin/activate
npm run dev:fastapi
```

It runs the same app from `services/fastapi-backend` on port 8000.

Open **http://127.0.0.1:8000/docs** for Swagger UI and
**http://127.0.0.1:8000/redoc** for ReDoc. The OpenAPI document is served at
`/openapi.json`.

### Ports

FastAPI listens on **8000** by default. The Express API listens on **4001**
(`server/config.js`) and the Vite frontend on **5173**. They are independent
processes: this service does not replace or proxy the Express API. If port 8000
is busy, add `--port 8001`; Swagger then moves to
`http://127.0.0.1:8001/docs`.

## Architecture

```
main.py          FastAPI app, /api routers, domain-error mapping, /api/health
routers/         HTTP layer only (paths, status codes, query/path params)
schemas.py       Pydantic request/response models and validation rules
services.py      Business rules and consistency checks
storage.py       Thread-safe in-memory collections with seeded demo data
tests/           TestClient suite covering every endpoint
```

Routers are split per workflow and mounted under `/api` in `main.py`. Handlers
call `services.py`; only the service layer mutates storage. `DomainError`
carries the HTTP status and a stable machine-readable code, which `main.py`
renders as `{"error": {"code": "...", "message": "..."}}`. Pydantic failures
keep FastAPI's standard `422` body with `detail`.

## Demo authentication

Protected routes read an `X-User-Id` header. This is demo identity, not real
authentication.

| User id | Email | Nickname | Password |
| --- | --- | --- | --- |
| 1 | ada@worldofcodes.dev | ada | ada-password-1 |
| 2 | grace@worldofcodes.dev | grace | grace-password-2 |

Missing or non-numeric headers return `401` / `422`; acting on another user's
profile, lesson or problem returns `403`.

## Workflows and endpoints

### 1. Users and profiles

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/users?q=&limit=` | List or search users |
| POST | `/api/users` | Register (unique email, nickname 3-20, password 8+ with letter and digit) |
| GET | `/api/users/{user_id}` | Read one user |
| GET | `/api/users/{user_id}/profile` | XP, coins, completions, solved problems, rank |
| GET | `/api/users/leaderboard?limit=` | Ranked users by XP |
| PATCH | `/api/users/{user_id}` | Owner-only update of email, nickname, password or bio |
| DELETE | `/api/users/{user_id}` | Owner-only delete; blocked while the user authors content |

### 2. Lessons and progress

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/lessons?level=&topic=&include_unpublished=` | Catalog with filters |
| POST | `/api/lessons` | Create a lesson (author must exist, XP 10-100, optional prerequisite) |
| GET | `/api/lessons/{lesson_id}` | Read one lesson |
| PATCH | `/api/lessons/{lesson_id}` | Author-only update; cycles rejected |
| DELETE | `/api/lessons/{lesson_id}` | Author-only delete; blocked by progress or dependents |
| GET | `/api/users/{user_id}/progress` | Completions, XP, coins and next recommended lesson |
| POST | `/api/users/{user_id}/progress` | Complete `{ "lesson_id": 2 }`; awards XP once |
| DELETE | `/api/users/{user_id}/progress/{lesson_id}` | Reset progress; blocked by completed dependents |

Rules: a lesson can only be completed once (`409 LESSON_ALREADY_COMPLETED`),
its prerequisite must be completed first (`409 PREREQUISITE_INCOMPLETE`),
unpublished lessons cannot be completed, and resetting a prerequisite refunds
its XP only when no completed lesson depends on it.

### 3. Problems and submissions

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/problems?difficulty=&topic=` | Catalog with filters |
| POST | `/api/problems` | Create a problem; `expected_answer` is never returned |
| GET | `/api/problems/{problem_id}` | Read one problem (answer hidden) |
| PATCH | `/api/problems/{problem_id}` | Author-only update |
| DELETE | `/api/problems/{problem_id}` | Author-only delete; blocked by submissions |
| POST | `/api/problems/{problem_id}/submissions` | Submit `{ "answer": "15" }` |
| GET | `/api/problems/{problem_id}/submissions?user_id=` | Submission history |
| GET | `/api/submissions/{submission_id}` | Read one submission |

A correct answer is `ACCEPTED` and awards XP/coins only on the first solved
submission. Repeats are accepted with `rewarded: false`; wrong answers are
`WRONG_ANSWER` with no reward. This is answer comparison for the assignment, not
a code judge.

## Status codes

| Code | Used for |
| --- | --- |
| 200 | Successful reads and updates |
| 201 | Created users, lessons, problems, completions and submissions |
| 204 | Successful deletes and progress resets |
| 400 | Invalid lesson prerequisite chain (`LESSON_CYCLE`) |
| 401 | Missing demo `X-User-Id` header |
| 403 | Acting on another user's resource |
| 404 | Unknown user, lesson, problem, submission or progress |
| 409 | Duplicate email, repeated completion, missing prerequisite, dependent progress, content still referenced |
| 422 | Pydantic validation failures and non-numeric path/header ids |

## Tests

```bash
cd services/fastapi-backend
.venv/bin/python -m pytest -q
```

The suite uses `fastapi.testclient.TestClient` and resets the in-memory store
before every test. It covers success paths plus `401`, `403`, `404`, `409`,
`422`, wrong submissions and repeated rewards.

## Manual Swagger checklist

1. `GET /api/health` returns `status: ok`.
2. `POST /api/users` with a new email returns `201`; repeat it to see `409 EMAIL_TAKEN`.
3. Submit an invalid email or a 2-character nickname to see `422`.
4. `PATCH /api/users/1` with header `X-User-Id: 2` returns `403`.
5. `POST /api/users/1/progress` with `{"lesson_id": 1}` returns `409 LESSON_ALREADY_COMPLETED`.
6. `POST /api/users/2/progress` with `{"lesson_id": 3}` returns `409 PREREQUISITE_INCOMPLETE`.
7. `POST /api/problems/1/submissions` with `{"answer": "15"}` and `X-User-Id: 2` awards the first reward; repeat and confirm `rewarded: false`.
8. `DELETE /api/problems/1` returns `409 PROBLEM_HAS_SUBMISSIONS`.

Swagger does not have an Authorize button for this demo because identity is a
plain header: expand an endpoint, choose **Try it out**, and add `X-User-Id` in
the header fields before **Execute**.
