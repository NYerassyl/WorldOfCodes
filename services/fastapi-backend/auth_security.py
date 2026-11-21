"""JWT and scrypt compatible with the site's canonical Node/Prisma credentials.

JWT_SECRET is required for JWT issuance/verification; there is no fallback key.
Opaque legacy sessions do not need this secret during the migration window.
"""
import hashlib
import hmac
import os
import re
import secrets
import time
from datetime import datetime, timezone
from uuid import uuid4

import jwt
from jwt import InvalidTokenError

from errors import DomainError

ISSUER = "worldofcodes-auth"
AUDIENCE = "worldofcodes-api"
ALGORITHM = "HS256"
REQUIRED_CLAIMS = ("sub", "iat", "exp", "jti", "iss", "aud")
SCRYPT_PATTERN = re.compile(r"^scrypt\$16384\$8\$1\$([0-9a-f]{32})\$([0-9a-f]{128})$")
# Process unknown emails through the same expensive KDF to limit timing signals.
UNKNOWN_HASH = "scrypt$16384$8$1$" + "00" * 16 + "$" + "00" * 64


def _jwt_settings():
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise DomainError(503, "JWT_NOT_CONFIGURED", "JWT authentication is not configured.")
    raw_ttl = os.environ.get("JWT_ACCESS_TTL_SECONDS", "3600")
    try:
        ttl = int(raw_ttl)
    except (ValueError, TypeError) as exc:
        raise DomainError(503, "JWT_NOT_CONFIGURED", "JWT authentication is not configured.") from exc
    if not 1 <= ttl <= 2_592_000:
        raise DomainError(503, "JWT_NOT_CONFIGURED", "JWT authentication is not configured.")
    return secret, ttl


def issue_access_token(user_id: str):
    """Produce a signed token and its matching UTC expiry (Prisma timestamp is naive)."""
    secret, ttl = _jwt_settings()
    now = int(time.time())
    claims = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + ttl,
        "jti": str(uuid4()),
        "iss": ISSUER,
        "aud": AUDIENCE,
    }
    token = jwt.encode(claims, secret, algorithm=ALGORITHM)
    return token, datetime.fromtimestamp(claims["exp"], timezone.utc).replace(tzinfo=None)


def decode_access_token(token: str) -> dict:
    secret, _ttl = _jwt_settings()
    try:
        claims = jwt.decode(
            token, secret, algorithms=[ALGORITHM],
            issuer=ISSUER, audience=AUDIENCE,
            options={"require": list(REQUIRED_CLAIMS), "verify_signature": True,
                     "verify_exp": True, "verify_iat": True,
                     "verify_iss": True, "verify_aud": True},
            leeway=0,
        )
    except (InvalidTokenError, ValueError, TypeError) as exc:
        raise DomainError(401, "UNAUTHORIZED", "Invalid or expired JWT.") from exc
    if (
        not isinstance(claims.get("sub"), str) or not claims["sub"]
        or not isinstance(claims.get("jti"), str) or not claims["jti"]
        or type(claims.get("iat")) is not int or type(claims.get("exp")) is not int
        or claims["exp"] <= claims["iat"]
    ):
        raise DomainError(401, "UNAUTHORIZED", "Invalid JWT claims.")
    return claims


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt,
                            n=16384, r=8, p=1, dklen=64, maxmem=64 * 1024 * 1024)
    return "scrypt$16384$8$1$" + salt.hex() + "$" + digest.hex()


def verify_password(password: str, stored: str | None) -> bool:
    if not isinstance(password, str):
        return False
    value = stored if isinstance(stored, str) else UNKNOWN_HASH
    match = SCRYPT_PATTERN.fullmatch(value)
    if not match:
        return False
    digest = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(match.group(1)),
                            n=16384, r=8, p=1, dklen=64, maxmem=64 * 1024 * 1024)
    return hmac.compare_digest(digest, bytes.fromhex(match.group(2)))
