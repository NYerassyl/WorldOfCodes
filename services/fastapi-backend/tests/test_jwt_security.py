"""JWT crypto and original Node-compatible password format (no database required)."""
import base64
import os
import secrets
import time
from uuid import uuid4

import jwt
import pytest

from auth_security import (
    AUDIENCE, ISSUER, decode_access_token, hash_password, hash_token,
    issue_access_token, verify_password,
)
from errors import DomainError


@pytest.fixture(autouse=True)
def configured_jwt(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", secrets.token_urlsafe(48))
    monkeypatch.setenv("JWT_ACCESS_TTL_SECONDS", "3600")


def raises_401(token):
    with pytest.raises(DomainError) as error:
        decode_access_token(token)
    assert error.value.status_code == 401


def test_round_trip_required_claims_and_unique_jti():
    user_id = str(uuid4())
    token, expiry = issue_access_token(user_id)
    second, _ = issue_access_token(user_id)
    a, b = decode_access_token(token), decode_access_token(second)
    assert a["sub"] == b["sub"] == user_id
    assert a["iss"] == ISSUER and a["aud"] == AUDIENCE
    assert a["exp"] - a["iat"] == 3600
    assert a["jti"] != b["jti"]
    assert a["exp"] == int(expiry.replace(tzinfo=__import__("datetime").timezone.utc).timestamp())
    assert hash_token(token) != token and len(hash_token(token)) == 64


@pytest.mark.parametrize("alter", [
    lambda p: {**p, "iss": "another-issuer"},
    lambda p: {**p, "aud": "another-audience"},
    lambda p: {**p, "exp": int(time.time()) - 1},
    lambda p: {k: v for k, v in p.items() if k != "jti"},
    lambda p: {**p, "sub": ""},
    lambda p: {**p, "iat": "bad-timestamp"},
    lambda p: {**p, "exp": p["iat"]},
])
def test_invalid_claims_are_401(alter):
    token, _ = issue_access_token(str(uuid4()))
    claims = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"],
                        issuer=ISSUER, audience=AUDIENCE)
    bad = jwt.encode(alter(claims), os.environ["JWT_SECRET"], algorithm="HS256")
    raises_401(bad)


def test_tampered_signature_and_algorithm_confusion_rejected():
    token, _ = issue_access_token(str(uuid4()))
    first, middle, last = token.split(".")
    signature = bytearray(base64.urlsafe_b64decode(last + "=" * (-len(last) % 4)))
    assert signature
    signature[0] ^= 0x01  # Guaranteed binary change, not Base64URL padding ambiguity.
    corrupt = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    assert corrupt != last
    raises_401(first + "." + middle + "." + corrupt)
    payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"],
                         issuer=ISSUER, audience=AUDIENCE)
    raises_401(jwt.encode(payload, os.environ["JWT_SECRET"], algorithm="HS384"))


def test_no_secret_or_invalid_ttl_fails_closed(monkeypatch):
    monkeypatch.delenv("JWT_SECRET")
    with pytest.raises(DomainError) as exc:
        issue_access_token("user")
    assert exc.value.status_code == 503 and exc.value.code == "JWT_NOT_CONFIGURED"
    monkeypatch.setenv("JWT_SECRET", secrets.token_urlsafe(48))
    monkeypatch.setenv("JWT_ACCESS_TTL_SECONDS", "not-an-integer")
    with pytest.raises(DomainError) as exc:
        issue_access_token("user")
    assert exc.value.status_code == 503


def test_scrypt_format_is_compatible_and_salted():
    first, second = hash_password("a strong password"), hash_password("a strong password")
    assert first != second
    assert first.startswith("scrypt$16384$8$1$")
    assert len(first.split("$")[4]) == 32
    assert len(first.split("$")[5]) == 128
    assert verify_password("a strong password", first)
    assert not verify_password("incorrect", first)
    assert not verify_password("a strong password", "plaintext")
    assert not verify_password("a strong password", None)
