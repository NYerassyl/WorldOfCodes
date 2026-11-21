"""SQLAlchemy mappings of Prisma-owned tables; Alembic never creates these."""
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Player(Base):
    __tablename__='User'
    id: Mapped[str] = mapped_column(primary_key=True)
    nickname: Mapped[str]
    email: Mapped[str]
    passwordHash: Mapped[str]
    normalizedNickname: Mapped[str]
    nicknameChanges: Mapped[int]
    renamedAt: Mapped[datetime | None] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)
    displayName: Mapped[str | None]
    bio: Mapped[str]
    avatarUrl: Mapped[str | None]
    xp: Mapped[int]
    coins: Mapped[int]
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    authored_lessons: Mapped[list['Lesson']] = relationship(back_populates='author',passive_deletes='all')
    authored_problems: Mapped[list['Problem']] = relationship(back_populates='author',passive_deletes='all')

class Lesson(Base):
    __tablename__='Lesson'
    id: Mapped[str] = mapped_column(primary_key=True)
    topicId: Mapped[str]
    title: Mapped[str]
    theoryMd: Mapped[str] = mapped_column(Text)
    position: Mapped[int]
    prerequisiteId: Mapped[str | None] = mapped_column(ForeignKey('Lesson.id',ondelete='RESTRICT'))
    createdById: Mapped[str | None] = mapped_column(ForeignKey('User.id',ondelete='SET NULL'))
    author: Mapped[Player | None] = relationship(back_populates='authored_lessons')

class Problem(Base):
    __tablename__='Problem'
    id: Mapped[str] = mapped_column(primary_key=True)
    lessonId: Mapped[str | None] = mapped_column(ForeignKey('Lesson.id'))
    title: Mapped[str]
    statement: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(default='python')
    topicSlug: Mapped[str]
    difficulty: Mapped[str] = mapped_column(ENUM("EASY","MEDIUM","HARD",name="Difficulty",create_type=False))
    functionName: Mapped[str]
    starterCode: Mapped[str]
    rewardXp: Mapped[int]
    rewardCoins: Mapped[int]
    isPublished: Mapped[bool]
    createdById: Mapped[str | None] = mapped_column(ForeignKey('User.id',ondelete='SET NULL'))
    author: Mapped[Player | None] = relationship(back_populates='authored_problems')

class AuthSession(Base):
    """Mapping of the existing Prisma session table; never created by Alembic."""
    __tablename__ = "AuthSession"
    id: Mapped[str] = mapped_column(primary_key=True)
    userId: Mapped[str] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"))
    tokenHash: Mapped[str]
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    revokedAt: Mapped[datetime | None] = mapped_column(DateTime)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
