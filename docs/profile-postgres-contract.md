# Profile integration

Use the existing Prisma User.id string in all user references. Express owns registration,
login, session revocation and the unique normalizedNickname. New handles are 3–24
lowercase ASCII letters. Existing handles remain valid for login, lookup and social links.
displayName is separate. No service should trust a browser-supplied actor ID for these routes.

GPT2 writes judged attempts to Submission with userId, problemId, createdAt and status.
Problem.topicSlug and difficulty classify unique accepted problems. The activity window
is 365 UTC dates including today. Daily and period counts deduplicate problem IDs within
each period. Streaks count dates with any submission; yesterday's streak stays current
until today's UTC day ends. No source code or private account fields leave the activity API.

GPT3 uses #chat/{userId} and the existing Follow composite key (followerId, followedId).
Produce a notification only for a new edge inside the same transaction. The current
chat page uses existing message endpoints until the dedicated inbox is integrated.

Prisma owns the existing account, social and learning tables. Alembic owns the
woc_profile_activity view and woc_fastapi_revision version table. Apply Prisma
migrations first, then run the following from services/fastapi-backend with the same
PostgreSQL DATABASE_URL. Use an isolated database for integration tests.

    python -m pip install -r requirements.txt
    alembic upgrade head
    python -m uvicorn main:app --port 8000

Express forwards authenticated activity reads to FASTAPI_INTERNAL_URL (default
http://127.0.0.1:8000). GET /api/players/{id}/profile exposes public fields and follow
counts. GET /api/players/{id}/followers and /following return players and a next
cursor for the after query parameter. GET /api/players/{id}/activity returns daily
counts, period totals, difficulty/topic breakdown and current/longest streak.
