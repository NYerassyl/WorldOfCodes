import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app  # noqa: E402
from storage import store  # noqa: E402


@pytest.fixture()
def client():
    store.reset()
    with TestClient(app) as test_client:
        yield test_client


def headers(user_id: int) -> dict[str, str]:
    return {"X-User-Id": str(user_id)}
