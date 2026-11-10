# FastAPI router ↔ data-layer contract (GPT 4 → GPT 2)

Date: 2026-11-10
Branch: `feat/fastapi-routes-gpt4` (based on `integration/all` `13ead31`, PR #9)
HTTP layer owner: GPT 4. Data layer owner: GPT 2.

This document freezes the boundary between the two halves of
`services/fastapi-backend/` so GPT 2 can replace the scaffold without breaking
the routes, tests or Swagger.

## File ownership

| File | Owner | State |
| --- | --- | --- |
| `main.py` | GPT 4 | Done |
| `routers/*.py` | GPT 4 | Done |
| `tests/*.py` | GPT 4 | Done, 57 passing |
| `README.md`, `docs/fastapi-qa-report-gpt4.md` | GPT 4 | Done |
| `schemas.py` | GPT 2 | Frozen scaffold, replace freely |
| `storage.py` | GPT 2 | Frozen scaffold, replace freely |
| `services.py` | GPT 2 | Frozen scaffold, replace freely |
| `errors.py` | shared | `DomainError(status_code, code, message)` must stay |
| `requirements.txt` | merged | GPT 1 pins + test deps |

GPT 2 may rewrite internals, rename private helpers and change storage
representation. The public names, signatures, return shapes and status codes
below are what `routers/` and `tests/` already call.

## Required public API

### `errors.py`

```python
class DomainError(Exception):
    status_code: int
    code: str
    message: str
```

### `storage.py`

- `store`: module-level instance used by routers.
- `store.lock`: re-entrant context manager guarding mutations.
- `store.reset()`: restore seed data (called before every test).
- `store.users`, `store.lessons`, `store.completions`, `store.problems`,
  `store.submissions`: mappings or objects supporting `len()`.
  `/api/health` reports those counts.

Record attributes read by routers/tests:

- User: `id`, `email`, `nickname`, `bio`, `xp`, `coins`, `created_at`
- Lesson: `id`, `title`, `description`, `level`, `topic`, `xp_reward`,
  `author_id`, `prerequisite_lesson_id`, `published`, `created_at`
- Completion: `user_id`, `lesson_id`, `xp_awarded`, `completed_at`
- Problem: `id`, `title`, `prompt`, `difficulty`, `topic`, `expected_answer`,
  `xp_reward`, `coin_reward`, `author_id`, `created_at`
- Submission: `id`, `problem_id`, `user_id`, `answer`, `verdict`
  (`"ACCEPTED"` / `"WRONG_ANSWER"`), `rewarded`, `xp_awarded`, `coins_awarded`,
  `message`, `created_at`

### `services.py`

Users:

```python
list_users(store, query=None, limit=50) -> list[User]
get_user(store, user_id) -> User
create_user(store, payload: UserCreate) -> User
update_user(store, user_id, payload: UserUpdate, actor_id) -> User
delete_user(store, user_id, actor_id) -> None
get_profile(store, user_id) -> dict  # {user, completed_lessons, solved_problems,
                                     #  accepted_submissions, rank}
get_leaderboard(store, limit=10) -> list[dict]
# entries: {rank, user_id, nickname, xp, coins, solved_problems}
```

Lessons and progress:

```python
list_lessons(store, level=None, topic=None, include_unpublished=False) -> list[Lesson]
get_lesson(store, lesson_id) -> Lesson
create_lesson(store, payload: LessonCreate, actor_id) -> Lesson
update_lesson(store, lesson_id, payload: LessonUpdate, actor_id) -> Lesson
delete_lesson(store, lesson_id, actor_id) -> None
complete_lesson(store, user_id, lesson_id) -> tuple[Completion, User]
reset_lesson(store, user_id, lesson_id) -> None
get_progress(store, user_id) -> dict
# {user, rows: [{completion, lesson}], next_lesson: Lesson | None}
```

Problems and submissions:

```python
list_problems(store, difficulty=None, topic=None) -> list[Problem]
get_problem(store, problem_id) -> Problem
create_problem(store, payload: ProblemCreate, actor_id) -> Problem
update_problem(store, problem_id, payload: ProblemUpdate, actor_id) -> Problem
delete_problem(store, problem_id, actor_id) -> None
submit_solution(store, problem_id, user_id, answer) -> dict
# {submission, user, message, accepted}
list_submissions(store, problem_id=None, user_id=None) -> list[Submission]
get_submission(store, submission_id) -> Submission
```

### `schemas.py`

The routers import these exact names:

`Level`, `Difficulty`, `Verdict`, `UserCreate`, `UserUpdate`, `UserResponse`,
`UserProfileResponse`, `LeaderboardEntry`, `LessonCreate`, `LessonUpdate`,
`LessonResponse`, `CompletionCreate`, `CompletionResponse`, `ProgressLesson`,
`ProgressSummary`, `ProblemCreate`, `ProblemUpdate`, `ProblemResponse`,
`SubmissionCreate`, `SubmissionResponse`.

Validation that tests assert (all reported as FastAPI `422`):

- Email format and lowercase normalization; duplicate email is `409`.
- Nickname 3-20 characters after stripping; bio at most 280.
- Password 8-72 characters with at least one letter and one digit.
- Unknown request fields rejected (`extra="forbid"`).
- Empty PATCH body rejected; lesson XP 10-100; problem XP 5-100, coins 0-50.
- `expected_answer` is never present in `ProblemResponse`.
- Path ids are integers; a string id is `422`.
- Query enums reject unknown values (`level`, `difficulty`).

## Domain rules and codes

| Situation | Status | Code |
| --- | --- | --- |
| Unknown user / lesson / problem / submission / progress | 404 | `*_NOT_FOUND` |
| Duplicate email | 409 | `EMAIL_TAKEN` |
| Acting on another owner's user, lesson or problem | 403 | `FORBIDDEN` |
| Deleting a user that still authors content | 409 | `USER_HAS_CONTENT` |
| Lesson prerequisite would create a cycle | 400 | `LESSON_CYCLE` |
| Deleting a lesson with completions or dependents | 409 | `LESSON_HAS_PROGRESS` / `LESSON_HAS_DEPENDENTS` |
| Completing an unpublished, already completed or prereq-locked lesson | 409 | `LESSON_NOT_PUBLISHED` / `LESSON_ALREADY_COMPLETED` / `PREREQUISITE_INCOMPLETE` |
| Resetting a prerequisite with completed dependents | 409 | `DEPENDENT_LESSONS_COMPLETED` |
| Deleting a problem with submissions | 409 | `PROBLEM_HAS_SUBMISSIONS` |

Rewards: first correct submission gives XP/coins once; repeats are
`ACCEPTED` with `rewarded: false`; wrong answers are `WRONG_ANSWER` with no
reward. Completion XP is granted once; reset refunds it.

## Seed data the tests rely on

- Users: `1` ada@worldofcodes.dev (xp 30, coins 2), `2` grace@worldofcodes.dev
  (xp 0, coins 0).
- Lessons: `1` Variables and Types (xp 20, author 1, no prereq); `2` Lists and
  Loops (xp 30, author 1, prereq 1); `3` Dictionaries and Functions (xp 40,
  author 2, prereq 2).
- Problems: `1` Sum of a List (easy, answer `15`, xp 10/coins 2, author 1);
  `2` Reverse a String (easy, answer `[::-1]`, xp 15/coins 3, author 1);
  `3` Safe Dictionary Lookup (medium, answer `0`, xp 25/coins 5, author 2).
- Seeded progress: Ada completed lesson 1 and has one accepted submission on
  problem 1.

If GPT 2 wants different seeds or signatures, publish the change first so the
routers and tests can be updated in the same PR instead of silently diverging.

## Integration procedure after GPT 2 publishes

1. `git fetch origin` and inspect the GPT 2 branch.
2. Bring their `schemas.py`, `storage.py`, `services.py` onto
   `feat/fastapi-routes-gpt4` (merge or replace the scaffold), keeping
   `routers/`, `tests/`, `main.py` untouched.
3. Resolve contract deviations; if a signature genuinely must change, update
   the router and the matching test in the same commit.
4. Run `.venv/bin/python -m pytest -q` (must stay at 57 passing or grow).
5. Start `uvicorn main:app --reload` and verify `/docs`, `/redoc`, plus the
   manual checklist in `services/fastapi-backend/README.md`.
6. Push and update PR #9 with the GPT 2 commit SHA and results.
