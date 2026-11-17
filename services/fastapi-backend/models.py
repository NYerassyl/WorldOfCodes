"""Persistent learning entities. This service uses its own PostgreSQL database."""
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Timestamped:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Timestamped, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("xp >= 0 AND coins >= 0", name="ck_user_balances"),
        CheckConstraint("email = lower(email)", name="ck_user_email_normalized"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    nickname: Mapped[str] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(256))
    bio: Mapped[str] = mapped_column(String(280), default="", server_default="")
    xp: Mapped[int] = mapped_column(default=0, server_default="0")
    coins: Mapped[int] = mapped_column(default=0, server_default="0")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="author", passive_deletes="all")
    problems: Mapped[list["Problem"]] = relationship(back_populates="author", passive_deletes="all")
    completions: Mapped[list["Completion"]] = relationship(back_populates="user", passive_deletes="all")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="user", passive_deletes="all")
    comments: Mapped[list["Comment"]] = relationship(back_populates="author", passive_deletes="all")


class Lesson(Timestamped, Base):
    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("xp_reward BETWEEN 10 AND 100", name="ck_lesson_reward"),
        CheckConstraint("level IN ('beginner', 'intermediate', 'advanced')", name="ck_lesson_level"),
        CheckConstraint("prerequisite_lesson_id <> id", name="ck_lesson_not_self"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(500))
    level: Mapped[str] = mapped_column(String(20))
    topic: Mapped[str] = mapped_column(String(40), index=True)
    xp_reward: Mapped[int] = mapped_column(Integer)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    prerequisite_lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="RESTRICT"), index=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    author: Mapped[User] = relationship(back_populates="lessons")
    prerequisite: Mapped["Lesson | None"] = relationship(remote_side=[id])
    completions: Mapped[list["Completion"]] = relationship(back_populates="lesson", passive_deletes="all")


class Completion(Base):
    __tablename__ = "completions"
    __table_args__ = (CheckConstraint("xp_awarded >= 0", name="ck_completion_reward"),)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="RESTRICT"), primary_key=True, index=True)
    xp_awarded: Mapped[int] = mapped_column(Integer)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user: Mapped[User] = relationship(back_populates="completions")
    lesson: Mapped[Lesson] = relationship(back_populates="completions")


class Problem(Timestamped, Base):
    __tablename__ = "problems"
    __table_args__ = (
        CheckConstraint("xp_reward BETWEEN 5 AND 100 AND coin_reward BETWEEN 0 AND 50", name="ck_problem_rewards"),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="ck_problem_difficulty"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(80))
    prompt: Mapped[str] = mapped_column(String(500))
    difficulty: Mapped[str] = mapped_column(String(20), index=True)
    topic: Mapped[str] = mapped_column(String(40), index=True)
    expected_answer: Mapped[str] = mapped_column(String(120))
    xp_reward: Mapped[int] = mapped_column(Integer)
    coin_reward: Mapped[int] = mapped_column(Integer)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    author: Mapped[User] = relationship(back_populates="problems")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="problem", passive_deletes="all")
    comments: Mapped[list["Comment"]] = relationship(back_populates="problem", passive_deletes="all")


class Submission(Timestamped, Base):
    __tablename__ = "submissions"
    __table_args__ = (
        CheckConstraint("verdict IN ('ACCEPTED', 'WRONG_ANSWER')", name="ck_submission_verdict"),
        CheckConstraint("xp_awarded >= 0 AND coins_awarded >= 0", name="ck_submission_rewards"),
        CheckConstraint("(rewarded AND verdict = 'ACCEPTED') OR (NOT rewarded AND xp_awarded = 0 AND coins_awarded = 0)", name="ck_submission_reward_consistency"),
        Index("uq_submission_first_reward", "user_id", "problem_id", unique=True, postgresql_where=text("rewarded")),
        Index("ix_submissions_user_created", "user_id", "created_at"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="RESTRICT"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    answer: Mapped[str] = mapped_column(String(200))
    verdict: Mapped[str] = mapped_column(String(20))
    rewarded: Mapped[bool] = mapped_column(Boolean)
    xp_awarded: Mapped[int] = mapped_column(Integer)
    coins_awarded: Mapped[int] = mapped_column(Integer)
    message: Mapped[str] = mapped_column(Text)
    problem: Mapped[Problem] = relationship(back_populates="submissions")
    user: Mapped[User] = relationship(back_populates="submissions")


class Comment(Timestamped, Base):
    __tablename__ = "comments"
    __table_args__ = (CheckConstraint("length(trim(body)) BETWEEN 1 AND 2000", name="ck_comment_body"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(String(2000))
    author: Mapped[User] = relationship(back_populates="comments")
    problem: Mapped[Problem] = relationship(back_populates="comments")


class TraceAttempt(Timestamped, Base):
    __tablename__ = "trace_attempts"
    __table_args__ = (CheckConstraint("attempt_number > 0", name="ck_trace_attempt_number"),
                      Index("uq_trace_attempt_number", "user_id", "exercise_id", "attempt_number", unique=True))
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    exercise_id: Mapped[str] = mapped_column(String(80))
    submitted_output: Mapped[str] = mapped_column(Text)
    correct: Mapped[bool] = mapped_column(Boolean)
    attempt_number: Mapped[int] = mapped_column(Integer)
