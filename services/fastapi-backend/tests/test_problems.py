from tests.helpers import headers

VALID_PROBLEM = {
    "title": "Set Membership",
    "prompt": "What does 3 in {1, 2, 3} evaluate to?",
    "difficulty": "easy",
    "topic": "sets",
    "expected_answer": "True",
    "xp_reward": 10,
    "coin_reward": 2,
}


def test_list_problems_with_filters(client):
    assert len(client.get("/api/problems").json()) == 3
    easy = client.get("/api/problems", params={"difficulty": "easy"}).json()
    assert [problem["id"] for problem in easy] == [1, 2]
    dictionaries = client.get("/api/problems", params={"topic": "dictionaries"}).json()
    assert [problem["id"] for problem in dictionaries] == [3]
    assert client.get("/api/problems", params={"difficulty": "impossible"}).status_code == 422


def test_problem_response_hides_expected_answer(client):
    body = client.get("/api/problems/1").json()
    assert "expected_answer" not in body
    assert body["title"] == "Sum of a List"


def test_create_problem(client):
    response = client.post("/api/problems", json=VALID_PROBLEM, headers=headers(1))
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 4
    assert body["author_id"] == 1
    assert "expected_answer" not in body


def test_create_problem_validation_and_author(client):
    bad_reward = {**VALID_PROBLEM, "xp_reward": 1}
    assert (
        client.post("/api/problems", json=bad_reward, headers=headers(1)).status_code == 422
    )
    missing_author = client.post("/api/problems", json=VALID_PROBLEM, headers=headers(999))
    assert missing_author.status_code == 404


def test_update_problem_is_author_only(client):
    denied = client.patch(
        "/api/problems/1", json={"difficulty": "hard"}, headers=headers(2)
    )
    assert denied.status_code == 403
    allowed = client.patch(
        "/api/problems/1", json={"difficulty": "hard"}, headers=headers(1)
    )
    assert allowed.status_code == 200
    assert allowed.json()["difficulty"] == "hard"


def test_delete_problem_with_submissions_returns_409(client):
    response = client.delete("/api/problems/1", headers=headers(1))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PROBLEM_HAS_SUBMISSIONS"


def test_delete_unused_problem(client):
    created = client.post("/api/problems", json=VALID_PROBLEM, headers=headers(2)).json()
    response = client.delete(f"/api/problems/{created['id']}", headers=headers(2))
    assert response.status_code == 204
    assert client.get(f"/api/problems/{created['id']}").status_code == 404


def test_correct_submission_rewards_once(client):
    accepted = client.post(
        "/api/problems/2/submissions", json={"answer": " [::-1] "}, headers=headers(2)
    )
    assert accepted.status_code == 201
    body = accepted.json()
    assert body["verdict"] == "ACCEPTED"
    assert body["rewarded"] is True
    assert body["xp_awarded"] == 15
    assert body["coins_awarded"] == 3
    assert client.get("/api/users/2").json()["xp"] == 15
    assert client.get("/api/users/2").json()["coins"] == 3


def test_repeated_correct_submission_has_no_second_reward(client):
    before = client.get("/api/users/1").json()
    response = client.post(
        "/api/problems/1/submissions", json={"answer": "15"}, headers=headers(1)
    )
    assert response.status_code == 201
    body = response.json()
    assert body["verdict"] == "ACCEPTED"
    assert body["rewarded"] is False
    assert body["xp_awarded"] == 0
    assert body["coins_awarded"] == 0
    after = client.get("/api/users/1").json()
    assert after["xp"] == before["xp"]
    assert after["coins"] == before["coins"]


def test_wrong_answer_gets_no_reward(client):
    response = client.post(
        "/api/problems/1/submissions", json={"answer": "42"}, headers=headers(2)
    )
    assert response.status_code == 201
    body = response.json()
    assert body["verdict"] == "WRONG_ANSWER"
    assert body["rewarded"] is False
    assert body["xp_awarded"] == 0
    assert client.get("/api/users/2").json()["xp"] == 0


def test_submission_errors(client):
    missing_header = client.post("/api/problems/1/submissions", json={"answer": "15"})
    assert missing_header.status_code == 401

    missing_problem = client.post(
        "/api/problems/99/submissions", json={"answer": "15"}, headers=headers(1)
    )
    assert missing_problem.status_code == 404

    missing_user = client.post(
        "/api/problems/1/submissions", json={"answer": "15"}, headers=headers(999)
    )
    assert missing_user.status_code == 404

    empty_answer = client.post(
        "/api/problems/1/submissions", json={"answer": ""}, headers=headers(1)
    )
    assert empty_answer.status_code == 422


def test_list_and_fetch_submissions(client):
    listed = client.get("/api/problems/1/submissions").json()
    assert [submission["id"] for submission in listed] == [1]
    only_ada = client.get("/api/problems/1/submissions", params={"user_id": 1}).json()
    assert len(only_ada) == 1
    nobody = client.get("/api/problems/1/submissions", params={"user_id": 2}).json()
    assert nobody == []

    fetched = client.get("/api/submissions/1")
    assert fetched.status_code == 200
    assert fetched.json()["verdict"] == "ACCEPTED"
    assert client.get("/api/submissions/999").status_code == 404
