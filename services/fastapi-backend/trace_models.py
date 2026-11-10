"""Public Pydantic schemas for Python Trace Practice.

Expected outputs and solution explanations are deliberately not included in
the list/detail response models. They are revealed after a submission only.
"""
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TraceDifficulty(str, Enum):
    EASY = "easy"
    EASY_MEDIUM = "easy-medium"
    MEDIUM = "medium"
    MEDIUM_HARD = "medium-hard"
    HARD = "hard"


class TraceModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExerciseSummary(TraceModel):
    id: str
    level: int = Field(ge=1, le=5)
    difficulty: TraceDifficulty
    topic: str
    title: str


class ExerciseDetail(ExerciseSummary):
    instructions: str
    code: str


class TraceSubmissionInput(TraceModel):
    answer: str = Field(max_length=2000, description="Predicted stdout, without the final terminal newline")


class TraceSubmissionResult(TraceModel):
    exercise_id: str
    user_id: int
    correct: bool
    verdict: Literal["CORRECT", "INCORRECT"]
    submitted_output: str
    expected_output: str
    explanation: str
    attempt_number: int
