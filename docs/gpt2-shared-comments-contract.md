# GPT2 shared comments bridge

Canonical identity/history is Prisma-owned, as confirmed by the integrator.
This change builds on PR #15 (`abad7cb3dd3c6cb41c47a18a168fdc17dbb3a686`)
and reuses its shared database rather than importing PR #16's demo identities.
PR #16 stays a separate database-assignment review.

## Ownership and data flow

- Express owns registration/login/logout and opaque Bearer tokens. `AuthSession.userId`
  is the existing string UUID `User.id`; `Problem.id` is the existing string ID
  (for example `py-double`), and must not be validated as a UUID.
- Challenges code submissions remain `POST /api/problems/:id/submit` → existing
  isolated judge → Prisma `Submission`. This bridge does not create another
  submission history or modify learning rewards. PR #15 analytics reads the same
  canonical `Submission` history.
- Prisma owns the new `ProblemComment` table and both FKs. FastAPI maps it with
  SQLAlchemy; it does not create/alter the Prisma tables through Alembic.
- Browser → same-origin Express `/api/problems/:id/comments` → FastAPI at
  `FASTAPI_INTERNAL_URL`. Express reuses `makeRequireAuth` for writes and forwards
  the actual Authorization header, never a browser-supplied actor ID.
- FastAPI independently hashes/validates that Bearer token against `AuthSession`,
  checks expiry/revocation, and derives authorId from that row on every mutation.
  `X-User-Id` cannot authorize site comments. Extra authorId/userId payload fields
  are rejected. A session shared row lock orders mutations relative to logout.

## HTTP contract

| Method | Path | Request / response |
| --- | --- | --- |
| GET | `/api/problems/{string_id}/comments?limit=50&before={comment_id}` | Public; `{comments, nextCursor}`; newest first; max 100 |
| POST | `/api/problems/{string_id}/comments` | Bearer, `{body}` → 201 comment |
| PATCH | `/api/problems/{string_id}/comments/{comment_id}` | Author Bearer, `{body}` → 200 comment |
| DELETE | `/api/problems/{string_id}/comments/{comment_id}` | Author Bearer → 204 |

Comment output: `{id, problemId, author:{id,nickname,avatarUrl}, body, createdAt,
updatedAt}`. No email, password or token hash is returned. Dates use UTC ISO8601.
Body must contain 1–2000 characters after trimming. Unknown/unpublished problems
return 404. A comment under a different problem returns 404, a nonauthor mutation
403, invalid/expired/revoked identity 401, invalid payload 422, and upstream outage
503. Text is rendered as escaped React text. UI controls are only a convenience;
server ownership checks enforce permissions.

## Database and migration order

Use an isolated shared test database first:

```sh
export DATABASE_URL='postgresql://woc:woc@127.0.0.1:5432/worldofcodes_shared_test?schema=public'
export FASTAPI_DATABASE_URL='postgresql+psycopg://woc:woc@127.0.0.1:5432/worldofcodes_shared_test'
export SHARED_DATABASE_TEST_URL='postgresql://woc:woc@127.0.0.1:5432/worldofcodes_shared_test'
export FASTAPI_INTERNAL_URL='http://127.0.0.1:8000'
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
cd services/fastapi-backend
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn main:app --host 127.0.0.1 --port 8000
# Another terminal from repository root, with DATABASE_URL exported:
npm run build
npm start
```

Prisma migrations create shared tables, including additive
`20261117020000_problem_comments`; only then PR #15 Alembic creates the
`woc_profile_activity` view (`woc_fastapi_revision` version table). Both URLs
must identify the same host/port/database/public schema; mismatches are rejected.
Prisma's `schema=public` is stripped before connecting via psycopg. Sessions set
UTC and public search_path explicitly. Separate DB credentials/roles can be used
for the same target database. No credentials belong in frontend environment.

Do not run PR #16's demo `20261117_01` migration or demo seed as part of this
site integration: its lowercase integer-ID tables remain outside this contract.
Merging PR #15 and #16's overlapping configuration/history still requires the
integrator to preserve the two roles explicitly, rather than replacing one
`database.py` with the other.

## Acceptance and verification

Open Challenges (`#algorithms`), choose two distinct seeded problems. With account
A, post on problem 1 and reload. The comment must remain and show A as author.
Problem 2 must not show it. Account B sees it on problem 1 but has no owner
controls, and direct PATCH/DELETE attempts return 403. A can edit/reload/delete.
A forged authorId body is rejected. FastAPI restart must preserve the comment.

`tests/test_shared_comments.py` tests actual PostgreSQL identity, ownership,
scoping, pagination, expired/revoked tokens, spoofing and shared profile-history
visibility. It runs only with explicit localhost `SHARED_DATABASE_TEST_URL`
ending in `_test`; fixtures remove only their own generated records.

`python scripts/verify-comments-browser.py` starts real Express/FastAPI services,
registers two real accounts, uses actual Challenges pages and checks the full
scenario above, including FastAPI restart. It requires a built frontend,
Playwright Chromium and the migrated/seeded database. Evidence is written to
`artifacts/`; CI uploads it. Mock bridge tests cover transport errors only and
are not presented as PostgreSQL/browser evidence.

No main merge or production migration is performed by this change.
