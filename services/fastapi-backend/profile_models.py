from datetime import date
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DailyProblemActivity(Base):
    """Alembic-managed, read-only PostgreSQL view."""
    __tablename__ = "woc_profile_activity"

    user_id: Mapped[str] = mapped_column(primary_key=True)
    day: Mapped[date] = mapped_column(primary_key=True)
    problem_id: Mapped[str] = mapped_column(primary_key=True)
    topic: Mapped[str]
    difficulty: Mapped[str]
    submissions: Mapped[int]
    solved: Mapped[bool]
