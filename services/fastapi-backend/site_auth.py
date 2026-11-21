"""Shared JWT and legacy session validation for Prisma-owned User/AuthSession.

Each JWT is validated cryptographically BEFORE the database token hash lookup.
Any token containing a dot is treated ONLY as JWT: there is no downgrade
to legacy opaque authentication after JWT validation fails.
"""
import re
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth_security import decode_access_token, hash_token
from database import database_session
from errors import DomainError

SiteSession = Annotated[Session, Depends(database_session, scope="function")]
LEGACY_TOKEN = re.compile(r"^[A-Za-z0-9_-]{32,128}$")


@dataclass(frozen=True)
class SessionIdentity:
    user_id: str
    session_id: str
    token_kind: str


BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(HTTPBearer(auto_error=False)),
]


def _resolve_session(
    session: Session,
    credentials: HTTPAuthorizationCredentials | None,
    *,
    lock_mode: str,
) -> SessionIdentity:
    # Internal constant only; never interpolate client-supplied SQL.
    assert lock_mode in ("SHARE", "UPDATE")
    token = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else ""
    if not token or len(token) > 8192:
        raise DomainError(401, "UNAUTHORIZED", "Valid Bearer session required.")
    if "." in token:
        # NEVER accept a tampered or expired JWT by opaque-token fallback.
        claims = decode_access_token(token)
        user_id = claims["sub"]
        kind = "jwt"
    else:
        if not LEGACY_TOKEN.fullmatch(token):
            raise DomainError(401, "UNAUTHORIZED", "Invalid Bearer session.")
        user_id = None
        kind = "opaque"

    # Both variants are registered/revocable in the same Prisma AuthSession.
    # Join User to fail closed if a deleted account somehow has a session.
    # Ordinary protected calls take a shared row lock so logout cannot revoke
    # the session before their transaction finishes. Logout instead takes the
    # exclusive lock up front, avoiding SHARE -> UPDATE lock-upgrade deadlocks
    # when two requests attempt to revoke the same token simultaneously.
    row = session.execute(text(f"""
        SELECT s.id, s."userId" FROM "AuthSession" AS s
        JOIN "User" AS u ON u.id=s."userId"
        WHERE s."tokenHash"=:digest AND s."revokedAt" IS NULL
          AND s."expiresAt" > timezone('UTC', CURRENT_TIMESTAMP)
          AND (CAST(:user_id AS TEXT) IS NULL OR s."userId"=:user_id)
        FOR {lock_mode} OF s
    """), {"digest": hash_token(token), "user_id": user_id}).mappings().first()
    if row is None:
        raise DomainError(401, "UNAUTHORIZED", "Invalid, expired or revoked session.")
    return SessionIdentity(user_id=row["userId"], session_id=row["id"], token_kind=kind)


def current_session(
    session: SiteSession,
    credentials: BearerCredentials,
) -> SessionIdentity:
    return _resolve_session(session, credentials, lock_mode="SHARE")


def current_logout_session(
    session: SiteSession,
    credentials: BearerCredentials,
) -> SessionIdentity:
    # Acquire the exclusive lock before the logout service updates revokedAt.
    # A second concurrent logout waits, then sees a revoked row and returns 401.
    return _resolve_session(session, credentials, lock_mode="UPDATE")


AuthenticatedSession = Annotated[SessionIdentity, Depends(current_session)]
LogoutSession = Annotated[SessionIdentity, Depends(current_logout_session)]


def authenticated_player(identity: AuthenticatedSession) -> str:
    return identity.user_id


PlayerId = Annotated[str, Depends(authenticated_player)]
