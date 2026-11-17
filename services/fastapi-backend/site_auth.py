"""Authenticate the existing Express/Prisma session; never trust actor headers."""
import re
from hashlib import sha256
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import database_session
from errors import DomainError

SiteSession = Annotated[Session, Depends(database_session, scope="function")]


def authenticated_player(
    session: SiteSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))],
) -> str:
    token = credentials.credentials if credentials else ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", token):
        raise DomainError(401, "UNAUTHORIZED", "Valid Bearer session required.")
    # A shared lock gives logout a clear order relative to this mutation.
    # Prisma timestamps are UTC TIMESTAMP(3) without time zone.
    player_id = session.scalar(text('''
        SELECT "userId" FROM "AuthSession"
        WHERE "tokenHash"=:digest AND "revokedAt" IS NULL
          AND "expiresAt" > timezone('UTC', CURRENT_TIMESTAMP)
        FOR SHARE
    '''), {"digest": sha256(token.encode()).hexdigest()})
    if player_id is None:
        raise DomainError(401, "UNAUTHORIZED", "Invalid, expired or revoked session.")
    return player_id


PlayerId = Annotated[str, Depends(authenticated_player)]
