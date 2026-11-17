"""Integration checks run against real PostgreSQL, never an in-memory substitute."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError
import pytest

from database import engine, SessionLocal
from models import Comment, Completion, Submission, User

ROOT = Path(__file__).resolve().parents[1]
H = {"X-User-Id": "2"}


def test_comments_are_scoped_and_owner_only(client):
    response = client.post("/api/problems/1/comments", headers=H, json={"body": "My explanation"})
    assert response.status_code == 201
    comment_id = response.json()["id"]
    assert client.get("/api/problems/2/comments").json() == []
    assert len(client.get("/api/problems/1/comments").json()) == 1
    path = f"/api/problems/1/comments/{comment_id}"
    assert client.patch(path, headers={"X-User-Id": "1"}, json={"body": "stolen"}).status_code == 403
    assert client.delete(path, headers={"X-User-Id": "1"}).status_code == 403
    assert client.patch(f"/api/problems/2/comments/{comment_id}", headers=H, json={"body": "wrong problem"}).status_code == 404
    assert client.patch(path, headers=H, json={"body": "Edited explanation"}).json()["body"] == "Edited explanation"
    assert client.post("/api/problems/1/comments", headers=H, json={"body": "   "}).status_code == 422
    assert client.post("/api/problems/999/comments", headers=H, json={"body": "Missing"}).status_code == 404
    assert client.delete(path, headers=H).status_code == 204
    assert client.get("/api/problems/1/comments").json() == []


def test_concurrent_api_submissions_reward_once(client):
    def submit(_):
        return client.post("/api/problems/2/submissions", headers=H, json={"answer": "[::-1]"})
    with ThreadPoolExecutor(max_workers=8) as executor:
        responses = list(executor.map(submit, range(24)))
    assert all(r.status_code == 201 for r in responses), [r.text for r in responses]
    assert sum(r.json()["rewarded"] for r in responses) == 1
    assert len({r.json()["id"] for r in responses}) == 24
    user = client.get("/api/users/2").json()
    assert (user["xp"], user["coins"]) == (15, 3)


def test_duplicate_email_race_returns_conflict(client):
    def create(_):
        return client.post("/api/users", json={"email": "race@example.com", "nickname": "racer", "password": "password123"})
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(create, range(4)))
    assert sorted(r.status_code for r in responses) == [201, 409, 409, 409]
    assert all(r.json()["error"]["code"] == "EMAIL_TAKEN" for r in responses if r.status_code == 409)


def test_database_constraints_and_rollback():
    with pytest.raises(IntegrityError):
        with SessionLocal.begin() as db:
            db.get(User, 2).xp = 999
            db.add(Completion(user_id=99999, lesson_id=1, xp_awarded=20))
            db.flush()
    with SessionLocal() as db:
        assert db.get(User, 2).xp == 0
    # A second rewarded row for the same pair is blocked even outside services.
    with pytest.raises(IntegrityError):
        with SessionLocal.begin() as db:
            db.add(Submission(user_id=1, problem_id=1, answer="15", verdict="ACCEPTED", rewarded=True,
                              xp_awarded=10, coins_awarded=2, message="duplicate"))
            db.flush()


def test_process_restart_preserves_records_and_trace_attempts():
    def run(code):
        result = subprocess.run([sys.executable, "-c", code], cwd=ROOT, env=os.environ.copy(),
                                check=True, text=True, capture_output=True, timeout=30)
        return json.loads(result.stdout)
    common = "from fastapi.testclient import TestClient; from main import app; import json; c=TestClient(app); "
    first = run(common + "u=c.post('/api/users', json={'email':'restart@example.com','nickname':'restart','password':'password123'}).json(); "
                "c.post('/api/problems/2/submissions', headers={'X-User-Id':str(u['id'])}, json={'answer':'[::-1]'}); "
                "c.post('/api/problems/2/comments', headers={'X-User-Id':str(u['id'])}, json={'body':'Persistent comment'}); "
                "c.post('/api/users/'+str(u['id'])+'/progress', headers={'X-User-Id':str(u['id'])}, json={'lesson_id':1}); "
                "t=c.post('/api/trace/exercises/trace-1-01/submit', headers={'X-User-Id':str(u['id'])}, json={'answer':'wrong'}).json(); "
                "print(json.dumps({'id':u['id'],'attempt':t['attempt_number']}))")
    second = run(common + f"uid={first['id']}; "
                 "u=c.get('/api/users/'+str(uid)).json(); "
                 "t=c.post('/api/trace/exercises/trace-1-01/submit', headers={'X-User-Id':str(uid)}, json={'answer':'wrong'}).json(); "
                 "p=c.get('/api/users/'+str(uid)+'/progress').json(); comments=c.get('/api/problems/2/comments').json(); "
                 "print(json.dumps({'xp':u['xp'],'coins':u['coins'],'attempt':t['attempt_number'],'lessons':len(p['completed_lessons']),'comments':len(comments)}))")
    assert first["attempt"] == 1
    assert second == {"xp": 35, "coins": 3, "attempt": 2, "lessons": 1, "comments": 1}


def test_migrations_roundtrip_and_schema_matches():
    config = Config(str(ROOT / "alembic.ini"))
    command.check(config)
    command.downgrade(config, "base")
    assert "users" not in inspect(engine).get_table_names()
    command.upgrade(config, "head")
    command.check(config)
    assert {"users", "lessons", "problems", "completions", "submissions", "comments", "trace_attempts"} <= set(inspect(engine).get_table_names())
