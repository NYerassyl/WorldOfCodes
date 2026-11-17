# WorldOfCodes shared FastAPI API

This service uses the same PostgreSQL `public` schema and Prisma string IDs as
Express. There is no classroom MemoryStore or integer account registration.
Register/login once, then use the returned Bearer token in `/docs` → Authorize.
The same token works in the site and FastAPI; logout/revocation is shared.

Run Express on port 4001 and FastAPI on port 8000 after Prisma migrations/seed,
then the existing profile Alembic migration. `DATABASE_URL` and
`FASTAPI_DATABASE_URL` must identify the same database/public schema.
`EXPRESS_INTERNAL_URL` defaults to `http://127.0.0.1:4001`;
`FASTAPI_INTERNAL_URL` on Express points to `http://127.0.0.1:8000`.

Export the connection variables in the shell running Alembic/FastAPI (Express
loading its own `.env` does not export variables into a separate Python process):

```sh
export DATABASE_URL='postgresql://woc:YOUR_PASSWORD@127.0.0.1:5432/worldofcodes_test?schema=public'
export FASTAPI_DATABASE_URL='postgresql+psycopg://woc:YOUR_PASSWORD@127.0.0.1:5432/worldofcodes_test'
export EXPRESS_INTERNAL_URL='http://127.0.0.1:4001'
```

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
cd services/fastapi-backend
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Recreating the schema from scratch

Prisma owns the shared `public` tables; Alembic adds only the profile view.
From an empty database:

```sh
export DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/EMPTY_DB?schema=public'
bash scripts/verify-schema-recreation.sh
```

The script applies 11 Prisma migrations, seeds, runs `alembic upgrade head`
(`001_activity`) and asserts the FastAPI contract (50 operations on 36 paths).
See `docs/schema-recreation-25db51a.md` for the decision and evidence.

Express remains the canonical password/session/profile/judge/reward service.
FastAPI exposes those typed operations through a bounded HTTP adapter and uses
SQLAlchemy for canonical profile/history reads, authorized content/progress CRUD,
credentials and comments. Neither service forwards learning calls back to
FastAPI; only comments/activity flow Express → FastAPI. Service outages return
503 rather than falling back to local accounts or invented judge results.

`GET /api/users/{id}` is a public ID lookup, with no email/password/coins.
`GET /api/users/me` is private. Submission source and per-user progress are owner
only. `PATCH /api/users/{id}/credentials` requires the current password and uses
the canonical scrypt format, then revokes every old session in both runtimes.

Intentional migration from the classroom contract:

- IDs are canonical strings; `X-User-Id` no longer authenticates.
- `POST /api/users` is a deprecated alias for `/api/auth/register`, returning
  `{token,user}`. Login and logout are now available in Swagger.
- Graded requests accept `{code}` and invoke the real isolated Python/SQL judge;
  classroom `{answer}` text equality cannot grant site XP.
- Lesson completion is derived from canonical ProblemCompletion. The legacy
  completion endpoint confirms earned progress without adding rewards. Completed
  progress cannot be reset to replay rewards; incomplete progress may be reset.
- Content CRUD uses canonical `topicId`, `theoryMd`, `lessonId`, function starter
  and test cases, rather than the unrelated demo-level/answer columns.
- Content CRUD requires an allowlisted canonical User.id in
  `FASTAPI_CONTENT_ADMIN_IDS` (comma separated), plus ownership. Ordinary players
  cannot create rewarding problems. Existing seeded content has no creator.
  Published problems are immutable; publish a new ID for a changed version.
  Drafts with submissions/matches/completions are protected against deletion.
  Adding/publishing problems also requires parent-lesson ownership and no learner
  history; completed lessons cannot silently acquire new unsolved requirements.
- Prisma owns the additive nullable `createdById` FKs on Lesson/Problem. Alembic
  continues to own only the profile view/version table. PR #16's independent
  demo migrations are not applied to this database. Existing demo records are
  not automatically interpreted as site accounts or submissions.

The obsolete demo runtime and tests were replaced, not mounted alongside this
API. PR #16 retains the separate assignment implementation/history. Tests now
cover the canonical transport contract, trusted Trace references, real shared
PostgreSQL comments and actual Swagger workflows. Run:

```sh
python -m pytest -q services/fastapi-backend/tests
# After a dedicated localhost *_test database, migrations and worker images:
python scripts/verify-shared-fastapi.py
```

The new workflow also repeats comments, learning and editor browser acceptance
on this runtime. Evidence includes screenshots, exact Swagger status codes and
both service logs. Main merging belongs to GPT1; production migration/deployment
is not part of this change.
