from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field


class CommentInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    body: Annotated[str, Field(min_length=1, max_length=2000)]


class CommentAuthor(BaseModel):
    id: str
    nickname: str
    avatarUrl: str | None


class CommentOutput(BaseModel):
    id: str
    problemId: str
    author: CommentAuthor
    body: str
    createdAt: datetime
    updatedAt: datetime


class CommentPage(BaseModel):
    comments: list[CommentOutput]
    nextCursor: str | None
