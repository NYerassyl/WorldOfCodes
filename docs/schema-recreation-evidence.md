# Schema recreation evidence — GPT 2

Source branch: `docs/gpt2-schema-recreation`, based on
`feat/profile-insights@25db51a9853f8c69c255282ecd87ca943a180f39`.
Target PR: `feat/profile-insights`, **not** `main`.

## Canonical ownership and exact revision

- Prisma owns all shared Express/FastAPI PostgreSQL tables and the original
  **11 additive migrations**, ending in `20261117160000_content_authors`.
- After the canonical seed, Alembic creates only the
  `woc_profile_activity` read-only view and its
  `woc_fastapi_revision` tracking table.
- Filename: `001_activity.py`. Actual revision identifier:
  `001_profile_activity`. `alembic current` prints the latter; no
  migration identifier/history has been rewritten.
- The existing `Canonical FastAPI persistence, Swagger and cross-runtime
  rewards` job runs Prisma migrate → seed → Alembic (with repeat calls to
  verify Prisma migration/seed idempotency). The new `schema-recreation`
  job checks the clean-database first-time recreation separately.

## Exact commands on an isolated empty *_test DB

Export `DATABASE_URL` and optional `FASTAPI_DATABASE_URL` privately (never
echo the values), then run from the repository root:

```bash
npm ci --ignore-scripts --no-audit --no-fund
python -m pip install -r services/fastapi-backend/requirements.txt
bash scripts/verify_schema_recreation.sh
```

The verifier refuses non-local, non-test or populated databases and never
clears or drops one. It records a *real execution transcript*, without
credentials or bearer tokens, in `artifacts/schema-recreation-transcript.md`.

## Assertions and artifacts

| Verification | Actual assertion |
|---|---|
| Empty DB | No public PostgreSQL tables or profile view |
| Prisma | Exactly 11 migration files; 11 finished DB migration records with matching names |
| Seed | Course, Topic, Lesson and Problem contain records |
| Alembic | `alembic current` reports `001_profile_activity` |
| View ownership | `woc_profile_activity` is a view, no extra Alembic-owned tables except revision tracking |
| Swagger | uvicorn serves `/docs` with 200 |
| Routes | Live `/openapi.json` has exactly **50** operations |
| Create/read | `POST /api/lessons` 201; `GET /api/lessons` 200 |
| Validation | Invalid PATCH 422 |
| Not found | Unknown lesson PATCH 404 |
| Conflict | Self-prerequisite PATCH 409 with `PREREQUISITE_CYCLE` |
| Update | Valid PATCH 200 |
| Durability | Restart uvicorn and retrieve the updated lesson via GET 200 |
| Delete | DELETE 204; GET no longer lists deleted lesson |
| Cleanup | Generated test author/session removed from isolated DB |

The script uses a temporary test-only user/session row to authenticate the
authorized lesson CRUD request. It does **not** change or re-test Express token
revocation; the source of truth remains the canonical Prisma `AuthSession`.
No production DB, `main`, Socket.IO, Express runtime or historical Prisma
migration is modified.

**CI results and live transcript:** see the `schema-recreation-evidence`
artifact in the `Canonical FastAPI persistence, Swagger and cross-runtime
rewards` workflow for this PR. Record the exact run ID and observed results
in the PR after the GitHub Actions job finishes.
