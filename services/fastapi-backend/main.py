from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from errors import DomainError
from routers import lessons, problems, users
from trace_api import router as trace_router
from routers.deps import DbSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError, OperationalError
from models import User, Lesson, Problem, Submission

DESCRIPTION = """
Educational FastAPI service for the WorldOfCodes REST API assignment.

It is independent from the production Express/PostgreSQL application and keeps
learning data in its own PostgreSQL database. Apply Alembic migrations before startup.

## Demo authentication

Mutations and submissions read the `X-User-Id` header. Seeded users are `1`
(ada) and `2` (grace). Unknown, missing or non-numeric headers are rejected.
"""

app = FastAPI(
    title="WorldOfCodes FastAPI Learning API",
    description=DESCRIPTION,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "users", "description": "Registration, profiles, updates and leaderboard."},
        {"name": "lessons", "description": "Lesson catalog management."},
        {"name": "progress", "description": "Per-user lesson completion and XP."},
        {"name": "problems", "description": "Problem catalog and submission review."},
        {"name": "submissions", "description": "Submission lookup."},
        {"name": "meta", "description": "Health and service metadata."},
    ],
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.get("/", tags=["meta"])
def service_index() -> dict:
    return {
        "service": "fastapi-backend",
        "storage": "postgresql",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["meta"])
def health(store: DbSession) -> dict:
    return {
        "status": "ok", "service": "fastapi-backend", "storage": "postgresql",
        **{name: store.scalar(select(func.count()).select_from(model))
           for name, model in (("users", User), ("lessons", Lesson),
                               ("problems", Problem), ("submissions", Submission))},
    }


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
    code = "EMAIL_TAKEN" if constraint == "users_email_key" else "DATA_CONFLICT"
    return JSONResponse(status_code=409, content={"error": {
        "code": code,
        "message": "That email is already registered." if code == "EMAIL_TAKEN" else
                   "This operation conflicts with saved records or a relationship constraint.",
    }})


@app.exception_handler(OperationalError)
async def database_error_handler(request: Request, exc: OperationalError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"error": {
        "code": "DATABASE_UNAVAILABLE", "message": "Database operation unavailable; retry the request.",
    }})


app.include_router(users.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
app.include_router(lessons.progress_router, prefix="/api")
app.include_router(problems.router, prefix="/api")
app.include_router(problems.submissions_router, prefix="/api")
app.include_router(trace_router, prefix="/api")
