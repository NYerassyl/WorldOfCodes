# Schema recreation — Prisma tables + Alembic view (25db51a)

Decision A (agreed 2026-11-17): Prisma stays the single owner of the shared
`public` tables used by Express and FastAPI. Alembic owns only the read-only
profile activity view (`001_activity`). This keeps one migration history for the
data both runtimes read, instead of duplicating table DDL in two tools.

The full schema is still recreatable from an empty database:

```sh
export DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/EMPTY_DB?schema=public'
export FASTAPI_DATABASE_URL='postgresql+psycopg://USER:PASSWORD@127.0.0.1:5432/EMPTY_DB'
bash scripts/verify-schema-recreation.sh
```

The script performs and verifies, in order:

1. `prisma migrate deploy` — 11 committed migrations:
   `20261103000000_init` … `20261117160000_content_authors`.
2. `prisma` seed — courses, lessons, problems and copy exercises.
3. `alembic upgrade head` — revision `001_activity` creates the read-only view
   `woc_profile_activity` over `Submission`/`Problem`.
4. Starts FastAPI against the recreated database and asserts:
   - `/api/health` reports the shared row counts;
   - `/openapi.json` exposes **50 operations** on 36 paths.

Running services afterwards: Express `:4001`, FastAPI `:8099` (or `:8000`), both
with the same `DATABASE_URL` / `FASTAPI_DATABASE_URL` pair.

## Why not Alembic-owned tables

- Express, Prisma and FastAPI must see identical tables; two migration owners
  would create drift on every schema change.
- PR #16 keeps the independent demo implementation that creates tables through
  Alembic; it is not applied to this database (see `services/fastapi-backend/README.md`).
- CI enforces the same order for every pull request: Prisma deploy → seed →
  `alembic upgrade head`.

## Verified evidence (local, 2026-11-17)

```
Prisma: 11 migrations applied
Seed: 2 courses, 12 lessons, 31 problems, 3 copy exercises
Alembic: 001_activity (view woc_profile_activity present)
FastAPI: health ok — lessons=12, problems=31
OpenAPI: paths=36 operations=50
```
