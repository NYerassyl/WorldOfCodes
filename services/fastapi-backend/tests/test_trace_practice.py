"""Run EVERY repository Trace Practice Python snippet; compare exact stdout."""
from collections import Counter
from pathlib import Path
import re
import subprocess
import sys

import pytest

from main import app
from trace_data import load_catalog
from storage import store

CATALOG = load_catalog()


def test_exactly_ten_unique_exercises_in_each_level():
    assert len(CATALOG) == 50
    counts = Counter(item["level"] for item in CATALOG)
    assert counts == {1: 10, 2: 10, 3: 10, 4: 10, 5: 10}
    assert len({item["id"] for item in CATALOG}) == 50
    assert len({item["title"] for item in CATALOG}) == 50
    assert len({item["code"] for item in CATALOG}) == 50


@pytest.mark.parametrize("exercise", CATALOG, ids=lambda item: item["id"])
def test_repository_python_stdout_exactly_matches_saved_answer(exercise):
    code = exercise["code"]
    meaningful = [
        line for line in code.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    assert 10 <= len(meaningful) <= 20
    assert len(exercise["expected_stdout"].splitlines()) in range(1, 9)
    assert exercise["expected_stdout"].endswith("\n")
    assert exercise["title"].isascii()
    assert exercise["instructions"].isascii()
    assert len(exercise["explanation"]) >= 35
    # Fixed trusted catalog only. Never evaluate submitted user answers.
    completed = subprocess.run(
        [sys.executable, "-I", "-c", code],
        text=True, capture_output=True, timeout=3, check=False,
    )
    assert completed.returncode == 0, f'{exercise["id"]}: {completed.stderr}'
    assert completed.stderr == ""
    assert completed.stdout == exercise["expected_stdout"], (
        f'{exercise["id"]} actual={completed.stdout!r}, '
        f'expected={exercise["expected_stdout"]!r}'
    )


def test_public_listing_filters_and_does_not_reveal_answer(client):
    res = client.get("/api/trace/exercises")
    assert res.status_code == 200 and len(res.json()) == 50
    assert all("expected_stdout" not in item and "explanation" not in item for item in res.json())
    for level in range(1, 6):
        result = client.get("/api/trace/exercises", params={"level": level})
        assert result.status_code == 200 and len(result.json()) == 10
    for exercise in CATALOG:
        result = client.get("/api/trace/exercises", params={"topic": exercise["topic"], "difficulty": exercise["difficulty"]})
        assert exercise["id"] in {row["id"] for row in result.json()}
    assert client.get("/api/trace/exercises", params={"level": 6}).status_code == 422
    assert client.get("/api/trace/exercises", params={"difficulty": "impossible"}).status_code == 422


def test_detail_hides_solution_until_player_submits(client):
    item = CATALOG[0]
    detail = client.get(f'/api/trace/exercises/{item["id"]}')
    assert detail.status_code == 200
    body = detail.json()
    assert body["code"] == item["code"]
    assert "expected_stdout" not in body
    assert "explanation" not in body
    assert client.get("/api/trace/exercises/unknown").status_code == 404
    assert client.post(f'/api/trace/exercises/{item["id"]}/submit', json={"answer": "wrong"}).status_code == 401
    wrong = client.post(
        f'/api/trace/exercises/{item["id"]}/submit',
        json={"answer": "not the output"},
        headers={"X-User-Id": "2"},
    )
    assert wrong.status_code == 200
    data = wrong.json()
    assert data["correct"] is False
    assert data["verdict"] == "INCORRECT"
    assert data["explanation"] == item["explanation"]
    assert data["expected_output"] == item["expected_stdout"].removesuffix("\n")
    assert data["attempt_number"] == 1
    correct = client.post(
        f'/api/trace/exercises/{item["id"]}/submit',
        json={"answer": item["expected_stdout"].removesuffix("\n")},
        headers={"X-User-Id": "2"},
    )
    assert correct.status_code == 200
    assert correct.json()["correct"] is True
    assert correct.json()["attempt_number"] == 2
    assert store.users[2].xp == 0 and store.users[2].coins == 0


def test_exact_whitespace_and_user_validation(client):
    item = CATALOG[0]
    url = f'/api/trace/exercises/{item["id"]}/submit'
    assert client.post(url, json={"answer": "anything"}, headers={"X-User-Id": "999"}).status_code == 404
    assert client.post(url, json={"answer": 3}, headers={"X-User-Id": "1"}).status_code == 422
    assert client.post(url, json={"answer": "x", "unexpected": 1}, headers={"X-User-Id": "1"}).status_code == 422
    expected = item["expected_stdout"].removesuffix("\n")
    if "\n" in expected:
        assert client.post(url, json={"answer": expected.replace("\n", " ")}, headers={"X-User-Id": "1"}).json()["correct"] is False
    assert client.post(url, json={"answer": expected + " "}, headers={"X-User-Id": "1"}).json()["correct"] is False


def test_three_trace_paths_appear_in_openapi(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert "/api/trace/exercises" in paths
    assert set(paths["/api/trace/exercises"]) == {"get"}
    assert set(paths["/api/trace/exercises/{exercise_id}"]) == {"get"}
    assert set(paths["/api/trace/exercises/{exercise_id}/submit"]) == {"post"}
