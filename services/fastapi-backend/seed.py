"""Opt-in demo data for a new, migrated FastAPI database."""
from itertools import count
from sqlalchemy import select, text
from database import SessionLocal
from models import User as UserRecord, Lesson as LessonRecord, Problem as ProblemRecord
from models import Completion as CompletionRecord, Submission as SubmissionRecord
from security import hash_password

def seed_demo(session) -> None:
    if session.scalar(select(UserRecord.id).limit(1)) is not None:
        raise RuntimeError("Demo seed requires an empty FastAPI database.")
    user_ids, lesson_ids, problem_ids, submission_ids = (count(1) for _ in range(4))
    ada = UserRecord(
        id=next(user_ids),
        email="ada@worldofcodes.dev",
        nickname="ada",
        password_hash=hash_password("ada-password-1"),
        bio="Learning Python one lesson at a time.",
    )
    grace = UserRecord(
        id=next(user_ids),
        email="grace@worldofcodes.dev",
        nickname="grace",
        password_hash=hash_password("grace-password-2"),
        bio="Interested in algorithms and compilers.",
    )
    session.add_all([ada, grace])
    session.flush()

    variables = LessonRecord(
        id=next(lesson_ids),
        title="Python Variables and Types",
        description="Create variables and inspect the four core Python types.",
        level="beginner",
        topic="basics",
        xp_reward=20,
        author_id=ada.id,
    )
    loops = LessonRecord(
        id=next(lesson_ids),
        title="Lists and Loops",
        description="Store sequences and iterate over them with for and while loops.",
        level="beginner",
        topic="collections",
        xp_reward=30,
        author_id=ada.id,
        prerequisite_lesson_id=variables.id,
    )
    functions = LessonRecord(
        id=next(lesson_ids),
        title="Dictionaries and Functions",
        description="Model key-value data and move it through reusable functions.",
        level="intermediate",
        topic="functions",
        xp_reward=40,
        author_id=grace.id,
        prerequisite_lesson_id=loops.id,
    )
    session.add_all([variables, loops, functions])
    session.flush()

    sum_problem = ProblemRecord(
        id=next(problem_ids),
        title="Sum of a List",
        prompt="What is sum([1, 2, 3, 4, 5])?",
        difficulty="easy",
        topic="basics",
        expected_answer="15",
        xp_reward=10,
        coin_reward=2,
        author_id=ada.id,
    )
    reverse_problem = ProblemRecord(
        id=next(problem_ids),
        title="Reverse a String",
        prompt="Which slice returns 'abc' reversed?",
        difficulty="easy",
        topic="strings",
        expected_answer="[::-1]",
        xp_reward=15,
        coin_reward=3,
        author_id=ada.id,
    )
    lookup_problem = ProblemRecord(
        id=next(problem_ids),
        title="Safe Dictionary Lookup",
        prompt="What does {'a': 1}.get('b', 0) return?",
        difficulty="medium",
        topic="dictionaries",
        expected_answer="0",
        xp_reward=25,
        coin_reward=5,
        author_id=grace.id,
    )
    session.add_all([sum_problem, reverse_problem, lookup_problem])
    session.flush()

    completion = CompletionRecord(
        user_id=ada.id, lesson_id=variables.id, xp_awarded=variables.xp_reward
    )
    ada.xp += variables.xp_reward

    accepted = SubmissionRecord(
        id=next(submission_ids),
        problem_id=sum_problem.id,
        user_id=ada.id,
        answer="15",
        verdict="ACCEPTED",
        rewarded=True,
        xp_awarded=sum_problem.xp_reward,
        coins_awarded=sum_problem.coin_reward,
        message="Seeded sample submission.",
    )
    session.add_all([completion, accepted])
    ada.xp += sum_problem.xp_reward
    ada.coins += sum_problem.coin_reward
    session.flush()
    if session.bind.dialect.name == "postgresql":
        for table in ("users", "lessons", "problems", "submissions"):
            session.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"(SELECT max(id) FROM {table}))"
            ))


if __name__ == "__main__":
    with SessionLocal.begin() as session:
        seed_demo(session)
    print("Demo data seeded.")
