from __future__ import annotations

from errors import DomainError
from schemas import (
    LessonCreate,
    LessonUpdate,
    ProblemCreate,
    ProblemUpdate,
    UserCreate,
    UserUpdate,
)
from storage import (
    CompletionRecord,
    LessonRecord,
    ProblemRecord,
    Storage,
    SubmissionRecord,
    UserRecord,
    hash_password,
)


def _normalize_answer(value: str) -> str:
    return " ".join(value.split()).casefold()


def list_users(store: Storage, query: str | None = None, limit: int = 50) -> list[UserRecord]:
    with store.lock:
        users = sorted(store.users.values(), key=lambda user: user.id)
        if query:
            needle = query.casefold()
            users = [
                user
                for user in users
                if needle in user.email.casefold() or needle in user.nickname.casefold()
            ]
        return users[:limit]


def get_user(store: Storage, user_id: int) -> UserRecord:
    with store.lock:
        user = store.users.get(user_id)
        if user is None:
            raise DomainError(404, "USER_NOT_FOUND", f"User {user_id} does not exist.")
        return user


def ensure_progress_owner(store: Storage, user_id: int, actor_id: int) -> None:
    """Authorize progress mutations; called by the GPT 4 router with ActorId.

    The X-User-Id header is demo-only identity, not production authentication.
    Keep actor_id required so a caller cannot accidentally bypass this check.
    """
    with store.lock:
        get_user(store, user_id)
        if actor_id != user_id:
            raise DomainError(
                403, "FORBIDDEN", "Only the learner can change their progress."
            )


def _ensure_email_available(store: Storage, email: str, exclude_id: int | None = None) -> None:
    for user in store.users.values():
        if user.email == email and user.id != exclude_id:
            raise DomainError(409, "EMAIL_TAKEN", "That email is already registered.")


def create_user(store: Storage, payload: UserCreate) -> UserRecord:
    with store.lock:
        _ensure_email_available(store, payload.email)
        user = UserRecord(
            id=store.new_user_id(),
            email=payload.email,
            nickname=payload.nickname,
            password_hash=hash_password(payload.password),
            bio=payload.bio,
        )
        store.users[user.id] = user
        return user


def update_user(store: Storage, user_id: int, payload: UserUpdate, actor_id: int) -> UserRecord:
    with store.lock:
        user = get_user(store, user_id)
        if actor_id != user_id:
            raise DomainError(403, "FORBIDDEN", "Only the profile owner can update this user.")
        if payload.email is not None:
            _ensure_email_available(store, payload.email, exclude_id=user_id)
            user.email = payload.email
        if payload.nickname is not None:
            user.nickname = payload.nickname
        if payload.password is not None:
            user.password_hash = hash_password(payload.password)
        if payload.bio is not None:
            user.bio = payload.bio
        return user


def delete_user(store: Storage, user_id: int, actor_id: int) -> None:
    with store.lock:
        get_user(store, user_id)
        if actor_id != user_id:
            raise DomainError(403, "FORBIDDEN", "Only the profile owner can delete this user.")
        if any(lesson.author_id == user_id for lesson in store.lessons.values()) or any(
            problem.author_id == user_id for problem in store.problems.values()
        ):
            raise DomainError(
                409,
                "USER_HAS_CONTENT",
                "Delete or reassign authored lessons and problems before deleting this user.",
            )
        for key in [key for key in store.completions if key[0] == user_id]:
            del store.completions[key]
        for submission_id in [
            submission.id
            for submission in store.submissions.values()
            if submission.user_id == user_id
        ]:
            del store.submissions[submission_id]
        del store.users[user_id]


def get_profile(store: Storage, user_id: int) -> dict:
    with store.lock:
        user = get_user(store, user_id)
        completed_lessons = sum(
            1 for key in store.completions if key[0] == user_id
        )
        user_submissions = [
            submission
            for submission in store.submissions.values()
            if submission.user_id == user_id
        ]
        accepted = [
            submission for submission in user_submissions if submission.verdict == "ACCEPTED"
        ]
        return {
            "user": user,
            "completed_lessons": completed_lessons,
            "solved_problems": len({submission.problem_id for submission in accepted}),
            "accepted_submissions": len(accepted),
            "rank": 1 + sum(1 for other in store.users.values() if other.xp > user.xp),
        }


def get_leaderboard(store: Storage, limit: int = 10) -> list[dict]:
    with store.lock:
        accepted_problems: dict[int, set[int]] = {}
        for submission in store.submissions.values():
            if submission.verdict == "ACCEPTED":
                accepted_problems.setdefault(submission.user_id, set()).add(
                    submission.problem_id
                )
        ranked = sorted(store.users.values(), key=lambda user: (-user.xp, user.id))
        return [
            {
                "rank": index,
                "user_id": user.id,
                "nickname": user.nickname,
                "xp": user.xp,
                "coins": user.coins,
                "solved_problems": len(accepted_problems.get(user.id, set())),
            }
            for index, user in enumerate(ranked[:limit], start=1)
        ]


def list_lessons(
    store: Storage,
    level: str | None = None,
    topic: str | None = None,
    include_unpublished: bool = False,
) -> list[LessonRecord]:
    with store.lock:
        lessons = sorted(store.lessons.values(), key=lambda lesson: lesson.id)
        if not include_unpublished:
            lessons = [lesson for lesson in lessons if lesson.published]
        if level:
            lessons = [lesson for lesson in lessons if lesson.level == level]
        if topic:
            lessons = [lesson for lesson in lessons if lesson.topic.casefold() == topic.casefold()]
        return lessons


def get_lesson(store: Storage, lesson_id: int) -> LessonRecord:
    with store.lock:
        lesson = store.lessons.get(lesson_id)
        if lesson is None:
            raise DomainError(404, "LESSON_NOT_FOUND", f"Lesson {lesson_id} does not exist.")
        return lesson


def _ensure_prerequisite(store: Storage, lesson_id: int, prerequisite_id: int | None) -> None:
    if prerequisite_id is None:
        return
    if prerequisite_id == lesson_id:
        raise DomainError(400, "LESSON_CYCLE", "A lesson cannot require itself.")
    get_lesson(store, prerequisite_id)
    cursor = prerequisite_id
    visited: set[int] = set()
    while cursor is not None:
        if cursor == lesson_id:
            raise DomainError(400, "LESSON_CYCLE", "That prerequisite would create a cycle.")
        if cursor in visited:
            raise DomainError(400, "LESSON_CYCLE", "Existing prerequisite chain contains a cycle.")
        visited.add(cursor)
        parent = store.lessons.get(cursor)
        cursor = parent.prerequisite_lesson_id if parent else None


def create_lesson(store: Storage, payload: LessonCreate, actor_id: int) -> LessonRecord:
    with store.lock:
        get_user(store, actor_id)
        lesson_id = store.new_lesson_id()
        _ensure_prerequisite(store, lesson_id, payload.prerequisite_lesson_id)
        lesson = LessonRecord(
            id=lesson_id,
            title=payload.title,
            description=payload.description,
            level=payload.level.value,
            topic=payload.topic,
            xp_reward=payload.xp_reward,
            author_id=actor_id,
            prerequisite_lesson_id=payload.prerequisite_lesson_id,
            published=payload.published,
        )
        store.lessons[lesson.id] = lesson
        return lesson


def update_lesson(
    store: Storage, lesson_id: int, payload: LessonUpdate, actor_id: int
) -> LessonRecord:
    with store.lock:
        lesson = get_lesson(store, lesson_id)
        if lesson.author_id != actor_id:
            raise DomainError(403, "FORBIDDEN", "Only the lesson author can update this lesson.")
        if "prerequisite_lesson_id" in payload.model_fields_set:
            new_prerequisite_id = payload.prerequisite_lesson_id
            if new_prerequisite_id != lesson.prerequisite_lesson_id:
                # Never invalidate already recorded lesson progress by
                # introducing/removing a prerequisite after completion.
                if any(key[1] == lesson_id for key in store.completions):
                    raise DomainError(
                        409,
                        "LESSON_HAS_PROGRESS",
                        "Cannot change prerequisites after a learner completed this lesson.",
                    )
                _ensure_prerequisite(store, lesson_id, new_prerequisite_id)
                lesson.prerequisite_lesson_id = new_prerequisite_id
        if payload.title is not None:
            lesson.title = payload.title
        if payload.description is not None:
            lesson.description = payload.description
        if payload.level is not None:
            lesson.level = payload.level.value
        if payload.topic is not None:
            lesson.topic = payload.topic
        if payload.xp_reward is not None:
            lesson.xp_reward = payload.xp_reward
        if payload.published is not None:
            lesson.published = payload.published
        return lesson


def delete_lesson(store: Storage, lesson_id: int, actor_id: int) -> None:
    with store.lock:
        lesson = get_lesson(store, lesson_id)
        if lesson.author_id != actor_id:
            raise DomainError(403, "FORBIDDEN", "Only the lesson author can delete this lesson.")
        if any(key[1] == lesson_id for key in store.completions):
            raise DomainError(
                409, "LESSON_HAS_PROGRESS", "Learners already completed this lesson."
            )
        if any(other.prerequisite_lesson_id == lesson_id for other in store.lessons.values()):
            raise DomainError(
                409, "LESSON_HAS_DEPENDENTS", "Another lesson depends on this prerequisite."
            )
        del store.lessons[lesson_id]


def complete_lesson(store: Storage, user_id: int, lesson_id: int) -> tuple[CompletionRecord, UserRecord]:
    with store.lock:
        user = get_user(store, user_id)
        lesson = get_lesson(store, lesson_id)
        if not lesson.published:
            raise DomainError(409, "LESSON_NOT_PUBLISHED", "This lesson is not published yet.")
        if (user_id, lesson_id) in store.completions:
            raise DomainError(
                409,
                "LESSON_ALREADY_COMPLETED",
                "This lesson is already completed; XP is never awarded twice.",
            )
        if (
            lesson.prerequisite_lesson_id is not None
            and (user_id, lesson.prerequisite_lesson_id) not in store.completions
        ):
            raise DomainError(
                409,
                "PREREQUISITE_INCOMPLETE",
                "Complete the prerequisite lesson before this one.",
            )
        completion = CompletionRecord(
            user_id=user_id, lesson_id=lesson_id, xp_awarded=lesson.xp_reward
        )
        store.completions[(user_id, lesson_id)] = completion
        user.xp += completion.xp_awarded
        return completion, user


def reset_lesson(store: Storage, user_id: int, lesson_id: int) -> None:
    with store.lock:
        get_user(store, user_id)
        completion = store.completions.get((user_id, lesson_id))
        if completion is None:
            raise DomainError(404, "PROGRESS_NOT_FOUND", "This lesson has no saved progress.")
        for other in store.completions.values():
            if other.user_id != user_id:
                continue
            lesson = store.lessons.get(other.lesson_id)
            if lesson is not None and lesson.prerequisite_lesson_id == lesson_id:
                raise DomainError(
                    409,
                    "DEPENDENT_LESSONS_COMPLETED",
                    "Reset the dependent lessons before resetting this prerequisite.",
                )
        del store.completions[(user_id, lesson_id)]
        user = store.users[user_id]
        user.xp = max(0, user.xp - completion.xp_awarded)


def get_progress(store: Storage, user_id: int) -> dict:
    with store.lock:
        user = get_user(store, user_id)
        completed = sorted(
            (record for key, record in store.completions.items() if key[0] == user_id),
            key=lambda record: record.completed_at,
        )
        rows = [
            {"completion": record, "lesson": store.lessons.get(record.lesson_id)}
            for record in completed
        ]
        next_lesson = None
        for lesson in sorted(store.lessons.values(), key=lambda item: item.id):
            if not lesson.published or (user_id, lesson.id) in store.completions:
                continue
            if (
                lesson.prerequisite_lesson_id is None
                or (user_id, lesson.prerequisite_lesson_id) in store.completions
            ):
                next_lesson = lesson
                break
        return {"user": user, "rows": rows, "next_lesson": next_lesson}


def list_problems(
    store: Storage, difficulty: str | None = None, topic: str | None = None
) -> list[ProblemRecord]:
    with store.lock:
        problems = sorted(store.problems.values(), key=lambda problem: problem.id)
        if difficulty:
            problems = [
                problem for problem in problems if problem.difficulty == difficulty
            ]
        if topic:
            problems = [
                problem for problem in problems if problem.topic.casefold() == topic.casefold()
            ]
        return problems


def get_problem(store: Storage, problem_id: int) -> ProblemRecord:
    with store.lock:
        problem = store.problems.get(problem_id)
        if problem is None:
            raise DomainError(
                404, "PROBLEM_NOT_FOUND", f"Problem {problem_id} does not exist."
            )
        return problem


def create_problem(store: Storage, payload: ProblemCreate, actor_id: int) -> ProblemRecord:
    with store.lock:
        get_user(store, actor_id)
        problem = ProblemRecord(
            id=store.new_problem_id(),
            title=payload.title,
            prompt=payload.prompt,
            difficulty=payload.difficulty.value,
            topic=payload.topic,
            expected_answer=payload.expected_answer,
            xp_reward=payload.xp_reward,
            coin_reward=payload.coin_reward,
            author_id=actor_id,
        )
        store.problems[problem.id] = problem
        return problem


def update_problem(
    store: Storage, problem_id: int, payload: ProblemUpdate, actor_id: int
) -> ProblemRecord:
    with store.lock:
        problem = get_problem(store, problem_id)
        if problem.author_id != actor_id:
            raise DomainError(
                403, "FORBIDDEN", "Only the problem author can update this problem."
            )
        if payload.title is not None:
            problem.title = payload.title
        if payload.prompt is not None:
            problem.prompt = payload.prompt
        if payload.difficulty is not None:
            problem.difficulty = payload.difficulty.value
        if payload.topic is not None:
            problem.topic = payload.topic
        if payload.expected_answer is not None:
            problem.expected_answer = payload.expected_answer
        if payload.xp_reward is not None:
            problem.xp_reward = payload.xp_reward
        if payload.coin_reward is not None:
            problem.coin_reward = payload.coin_reward
        return problem


def delete_problem(store: Storage, problem_id: int, actor_id: int) -> None:
    with store.lock:
        problem = get_problem(store, problem_id)
        if problem.author_id != actor_id:
            raise DomainError(
                403, "FORBIDDEN", "Only the problem author can delete this problem."
            )
        if any(submission.problem_id == problem_id for submission in store.submissions.values()):
            raise DomainError(
                409,
                "PROBLEM_HAS_SUBMISSIONS",
                "Delete submissions before deleting this problem.",
            )
        del store.problems[problem_id]


def submit_solution(
    store: Storage, problem_id: int, user_id: int, answer: str
) -> dict:
    with store.lock:
        user = get_user(store, user_id)
        problem = get_problem(store, problem_id)
        correct = _normalize_answer(answer) == _normalize_answer(problem.expected_answer)
        already_accepted = any(
            submission.problem_id == problem_id
            and submission.user_id == user_id
            and submission.verdict == "ACCEPTED"
            for submission in store.submissions.values()
        )
        rewarded = correct and not already_accepted
        xp_awarded = problem.xp_reward if rewarded else 0
        coins_awarded = problem.coin_reward if rewarded else 0
        verdict = "ACCEPTED" if correct else "WRONG_ANSWER"
        if rewarded:
            message = f"Accepted! +{xp_awarded} XP and +{coins_awarded} coins."
        elif correct:
            message = "Accepted, but this problem was already solved; no additional reward."
        else:
            message = "Wrong answer. Review the material and try again."
        submission = SubmissionRecord(
            id=store.new_submission_id(),
            problem_id=problem_id,
            user_id=user_id,
            answer=answer,
            verdict=verdict,
            rewarded=rewarded,
            xp_awarded=xp_awarded,
            coins_awarded=coins_awarded,
            message=message,
        )
        store.submissions[submission.id] = submission
        if rewarded:
            user.xp += xp_awarded
            user.coins += coins_awarded
        return {
            "submission": submission,
            "user": user,
            "message": message,
            "accepted": correct,
        }


def list_submissions(
    store: Storage, problem_id: int | None = None, user_id: int | None = None
) -> list[SubmissionRecord]:
    with store.lock:
        if problem_id is not None:
            get_problem(store, problem_id)
        if user_id is not None:
            get_user(store, user_id)
        submissions = sorted(
            store.submissions.values(), key=lambda submission: submission.id
        )
        if problem_id is not None:
            submissions = [
                submission
                for submission in submissions
                if submission.problem_id == problem_id
            ]
        if user_id is not None:
            submissions = [
                submission for submission in submissions if submission.user_id == user_id
            ]
        return submissions


def get_submission(store: Storage, submission_id: int) -> SubmissionRecord:
    with store.lock:
        submission = store.submissions.get(submission_id)
        if submission is None:
            raise DomainError(
                404, "SUBMISSION_NOT_FOUND", f"Submission {submission_id} does not exist."
            )
        return submission
