import pytest

from tests.helpers import headers

VALID_USER = {
    "email": "new.user@worldofcodes.dev",
    "nickname": "newbie",
    "password": "python123",
    "bio": "Hello WorldOfCodes",
}


def test_create_user_and_read_it_back(client):
    created = client.post("/api/users", json=VALID_USER)
    assert created.status_code == 201
    body = created.json()
    assert body["email"] == "new.user@worldofcodes.dev"
    assert body["nickname"] == "newbie"
    assert body["xp"] == 0
    assert "password" not in body
    assert "password_hash" not in body

    fetched = client.get(f"/api/users/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == body


def test_email_is_normalized_to_lowercase(client):
    payload = {**VALID_USER, "email": "MiXeD.Case@WorldOfCodes.dev"}
    body = client.post("/api/users", json=payload).json()
    assert body["email"] == "mixed.case@worldofcodes.dev"


def test_duplicate_email_returns_409(client):
    client.post("/api/users", json=VALID_USER)
    response = client.post("/api/users", json={**VALID_USER, "nickname": "other"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_TAKEN"


@pytest.mark.parametrize(
    "payload",
    [
        {**VALID_USER, "email": "not-an-email"},
        {**VALID_USER, "nickname": "ab"},
        {**VALID_USER, "password": "short1"},
        {**VALID_USER, "password": "onlyletters"},
        {**VALID_USER, "bio": "x" * 281},
        {**VALID_USER, "unexpected": "field"},
        {},
    ],
)
def test_invalid_user_payload_returns_422(client, payload):
    response = client.post("/api/users", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_list_users_and_search(client):
    assert client.get("/api/users").json()[0]["nickname"] == "ada"
    found = client.get("/api/users", params={"q": "grace"}).json()
    assert [user["nickname"] for user in found] == ["grace"]
    assert client.get("/api/users", params={"limit": 1}).json()[0]["id"] == 1
    assert client.get("/api/users", params={"limit": 0}).status_code == 422


def test_leaderboard_is_not_captured_by_user_id_route(client):
    response = client.get("/api/users/leaderboard")
    assert response.status_code == 200
    entries = response.json()
    assert entries[0]["nickname"] == "ada"
    assert entries[0]["rank"] == 1
    assert entries[0]["xp"] == 30
    assert entries[0]["solved_problems"] == 1


def test_unknown_user_returns_404(client):
    response = client.get("/api/users/999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "USER_NOT_FOUND"


def test_non_integer_user_id_returns_422(client):
    assert client.get("/api/users/abc").status_code == 422


def test_update_requires_header(client):
    response = client.patch("/api/users/1", json={"nickname": "ada2"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"


def test_update_rejects_other_users(client):
    response = client.patch(
        "/api/users/1", json={"nickname": "hacked"}, headers=headers(2)
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_update_owner_fields(client):
    response = client.patch(
        "/api/users/1",
        json={"nickname": "ada-lovelace", "bio": "Updated bio"},
        headers=headers(1),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["nickname"] == "ada-lovelace"
    assert body["bio"] == "Updated bio"


def test_update_to_taken_email_returns_409(client):
    response = client.patch(
        "/api/users/1",
        json={"email": "grace@worldofcodes.dev"},
        headers=headers(1),
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_TAKEN"


def test_update_with_empty_body_returns_422(client):
    response = client.patch("/api/users/1", json={}, headers=headers(1))
    assert response.status_code == 422


def test_profile_aggregates_progress_and_rank(client):
    body = client.get("/api/users/1/profile").json()
    assert body["xp"] == 30
    assert body["coins"] == 2
    assert body["completed_lessons"] == 1
    assert body["solved_problems"] == 1
    assert body["accepted_submissions"] == 1
    assert body["rank"] == 1


def test_delete_requires_owner(client):
    response = client.delete("/api/users/1", headers=headers(2))
    assert response.status_code == 403


def test_delete_user_with_authored_content_returns_409(client):
    response = client.delete("/api/users/1", headers=headers(1))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "USER_HAS_CONTENT"


def test_delete_fresh_user(client):
    created = client.post("/api/users", json=VALID_USER).json()
    response = client.delete(f"/api/users/{created['id']}", headers=headers(created["id"]))
    assert response.status_code == 204
    assert client.get(f"/api/users/{created['id']}").status_code == 404
