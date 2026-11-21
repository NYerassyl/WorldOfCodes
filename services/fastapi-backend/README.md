# WorldOfCodes shared FastAPI API

This service uses the same PostgreSQL `public` schema and Prisma string IDs as
Express. There is no classroom MemoryStore or integer account registration.
FastAPI issues JWT for the existing Prisma users and sessions. Legacy opaque tokens
remain valid until expiry. The unchanged website still issues opaque tokens and
cannot accept JWTs until GPT 1 separately integrates Express/Socket.IO.

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

Prisma remains the canonical account/session *database*. FastAPI now handles
registration, login, logout and JWT verification. Express still owns the live
website login route until GPT 1's separate reverse-proxy change. FastAPI uses
SQLAlchemy for canonical profile/history reads, authorized content/progress CRUD,
credentials and comments. Learning/judge requests still use the canonical Express service. Service outages return
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

## Schema recreation (requirement 3)

This is the **single, shared PostgreSQL schema** used by Express and FastAPI,
not the old classroom in-memory store. **Prisma is the only owner of tables,
constraints, FKs and their history.** Alembic is restricted to the read-only
analytics VIEW `woc_profile_activity` and its own revision tracking table
`woc_fastapi_revision`; never run Alembic autogenerate to recreate Prisma
tables. Both services use the same `public` schema.

### Reproduce from an EMPTY test database

**Prerequisites:** Node 22+, npm, Python 3.12, a local PostgreSQL database that
already exists, and project dependencies. Export `DATABASE_URL` and
`FASTAPI_DATABASE_URL` securely from your local environment/secrets manager.
Both must refer to the same localhost `public` schema whose **database name
ends in `_test`**. Do **not** print either URL, paste real credentials in
terminal logs, or run this verification on production. The script refuses a
non-local, non-`_test`, non-empty database.

From the repository root:

```bash
npm ci --ignore-scripts --no-audit --no-fund
python -m pip install -r services/fastapi-backend/requirements.txt
bash scripts/verify_schema_recreation.sh
```

The shell script executes this **exact creation order** (validate/generate
Prisma Client first, then migrate):

1. `npx prisma migrate deploy --schema services/learning-backend/prisma/schema.prisma`
   — applies **11 original Prisma migrations**, ending in
   `20261117160000_content_authors`. No historical migration files are edited.
2. `node services/learning-backend/prisma/seed.js` — seeds courses, topics,
   lessons and problems using the canonical Prisma model.
3. `(cd services/fastapi-backend && python -m alembic upgrade head)`
   — adds **only** the read-only `woc_profile_activity` VIEW and the
   `woc_fastapi_revision` tracking table. It does **not** create site tables.
4. `(cd services/fastapi-backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000)`
   — standalone manual example; the verification script starts and restarts
   `uvicorn` automatically on an available localhost port, checks `/docs`
   (HTTP 200) and `/openapi.json` (**50 HTTP operations**).

**Alembic naming note:** The migration *filename* is `001_activity.py`,
but its actual `revision` field, and therefore the value printed by
`python -m alembic current`, is **`001_profile_activity`**.
Renaming that revision to `001_activity` would rewrite migration history;
we intentionally leave it unchanged. The script validates the real
`001_profile_activity` revision and the view independently.

### Evidence and negative cases

The verifier compares the set of PostgreSQL tables **before and after**
Alembic: only `woc_fastapi_revision` may be added by Alembic. It checks
11 finished Prisma migrations, `alembic current`, the read-only view and
exactly 50 FastAPI OpenAPI operations. It creates an isolated throwaway
user/session **only in this dedicated test database**, grants author permission
to that process through `FASTAPI_CONTENT_ADMIN_IDS`, and performs real HTTP:

- `POST /api/lessons` → **201**, then `GET /api/lessons` → **200**;
- invalid title `PATCH /api/lessons/{id}` → **422** (Pydantic);
- missing lesson `PATCH /api/lessons/{missing_id}` → **404**;
- circular prerequisite `PATCH /api/lessons/{id}` → **409**;
- valid `PATCH /api/lessons/{id}` → **200**;
- **stop and restart uvicorn**, then `GET /api/lessons` → **200** with the
  same updated title, proving state is persisted in PostgreSQL;
- `DELETE /api/lessons/{id}` → **204** and final GET confirms deletion.

Transcript: `artifacts/schema-recreation-transcript.md`; the CI job
`Canonical FastAPI persistence, Swagger and cross-runtime rewards /
schema-recreation` uploads it as an Actions artifact. See
`docs/schema-recreation-evidence.md` for verification scope and links.

The historical `verify` job in that workflow already runs **Prisma
migrations → seed → Alembic** (each Prisma migrate/seed command repeats only
to check idempotency). The new `schema-recreation` job independently
exercises the same order **once on an empty PostgreSQL instance**.
The content/session business logic is unchanged: this check does not
duplicate logout or session-revocation testing.

## Assignment 7 — FastAPI JWT auth for the existing website

There is **one** Prisma-owned `User` and `AuthSession` in shared PostgreSQL.
No new tables or migrations: Prisma owns table migrations, Alembic still owns
only the read-only `woc_profile_activity` view and revision tracking.

**Server environment (never commit a real secret):**
- `JWT_SECRET`: required, at least 32 UTF-8 bytes; missing/short secret
  yields **503 JWT_NOT_CONFIGURED**, not a fallback key.
- `JWT_ACCESS_TTL_SECONDS`: optional positive integer, default **3600**.
- Existing `DATABASE_URL` and `FASTAPI_DATABASE_URL` must refer to the
  same Prisma PostgreSQL public database; `EXPRESS_INTERNAL_URL` remains
  the URL for non-auth bridge requests.

**Endpoints and unchanged frontend contract:**

```http
POST /api/auth/register
Content-Type: application/json
{"email":"learner@example.com","nickname":"learner","password":"StrongPassword123!"}
201 {"token":"<JWT>","user":{...same existing privateUser fields...}}

POST /api/auth/login
Content-Type: application/json
{"email":"learner@example.com","password":"StrongPassword123!"}
200 {"token":"<JWT>","user":{...same existing privateUser fields...}}

POST /api/auth/logout
Authorization: Bearer <JWT>
204 No Content

GET /api/users/me
Authorization: Bearer <JWT>
200 { ...same privateUser fields, "completedLessons": integer }
```

Deprecated `POST /api/users` is still a registration alias. Pydantic invalid
input → 422; duplicate email/nickname (including races) → 409; invalid
credentials/absent, forged, expired or revoked tokens → 401.

JWT uses **HS256 only**, `iss=worldofcodes-auth`, `aud=worldofcodes-api`,
required `sub` (canonical string User ID), `iat`, `exp`, `jti`.
The token's **SHA-256** hash is stored in existing
`AuthSession.tokenHash`; `AuthSession.expiresAt` matches the JWT expiry.
Both JWT signature/claims and an active matching DB session/user are required.
Logout sets `revokedAt` on that exact session. Legacy opaque sessions without
dots remain accepted until expiry; malformed/invalid JWTs **never** downgrade
to opaque verification. Original salted Node `scrypt$16384$8$1$` password
hashes are verified without requiring existing users to re-register.

**Integration not done in this PR:** the website calls Express on port 4001;
GPT 1 must proxy its three auth endpoints to FastAPI, teach Express HTTP and
Socket.IO to validate JWT + AuthSession, and return a structured 503 if FastAPI
is unavailable. `PATCH /api/users/me` and forwarded judge/progress routes
still go through Express; JWT requests to those routes require the agreed
Express update. Do not roll out JWT to the site until that acceptance passes.
See `docs/ASSIGNMENT7_JWT_FASTAPI_GPT2.md`.

**Tests:** `python -m pytest -q services/fastapi-backend/tests` from repository
root. Unit JWT tests need no database; PostgreSQL integration tests require
an explicit `SHARED_DATABASE_TEST_URL` matching the real local `*_test`
database. The dedicated GitHub Actions JWT workflow provisions PostgreSQL 17,
applies the unchanged 11 Prisma migrations/seed and Alembic profile view, then
runs both JWT and existing FastAPI/Node regression tests. Do not run it on
production or a populated shared database.
