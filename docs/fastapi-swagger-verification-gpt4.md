# Swagger UI verification (GPT 4)

Date: 2026-11-10

Every operation exposed by the FastAPI service was executed from the Swagger UI
(`http://127.0.0.1:8000/docs`) with **Try it out -> Execute**. The uvicorn access
log was used to confirm that each click produced a real HTTP request; no verdict,
reward or status code in this document is written by hand.

The service was restarted immediately before the run, so the seeded in-memory
state was: users `1 ada` (30 XP, 2 coins, lesson 1 completed, problem 1 accepted)
and `2 grace` (0 XP), lessons 1 -> 2 -> 3, problems 1..3, submission 1.

OpenAPI 3.1 lists 25 operations across six tags: `users`, `lessons`, `progress`,
`problems`, `submissions`, `meta`.

## Operation matrix

| # | Operation | Request used in the UI | Status | Observed result |
|---|-----------|------------------------|--------|-----------------|
| 1 | GET `/` | none | 200 | `service`, `storage=in-memory`, `docs`, `redoc`, `health` |
| 2 | GET `/api/health` | none | 200 | `status=ok`, counts `users=2 lessons=3 problems=3 submissions=1` |
| 3 | GET `/api/users` | none | 200 | both seeded users, no password field |
| 4 | POST `/api/users` | `swagger.user@worldofcodes.dev` / `swagger` / `swagger-pass-1` | 201 | created `id=3`, `xp=0`, `coins=0` |
| 5 | GET `/api/users/leaderboard` | none | 200 | rank 1 ada (30 XP), rank 2 grace (0 XP) |
| 6 | GET `/api/users/{user_id}` | `user_id=1` | 200 | ada record |
| 7 | PATCH `/api/users/{user_id}` | `user_id=3`, `X-User-Id: 3`, `{"nickname":"swagger3","bio":"Updated from the Swagger UI."}` | 200 | nickname and bio changed |
| 8 | DELETE `/api/users/{user_id}` | `user_id=3`, `X-User-Id: 3` | 204 | user 3 removed, no body |
| 9 | GET `/api/users/{user_id}/profile` | `user_id=1` | 200 | `completed_lessons=1`, `solved_problems=1`, `accepted_submissions=1`, `rank=1` |
| 10 | GET `/api/lessons` | none | 200 | lessons 1..3 with prerequisites |
| 11 | POST `/api/lessons` | `X-User-Id: 1`, `{"title":"Swagger Lesson", ... "xp_reward":15}` | 201 | created `id=4`, `author_id=1` |
| 12 | GET `/api/lessons/{lesson_id}` | `lesson_id=1` | 200 | "Python Variables and Types" |
| 13 | PATCH `/api/lessons/{lesson_id}` | `lesson_id=4`, `X-User-Id: 1`, `{"xp_reward":25}` | 200 | `xp_reward` changed 15 -> 25 |
| 14 | DELETE `/api/lessons/{lesson_id}` | `lesson_id=4`, `X-User-Id: 1` | 204 | lesson 4 removed |
| 15 | GET `/api/users/{user_id}/progress` | `user_id=1` | 200 | see the ownership matrix below |
| 16 | POST `/api/users/{user_id}/progress` | see the ownership matrix below | 401 / 403 / 201 | see below |
| 17 | DELETE `/api/users/{user_id}/progress/{lesson_id}` | see the ownership matrix below | 401 / 403 / 204 | see below |
| 18 | GET `/api/problems` | none | 200 | problems 1..3, `expected_answer` absent |
| 19 | POST `/api/problems` | `X-User-Id: 1`, `{"title":"Swagger Problem", ... "expected_answer":"42", "xp_reward":10, "coin_reward":1}` | 201 | created `id=4`; response has no `expected_answer` |
| 20 | GET `/api/problems/{problem_id}` | `problem_id=1` | 200 | "Sum of a List", no `expected_answer` |
| 21 | PATCH `/api/problems/{problem_id}` | `problem_id=4`, `X-User-Id: 1`, `{"xp_reward":12,"coin_reward":2}` | 200 | rewards updated, answer still hidden |
| 22 | DELETE `/api/problems/{problem_id}` | `problem_id=4`, `X-User-Id: 1` | 204 | problem 4 removed |
| 23 | POST `/api/problems/{problem_id}/submissions` | `problem_id=2`, `X-User-Id: 1`, `{"answer":"[::-1]"}` | 201 | `verdict=ACCEPTED`, `rewarded=true`, +15 XP, +3 coins |
| 24 | GET `/api/problems/{problem_id}/submissions` | `problem_id=1` | 200 | seeded submission 1 (ACCEPTED, 10 XP, 2 coins) |
| 25 | GET `/api/submissions/{submission_id}` | `submission_id=2` | 200 | the submission created in row 23 |

`POST /api/problems/{problem_id}/submissions` matched the stored expected answer
(`[::-1]`); the Accepted verdict comes from the service rule, not from executing
submitted code.

## Progress ownership matrix

`X-User-Id` is the only demo identity. The owner of `user_id=1` is `ada`.

| Call | Identity sent | Status | Body / side effect |
|------|---------------|--------|--------------------|
| `GET /api/users/1/progress` (before) | - | 200 | `xp=45`, `coins=5`, 1 completed lesson |
| `POST /api/users/1/progress {"lesson_id":2}` | header omitted | 401 | `AUTH_REQUIRED` |
| `GET /api/users/1/progress` | - | 200 | unchanged: `xp=45`, 1 completed lesson |
| `POST /api/users/1/progress {"lesson_id":2}` | `X-User-Id: 2` | 403 | `FORBIDDEN` "Only the learner can change their progress." |
| `GET /api/users/1/progress` | - | 200 | unchanged: `xp=45`, 1 completed lesson |
| `POST /api/users/1/progress {"lesson_id":2}` | `X-User-Id: 1` | 201 | `xp_awarded=30`, `user_xp=75`, lesson 2 completed |
| `DELETE /api/users/1/progress/2` | header omitted | 401 | `AUTH_REQUIRED` |
| `GET /api/users/1/progress` | - | 200 | unchanged: `xp=75`, 2 completed lessons |
| `DELETE /api/users/1/progress/2` | `X-User-Id: 2` | 403 | `FORBIDDEN`, progress kept |
| `GET /api/users/1/progress` | - | 200 | unchanged: `xp=75`, 2 completed lessons |
| `DELETE /api/users/1/progress/2` | `X-User-Id: 1` | 204 | lesson 2 reset |
| `GET /api/users/1/progress` (after) | - | 200 | `xp=45`, 1 completed lesson, `next_lesson` is lesson 2 |

Both unauthorized paths left `xp`, `coins` and `completed_lessons` exactly as they
were. The `401` and `403` rows are also asserted by
`tests/test_lessons.py::test_complete_progress_requires_header_and_changes_nothing`,
`test_complete_progress_rejects_other_user_and_changes_nothing`,
`test_reset_progress_requires_header_and_changes_nothing` and
`test_reset_progress_rejects_other_user_and_changes_nothing`.

## Notes

- Swagger labels the 401 responses as `Undocumented` because routers declare only
  the documented success and 4xx domain responses in the OpenAPI schema. The
  request/response itself is correct.
- The `X-User-Id` parameter is optional in the schema so that the missing-header
  case can be shown in the UI; the dependency rejects a missing value with
  `401 AUTH_REQUIRED`. Leaving the input empty omits the header entirely.
- `expected_answer` never appears in any response (rows 18-21).
- Full test suite after this run: `71 passed, 1 warning` (Starlette deprecation
  notice about `httpx` in `TestClient`).
