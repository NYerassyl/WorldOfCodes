"""Actual FastAPI + canonical Prisma User/AuthSession integration on isolated Postgres.

Never touches a shared database: requires explicit SHARED_DATABASE_TEST_URL
pointing to localhost and a database whose name ends with _test.
"""
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url

from auth_security import AUDIENCE, ISSUER, issue_access_token
from database import database_url, engine
from main import app

pytestmark = pytest.mark.skipif(
    not os.environ.get("SHARED_DATABASE_TEST_URL"),
    reason="Requires an explicit isolated localhost PostgreSQL *_test database.",
)

ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture()
def accounts(monkeypatch):
    explicit = make_url(os.environ["SHARED_DATABASE_TEST_URL"])
    actual = database_url()
    assert explicit.host in ("localhost", "127.0.0.1") and explicit.database.endswith("_test")
    assert (explicit.host, explicit.port or 5432, explicit.database) == (
        actual.host, actual.port or 5432, actual.database
    )
    monkeypatch.setenv("JWT_SECRET", secrets.token_urlsafe(48))
    monkeypatch.setenv("JWT_ACCESS_TTL_SECONDS", "3600")
    created = []
    yield created
    with engine().begin() as db:
        for user_id in created:
            db.execute(text('DELETE FROM "User" WHERE id=:id'), {"id": user_id})


def username():
    return "jwt" + "".join(chr(ord("a") + b % 26) for b in secrets.token_bytes(12))


def new_account(client, accounts, *, password="ExistingPassword123!"):
    nickname = username()
    email = nickname + "@example.com"
    response = client.post("/api/auth/register", json={
        "email": email, "nickname": nickname, "password": password,
    })
    assert response.status_code == 201, response.text
    info = response.json()
    accounts.append(info["user"]["id"])
    return info, email, password


def auth(token):
    return {"Authorization": "Bearer " + token}


def test_register_login_and_shared_storage(client, accounts):
    created, email, password = new_account(client, accounts)
    token = created["token"]
    user = created["user"]
    assert user["email"] == email and user["nickname"] == email.split("@")[0]
    assert {"id", "displayName", "bio", "nickname", "avatarUrl", "xp",
            "level", "renamedAt", "email", "coins", "nicknameChanges",
            "nextNicknameChange"} <= set(user)
    claims = jwt.decode(token, os.environ["JWT_SECRET"],
                        algorithms=["HS256"], issuer=ISSUER, audience=AUDIENCE)
    assert claims["sub"] == user["id"] and claims["jti"]
    assert claims["exp"] - claims["iat"] == 3600
    with engine().connect() as db:
        row = db.execute(text('SELECT "passwordHash" FROM "User" WHERE id=:id'),
                         {"id": user["id"]}).scalar_one()
        session = db.execute(text('''SELECT "tokenHash","expiresAt","revokedAt" FROM "AuthSession"
                                     WHERE "userId"=:id'''), {"id": user["id"]}).mappings().one()
    assert row.startswith("scrypt$16384$8$1$") and password not in row
    assert session["tokenHash"] == hashlib.sha256(token.encode()).hexdigest()
    assert session["expiresAt"].timestamp() == claims["exp"]
    assert session["revokedAt"] is None
    login = client.post("/api/auth/login", json={"email": email.upper(), "password": password})
    assert login.status_code == 200
    assert login.json()["user"] == user
    assert login.json()["token"] != token
    assert client.get("/api/users/me", headers=auth(token)).json()["id"] == user["id"]
    assert client.get("/api/users/me", headers=auth(login.json()["token"])).status_code == 200


def test_invalid_credentials_duplicates_and_pydantic_422(client, accounts):
    created, email, password = new_account(client, accounts)
    nickname = created["user"]["nickname"]
    bad_login = client.post("/api/auth/login", json={"email": email, "password": "bad"})
    assert bad_login.status_code == 401
    assert bad_login.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert client.post("/api/auth/login", json={
        "email": "unknown@example.com", "password": password,
    }).status_code == 401
    reused_email = client.post("/api/auth/register", json={
        "email": email, "nickname": username(), "password": password,
    })
    assert reused_email.status_code == 409 and reused_email.json()["error"]["code"] == "EMAIL_TAKEN"
    reused_nickname = client.post("/api/auth/register", json={
        "email": "diff-" + email, "nickname": nickname, "password": password,
    })
    assert reused_nickname.status_code == 409
    for payload in [
        {"email": "invalid", "nickname": username(), "password": password},
        {"email": "valid@example.com", "nickname": "BAD USER", "password": password},
        {"email": "valid@example.com", "nickname": username(), "password": "short"},
        {"email": "valid@example.com", "nickname": username()},
    ]:
        assert client.post("/api/auth/register", json=payload).status_code == 422
    assert client.post("/api/auth/login", json={"email": "invalid", "password": "pw"}).status_code == 422


def test_protected_jwt_tampering_expiry_issuer_audience_missing_user_and_logout(client, accounts):
    created, _, _ = new_account(client, accounts)
    token = created["token"]
    user_id = created["user"]["id"]
    url = f"/api/users/{user_id}/progress"
    assert client.get(url).status_code == 401
    assert client.get(url, headers=auth(token)).status_code == 200
    raw_header, raw_claims, sig = token.split(".")
    invalid_sig = raw_header + "." + raw_claims + "." + ("x" if sig[0] != "x" else "y") + sig[1:]
    assert client.get(url, headers=auth(invalid_sig)).status_code == 401
    original = jwt.decode(token, os.environ["JWT_SECRET"],
                          algorithms=["HS256"], issuer=ISSUER, audience=AUDIENCE)
    for changes in (
        {"exp": int(time.time()) - 2},
        {"iss": "wrong-issuer"},
        {"aud": "wrong-audience"},
        {"sub": str(uuid4())},
    ):
        forged = jwt.encode({**original, **changes}, os.environ["JWT_SECRET"], algorithm="HS256")
        assert client.get(url, headers=auth(forged)).status_code == 401
    assert client.get(url, headers={"X-User-Id": user_id}).status_code == 401
    assert client.post("/api/auth/logout", headers=auth(token)).status_code == 204
    assert client.get(url, headers=auth(token)).status_code == 401
    assert client.post("/api/auth/logout", headers=auth(token)).status_code == 401


def test_resource_ownership_not_weakened(client, accounts):
    first, _, _ = new_account(client, accounts)
    second, _, _ = new_account(client, accounts)
    user_id = first["user"]["id"]
    other_id = second["user"]["id"]
    assert client.get(f"/api/users/{other_id}/progress", headers=auth(first["token"])).status_code == 403
    assert client.get(f"/api/users/{user_id}/progress", headers=auth(first["token"])).status_code == 200
    assert client.patch(f"/api/users/{other_id}", json={"bio": "spoofed"}, headers=auth(first["token"])).status_code == 403


def test_legacy_opaque_sessions_and_strict_no_jwt_downgrade(client, accounts):
    created, _, _ = new_account(client, accounts)
    uid = created["user"]["id"]
    opaque = secrets.token_urlsafe(32)
    with engine().begin() as db:
        db.execute(text('''INSERT INTO "AuthSession"
            (id,"userId","tokenHash","expiresAt") VALUES
            (:id,:uid,:digest,timezone('UTC',now()) + interval '30 minutes')'''), {
                "id": str(uuid4()), "uid": uid,
                "digest": hashlib.sha256(opaque.encode()).hexdigest(),
            })
    assert client.get("/api/users/me", headers=auth(opaque)).status_code == 200
    # A JWT-shaped token with a matching stored hash is still invalid without a signature.
    fake = "header.payload.signature"
    with engine().begin() as db:
        db.execute(text('''INSERT INTO "AuthSession"
            (id,"userId","tokenHash","expiresAt") VALUES
            (:id,:uid,:digest,timezone('UTC',now()) + interval '30 minutes')'''), {
                "id": str(uuid4()), "uid": uid,
                "digest": hashlib.sha256(fake.encode()).hexdigest(),
            })
    assert client.get("/api/users/me", headers=auth(fake)).status_code == 401
    assert client.post("/api/auth/logout", headers=auth(opaque)).status_code == 204
    assert client.get("/api/users/me", headers=auth(opaque)).status_code == 401


def test_missing_secret_fails_closed_without_creating_account(client, accounts, monkeypatch):
    email = username() + "@example.com"
    monkeypatch.delenv("JWT_SECRET")
    response = client.post("/api/auth/register", json={
        "email": email, "nickname": username(), "password": "ValidPassword123!",
    })
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "JWT_NOT_CONFIGURED"
    with engine().connect() as db:
        assert db.scalar(text('SELECT count(*) FROM "User" WHERE email=:email'),
                         {"email": email}) == 0


def test_concurrent_duplicate_registration_returns_409_not_500(accounts):
    email = username() + "@example.com"
    nickname = username()
    data = {"email": email, "nickname": nickname, "password": "ConcurrentPassword123!"}
    def attempt(_):
        with TestClient(app) as client:
            response = client.post("/api/auth/register", json=data)
            return response.status_code, response.json()
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(attempt, range(3)))
    assert sorted(status for status, _ in results) == [201, 409, 409], results
    accounts.append(next(body["user"]["id"] for status, body in results if status == 201))


def test_existing_node_scrypt_account_can_login_without_reregistering(client, accounts):
    if not shutil.which("node"):
        pytest.skip("Node.js is needed to generate the canonical pre-existing hash")
    password = "ExistingPassword123!"
    script = (
        "import { hashPassword } from './services/learning-backend/src/lib/security.js';"
        "process.stdout.write(await hashPassword('ExistingPassword123!'));"
    )
    generated = subprocess.run(
        ["node", "--input-type=module", "-e", script], cwd=ROOT,
        check=True, capture_output=True, text=True, timeout=15,
    )
    stored = generated.stdout
    assert stored.startswith("scrypt$16384$8$1$")
    uid = str(uuid4())
    nickname = username()
    email = nickname + "@example.com"
    with engine().begin() as db:
        db.execute(text('''INSERT INTO "User"
            (id,email,"passwordHash",nickname,"normalizedNickname","updatedAt")
            VALUES (:id,:email,:hash,:name,:name,timezone('UTC',now()))'''), {
                "id": uid, "email": email, "hash": stored, "name": nickname,
            })
    accounts.append(uid)
    result = client.post("/api/auth/login", json={"email": email, "password": password})
    assert result.status_code == 200
    assert result.json()["user"]["id"] == uid
    assert client.get("/api/users/me", headers=auth(result.json()["token"])).status_code == 200
