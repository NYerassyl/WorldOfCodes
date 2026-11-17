"""Safe, reproducible proof of the canonical Prisma → seed → Alembic schema.

Used only by scripts/verify_schema_recreation.sh on an EMPTY localhost *_test DB.
The test creates one temporary account/session directly in the isolated database
for the authorized content-CRUD smoke test. This is NOT a login implementation.
Never log credentials, bearer tokens, connection URLs, or environment variables.
"""

import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import sys
import time
from uuid import uuid4

import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "services/learning-backend/prisma/migrations"
EVIDENCE = ROOT / "artifacts/schema-recreation-transcript.md"
SNAPSHOT = ROOT / "artifacts/schema-recreation-prisma-tables.json"
FASTAPI_DIR = ROOT / "services/fastapi-backend"
# The actual revision inside migrations/versions/001_activity.py. Its filename
# is 001_activity.py, but Alembic CURRENT reports this identifier, not "001_activity".
ALEMBIC_REVISION = "001_profile_activity"
MIGRATION_COUNT = 11
LAST_PRISMA_MIGRATION = "20261117160000_content_authors"


def abort(message):
    raise SystemExit("Schema recreation verification failed: " + message)


def note(message):
    print(message, flush=True)
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    with EVIDENCE.open("a", encoding="utf-8") as out:
        out.write("- " + message + "\n")


def url_identity(value):
    url = make_url(value)
    if url.get_backend_name() != "postgresql":
        abort("Only PostgreSQL is supported.")
    if url.query.get("schema", "public") != "public":
        abort("Only the public Prisma schema is supported.")
    return url.host, url.port or 5432, url.database, url.query.get("schema", "public")


def db_engine():
    raw = os.environ.get("DATABASE_URL")
    if not raw:
        abort("DATABASE_URL must be set to an isolated local test database.")
    try:
        host, port, name, schema = url_identity(raw)
        if host not in {"127.0.0.1", "localhost"} or not name.endswith("_test"):
            abort("Refusing any database except localhost with name ending _test.")
        alternate = os.environ.get("FASTAPI_DATABASE_URL")
        if alternate and url_identity(alternate) != (host, port, name, schema):
            abort("DATABASE_URL and FASTAPI_DATABASE_URL target different databases.")
        safe_url = make_url(raw).set(drivername="postgresql+psycopg").difference_update_query(["schema"])
        engine = create_engine(safe_url, pool_pre_ping=True, connect_args={
            "options": "-c timezone=UTC -c search_path=public"
        })
        with engine.connect() as conn:
            conn.scalar(text("SELECT 1"))
        return engine
    except SystemExit:
        raise
    except Exception:
        abort("Cannot connect to the isolated local test database; no URL displayed.")


def migration_names():
    names = sorted(
        p.name for p in MIGRATIONS.iterdir()
        if p.is_dir() and (p / "migration.sql").is_file()
    )
    if len(names) != MIGRATION_COUNT or names[-1] != LAST_PRISMA_MIGRATION:
        abort("Expected 11 canonical Prisma migration directories ending in content_authors.")
    return names


def public_tables(conn):
    return sorted(conn.execute(text(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )).scalars().all())


def preflight():
    EVIDENCE.parent.mkdir(exist_ok=True)
    EVIDENCE.write_text(
        "# Schema recreation: clean local PostgreSQL evidence\n\n"
        "Execution: scripts/verify_schema_recreation.sh\n\n"
        "Database name, URL, credentials, tokens and test identities are deliberately omitted.\n\n"
        "## Verified steps\n\n",
        encoding="utf-8",
    )
    names = migration_names()
    engine = db_engine()
    with engine.connect() as conn:
        if public_tables(conn):
            abort("The public schema already has tables. Start with an empty dedicated *_test database.")
        if conn.scalar(text("SELECT to_regclass('public.woc_profile_activity')")) is not None:
            abort("The view already exists; an empty test database is required.")
    engine.dispose()
    note("PASS: connected to an EMPTY, local PostgreSQL *_test database; no existing public tables or profile view")
    note("PASS: 11 migration files present; final migration is 20261117160000_content_authors")
    return names


def prisma_check():
    expected = migration_names()
    engine = db_engine()
    with engine.connect() as conn:
        names = conn.execute(text("""
            SELECT migration_name FROM "_prisma_migrations"
            WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
            ORDER BY migration_name
        """)).scalars().all()
        if names != expected:
            abort("Prisma did not apply the expected 11 unmodified migration files.")
        counts = {
            table: conn.scalar(text('SELECT count(*) FROM "' + table + '"'))
            for table in ("Course", "Topic", "Lesson", "Problem")
        }
        if any(value < 1 for value in counts.values()):
            abort("Prisma seed did not populate all required learning resources.")
        tables = public_tables(conn)
        if "woc_fastapi_revision" in tables:
            abort("Alembic version table appeared before the Alembic step.")
        if conn.scalar(text("SELECT to_regclass('public.woc_profile_activity')")) is not None:
            abort("Profile view appeared before Alembic step.")
    engine.dispose()
    SNAPSHOT.write_text(json.dumps(tables, indent=2), encoding="utf-8")
    note("PASS: prisma migrate deploy applied exactly 11 finished migrations, including content_authors")
    note("PASS: Prisma seed populated Course/Topic/Lesson/Problem and Alembic view did not yet exist")


def check_alembic():
    engine = db_engine()
    with engine.connect() as conn:
        revision = conn.scalar(text("SELECT version_num FROM woc_fastapi_revision"))
        if revision != ALEMBIC_REVISION:
            abort("Unexpected Alembic current revision; expected actual ID 001_profile_activity.")
        kind = conn.scalar(text("""
            SELECT c.relkind FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname='public' AND c.relname='woc_profile_activity'
        """))
        if kind != "v":
            abort("woc_profile_activity is not an SQL VIEW.")
        before = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
        after = public_tables(conn)
        if after != sorted(before + ["woc_fastapi_revision"]):
            abort("Alembic added/removed unexpected tables; it may own only its version table.")
        # The Prisma migration history must remain complete after Alembic.
        names = conn.execute(text("""
            SELECT migration_name FROM "_prisma_migrations"
            WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
            ORDER BY migration_name
        """)).scalars().all()
        if names != migration_names():
            abort("Prisma history changed during Alembic upgrade.")
    engine.dispose()
    cli = subprocess.run(
        [sys.executable, "-m", "alembic", "current"], cwd=FASTAPI_DIR,
        text=True, capture_output=True, timeout=25, check=False,
    )
    if cli.returncode != 0 or not re.search(r"\b001_profile_activity\b", cli.stdout):
        abort("The alembic current command did not report 001_profile_activity.")
    note("PASS: alembic current = 001_profile_activity (revision defined in 001_activity.py)")
    note("PASS: woc_profile_activity is a read-only SQL VIEW")
    note("PASS: Alembic created only its woc_fastapi_revision tracking table; Prisma's 11 migrations remain unchanged")


def fixture_account(conn):
    uid = str(uuid4())
    sid = str(uuid4())
    token = secrets.token_urlsafe(48)
    # Canonical username policy: lower-case a-z only, length 3..24.
    nickname = "schema" + "".join(chr(ord("a") + value % 26) for value in secrets.token_bytes(12))
    conn.execute(text("""
        INSERT INTO "User" (id,email,"passwordHash",nickname,"normalizedNickname","updatedAt")
        VALUES (:id,:email,:password,:nickname,:nickname,timezone('UTC',CURRENT_TIMESTAMP))
    """), {
        "id": uid, "email": nickname + "@example.invalid", "password": "isolated-test-fixture-only",
        "nickname": nickname,
    })
    conn.execute(text("""
        INSERT INTO "AuthSession" (id,"userId","tokenHash","expiresAt")
        VALUES (:sid,:uid,:digest,timezone('UTC',CURRENT_TIMESTAMP) + interval '20 minutes')
    """), {"sid": sid, "uid": uid, "digest": hashlib.sha256(token.encode()).hexdigest()})
    return uid, token


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def start_server(port, author_id, log_file):
    env = dict(os.environ)
    env["FASTAPI_CONTENT_ADMIN_IDS"] = author_id
    # Do not log the environment or credentials.
    process = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "main:app",
            "--host", "127.0.0.1", "--port", str(port),
        ], cwd=FASTAPI_DIR, env=env, stdout=log_file, stderr=subprocess.STDOUT,
    )
    base = "http://127.0.0.1:" + str(port)
    deadline = time.monotonic() + 35
    while time.monotonic() < deadline:
        if process.poll() is not None:
            abort("uvicorn exited during startup (inspect CI artifact logs).")
        try:
            with httpx.Client(timeout=2, trust_env=False) as client:
                response = client.get(base + "/docs")
                if response.status_code == 200:
                    return process, base
        except httpx.HTTPError:
            pass
        time.sleep(0.2)
    stop_server(process)
    abort("uvicorn /docs did not become available.")


def stop_server(process):
    if process is None:
        return
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=12)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=12)


def assert_status(response, expected, label):
    if response.status_code != expected:
        # Avoid including the raw response or auth/DB details in logs.
        abort(label + ": expected HTTP " + str(expected) + ", received " + str(response.status_code))


def smoke():
    check_alembic()
    engine = db_engine()
    with engine.begin() as conn:
        uid, token = fixture_account(conn)
        topic = conn.scalar(text('SELECT id FROM "Topic" ORDER BY id LIMIT 1'))
        if not topic:
            abort("No seeded Topic available for lesson CRUD.")
    port = free_port()
    proc = None
    log_path = EVIDENCE.parent / "schema-recreation-uvicorn.log"
    lesson_id = None
    try:
        with log_path.open("a", encoding="utf-8") as logfile:
            proc, base = start_server(port, uid, logfile)
            with httpx.Client(base_url=base, timeout=15, trust_env=False) as client:
                docs = client.get("/docs")
                assert_status(docs, 200, "Swagger /docs")
                openapi = client.get("/openapi.json")
                assert_status(openapi, 200, "OpenAPI")
                paths = openapi.json()["paths"]
                operations = sum(
                    method in {"get", "post", "patch", "put", "delete"}
                    for methods in paths.values() for method in methods
                )
                if operations != 50:
                    abort("Expected 50 OpenAPI operations, got " + str(operations))
                note("PASS: uvicorn served /docs (HTTP 200) and /openapi.json (exactly 50 operations)")
                headers = {"Authorization": "Bearer " + token}
                payload = {
                    "topicId": topic, "title": "Schema recreation lesson",
                    "theoryMd": "A verified lesson created on a fresh Prisma database.",
                    "position": 9999,
                }
                result = client.post("/api/lessons", json=payload, headers=headers)
                assert_status(result, 201, "Lesson POST")
                lesson_id = result.json()["id"]
                note("PASS: POST /api/lessons → 201 (authorized content author)")
                result = client.get("/api/lessons", params={"topic": topic})
                assert_status(result, 200, "Lesson list GET")
                if not any(row["id"] == lesson_id for row in result.json()):
                    abort("New lesson not returned by GET /api/lessons")
                note("PASS: GET /api/lessons → 200; created lesson present")
                result = client.patch("/api/lessons/" + lesson_id, json={"title": "X"}, headers=headers)
                assert_status(result, 422, "Lesson PATCH invalid")
                note("PASS: PATCH /api/lessons/{id} invalid title → 422 (Pydantic)")
                result = client.patch(
                    "/api/lessons/" + str(uuid4()), json={"title": "Valid update"},
                    headers=headers,
                )
                assert_status(result, 404, "Lesson PATCH missing")
                note("PASS: PATCH /api/lessons/{missing_id} → 404")
                result = client.patch(
                    "/api/lessons/" + lesson_id, json={"prerequisiteId": lesson_id},
                    headers=headers,
                )
                assert_status(result, 409, "Lesson PATCH prerequisite cycle")
                if result.json().get("error", {}).get("code") != "PREREQUISITE_CYCLE":
                    abort("Expected domain code PREREQUISITE_CYCLE for 409.")
                note("PASS: PATCH /api/lessons/{id} circular prerequisite → 409 PREREQUISITE_CYCLE")
                result = client.patch(
                    "/api/lessons/" + lesson_id,
                    json={"title": "Schema recreation updated"},
                    headers=headers,
                )
                assert_status(result, 200, "Lesson PATCH valid")
                if result.json()["title"] != "Schema recreation updated":
                    abort("PATCH response did not include changed title")
                note("PASS: PATCH /api/lessons/{id} → 200; title updated")
            stop_server(proc)
            proc = None
            note("PASS: first uvicorn process stopped; testing durable state after restart")
            proc, base = start_server(port, uid, logfile)
            with httpx.Client(base_url=base, timeout=15, trust_env=False) as client:
                reopened = client.get("/api/lessons", params={"topic": topic})
                assert_status(reopened, 200, "Lesson list after restart")
                if not any(
                    row["id"] == lesson_id and row["title"] == "Schema recreation updated"
                    for row in reopened.json()
                ):
                    abort("Lesson changes did not persist across uvicorn restart.")
                note("PASS: GET /api/lessons after uvicorn restart → 200; updated title persisted")
                removed = client.delete("/api/lessons/" + lesson_id, headers=headers)
                assert_status(removed, 204, "Lesson DELETE")
                note("PASS: DELETE /api/lessons/{id} → 204")
                listing = client.get("/api/lessons", params={"topic": topic})
                assert_status(listing, 200, "Lesson list after delete")
                if any(row["id"] == lesson_id for row in listing.json()):
                    abort("Deleted lesson still appears in list.")
                note("PASS: GET /api/lessons after DELETE → 200; lesson absent")
            with engine.connect() as conn:
                if conn.scalar(text('SELECT count(*) FROM "Lesson" WHERE id=:id'), {"id": lesson_id}):
                    abort("Deleted lesson still exists in PostgreSQL.")
            note("PASS: PostgreSQL confirms lesson deletion; no in-memory fallback")
    finally:
        stop_server(proc)
        # Only remove the generated test fixture from an isolated localhost DB.
        with engine.begin() as conn:
            if lesson_id is not None:
                conn.execute(text('DELETE FROM "Lesson" WHERE id=:id AND "createdById"=:uid'), {
                    "id": lesson_id, "uid": uid,
                })
            conn.execute(text('DELETE FROM "User" WHERE id=:uid'), {"uid": uid})
        engine.dispose()
    note("PASS: cleaned up temporary test account and session")
    note("SUCCESS: Prisma → seed → Alembic → uvicorn /docs, 50 operations, CRUD, errors, persistence")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"preflight", "prisma-check", "smoke"}:
        abort("Usage: verify_schema_recreation.py preflight|prisma-check|smoke")
    {"preflight": preflight, "prisma-check": prisma_check, "smoke": smoke}[sys.argv[1]]()
