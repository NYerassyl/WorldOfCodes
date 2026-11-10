from fastapi import APIRouter

from routers.deps import ActorId
from schemas import (
    CompletionCreate,
    CompletionResponse,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    Level,
    ProgressLesson,
    ProgressSummary,
)
from services import (
    complete_lesson,
    create_lesson,
    delete_lesson,
    ensure_progress_owner,
    get_lesson,
    get_progress,
    list_lessons,
    reset_lesson,
    update_lesson,
)
from storage import store

router = APIRouter(prefix="/lessons", tags=["lessons"])
progress_router = APIRouter(prefix="/users", tags=["progress"])


@router.get("", response_model=list[LessonResponse])
def list_lessons_route(
    level: Level | None = None,
    topic: str | None = None,
    include_unpublished: bool = False,
) -> list:
    return list_lessons(
        store,
        level=level.value if level else None,
        topic=topic,
        include_unpublished=include_unpublished,
    )


@router.post("", response_model=LessonResponse, status_code=201)
def create_lesson_route(payload: LessonCreate, actor_id: ActorId):
    return create_lesson(store, payload, actor_id)


@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson_route(lesson_id: int):
    return get_lesson(store, lesson_id)


@router.patch("/{lesson_id}", response_model=LessonResponse)
def update_lesson_route(lesson_id: int, payload: LessonUpdate, actor_id: ActorId):
    return update_lesson(store, lesson_id, payload, actor_id)


@router.delete("/{lesson_id}", status_code=204)
def delete_lesson_route(lesson_id: int, actor_id: ActorId) -> None:
    delete_lesson(store, lesson_id, actor_id)


@progress_router.get("/{user_id}/progress", response_model=ProgressSummary)
def progress_route(user_id: int):
    data = get_progress(store, user_id)
    return ProgressSummary(
        user_id=user_id,
        xp=data["user"].xp,
        coins=data["user"].coins,
        completed_lessons=[
            ProgressLesson(
                lesson_id=row["lesson"].id,
                title=row["lesson"].title,
                level=row["lesson"].level,
                xp_awarded=row["completion"].xp_awarded,
                completed_at=row["completion"].completed_at,
            )
            for row in data["rows"]
        ],
        next_lesson=data["next_lesson"],
    )


@progress_router.post("/{user_id}/progress", response_model=CompletionResponse, status_code=201)
def complete_lesson_route(user_id: int, payload: CompletionCreate, actor_id: ActorId):
    ensure_progress_owner(store, user_id, actor_id)
    completion, user = complete_lesson(store, user_id, payload.lesson_id)
    lesson = get_lesson(store, payload.lesson_id)
    return CompletionResponse(
        user_id=user_id,
        lesson_id=lesson.id,
        lesson_title=lesson.title,
        xp_awarded=completion.xp_awarded,
        user_xp=user.xp,
        completed_at=completion.completed_at,
    )


@progress_router.delete("/{user_id}/progress/{lesson_id}", status_code=204)
def reset_lesson_route(user_id: int, lesson_id: int, actor_id: ActorId) -> None:
    ensure_progress_owner(store, user_id, actor_id)
    reset_lesson(store, user_id, lesson_id)
