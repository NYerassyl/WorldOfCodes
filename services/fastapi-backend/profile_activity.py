from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from database import database_session
from profile_models import DailyProblemActivity

router = APIRouter(prefix="/api/players", tags=["profiles"])


class Totals(BaseModel):
    submissions: int = 0
    solved: int = 0


class Activity(BaseModel):
    days: dict[date, Totals]
    year: Totals
    recent: Totals
    previous: Totals
    current_streak: int
    longest_streak: int
    topics: dict[str, int]
    difficulties: dict[str, int]


def summarize(rows, today):
    start = today - timedelta(days=364)
    days = {start + timedelta(days=i): Totals() for i in range(365)}
    solved = {}
    recent, previous = set(), set()
    for row in rows:
        day = days[row.day]
        day.submissions += row.submissions
        if row.solved:
            day.solved += 1
            solved[row.problem_id] = (row.topic, row.difficulty)
            age = (today - row.day).days
            if age < 30:
                recent.add(row.problem_id)
            elif age < 60:
                previous.add(row.problem_id)
    topics, difficulties = {}, {}
    for topic, difficulty in solved.values():
        topics[topic] = topics.get(topic, 0) + 1
        difficulties[difficulty] = difficulties.get(difficulty, 0) + 1
    run = longest = current = 0
    for day, counts in days.items():
        run = run + 1 if counts.submissions else 0
        longest = max(longest, run)
        if day == today - timedelta(days=1) or day == today and run:
            current = run
    ordered = list(days.values())
    def totals(period, unique):
        return Totals(submissions=sum(d.submissions for d in period), solved=len(unique))
    return Activity(days=days, year=totals(ordered, solved), recent=totals(ordered[-30:], recent),
                    previous=totals(ordered[-60:-30], previous), current_streak=current,
                    longest_streak=longest, topics=topics, difficulties=difficulties)


@router.get("/{player_id}/activity", response_model=Activity)
def activity(player_id: str, session: Annotated[Session, Depends(database_session)],
             credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))]):
    token = credentials.credentials if credentials else ""
    valid = session.scalar(text('SELECT 1 FROM "AuthSession" WHERE "tokenHash"=:digest AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP AT TIME ZONE \'UTC\''),
                           {"digest": sha256(token.encode()).hexdigest()})
    if not valid:
        raise HTTPException(401, "Valid session required")
    if not session.scalar(text('SELECT 1 FROM "User" WHERE id=:id'), {"id": player_id}):
        raise HTTPException(404, "Player not found")
    today = datetime.now(timezone.utc).date()
    rows = session.scalars(select(DailyProblemActivity).where(
        DailyProblemActivity.user_id == player_id,
        DailyProblemActivity.day.between(today - timedelta(days=364), today),
    ))
    return summarize(rows, today)
