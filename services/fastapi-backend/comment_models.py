"""SQLAlchemy mappings of Prisma-owned shared tables; no create_all here."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class SiteBase(DeclarativeBase):
    pass


class SiteUser(SiteBase):
    __tablename__ = "User"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    nickname: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[str | None] = mapped_column("avatarUrl", String)


class SiteProblem(SiteBase):
    __tablename__ = "Problem"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    published: Mapped[bool] = mapped_column("isPublished")
    lesson_id: Mapped[str | None] = mapped_column("lessonId", String)


class ProblemComment(SiteBase):
    __tablename__ = "ProblemComment"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    problem_id: Mapped[str] = mapped_column("problemId", ForeignKey("Problem.id", ondelete="CASCADE"))
    author_id: Mapped[str] = mapped_column("authorId", ForeignKey("User.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime, server_default=func.now())
    author: Mapped[SiteUser] = relationship()
