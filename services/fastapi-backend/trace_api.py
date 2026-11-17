"""Three agreed resource-oriented /api/trace/exercises endpoints."""
from typing import Annotated

from fastapi import APIRouter, Query

from errors import DomainError
from routers.deps import ActorId, DbSession
from services import get_user
from models import TraceAttempt
from sqlalchemy import select, func
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
    store: DbSession,
    exercise_id: str,
    payload: TraceSubmissionInput,
    actor_id: ActorId,
) -> dict:
    get_user(store, actor_id, lock=True)
    item = _get_exercise(exercise_id)
    guess = _answer_lines(payload.answer)
    expected = _answer_lines(item["expected_stdout"])
    correct = guess == expected
    attempt_number = 1 + (store.scalar(select(func.max(TraceAttempt.attempt_number)).where(
        TraceAttempt.user_id == actor_id, TraceAttempt.exercise_id == exercise_id)) or 0)
    store.add(TraceAttempt(user_id=actor_id, exercise_id=exercise_id,
                           submitted_output=guess, correct=correct, attempt_number=attempt_number))
    store.flush()
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
