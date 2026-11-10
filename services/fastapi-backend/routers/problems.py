from fastapi import APIRouter

from routers.deps import ActorId
from schemas import (
    Difficulty,
    ProblemCreate,
    ProblemResponse,
    ProblemUpdate,
    SubmissionCreate,
    SubmissionResponse,
)
from services import (
    create_problem,
    delete_problem,
    get_problem,
    get_submission,
    list_problems,
    list_submissions,
    submit_solution,
    update_problem,
)
from storage import store

router = APIRouter(prefix="/problems", tags=["problems"])
submissions_router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("", response_model=list[ProblemResponse])
def list_problems_route(
    difficulty: Difficulty | None = None,
    topic: str | None = None,
) -> list:
    return list_problems(
        store,
        difficulty=difficulty.value if difficulty else None,
        topic=topic,
    )


@router.post("", response_model=ProblemResponse, status_code=201)
def create_problem_route(payload: ProblemCreate, actor_id: ActorId):
    return create_problem(store, payload, actor_id)


@router.get("/{problem_id}", response_model=ProblemResponse)
def get_problem_route(problem_id: int):
    return get_problem(store, problem_id)


@router.patch("/{problem_id}", response_model=ProblemResponse)
def update_problem_route(problem_id: int, payload: ProblemUpdate, actor_id: ActorId):
    return update_problem(store, problem_id, payload, actor_id)


@router.delete("/{problem_id}", status_code=204)
def delete_problem_route(problem_id: int, actor_id: ActorId) -> None:
    delete_problem(store, problem_id, actor_id)


@router.post(
    "/{problem_id}/submissions", response_model=SubmissionResponse, status_code=201
)
def submit_solution_route(problem_id: int, payload: SubmissionCreate, actor_id: ActorId):
    outcome = submit_solution(store, problem_id, actor_id, payload.answer)
    submission = outcome["submission"]
    return SubmissionResponse(
        id=submission.id,
        problem_id=submission.problem_id,
        user_id=submission.user_id,
        verdict=submission.verdict,
        answer=submission.answer,
        rewarded=submission.rewarded,
        xp_awarded=submission.xp_awarded,
        coins_awarded=submission.coins_awarded,
        message=outcome["message"],
        created_at=submission.created_at,
    )


@router.get("/{problem_id}/submissions", response_model=list[SubmissionResponse])
def list_problem_submissions_route(problem_id: int, user_id: int | None = None) -> list:
    return list_submissions(store, problem_id=problem_id, user_id=user_id)


@submissions_router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission_route(submission_id: int):
    return get_submission(store, submission_id)
