"""Engine configuration and one transaction/session per HTTP request."""
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

load_dotenv(Path(__file__).with_name(".env"))


def database_url() -> str:
    value = os.environ.get("FASTAPI_DATABASE_URL")
    if not value:
        raise RuntimeError("Set FASTAPI_DATABASE_URL to a PostgreSQL database; see .env.example.")
    url = make_url(value)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("FASTAPI_DATABASE_URL must use PostgreSQL.")
    return url.set(drivername="postgresql+psycopg").render_as_string(hide_password=False)


engine = create_engine(database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_session():
    # Exceptions roll back the entire request, including rewards and submissions.
    with SessionLocal.begin() as session:
        yield session
