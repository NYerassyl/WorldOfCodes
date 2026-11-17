"""Real PostgreSQL integration for the site's existing Prisma identity/history."""
import os
from hashlib import sha256
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url

from database import database_url, engine

pytestmark = pytest.mark.skipif(not os.environ.get('SHARED_DATABASE_TEST_URL'), reason='Requires an explicit isolated shared PostgreSQL test database')


@pytest.fixture()
def players():
    explicit = make_url(os.environ['SHARED_DATABASE_TEST_URL'])
    actual = database_url()
    assert explicit.host in {'localhost', '127.0.0.1'} and explicit.database.endswith('_test')
    assert (explicit.host, explicit.port, explicit.database) == (actual.host, actual.port, actual.database)
    ids = [str(uuid4()), str(uuid4())]
    tokens = [uuid4().hex + uuid4().hex for _ in range(4)]
    problem_ids = ['comment-' + uuid4().hex for _ in range(3)]
    with engine().begin() as db:
        for i, user_id in enumerate(ids):
            name = ('comment' + uuid4().hex.translate(str.maketrans('0123456789', 'abcdefghij')))[:24]
            db.execute(text('''INSERT INTO "User" (id,email,"passwordHash",nickname,"normalizedNickname","updatedAt")
                               VALUES (:id,:email,'not-a-login-hash',:name,:name,now())'''),
                       {'id': user_id, 'email': user_id + '@example.com', 'name': name})
        for i, token in enumerate(tokens):
            db.execute(text('''INSERT INTO "AuthSession" (id,"userId","tokenHash","expiresAt","revokedAt")
                               VALUES (:id,:user,:hash,timezone('UTC',now()) + CASE WHEN :expired THEN interval '-1 hour' ELSE interval '1 day' END,
                                       CASE WHEN :revoked THEN timezone('UTC',now()) ELSE NULL END)'''),
                       {'id': str(uuid4()), 'user': ids[1] if i == 1 else ids[0], 'hash': sha256(token.encode()).hexdigest(), 'expired': i == 2, 'revoked': i == 3})
        for i, problem_id in enumerate(problem_ids):
            db.execute(text('''INSERT INTO "Problem" (id,title,statement,"topicSlug",difficulty,"functionName","starterCode","isPublished")
                               VALUES (:id,'Comment isolation problem','Return a value','comments','EASY','solve','def solve(): pass',:published)'''),
                       {'id': problem_id, 'published': i != 2})
    yield {'ids': ids, 'tokens': tokens, 'problems': problem_ids}
    with engine().begin() as db:
        for user_id in ids:
            db.execute(text('DELETE FROM "User" WHERE id=:id'), {'id': user_id})
        for problem_id in problem_ids:
            db.execute(text('DELETE FROM "Problem" WHERE id=:id'), {'id': problem_id})


def auth(players, i=0):
    return {'Authorization': 'Bearer ' + players['tokens'][i]}


def test_real_identity_persistence_and_problem_isolation(client, players):
    p1, p2, _ = players['problems']
    result = client.post(f'/api/problems/{p1}/comments', json={'body': 'A saved comment'}, headers=auth(players))
    assert result.status_code == 201, result.text
    saved = result.json()
    assert saved['author']['id'] == players['ids'][0]
    assert saved['problemId'] == p1
    assert 'email' not in saved['author'] and 'tokenHash' not in result.text
    # A fresh request/session reads the committed record (not a mutable store).
    assert client.get(f'/api/problems/{p1}/comments').json()['comments'][0]['id'] == saved['id']
    assert client.get(f'/api/problems/{p2}/comments').json()['comments'] == []
    path = f"/api/problems/{p1}/comments/{saved['id']}"
    assert client.patch(path, json={'body': 'B edit'}, headers=auth(players, 1)).status_code == 403
    assert client.delete(path, headers=auth(players, 1)).status_code == 403
    assert client.patch(f"/api/problems/{p2}/comments/{saved['id']}", json={'body': 'wrong problem'}, headers=auth(players)).status_code == 404
    assert client.patch(path, json={'body': 'A edited'}, headers=auth(players)).json()['body'] == 'A edited'
    assert client.delete(path, headers=auth(players)).status_code == 204
    assert client.get(f'/api/problems/{p1}/comments').json()['comments'] == []


def test_spoofed_actor_invalid_payload_expired_and_revoked_tokens(client, players):
    url = f"/api/problems/{players['problems'][0]}/comments"
    assert client.post(url, json={'body': 'Spoofed'}, headers={'X-User-Id': players['ids'][0]}).status_code == 401
    assert client.post(url, json={'body': 'Spoofed', 'authorId': players['ids'][1]}, headers=auth(players)).status_code == 422
    for body in ('', '   ', 'a' * 2001):
        assert client.post(url, json={'body': body}, headers=auth(players)).status_code == 422
    for i in (2, 3):
        assert client.post(url, json={'body': 'Invalid session'}, headers=auth(players, i)).status_code == 401
    assert client.post(url, json={'body': 'Unknown token'}, headers={'Authorization': 'Bearer ' + 'a' * 64}).status_code == 401
    assert client.get(f"/api/problems/{players['problems'][2]}/comments").status_code == 404
    assert client.post('/api/problems/missing/comments', json={'body': 'Missing'}, headers=auth(players)).status_code == 404


def test_cursor_pagination_is_scoped(client, players):
    p1, p2, _ = players['problems']
    for i in range(3):
        assert client.post(f'/api/problems/{p1}/comments', json={'body': f'Comment {i}'}, headers=auth(players)).status_code == 201
    first = client.get(f'/api/problems/{p1}/comments?limit=2').json()
    assert len(first['comments']) == 2 and first['nextCursor']
    second = client.get(f"/api/problems/{p1}/comments?limit=2&before={first['nextCursor']}").json()
    assert len(second['comments']) == 1 and second['nextCursor'] is None
    assert not {c['id'] for c in first['comments']} & {c['id'] for c in second['comments']}
    assert client.get(f"/api/problems/{p2}/comments?before={first['nextCursor']}").status_code == 400


def test_profile_reads_the_same_canonical_submission(client, players):
    with engine().begin() as db:
        db.execute(text('''INSERT INTO "Submission" (id,"userId","problemId","sourceCode",status,"passedCases","totalCases")
                           VALUES (:id,:user,:problem,'def solve(): return 1','ACCEPTED',1,1)'''),
                   {'id': str(uuid4()), 'user': players['ids'][0], 'problem': players['problems'][0]})
    result = client.get(f"/api/players/{players['ids'][0]}/activity", headers=auth(players))
    assert result.status_code == 200, result.text
    assert result.json()['year'] == {'submissions': 1, 'solved': 1}
