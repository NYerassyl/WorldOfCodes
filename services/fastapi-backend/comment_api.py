from typing import Annotated
from fastapi import APIRouter, Path, Query
from comment_schemas import CommentInput, CommentOutput, CommentPage
import comment_services as services
from site_auth import PlayerId, SiteSession

router = APIRouter(prefix="/api/problems", tags=["site-comments"])
ProblemId = Annotated[str, Path(min_length=1, max_length=120)]
CommentId = Annotated[str, Path(min_length=1, max_length=120)]


@router.get("/{problem_id}/comments", response_model=CommentPage)
def list_comments(session: SiteSession, problem_id: ProblemId,
                  limit: Annotated[int, Query(ge=1, le=100)] = 50,
                  before: Annotated[str | None, Query(max_length=120)] = None):
    return services.list_comments(session, problem_id, limit, before)


@router.post("/{problem_id}/comments", response_model=CommentOutput, status_code=201)
def create_comment(session: SiteSession, problem_id: ProblemId, payload: CommentInput, player: PlayerId):
    return services.create_comment(session, problem_id, player, payload.body)


@router.patch("/{problem_id}/comments/{comment_id}", response_model=CommentOutput)
def update_comment(session: SiteSession, problem_id: ProblemId, comment_id: CommentId, payload: CommentInput, player: PlayerId):
    return services.update_comment(session, problem_id, comment_id, player, payload.body)


@router.delete("/{problem_id}/comments/{comment_id}", status_code=204)
def delete_comment(session: SiteSession, problem_id: ProblemId, comment_id: CommentId, player: PlayerId):
    services.delete_comment(session, problem_id, comment_id, player)
