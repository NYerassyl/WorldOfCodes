# GPT 2 service review and GPT 4 handoff — FastAPI in-memory assignment

Date: 2026-11-10. Source baseline: GPT 4 PR #9 `feat/fastapi-routes-gpt4` at
`6ad8c9cbbd1354afd7a9ab55af3f5386c53da274`.

## API contract preserved

The functions and Pydantic response models in
`docs/fastapi-router-contract-gpt4.md` remain the canonical contract.
GPT 2 deliberately preserved all existing `services/fastapi-backend/routers/*.py`,
`main.py`, `errors.py`, existing tests and JSON response shapes.

- `schemas.py`: retained validation limits, names and field types. An explicit
  `PATCH /api/lessons/{lesson_id}` with
  `{"prerequisite_lesson_id": null}` may now clear a prerequisite when that
  lesson has no completions. No-op `{"title": null}` still fails with 422.
- `storage.py`: reviewed and retained as-is. Its `RLock` guards atomic store
  mutations, seed data matches GPT 4's contract, and `reset()` creates fresh
  in-memory records. No SQL or external services.
- `services.py`: preserved all original names/return structures. Added
  `ensure_progress_owner(store, user_id, actor_id) -> None` to enable GPT 4's
  HTTP router to enforce ownership; also prevent retrospective prerequisite
  changes for lessons with existing completions (409 `LESSON_HAS_PROGRESS`).
  Existing user profile owner checks and first-correct reward logic are retained.

## Tests

`services/fastapi-backend/tests/test_services_gpt2.py` covers:
- owner-only profile PATCH/DELETE without partial mutations;
- new progress owner check (403 and unknown-user 404);
- lesson prerequisite clearing, prerequisite freeze after completion;
- lesson XP awarded once, blocked dependent reset and correct one-time refund;
- wrong-answer XP/coins zero, first correct rewarded, later correct not rewarded;
- 24 concurrent correct submissions with **exactly one** reward;
- private password hash and stored expected answer absent in public schemas.

`.github/workflows/fastapi-gpt2-services.yml` runs GPT 4's existing
router tests **plus** these tests and checks `/docs` and `/openapi.json`.

## Required GPT 4 router follow-up — ownership gap

**Confirmed issue in the unchanged GPT 4 router**:
`POST /api/users/{user_id}/progress` and
`DELETE /api/users/{user_id}/progress/{lesson_id}`
do not declare `actor_id: ActorId` and do not check `X-User-Id`.
A caller can therefore complete/reset another user's progress without
authorization.

GPT 4 must inject `ActorId` into both handlers and invoke the new
`ensure_progress_owner(store, user_id, actor_id)` **before** calling
`complete_lesson` or `reset_lesson`. For missing header expect 401;
for another user expect 403; for the owner preserve 201/204. Add route tests.
Do not simulate a real login/session: `X-User-Id` is explicitly demo-only.

## Acceptance boundaries

The service grades fixed text answers; it does **not** execute arbitrary user
Python. The Express/Prisma production application is unchanged. This is a
separate educational FastAPI service with in-memory data that reset on restart.
No claims about production authentication or real Docker Judge are made.
