"""GPT 2 service-layer contract checks; routers and GPT 4 tests are unchanged."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict

import pytest
from pydantic import ValidationError

from errors import DomainError
from schemas import LessonUpdate, ProblemResponse, UserResponse, UserUpdate
from services import (
    complete_lesson,
    delete_user,
    ensure_progress_owner,
    get_progress,
    get_user,
    reset_lesson,
    submit_solution,
    update_lesson,
    update_user,
)
from storage import Storage


def test_only_profile_owner_can_edit_or_delete_without_partial_mutation():
    store = Storage()
    initial = asdict(get_user(store, 1))
    with pytest.raises(DomainError) as denied:
        update_user(
            store,
            1,
            UserUpdate(email="grace@worldofcodes.dev", nickname="stolen"),
            actor_id=2,
        )
    assert (denied.value.status_code, denied.value.code) == (403, "FORBIDDEN")
    assert asdict(get_user(store, 1)) == initial

    with pytest.raises(DomainError) as denied_delete:
        delete_user(store, user_id=1, actor_id=2)
    assert denied_delete.value.code == "FORBIDDEN"
    assert asdict(get_user(store, 1)) == initial

    updated = update_user(store, 1, UserUpdate(bio="Updated by owner"), actor_id=1)
    assert updated.bio == "Updated by owner"


def test_progress_owner_guard_supports_router_authorization():
    store = Storage()
    ensure_progress_owner(store, user_id=1, actor_id=1)
    with pytest.raises(DomainError) as denied:
        ensure_progress_owner(store, user_id=1, actor_id=2)
    assert (denied.value.status_code, denied.value.code) == (403, "FORBIDDEN")
    with pytest.raises(DomainError) as unknown:
        ensure_progress_owner(store, user_id=999, actor_id=1)
    assert unknown.value.code == "USER_NOT_FOUND"


def test_lesson_prerequisite_can_be_cleared_before_any_completion():
    store = Storage()
    assert store.lessons[2].prerequisite_lesson_id == 1
    updated = update_lesson(
        store, lesson_id=2, payload=LessonUpdate(prerequisite_lesson_id=None), actor_id=1
    )
    assert updated.prerequisite_lesson_id is None
    assert store.lessons[2].prerequisite_lesson_id is None
    with pytest.raises(ValidationError):
        LessonUpdate(title=None)


def test_completed_lesson_prerequisites_cannot_change_or_invalidate_progress():
    store = Storage()
    completed, user = complete_lesson(store, user_id=1, lesson_id=2)
    assert completed.xp_awarded == 30
    assert user.xp == 60  # Seed gives Ada 30 XP, completion grants 30.
    with pytest.raises(DomainError) as conflict:
        update_lesson(
            store, lesson_id=2, payload=LessonUpdate(prerequisite_lesson_id=None), actor_id=1
        )
    assert (conflict.value.status_code, conflict.value.code) == (
        409, "LESSON_HAS_PROGRESS"
    )
    assert store.lessons[2].prerequisite_lesson_id == 1
    assert [row["lesson"].id for row in get_progress(store, 1)["rows"]] == [1, 2]
    with pytest.raises(DomainError) as duplicate:
        complete_lesson(store, user_id=1, lesson_id=2)
    assert duplicate.value.code == "LESSON_ALREADY_COMPLETED"
    assert get_user(store, 1).xp == 60


def test_resetting_prerequisite_is_blocked_and_xp_refunds_exactly_once():
    store = Storage()
    complete_lesson(store, user_id=1, lesson_id=2)
    with pytest.raises(DomainError) as dependent:
        reset_lesson(store, user_id=1, lesson_id=1)
    assert dependent.value.code == "DEPENDENT_LESSONS_COMPLETED"
    assert get_user(store, 1).xp == 60

    reset_lesson(store, user_id=1, lesson_id=2)
    assert get_user(store, 1).xp == 30
    with pytest.raises(DomainError) as absent:
        reset_lesson(store, user_id=1, lesson_id=2)
    assert absent.value.code == "PROGRESS_NOT_FOUND"
    assert get_user(store, 1).xp == 30


def test_wrong_correct_and_repeated_answers_reward_once_per_user_problem():
    store = Storage()
    grace_id = 2
    wrong = submit_solution(store, problem_id=1, user_id=grace_id, answer="42")
    assert not wrong["accepted"]
    assert wrong["submission"].verdict == "WRONG_ANSWER"
    assert not wrong["submission"].rewarded
    assert (wrong["submission"].xp_awarded, wrong["submission"].coins_awarded) == (0, 0)
    assert (get_user(store, grace_id).xp, get_user(store, grace_id).coins) == (0, 0)

    first = submit_solution(store, problem_id=1, user_id=grace_id, answer="15")
    repeated = submit_solution(store, problem_id=1, user_id=grace_id, answer=" 15 ")
    assert first["submission"].rewarded
    assert first["submission"].verdict == "ACCEPTED"
    assert not repeated["submission"].rewarded
    assert (repeated["submission"].xp_awarded, repeated["submission"].coins_awarded) == (0, 0)
    assert (get_user(store, grace_id).xp, get_user(store, grace_id).coins) == (10, 2)
    assert len(store.submissions) == 4  # 1 seeded + 3 new submissions.


def test_concurrent_correct_submissions_are_atomic_and_do_not_multiply_rewards():
    store = Storage()
    with ThreadPoolExecutor(max_workers=8) as executor:
        responses = list(
            executor.map(
                lambda _: submit_solution(store, 2, 2, " [::-1] "),
                range(24),
            )
        )
    assert all(response["submission"].verdict == "ACCEPTED" for response in responses)
    assert sum(bool(response["submission"].rewarded) for response in responses) == 1
    assert len({response["submission"].id for response in responses}) == 24
    assert (store.users[2].xp, store.users[2].coins) == (15, 3)


def test_public_schemas_do_not_expose_password_hash_or_expected_answer():
    store = Storage()
    public_user = UserResponse.model_validate(store.users[1]).model_dump()
    problem = ProblemResponse.model_validate(store.problems[1]).model_dump()
    assert "password_hash" not in public_user
    assert "password" not in public_user
    assert "expected_answer" not in problem
