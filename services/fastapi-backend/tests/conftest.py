import os
import sys
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
# Never use the application's database implicitly: this suite truncates test data.
url = os.environ.get("FASTAPI_TEST_DATABASE_URL")
if not url:
    raise RuntimeError("Set FASTAPI_TEST_DATABASE_URL to a dedicated localhost database ending in _test.")
parsed = make_url(url)
if parsed.get_backend_name() != "postgresql" or parsed.host not in {"127.0.0.1", "localhost", "::1"} or not (parsed.database or "").endswith("_test"):
    raise RuntimeError("Tests require a localhost PostgreSQL database ending in _test.")
os.environ["FASTAPI_DATABASE_URL"] = url

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from database import SessionLocal, engine
from main import app
from models import Base
from seed import seed_demo


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    command.upgrade(Config(str(ROOT / "alembic.ini")), "head")
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(migrated_database):
    with engine.begin() as connection:
        names = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
        connection.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
    with SessionLocal.begin() as session:
        seed_demo(session)


@pytest.fixture()
def db():
    with SessionLocal.begin() as session:
        yield session


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def headers(user_id: int) -> dict[str, str]:
    return {"X-User-Id": str(user_id)}
