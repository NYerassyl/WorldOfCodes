from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


class Level(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Verdict(str, Enum):
    ACCEPTED = "ACCEPTED"
    WRONG_ANSWER = "WRONG_ANSWER"


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, from_attributes=True)


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Enter a valid email address.")
    return email


def validate_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if len(value) > 72:
        raise ValueError("Password must be at most 72 characters.")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one digit.")
    return value


class UserCreate(ApiModel):
    email: str
    nickname: Annotated[str, Field(min_length=3, max_length=20)]
    password: Annotated[str, Field(min_length=8, max_length=72)]
    bio: Annotated[str, Field(max_length=280)] = ""

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_password(value)


class UserUpdate(ApiModel):
    email: str | None = None
    nickname: Annotated[str | None, Field(min_length=3, max_length=20)] = None
    password: Annotated[str | None, Field(min_length=8, max_length=72)] = None
    bio: Annotated[str | None, Field(max_length=280)] = None

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str | None) -> str | None:
        return normalize_email(value) if value is not None else None

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str | None) -> str | None:
        return validate_password(value) if value is not None else None

    @model_validator(mode="after")
    def require_one_field(self) -> UserUpdate:
        if all(value is None for value in self.model_dump().values()):
            raise ValueError("Provide at least one field to update.")
        return self


class UserResponse(ApiModel):
    id: int
    email: str
    nickname: str
    bio: str
    xp: int
    coins: int
    created_at: datetime


class UserProfileResponse(UserResponse):
    completed_lessons: int
    solved_problems: int
    accepted_submissions: int
    rank: int


class LeaderboardEntry(ApiModel):
    rank: int
    user_id: int
    nickname: str
    xp: int
    coins: int
    solved_problems: int


class LessonCreate(ApiModel):
    title: Annotated[str, Field(min_length=5, max_length=80)]
    description: Annotated[str, Field(min_length=10, max_length=500)]
    level: Level
    topic: Annotated[str, Field(min_length=3, max_length=40)]
    xp_reward: Annotated[int, Field(ge=10, le=100)]
    prerequisite_lesson_id: Annotated[int | None, Field(ge=1)] = None
    published: bool = True


class LessonUpdate(ApiModel):
    title: Annotated[str | None, Field(min_length=5, max_length=80)] = None
    description: Annotated[str | None, Field(min_length=10, max_length=500)] = None
    level: Level | None = None
    topic: Annotated[str | None, Field(min_length=3, max_length=40)] = None
    xp_reward: Annotated[int | None, Field(ge=10, le=100)] = None
    prerequisite_lesson_id: Annotated[int | None, Field(ge=1)] = None
    published: bool | None = None

    @model_validator(mode="after")
    def require_one_field(self) -> LessonUpdate:
        # Explicit JSON null clears an existing prerequisite. Other null-only
        # patches remain invalid to avoid silent no-op updates.
        if not any(
            field == "prerequisite_lesson_id" or getattr(self, field) is not None
            for field in self.model_fields_set
        ):
            raise ValueError("Provide at least one field to update.")
        return self


class LessonResponse(ApiModel):
    id: int
    title: str
    description: str
    level: Level
    topic: str
    xp_reward: int
    prerequisite_lesson_id: int | None
    published: bool
    author_id: int
    created_at: datetime


class CompletionCreate(ApiModel):
    lesson_id: Annotated[int, Field(ge=1)]


class CompletionResponse(ApiModel):
    user_id: int
    lesson_id: int
    lesson_title: str
    xp_awarded: int
    user_xp: int
    completed_at: datetime


class ProgressLesson(ApiModel):
    lesson_id: int
    title: str
    level: Level
    xp_awarded: int
    completed_at: datetime


class ProgressSummary(ApiModel):
    user_id: int
    xp: int
    coins: int
    completed_lessons: list[ProgressLesson]
    next_lesson: LessonResponse | None


class ProblemCreate(ApiModel):
    title: Annotated[str, Field(min_length=5, max_length=80)]
    prompt: Annotated[str, Field(min_length=10, max_length=500)]
    difficulty: Difficulty
    topic: Annotated[str, Field(min_length=3, max_length=40)]
    expected_answer: Annotated[str, Field(min_length=1, max_length=120)]
    xp_reward: Annotated[int, Field(ge=5, le=100)]
    coin_reward: Annotated[int, Field(ge=0, le=50)] = 0


class ProblemUpdate(ApiModel):
    title: Annotated[str | None, Field(min_length=5, max_length=80)] = None
    prompt: Annotated[str | None, Field(min_length=10, max_length=500)] = None
    difficulty: Difficulty | None = None
    topic: Annotated[str | None, Field(min_length=3, max_length=40)] = None
    expected_answer: Annotated[str | None, Field(min_length=1, max_length=120)] = None
    xp_reward: Annotated[int | None, Field(ge=5, le=100)] = None
    coin_reward: Annotated[int | None, Field(ge=0, le=50)] = None

    @model_validator(mode="after")
    def require_one_field(self) -> ProblemUpdate:
        if all(value is None for value in self.model_dump().values()):
            raise ValueError("Provide at least one field to update.")
        return self


class ProblemResponse(ApiModel):
    id: int
    title: str
    prompt: str
    difficulty: Difficulty
    topic: str
    xp_reward: int
    coin_reward: int
    author_id: int
    created_at: datetime


class SubmissionCreate(ApiModel):
    answer: Annotated[str, Field(min_length=1, max_length=200)]


class SubmissionResponse(ApiModel):
    id: int
    problem_id: int
    user_id: int
    verdict: Verdict
    answer: str
    rewarded: bool
    xp_awarded: int
    coins_awarded: int
    message: str
    created_at: datetime
