# GPT 2 → GPT 1: Assignment 7 FastAPI JWT handoff

Repository: `NYerassyl/WorldOfCodes`. Approved base: `feat/profile-insights@1c112ebd5c5654897fe8544a646c07463f5a49c1`.
Implementation branch: `feat/assignment7-jwt-gpt2`; PR target `feat/profile-insights`, never `main`.

## API and site compatibility

The site still calls Express `/api` (port 4001). This PR implements authentication in FastAPI (port 8000) against the **same Prisma User/AuthSession tables**. There is no second account system.

| FastAPI operation | Input | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{email,nickname,password}` | 201 `{token,user}` | 409 duplicate, 422 invalid, 503 missing JWT secret |
| `POST /api/auth/login` | `{email,password}` | 200 `{token,user}` | 401 bad credentials, 422 invalid, 503 missing JWT secret |
| `POST /api/auth/logout` | Bearer JWT or active old opaque session | 204 no body | 401 invalid/revoked/expired |
| `GET /api/users/me` | Bearer JWT or opaque | 200 `{...privateUser,completedLessons}` | 401 invalid |
| `POST /api/users` | legacy registration alias | 201 `{token,user}` | same as register |

The private `user` contract preserves `id,displayName,bio,nickname,avatarUrl,xp,level,renamedAt,email,coins,nicknameChanges,nextNicknameChange`. FastAPI returns the existing `{error:{code,message}}` structure for domain errors.

## Verified design; unchanged DB ownership

- HS256 is the ONLY allowed JWT algorithm. Required claims: `sub` (canonical string User.id), `iat`, `exp`, unique UUID `jti`, `iss=worldofcodes-auth`, `aud=worldofcodes-api`.
- `JWT_SECRET` required server-side, minimum 32 UTF-8 bytes. `JWT_ACCESS_TTL_SECONDS` default 3600 seconds. No code-embedded fallback secret. Fail closed with 503 if signing configuration is absent.
- Existing Node `scrypt$16384$8$1$SALT$DIGEST` hashes are verified using Python `hashlib.scrypt`; new passwords use the same format.
- FastAPI persists `SHA-256(full JWT)` to Prisma `AuthSession.tokenHash` with matching `expiresAt`, `userId`. For protected calls it checks signed JWT claims **first**, then token hash, matching user, DB expiry/revocation and user presence. Logout sets `revokedAt` on the current session.
- Opaque tokens with no dot and length 32–128 remain valid until their current expiry or revocation. Any token containing a dot is strictly JWT: invalid, forged or expired JWT is immediately 401, **never** opaque fallback.
- Only the existing SQLAlchemy mapping of Prisma `User` was expanded to expose canonical auth fields and a mapping of existing `AuthSession` added. Neither Prisma tables nor Alembic historical migrations are modified. Prisma is the only table owner, Alembic the read-only profile VIEW owner.

## GPT 1's separately assigned Express / Socket.IO integration

**Do not release FastAPI-issued JWT to website clients before these changes are merged and accepted.** None of the following files were modified by GPT 2.

1. `services/learning-backend/src/auth/router.js` → `createAuthRouter`: proxy precisely `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` from Express to FastAPI, preserving HTTP 201/200/204, JSON errors and `{token,user}`. If FastAPI is unreachable, return explicit **503 CANONICAL_AUTH_UNAVAILABLE**; do not fall back to old opaque issuance. Avoid proxy loops.
2. `services/learning-backend/src/auth/session.js` → `resolveAuthSession`: distinguish JWT vs opaque; for JWT validate pinned HS256, issuer/audience/required claims/signature/expiry via vetted Node JWT library using the same server-side `JWT_SECRET`. Verify SHA-256 token hash maps to an active Prisma AuthSession with `claims.sub===session.userId` and an existing User. Never accept failed JWT by treating it as opaque. Continue accepting pre-existing opaque sessions until expiry.
3. `services/learning-backend/src/auth/router.js` → `makeRequireAuth`: remove opaque-only regex restriction for JWT; keep `req.auth.userId/sessionId/user` for ownership, progress, profile, challenges, and social endpoints.
4. `services/learning-backend/src/battle/socket.js` → Socket.IO handshake / per-event guards use `resolveAuthSession`; JWT must work and revoked sessions must disconnect. `server/socket-auth.js` → `resolveSession` if still used in other paths.
5. `frontend/src/lib/api.ts` and `frontend/src/lib/auth.tsx` already treat the token as an opaque string (storage + Bearer header) and expect `{token,user}`; payload format needs no edit, but ensure login restore `GET /api/users/me`, logout, profile update, judge and Socket.IO work in acceptance.

**Integration limitation:** FastAPI direct `GET /api/users/me`, SQLAlchemy owner-protected routes, JWT register/login/logout work before Express integration. FastAPI still **forwards** some non-auth operations (`PATCH /users/me`, judge, learning/progress) to Express; these will not work with new JWT until Express `resolveAuthSession` accepts JWT. This is not a standalone alternate backend; the source of truth is the existing site database.

## Acceptance evidence checklist

- Fresh isolated localhost `*_test` PostgreSQL only, with original 11 Prisma migrations/seed followed by Alembic view-only migration.
- Previously registered Node-scrypt account logs in to FastAPI without re-registration; new user and hashed password in the same `User`.
- Correct JWT accepted and `AuthSession.tokenHash` / `expiresAt` stored; tampered signature, expiry, issuer/audience, missing/deleted user, missing token → 401; logout revokes.
- Existing opaque token still works and revokes normally; forged JWT cannot downgrade to opaque.
- Duplicate registration including concurrent race → 409, Pydantic validation → 422; ownership across users → 403.
- Full previous FastAPI and Node regression suites remain green.
- Express proxy / Socket.IO / website tests must be completed **by integrator GPT 1** before rollout.
