#!/usr/bin/env bash
# Recreate the site's shared schema on an EXISTING, EMPTY, LOCAL *_test database.
# Never prints connection strings, creates/deletes a database, or touches production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

command -v node >/dev/null || { echo "Node.js is required" >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required" >&2; exit 1; }
command -v python >/dev/null || { echo "Python with FastAPI dependencies is required" >&2; exit 1; }

# Refuse non-local, non-test, non-empty databases BEFORE running Prisma commands.
python scripts/verify_schema_recreation.py preflight

echo "[1/5] Prisma schema validation and client generation"
npm run db:validate
npm run db:generate

echo "[2/5] Prisma migrate deploy (all 11 original, unmodified migrations)"
npx prisma migrate deploy --schema services/learning-backend/prisma/schema.prisma

echo "[3/5] Canonical Prisma seed"
node services/learning-backend/prisma/seed.js
python scripts/verify_schema_recreation.py prisma-check

echo "[4/5] Alembic view-only migration (after Prisma and seed)"
(
  cd services/fastapi-backend
  python -m alembic upgrade head
  python -m alembic current
)

echo "[5/5] Verify Alembic revision/view, live uvicorn /docs + 50 operations, CRUD, errors and restart"
python scripts/verify_schema_recreation.py smoke
echo "PASS: artifacts/schema-recreation-transcript.md"
