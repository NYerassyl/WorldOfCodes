"""Three agreed resource-oriented /api/trace/exercises endpoints."""
from typing import Annotated

from fastapi import APIRouter, Query

from errors import DomainError
from routers.deps import ActorId
from services import get_user
from storage import store
from trace_data import by_id, match_catalog, public_detail
from trace_models import (
    ExerciseDetail,
    ExerciseSummary,
    TraceDifficulty,
    TraceSubmissionInput,
    TraceSubmissionResult,
)

router = APIRouter(prefix="/trace/exercises", tags=["python-trace-practice"])


def _get_exercise(exercise_id: str) -> dict:
    item = by_id().get(exercise_id)
    if item is None:
        raise DomainError(404, "TRACE_EXERCISE_NOT_FOUND", "Trace exercise does not exist.")
    return item


def _answer_lines(value: str) -> str:
    # Accept CRLF input from Windows, but preserve every interior space and
    # line break. The terminal newline produced by print is not typed by users.
    normalized = value.replace("\r\n", "\n")
    return normalized.removesuffix("\n")


@router.get("", response_model=list[ExerciseSummary])
def list_trace_exercises(
    level: Annotated[int | None, Query(ge=1, le=5)] = None,
    difficulty: TraceDifficulty | None = None,
    topic: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
) -> list[dict]:
    return match_catalog(level=level, difficulty=difficulty, topic=topic)


@router.get("/{exercise_id}", response_model=ExerciseDetail)
def get_trace_exercise(exercise_id: str) -> dict:
    return public_detail(_get_exercise(exercise_id))


@router.post("/{exercise_id}/submit", response_model=TraceSubmissionResult)
def submit_trace_answer(
    exercise_id: str,
    payload: TraceSubmissionInput,
    actor_id: ActorId,
) -> dict:
    with store.lock:
        get_user(store, actor_id)
        item = _get_exercise(exercise_id)
        guess = _answer_lines(payload.answer)
        expected = _answer_lines(item["expected_stdout"])
        correct = guess == expected
        # In-memory demo history is attached to the same store to share its
        # reset and lock lifecycle with all other educational workflows.
        if not hasattr(store, "trace_attempts"):
            store.trace_attempts = {}
        key = (actor_id, exercise_id)
        attempt_number = store.trace_attempts.get(key, 0) + 1
        store.trace_attempts[key] = attempt_number
        return {
            "exercise_id": exercise_id,
            "user_id": actor_id,
            "correct": correct,
            "verdict": "CORRECT" if correct else "INCORRECT",
            "submitted_output": guess,
            "expected_output": expected,
            "explanation": item["explanation"],
            "attempt_number": attempt_number,
        }
