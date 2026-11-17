"""Business rules. Callers own the transaction; mutations flush but never commit."""
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from errors import DomainError
from models import Comment, Completion, Lesson, Problem, Submission, User
from security import hash_password


def _one(db, model, record_id, code, label, lock=False):
    stmt = select(model).where(model.id == record_id)
    if lock:
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    value = db.scalar(stmt)
    if value is None:
        raise DomainError(404, code, f"{label} {record_id} does not exist.")
    return value


def get_user(db, user_id, *, lock=False):
    return _one(db, User, user_id, "USER_NOT_FOUND", "User", lock)


def get_lesson(db, lesson_id):
    return _one(db, Lesson, lesson_id, "LESSON_NOT_FOUND", "Lesson")


def get_problem(db, problem_id):
    return _one(db, Problem, problem_id, "PROBLEM_NOT_FOUND", "Problem")


def get_submission(db, submission_id):
    return _one(db, Submission, submission_id, "SUBMISSION_NOT_FOUND", "Submission")


def _exists(db, model, *conditions):
    return db.scalar(select(model).where(*conditions).limit(1)) is not None


def _owner(owner_id, actor_id, message="Only the owner can change this resource."):
    if owner_id != actor_id:
        raise DomainError(403, "FORBIDDEN", message)


def _lesson_lock(db):
    # Serialize prerequisite graph changes and completion/reset checks across
    # processes so concurrent edits cannot introduce a cycle or invalid progress.
    db.execute(text("SELECT pg_advisory_xact_lock(146481235, 1)"))


def ensure_progress_owner(db, user_id, actor_id):
    get_user(db, user_id)
    _owner(user_id, actor_id, "Only the learner can change their progress.")


def _ensure_email_available(db, email, exclude_id=None):
    stmt = select(User.id).where(User.email == email)
    if exclude_id is not None:
        stmt = stmt.where(User.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise DomainError(409, "EMAIL_TAKEN", "That email is already registered.")


def list_users(db, query=None, limit=50):
    stmt = select(User).order_by(User.id).limit(limit)
    if query:
        stmt = stmt.where(or_(User.email.icontains(query, autoescape=True), User.nickname.icontains(query, autoescape=True)))
    return list(db.scalars(stmt))


def create_user(db, payload):
    _ensure_email_available(db, payload.email)
    data = payload.model_dump(exclude={"password"})
    user = User(**data, password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    return user


def update_user(db, user_id, payload, actor_id):
    user = get_user(db, user_id, lock=True)
    _owner(user_id, actor_id)
    if payload.email is not None:
        _ensure_email_available(db, payload.email, user_id)
    for key, value in payload.model_dump(exclude_none=True).items():
        if key == "password":
            user.password_hash = hash_password(value)
        else:
            setattr(user, key, value)
    db.flush()
    return user


def delete_user(db, user_id, actor_id):
    user = get_user(db, user_id, lock=True)
    _owner(user_id, actor_id)
    if _exists(db, Lesson, Lesson.author_id == user_id) or _exists(db, Problem, Problem.author_id == user_id):
        raise DomainError(409, "USER_HAS_CONTENT", "Delete or reassign authored content first.")
    db.delete(user)
    db.flush()


def get_profile(db, user_id):
    user = get_user(db, user_id)
    accepted = (Submission.user_id == user_id, Submission.verdict == "ACCEPTED")
    return {
        "user": user,
        "completed_lessons": db.scalar(select(func.count()).select_from(Completion).where(Completion.user_id == user_id)),
        "solved_problems": db.scalar(select(func.count(func.distinct(Submission.problem_id))).where(*accepted)),
        "accepted_submissions": db.scalar(select(func.count()).select_from(Submission).where(*accepted)),
        "rank": 1 + db.scalar(select(func.count()).select_from(User).where(User.xp > user.xp)),
    }


def get_leaderboard(db, limit=10):
    users = db.scalars(select(User).order_by(User.xp.desc(), User.id).limit(limit))
    return [dict(rank=i, user_id=u.id, nickname=u.nickname, xp=u.xp, coins=u.coins,
                 solved_problems=db.scalar(select(func.count(func.distinct(Submission.problem_id))).where(Submission.user_id == u.id, Submission.verdict == "ACCEPTED")))
            for i, u in enumerate(users, 1)]


def list_lessons(db, level=None, topic=None, include_unpublished=False):
    stmt = select(Lesson).order_by(Lesson.id)
    if not include_unpublished:
        stmt = stmt.where(Lesson.published.is_(True))
    if level:
        stmt = stmt.where(Lesson.level == level)
    if topic:
        stmt = stmt.where(func.lower(Lesson.topic) == topic.lower())
    return list(db.scalars(stmt))


def _ensure_prerequisite(db, lesson_id, prerequisite_id):
    visited = {lesson_id} if lesson_id is not None else set()
    cursor = prerequisite_id
    while cursor is not None:
        if cursor in visited:
            raise DomainError(400, "LESSON_CYCLE", "That prerequisite would create a cycle.")
        visited.add(cursor)
        cursor = get_lesson(db, cursor).prerequisite_lesson_id


def _payload_data(payload):
    return payload.model_dump(mode="json")


def create_lesson(db, payload, actor_id):
    _lesson_lock(db)
    get_user(db, actor_id)
    _ensure_prerequisite(db, None, payload.prerequisite_lesson_id)
    lesson = Lesson(**_payload_data(payload), author_id=actor_id)
    db.add(lesson)
    db.flush()
    return lesson


def update_lesson(db, lesson_id, payload, actor_id):
    _lesson_lock(db)
    lesson = get_lesson(db, lesson_id)
    _owner(lesson.author_id, actor_id)
    if "prerequisite_lesson_id" in payload.model_fields_set:
        new_id = payload.prerequisite_lesson_id
        if new_id != lesson.prerequisite_lesson_id:
            _ensure_prerequisite(db, lesson_id, new_id)
            if _exists(db, Completion, Completion.lesson_id == lesson_id):
                raise DomainError(409, "LESSON_HAS_PROGRESS", "Cannot change prerequisites after completion.")
            lesson.prerequisite_lesson_id = new_id
    for key, value in payload.model_dump(mode="json", exclude_none=True).items():
        setattr(lesson, key, value)
    db.flush()
    return lesson


def delete_lesson(db, lesson_id, actor_id):
    _lesson_lock(db)
    lesson = get_lesson(db, lesson_id)
    _owner(lesson.author_id, actor_id)
    if _exists(db, Completion, Completion.lesson_id == lesson_id):
        raise DomainError(409, "LESSON_HAS_PROGRESS", "Learners already completed this lesson.")
    if _exists(db, Lesson, Lesson.prerequisite_lesson_id == lesson_id):
        raise DomainError(409, "LESSON_HAS_DEPENDENTS", "Another lesson depends on this prerequisite.")
    db.delete(lesson)
    db.flush()


def complete_lesson(db, user_id, lesson_id):
    _lesson_lock(db)
    user = get_user(db, user_id, lock=True)
    lesson = get_lesson(db, lesson_id)
    if not lesson.published:
        raise DomainError(409, "LESSON_NOT_PUBLISHED", "This lesson is not published yet.")
    if db.get(Completion, (user_id, lesson_id)) is not None:
        raise DomainError(409, "LESSON_ALREADY_COMPLETED", "This lesson is already completed; XP is never awarded twice.")
    if lesson.prerequisite_lesson_id is not None and db.get(Completion, (user_id, lesson.prerequisite_lesson_id)) is None:
        raise DomainError(409, "PREREQUISITE_INCOMPLETE", "Complete the prerequisite lesson first.")
    completion = Completion(user_id=user_id, lesson_id=lesson_id, xp_awarded=lesson.xp_reward)
    db.add(completion)
    user.xp += lesson.xp_reward
    db.flush()
    return completion, user


def reset_lesson(db, user_id, lesson_id):
    _lesson_lock(db)
    user = get_user(db, user_id, lock=True)
    completion = db.get(Completion, (user_id, lesson_id))
    if completion is None:
        raise DomainError(404, "PROGRESS_NOT_FOUND", "This lesson has no saved progress.")
    dependent = db.scalar(select(Completion).join(Lesson).where(Completion.user_id == user_id, Lesson.prerequisite_lesson_id == lesson_id).limit(1))
    if dependent is not None:
        raise DomainError(409, "DEPENDENT_LESSONS_COMPLETED", "Reset dependent lessons first.")
    user.xp = max(0, user.xp - completion.xp_awarded)
    db.delete(completion)
    db.flush()


def get_progress(db, user_id):
    user = get_user(db, user_id)
    completed = list(db.scalars(select(Completion).where(Completion.user_id == user_id).order_by(Completion.completed_at, Completion.lesson_id)))
    ids = {c.lesson_id for c in completed}
    next_lesson = next((l for l in list_lessons(db) if l.id not in ids and (l.prerequisite_lesson_id is None or l.prerequisite_lesson_id in ids)), None)
    return {"user": user, "rows": [{"completion": c, "lesson": c.lesson} for c in completed], "next_lesson": next_lesson}


def list_problems(db, difficulty=None, topic=None):
    stmt = select(Problem).order_by(Problem.id)
    if difficulty:
        stmt = stmt.where(Problem.difficulty == difficulty)
    if topic:
        stmt = stmt.where(func.lower(Problem.topic) == topic.lower())
    return list(db.scalars(stmt))


def create_problem(db, payload, actor_id):
    get_user(db, actor_id)
    problem = Problem(**_payload_data(payload), author_id=actor_id)
    db.add(problem)
    db.flush()
    return problem


def update_problem(db, problem_id, payload, actor_id):
    problem = _one(db, Problem, problem_id, "PROBLEM_NOT_FOUND", "Problem", lock=True)
    _owner(problem.author_id, actor_id)
    for key, value in payload.model_dump(mode="json", exclude_none=True).items():
        setattr(problem, key, value)
    db.flush()
    return problem


def delete_problem(db, problem_id, actor_id):
    problem = _one(db, Problem, problem_id, "PROBLEM_NOT_FOUND", "Problem", lock=True)
    _owner(problem.author_id, actor_id)
    if _exists(db, Submission, Submission.problem_id == problem_id):
        raise DomainError(409, "PROBLEM_HAS_SUBMISSIONS", "This problem has saved submissions.")
    db.delete(problem)
    db.flush()


def submit_solution(db, problem_id, user_id, answer):
    # Same lock order as problem deletion: problem then user. Shared problem
    # lock freezes the expected answer/reward while allowing different learners.
    problem = db.scalar(select(Problem).where(Problem.id == problem_id).with_for_update(read=True))
    user = get_user(db, user_id, lock=True)
    if problem is None:
        raise DomainError(404, "PROBLEM_NOT_FOUND", f"Problem {problem_id} does not exist.")
    correct = " ".join(answer.split()).casefold() == " ".join(problem.expected_answer.split()).casefold()
    already = _exists(db, Submission, Submission.problem_id == problem_id, Submission.user_id == user_id, Submission.verdict == "ACCEPTED")
    rewarded = correct and not already
    xp, coins = (problem.xp_reward, problem.coin_reward) if rewarded else (0, 0)
    if rewarded:
        message = f"Accepted! +{xp} XP and +{coins} coins."
    elif correct:
        message = "Accepted, but this problem was already solved; no additional reward."
    else:
        message = "Wrong answer. Review the material and try again."
    submission = Submission(problem_id=problem_id, user_id=user_id, answer=answer,
                            verdict="ACCEPTED" if correct else "WRONG_ANSWER", rewarded=rewarded,
                            xp_awarded=xp, coins_awarded=coins, message=message)
    db.add(submission)
    user.xp += xp
    user.coins += coins
    db.flush()
    return {"submission": submission, "user": user, "message": message, "accepted": correct}


def list_submissions(db, problem_id=None, user_id=None):
    stmt = select(Submission).order_by(Submission.id)
    if problem_id is not None:
        get_problem(db, problem_id)
        stmt = stmt.where(Submission.problem_id == problem_id)
    if user_id is not None:
        get_user(db, user_id)
        stmt = stmt.where(Submission.user_id == user_id)
    return list(db.scalars(stmt))


def list_comments(db, problem_id):
    get_problem(db, problem_id)
    return list(db.scalars(select(Comment).where(Comment.problem_id == problem_id).order_by(Comment.id)))


def create_comment(db, problem_id, payload, actor_id):
    get_problem(db, problem_id)
    get_user(db, actor_id)
    comment = Comment(problem_id=problem_id, author_id=actor_id, body=payload.body)
    db.add(comment)
    db.flush()
    return comment


def _comment(db, problem_id, comment_id, actor_id):
    get_problem(db, problem_id)
    comment = db.scalar(select(Comment).where(Comment.id == comment_id, Comment.problem_id == problem_id).with_for_update())
    if comment is None:
        raise DomainError(404, "COMMENT_NOT_FOUND", "This comment does not exist on this problem.")
    _owner(comment.author_id, actor_id)
    return comment


def update_comment(db, problem_id, comment_id, payload, actor_id):
    comment = _comment(db, problem_id, comment_id, actor_id)
    comment.body = payload.body
    db.flush()
    return comment


def delete_comment(db, problem_id, comment_id, actor_id):
    db.delete(_comment(db, problem_id, comment_id, actor_id))
    db.flush()
