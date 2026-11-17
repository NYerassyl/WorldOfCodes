# Acceptance evidence — 25db51a (progress/comments restart + continuous scenario)

Base: `feat/profile-insights` @ `25db51a` (merge of PR #27).
Runtime: isolated PostgreSQL database `woc_qa_25db51a` (11 Prisma migrations + seed +
Alembic `001_activity`), Express on `:4001`, FastAPI on `:8099`, Docker judge
`python:3.12-alpine`.

The shared development database was not used or modified. `main` and production
were not touched.

## Commands

```sh
# 1. continuous two-account scenario + persistence writes (no restart)
node scripts/verify-acceptance-25db51a.mjs snapshot

# 2. stop Express and FastAPI, start both again

# 3. re-read the same records with the same sessions
node scripts/verify-acceptance-25db51a.mjs verify
```

The script talks only to public HTTP endpoints: Express `/api/*` and FastAPI
`/api/*` on the same database. It never writes directly to Prisma.

## Result 1 — continuous scenario (9/9 PASS)

| Step | Evidence |
| --- | --- |
| profile | `GET /api/players/{id}/profile` returns the account nickname |
| follow → notification | `PUT /api/players/{id}/follow` 204; one FOLLOW notice for the second account; repeat follow does not duplicate |
| chat | message stored, conversation `unread=1`, `POST /chat/{id}/read` clears it |
| lesson | `POST /api/learning/lessons/{id}/start` → `IN_PROGRESS` |
| solution | real Docker judge accepted every program of the lesson (`2` programs), lesson becomes `COMPLETED` |
| analytics | FastAPI `GET /api/players/{id}/activity` → `submissions=2 solved=2` |
| comments | both accounts create comments through FastAPI on the shared problem (`py-double`) |
| ranked duel | two queued accounts pair without a third player; accepted verdict settles once; ratings `1000→1024` and `1000→1000` (Novice loss is 0) |
| isolation | a third account sees no chat, match or notifications, and receives 403 when editing another author's comment |

## Result 2 — after an Express + FastAPI restart (4/4 PASS)

| Record | Evidence |
| --- | --- |
| lesson progress | both accounts keep the same `lessonId`, `state` (`COMPLETED` / `IN_PROGRESS`), `startedAt`, `completedAt` |
| comments | both comments keep body, author id, problem id and timestamps |
| analytics | FastAPI still reports the same solved submissions (`solved=2`) |
| ranked match | the settled match is still readable with the same winner |

Sessions stayed valid across the restart because they are canonical `AuthSession`
rows, not process memory.

## Limitations

- The run used an isolated local database and local services; it is acceptance
  evidence for the merged code, not a production deployment.
- The Docker judge requires Colima; the run used the existing
  `python:3.12-alpine` image with `--pull=never`.
