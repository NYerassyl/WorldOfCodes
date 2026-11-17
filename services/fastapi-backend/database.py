"""Shared Prisma database used by site APIs and profile analytics."""
import os
from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from errors import DomainError


def database_url():
    shared = os.environ.get("FASTAPI_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not shared:
        raise ValueError("Set DATABASE_URL or FASTAPI_DATABASE_URL to the shared Prisma database")
    url = make_url(shared)
    if url.get_backend_name() != "postgresql":
        raise ValueError("The shared site database must be PostgreSQL")
    if url.query.get("schema", "public") != "public":
        raise ValueError("Site APIs currently require the public Prisma schema")
    prisma_value = os.environ.get("DATABASE_URL")
    if prisma_value:
        prisma = make_url(prisma_value)
        target = lambda u: (u.host, u.port or 5432, u.database, u.query.get("schema", "public"))
        if target(prisma) != target(url):
            raise ValueError("DATABASE_URL and FASTAPI_DATABASE_URL must identify the same database and public schema")
    return url.set(drivername="postgresql+psycopg").difference_update_query(["schema"])


@lru_cache
def engine():
    return create_engine(database_url(), pool_pre_ping=True,
                         connect_args={"options": "-c timezone=UTC -c search_path=public"})


def database_session():
    try:
        with Session(engine()) as session, session.begin():
            yield session
    except IntegrityError as exc:
        raise DomainError(409, "DATA_CONFLICT", "A related record changed; reload and try again.") from exc
    except SQLAlchemyError as exc:
        raise DomainError(503, "DATABASE_UNAVAILABLE", "The shared database is unavailable.") from exc
