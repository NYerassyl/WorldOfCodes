from tests.helpers import headers

VALID_LESSON = {
    "title": "Tuples and Unpacking",
    "description": "Work with immutable sequences and unpack them safely.",
    "level": "beginner",
    "topic": "collections",
    "xp_reward": 25,
}


def test_list_lessons_with_filters(client):
    all_lessons = client.get("/api/lessons").json()
    assert [lesson["id"] for lesson in all_lessons] == [1, 2, 3]

    beginner = client.get("/api/lessons", params={"level": "beginner"}).json()
    assert [lesson["id"] for lesson in beginner] == [1, 2]

    functions = client.get("/api/lessons", params={"topic": "functions"}).json()
    assert [lesson["title"] for lesson in functions] == ["Dictionaries and Functions"]

    assert client.get("/api/lessons", params={"level": "expert"}).status_code == 422


def test_create_lesson(client):
    response = client.post("/api/lessons", json=VALID_LESSON, headers=headers(1))
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 4
    assert body["author_id"] == 1
    assert body["prerequisite_lesson_id"] is None


def test_create_lesson_requires_existing_author(client):
    response = client.post("/api/lessons", json=VALID_LESSON, headers=headers(999))
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "USER_NOT_FOUND"


def test_create_lesson_rejects_bad_reward_and_missing_prerequisite(client):
    bad_reward = {**VALID_LESSON, "xp_reward": 5}
    assert (
        client.post("/api/lessons", json=bad_reward, headers=headers(1)).status_code == 422
    )
    missing_prerequisite = {**VALID_LESSON, "prerequisite_lesson_id": 99}
    response = client.post(
        "/api/lessons", json=missing_prerequisite, headers=headers(1)
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "LESSON_NOT_FOUND"


def test_get_missing_lesson_returns_404(client):
    assert client.get("/api/lessons/99").status_code == 404


def test_update_lesson_is_author_only(client):
    response = client.patch(
        "/api/lessons/1", json={"published": False}, headers=headers(2)
    )
    assert response.status_code == 403


def test_update_lesson_unpublishes_and_hides_from_catalog(client):
    response = client.patch(
        "/api/lessons/1", json={"published": False}, headers=headers(1)
    )
    assert response.status_code == 200
    assert response.json()["published"] is False
    catalog_ids = [lesson["id"] for lesson in client.get("/api/lessons").json()]
    assert 1 not in catalog_ids
    full_catalog = client.get(
        "/api/lessons", params={"include_unpublished": True}
    ).json()
    assert 1 in [lesson["id"] for lesson in full_catalog]


def test_update_lesson_rejects_prerequisite_cycle(client):
    response = client.patch(
        "/api/lessons/1", json={"prerequisite_lesson_id": 2}, headers=headers(1)
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "LESSON_CYCLE"


def test_delete_lesson_with_progress_returns_409(client):
    response = client.delete("/api/lessons/1", headers=headers(1))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LESSON_HAS_PROGRESS"


def test_delete_unused_lesson(client):
    response = client.delete("/api/lessons/3", headers=headers(2))
    assert response.status_code == 204
    assert client.get("/api/lessons/3").status_code == 404


def test_complete_lesson_awards_xp_once(client):
    response = client.post(
        "/api/users/2/progress", json={"lesson_id": 1}, headers=headers(2)
    )
    assert response.status_code == 201
    body = response.json()
    assert body["xp_awarded"] == 20
    assert body["user_xp"] == 20

    duplicate = client.post(
        "/api/users/2/progress", json={"lesson_id": 1}, headers=headers(2)
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "LESSON_ALREADY_COMPLETED"
    assert client.get("/api/users/2").json()["xp"] == 20


def test_complete_lesson_requires_prerequisite(client):
    response = client.post(
        "/api/users/2/progress", json={"lesson_id": 3}, headers=headers(2)
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PREREQUISITE_INCOMPLETE"


def test_complete_unpublished_lesson_returns_409(client):
    client.patch("/api/lessons/2", json={"published": False}, headers=headers(1))
    response = client.post(
        "/api/users/2/progress", json={"lesson_id": 2}, headers=headers(2)
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LESSON_NOT_PUBLISHED"


def test_complete_unknown_lesson_returns_404(client):
    response = client.post(
        "/api/users/2/progress", json={"lesson_id": 99}, headers=headers(2)
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "LESSON_NOT_FOUND"


def test_progress_summary_and_next_lesson(client):
    body = client.get("/api/users/1/progress").json()
    assert body["xp"] == 30
    assert [item["lesson_id"] for item in body["completed_lessons"]] == [1]
    assert body["next_lesson"]["id"] == 2


def test_reset_progress_is_blocked_by_completed_dependent(client):
    client.post("/api/users/1/progress", json={"lesson_id": 2}, headers=headers(1))
    response = client.delete("/api/users/1/progress/1", headers=headers(1))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DEPENDENT_LESSONS_COMPLETED"


def test_reset_progress_refunds_xp(client):
    client.post("/api/users/2/progress", json={"lesson_id": 1}, headers=headers(2))
    response = client.delete("/api/users/2/progress/1", headers=headers(2))
    assert response.status_code == 204
    assert client.get("/api/users/2").json()["xp"] == 0
    assert client.get("/api/users/2/progress").json()["completed_lessons"] == []


def test_reset_missing_progress_returns_404(client):
    response = client.delete("/api/users/2/progress/1", headers=headers(2))
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PROGRESS_NOT_FOUND"
