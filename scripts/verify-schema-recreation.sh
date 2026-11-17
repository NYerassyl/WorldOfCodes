#!/usr/bin/env bash
# Recreates the WorldOfCodes schema from an EMPTY PostgreSQL database and proves
# the FastAPI contract: Prisma owns the tables, Alembic adds the profile view.
#
#   export DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/EMPTY_DB?schema=public'
#   bash scripts/verify-schema-recreation.sh
#
# Optional: FASTAPI_DATABASE_URL, FASTAPI_PORT (default 8110).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${DATABASE_URL:?Set DATABASE_URL to an empty PostgreSQL database}"
export DATABASE_URL
export FASTAPI_DATABASE_URL="${FASTAPI_DATABASE_URL:-$DATABASE_URL}"
PSQL_URL="${DATABASE_URL%%\?*}"
PORT="${FASTAPI_PORT:-8110}"
SCHEMA="services/learning-backend/prisma/schema.prisma"
PY="services/fastapi-backend/.venv/bin/python"
[ -x "$PY" ] || PY="python3"

echo "== 1. Prisma migrations"
npx prisma migrate deploy --schema "$SCHEMA"

migrations="$(find services/learning-backend/prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
if [ "$migrations" -ne 11 ]; then
  echo "expected 11 committed Prisma migrations, found $migrations" >&2
  exit 1
fi
echo "Prisma: $migrations migrations applied"

echo "== 2. Seed"
node --env-file-if-exists=.env services/learning-backend/prisma/seed.js

echo "== 3. Alembic view"
(
  cd services/fastapi-backend
  "$OLDPWD/$PY" -m alembic upgrade head
)
view="$(psql "$PSQL_URL" -tAc "SELECT to_regclass('public.woc_profile_activity')")"
if [ "$view" != "woc_profile_activity" ]; then
  echo "Alembic view woc_profile_activity is missing" >&2
  exit 1
fi
echo "Alembic: 001_activity (view woc_profile_activity present)"

echo "== 4. FastAPI contract on the recreated database"
LOG="${TMPDIR:-/tmp}/woc-schema-fastapi.log"
(
  cd services/fastapi-backend
  exec env EXPRESS_INTERNAL_URL="${EXPRESS_INTERNAL_URL:-http://127.0.0.1:4001}" \
    "$OLDPWD/$PY" -m uvicorn main:app --app-dir . --host 127.0.0.1 --port "$PORT"
) >"$LOG" 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

ready=0
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null; then ready=1; break; fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then
  echo "FastAPI did not become ready on port $PORT" >&2
  cat "$LOG" >&2 || true
  exit 1
fi

curl -sf "http://127.0.0.1:$PORT/api/health" | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const health = JSON.parse(s);
  if (health.storage !== "postgresql") throw new Error("health did not read PostgreSQL");
  if (health.lessons !== 12 || health.problems !== 31) throw new Error("seed counts changed");
  console.log(`FastAPI: health ok — lessons=${health.lessons} problems=${health.problems}`);
});'

curl -sf "http://127.0.0.1:$PORT/openapi.json" | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const openapi = JSON.parse(s);
  const paths = Object.keys(openapi.paths);
  const operations = paths.flatMap((path) => Object.keys(openapi.paths[path]));
  if (operations.length !== 50) throw new Error(`expected 50 operations, found ${operations.length}`);
  console.log(`OpenAPI: paths=${paths.length} operations=${operations.length}`);
});'

echo "schema recreation OK"
