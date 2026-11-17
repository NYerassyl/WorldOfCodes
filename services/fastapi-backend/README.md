# WorldOfCodes FastAPI + PostgreSQL

The Assignment 5 API stores users, lessons, completions, problems, submissions,
problem comments and Python Trace attempts through SQLAlchemy. Existing API
paths, Pydantic validation, demo identity and first-solve rewards are preserved.
The Python service uses a **dedicated database**, separate from Express/Prisma.

## Run

From `services/fastapi-backend`:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# Edit FASTAPI_DATABASE_URL, or start the supplied development database:
docker compose up -d --wait
python -m alembic upgrade head
# Optional demo data, only for an EMPTY database:
python seed.py
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open [Swagger UI](http://127.0.0.1:8000/docs). Health is `/api/health`;
OpenAPI is `/openapi.json`. Health now reports `storage: postgresql` and queries
the database; outages return 503 without exposing connection credentials.

`FASTAPI_DATABASE_URL` is required and accepts `postgresql://` or
`postgresql+psycopg://`. The local `.env` does not override exported variables.
No credentials are stored in Alembic configuration. With an existing server,
create `worldofcodes_fastapi` and give its owner schema privileges first.
If port 5432 is occupied, change both the Compose binding and connection URL.

Startup never resets, seeds or creates tables. Restarting Uvicorn retains data.
Docker uses a named volume: `docker compose down` retains it; adding `-v` deletes
it. Repeating the seed command on nonempty user data is rejected.

## Architecture and relationships

| File | Responsibility |
| --- | --- |
| `routers/`, `trace_api.py` | HTTP, identity headers, request session dependency |
| `schemas.py`, `trace_models.py` | Request validation and public response fields |
| `services.py` | Ownership, prerequisites, CRUD, progress and rewards |
| `models.py` | SQLAlchemy tables, relationships, FKs, indexes and checks |
| `database.py` | Environment, engine pooling and request transactions |
| `migrations/` | Versioned, reversible Alembic schema |
| `seed.py` | Explicit demo fixtures, separate from migrations |
| `tests/` | API, integrity, concurrency and process restart checks |

Each database request gets its own Session. The dependency commits before
sending the response; errors roll back and close the session. Services flush
without committing independently. There is no global mutable data store.

User has one-to-many relationships with authored Lessons/Problems, Completions,
Submissions and Comments. Problem has many Submissions and Comments; Lesson has
many Completions and may reference one prerequisite Lesson. Authors cannot be
deleted while they own content. Lessons/problems with completions/submissions
cannot be deleted. Deleting a user cascades their progress, submissions, comments
and trace attempts. Deleting a problem cascades its comments.

The composite completion PK prevents duplicate completion. A partial unique
index allows only one rewarded submission per user/problem. PostgreSQL row locks
serialize balance changes across workers; submission and rewards commit
atomically. A transaction advisory lock serializes lesson graph changes,
completions and resets to prevent concurrent cycles or invalid progress.
This coarse graph lock favors correctness for the educational service.

The existing `X-User-Id` header remains demo identity, not production auth.
Passwords use salted scrypt hashes and are never returned. Answers are compared
with hidden expected text; the API never executes submitted code. The 50 trace
exercises remain versioned, read-only JSON; attempts and outputs are persistent.

## API and comments

Existing `/api/users`, `/api/lessons`, `/api/users/{id}/progress`,
`/api/problems`, `/api/problems/{id}/submissions`, `/api/submissions/{id}` and
`/api/trace/exercises` workflows remain available. Owner/author-only mutations
are enforced. Validation returns 422, missing identity 401, forbidden operations
403, missing records 404 and relationship/duplicate conflicts 409.

| Method | New path | Behavior |
| --- | --- | --- |
| GET | `/api/problems/{problem_id}/comments` | Only that problem's comments |
| POST | `/api/problems/{problem_id}/comments` | `{"body":"Explanation"}` with `X-User-Id` |
| PATCH | `/api/problems/{problem_id}/comments/{comment_id}` | Same body; author only |
| DELETE | `/api/problems/{problem_id}/comments/{comment_id}` | Author only; 204 |

Comment responses include id, problem_id, author_id, body and created_at.
Addressing a comment under another problem returns 404.

## Migrations and tests

```sh
python -m alembic upgrade head
python -m alembic current
python -m alembic check
# Future changes: generate, review and commit the new revision:
python -m alembic revision --autogenerate -m "describe change"
# Destructive rollback, disposable databases only:
# python -m alembic downgrade base
```

Migrations contain explicit operations; they never import changing application
models to recreate historical schema. Demo seed data is optional.

Tests truncate data. They refuse to run without an explicit localhost PostgreSQL
URL whose database name ends in `_test`; they never default to the app database.

```sh
docker compose exec postgres createdb -U woc worldofcodes_fastapi_test
export FASTAPI_TEST_DATABASE_URL='postgresql+psycopg://woc:woc@127.0.0.1:5432/worldofcodes_fastapi_test'
python -m pytest -q
```

The fixture applies migrations and seeds clean test data. Real PostgreSQL checks
cover existing success/error paths, 24 concurrent submissions, duplicate email
races, FK/unique enforcement, rollback, comments, schema drift and migration
roundtrip. A two-process test verifies progress, comments, balances and trace
attempt numbering survive API restarts. CI supplies PostgreSQL 17.

## Manual Swagger checklist

After migration and seeding, Ada is user 1 and Grace is user 2. Expand an
operation, choose **Try it out**, fill `X-User-Id`, then **Execute**.

1. `GET /api/health` → 200, PostgreSQL, two users.
2. `POST /api/users` with `{"email":"learner@example.com","nickname":"learner","password":"password123"}` → 201. Repeat → 409 `EMAIL_TAKEN`; malformed email/short password → 422.
3. `PATCH /api/users/2`, header 2, `{"bio":"Saved profile"}` → 200. Header 1 → 403; missing user 999 → 404.
4. Complete lesson 3 for user 2 → 409 missing prerequisite. Complete lesson 1 → 201; repeat → 409. Complete lesson 2 → 201; resetting lesson 1 now → 409 dependent progress.
5. Submit `{"answer":"wrong"}` to problem 2 as user 2 → WRONG_ANSWER. Submit `{"answer":"[::-1]"}` → ACCEPTED and rewarded. Repeat → accepted with no reward.
6. Add a comment to problem 1 as user 2; problem 2's comment list stays empty. Edit/delete it as user 1 → 403; as user 2 → success.
7. Restart Uvicorn. Verify saved profile, progress, submissions and comments. Submit another trace attempt; its number increases.
8. Create, update and delete an unused problem → 201/200/204. Delete problem 2 after submissions → 409 `PROBLEM_HAS_SUBMISSIONS`.

CI also opens Chromium and uses the actual Swagger **Try it out / Execute**
controls: health 200, registration 201, duplicate 409 and invalid input 422.
Its screenshot and server log are uploaded as `swagger-verification` artifacts.
To repeat locally: install Playwright and Chromium, then run
`python scripts/verify_swagger.py` with the API's port 8000 available.
The checklist above covers the broader manual acceptance workflow.
