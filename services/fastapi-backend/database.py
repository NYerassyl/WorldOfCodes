import os
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


def database_url():
    url = make_url(os.environ["DATABASE_URL"])
    if url.get_backend_name() != "postgresql":
        raise ValueError("DATABASE_URL must point to PostgreSQL")
    return url.set(drivername="postgresql+psycopg").difference_update_query(["schema"])


@lru_cache
def engine():
    return create_engine(database_url(), pool_pre_ping=True)


def database_session():
    with Session(engine()) as session, session.begin():
        yield session
