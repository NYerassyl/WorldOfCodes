"""Canonical account authentication through SQLAlchemy and Prisma-owned tables.

No SQLAlchemy create_all, no duplicate User table, no Alembic table migration.
The existing Prisma password/session formats are retained.
"""
from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_security import hash_password, hash_token, issue_access_token, verify_password
from canonical_models import Player, AuthSession
from canonical_schemas import Register, Login
from errors import DomainError
from site_auth import SessionIdentity


def private_user(user: Player) -> dict:
    """Preserve the Express privateUser() JSON contract for the unchanged frontend."""
    changes = user.nicknameChanges or 0
    return {
        "id": user.id,
        "displayName": user.displayName or user.nickname,
        "bio": user.bio or "",
        "nickname": user.nickname,
        "avatarUrl": user.avatarUrl,
        "xp": user.xp,
        "level": max(0, user.xp) // 100 + 1,
        "renamedAt": user.renamedAt,
        "email": user.email,
        "coins": user.coins,
        "nicknameChanges": changes,
        "nextNicknameChange": "FREE" if changes == 0 else "PAYMENT_REQUIRED",
    }


def _session_token(session: Session, user_id: str) -> str:
    # Fail closed before any session is inserted if the JWT server secret is absent.
    token, expiry = issue_access_token(user_id)
    session.add(AuthSession(
        id=str(uuid4()), userId=user_id,
        tokenHash=hash_token(token), expiresAt=expiry, revokedAt=None,
        createdAt=datetime.now(timezone.utc).replace(tzinfo=None),
    ))
    session.flush()
    return token


def register(session: Session, payload: Register) -> dict:
    email = str(payload.email).strip().lower()
    nickname = payload.nickname
    # Enforce server readiness before writing a new user to the shared database.
    from auth_security import _jwt_settings
    _jwt_settings()
    if session.scalar(select(Player.id).where(Player.email == email)):
        raise DomainError(409, "EMAIL_TAKEN", "An account with this email already exists.")
    if session.scalar(select(Player.id).where(Player.normalizedNickname == nickname)):
        raise DomainError(409, "USERNAME_TAKEN", "This username is already taken.")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    user = Player(
        id=str(uuid4()), email=email, passwordHash=hash_password(payload.password),
        nickname=nickname, normalizedNickname=nickname,
        bio="", xp=0, coins=0, nicknameChanges=0,
        createdAt=now, updatedAt=now,
    )
    try:
        # SAVEPOINT converts simultaneous duplicate registrations into 409,
        # instead of leaving the outer transaction in a failed state (500).
        with session.begin_nested():
            session.add(user)
            session.flush()
    except IntegrityError as exc:
        raise DomainError(409, "ACCOUNT_EXISTS", "Email or username already exists.") from exc
    token = _session_token(session, user.id)
    return {"token": token, "user": private_user(user)}


def login(session: Session, payload: Login) -> dict:
    email = str(payload.email).strip().lower()
    user = session.scalar(select(Player).where(Player.email == email))
    valid = verify_password(payload.password, user.passwordHash if user else None)
    if user is None or not valid:
        raise DomainError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
    token = _session_token(session, user.id)
    return {"token": token, "user": private_user(user)}


def logout(session: Session, identity: SessionIdentity) -> None:
    result = session.execute(text("""
        UPDATE "AuthSession"
        SET "revokedAt"=timezone('UTC',CURRENT_TIMESTAMP)
        WHERE id=:id AND "userId"=:user AND "revokedAt" IS NULL
    """), {"id": identity.session_id, "user": identity.user_id})
    if result.rowcount != 1:
        raise DomainError(401, "UNAUTHORIZED", "Session is already revoked.")


def current_profile(session: Session, user_id: str) -> dict:
    user = session.get(Player, user_id)
    if user is None:
        raise DomainError(401, "UNAUTHORIZED", "Account no longer exists.")
    completed = session.scalar(text("""
        SELECT count(*) FROM "LessonProgress"
        WHERE "userId"=:id AND "completedAt" IS NOT NULL
    """), {"id": user_id})
    return {**private_user(user), "completedLessons": completed}
