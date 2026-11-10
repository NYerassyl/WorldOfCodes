from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from errors import DomainError
from routers import lessons, problems, users
from trace_api import router as trace_router
from storage import store

DESCRIPTION = """
Educational FastAPI service for the WorldOfCodes REST API assignment.

It is independent from the production Express/PostgreSQL application and keeps
all data in memory. Restarting the process restores the seeded demo data.

## Demo authentication

Mutations and submissions read the `X-User-Id` header. Seeded users are `1`
(ada) and `2` (grace). Unknown, missing or non-numeric headers are rejected.
"""

app = FastAPI(
    title="WorldOfCodes FastAPI Learning API",
    description=DESCRIPTION,
    version="1.0.0",
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
        "storage": "in-memory",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    with store.lock:
        return {
            "status": "ok",
            "service": "fastapi-backend",
            "storage": "in-memory",
            "users": len(store.users),
            "lessons": len(store.lessons),
            "problems": len(store.problems),
            "submissions": len(store.submissions),
        }


app.include_router(users.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
app.include_router(lessons.progress_router, prefix="/api")
app.include_router(problems.router, prefix="/api")
app.include_router(problems.submissions_router, prefix="/api")
app.include_router(trace_router, prefix="/api")
