# Assignment 7 — canonical JWT login used by the live website

**Auth ownership:** FastAPI signs/registers/logs in/logs out against the shared
Prisma PostgreSQL `User` and `AuthSession`; Express is an HTTP proxy for
`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
and the existing resource API. Battle Socket.IO and protected Express REST
share the same signed JWT verifier and Prisma session. No extra users/sessions,
new migration, refresh tokens, or second HTTP/Socket.IO server.

## Server configuration

Set these **server-only** environment variables in **both** Express and
FastAPI processes (do not print a secret or commit a real `.env`):

- `JWT_SECRET`: the same random, unpredictable key, at least 32 UTF-8 bytes.
  Required for JWT verification. Missing/weak key fails closed.
- `JWT_ACCESS_TTL_SECONDS`: FastAPI JWT lifespan (default `3600`).
- `FASTAPI_INTERNAL_URL`: FastAPI server origin as seen by Express,
  e.g. `http://127.0.0.1:8000`. It must **not** point to Express.
- `AUTH_PROXY_TIMEOUT_MS`: optional Express→FastAPI auth timeout, default
  `8000` ms (allowed 100–30000).
- `DATABASE_URL`, `FASTAPI_DATABASE_URL`: existing **same** Prisma
  PostgreSQL public schema; no table migration is introduced.
- Existing `AUTH_RATE_LIMIT`, `AUTH_WINDOW_MS`, `REQUEST_BODY_LIMIT`
  still apply to Express register/login. Do not bypass app middleware.

Start PostgreSQL, apply the **existing** Prisma migrations and seed, then
run the existing view-only Alembic migration before starting both services:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
(cd services/fastapi-backend && python -m alembic upgrade head)
npm run dev:fastapi
npm run dev:api
npm run dev:web
```

Use separate terminals as appropriate for the three long-running servers.

## HTTP/API contract

| Method / URL on Express | Success | Error |
| --- | --- | --- |
| `POST /api/auth/register` | 201 `{token:<JWT>,user:<privateUser>}` | 409 duplicate, 422 Pydantic |
| `POST /api/auth/login` | 200 `{token:<JWT>,user:<privateUser>}` | 401 wrong credentials, 422 invalid |
| `POST /api/auth/logout` with Bearer JWT | 204 | 401 revoked/invalid |
| `GET /api/users/me` with Bearer JWT | 200 canonical current user | 401 invalid/expired |
| `PATCH /api/users/me` with Bearer JWT | 200 owner edit | 400/403/409 as before |

Proxy errors from FastAPI are passed through with their HTTP status and
`{error:{code,message}}` JSON contract. If the internal FastAPI origin
cannot be reached or times out, auth returns **503**
`CANONICAL_AUTH_UNAVAILABLE`. There is **no** fallback opaque issuer.
New JWTs are HS256-only, required `sub` (canonical User ID), `iat`,
`exp`, nonempty `jti`, issuer `worldofcodes-auth`, audience
`worldofcodes-api`. Express verifies the signature and claims, then looks up
SHA256(full JWT) in the **existing** `AuthSession.tokenHash`, checks expiry,
revocation, User presence and JWT sub/session user agreement.

Existing unexpired opaque sessions without dots continue to work in both
Express and FastAPI until revoked or expired. JWT-shaped invalid tokens are
NEVER treated as opaque. Socket.IO handshake and protected event guards reuse
this same `resolveAuthSession`, so logout revocation takes effect for
already-open sockets at the next protected event. One Socket.IO server and one
matchmaking queue are preserved; no battle/rank/lifecycle algorithm changes.

Frontend keeps `{token,user}`, its existing local session key and Bearer
header. On a 401 during restoration it clears the session and displays
**"Your session has expired or was revoked. Please sign in again."** No refresh
token mechanism is introduced.

## Isolated verification

- Node unit: shared JWT/session claims, tampering, user checks, opaque
  compatibility; auth proxy 201/200/204/401/409/422, unavailable 503,
  request-size and rate limiter tests.
- `scripts/verify-jwt-site.mjs`: real FastAPI+Express+Prisma+Socket.IO
  two-account registration/login, legacy Node-scrypt account, HTTP across
  both runtimes, profile, lesson progress, ownership, friendly battle,
  Socket.IO reconnect and match recovery, malformed/expired/iss/aud JWT,
  logout and active-socket revocation, legacy opaque compatibility.
- `scripts/verify-shared-fastapi.py`: actual Swagger browser path, canonical
  reward concurrency, server restart and errors now uses JWT end-to-end.
- `scripts/verify-arena-two-account.mjs` + GPT 4 QA workflow: full friendly
  and ranked judge, rating, chat/notifications, restart recovery.
- Playwright comments/learning/editor browser acceptance additionally checks
  frontend account state, profile, submission and persisted progress.

**Never** run these database tests outside a dedicated localhost `*_test`
database. CI provisions disposable PostgreSQL and a masked, ephemeral secret.
Report which CI jobs are green before claiming site/browser acceptance.
