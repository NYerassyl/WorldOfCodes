# GPT2 original learning pack

Baseline audit: 16 server-graded problems (8 EASY, 8 MEDIUM, no HARD), six server
Python lessons and 25 local lessons across five other languages. The five local
Python lessons are shadowed by the server route and are not counted twice.

This pack adds **15 new problems, exactly three at each of five practice levels**,
and **six practical lessons** (five Python, one SQL). No existing IDs are replaced.
After seeding: 31 Challenges, 12 server lessons (11 Python + one SQL), two server
courses and the unchanged 25 local lessons: 37 reachable lessons overall.

## Content and contracts

| Level | New problems |
| --- | --- |
| 1 Easy | Cargo Balance Point; Signal Run Log; Learners Without Attempts (SQL) |
| 2 Easy–Medium | Workshop Booking Union; Longest Affordable Route; Qualified Practice Clubs (SQL) |
| 3 Medium | One Emergency Passage; Daily Parcel Capacity; Exact Training Score |
| 4 Medium–Hard | Parallel Build Deadline; Mirror Label Repair; Longest Distinct-Day Streak (SQL) |
| 5 Hard | Nonadjacent Travel Coupons; Sequence-Dependent Workshop; Adjacent Capsule Fusion |

`prisma/learning-pack.json` contains original statements, numeric constraints,
samples, reference code, explanations, complexity notes and authored edge cases.
`learningPack.js` adds deterministic hidden stress cases. There are 95 new cases,
145 including the original 50. The public API returns only the two authored
samples per new problem; reference code and hidden fixtures are never serialized.
An accepted submission can show its explanation and complexity notes.

`Problem.practiceLevel` (1–5) is separate from the unchanged three-value
`Difficulty` enum, preserving the Battle contract. Legacy Easy/Medium/Hard map
to practice levels 1/3/5. The site catalog includes Python and SQL. The existing
Arena problem-bank helper defaults to Python only, so SQL is never handed to its
Python-only judge. Arena page/editor behavior is unchanged, pending GPT3 review.

## Six practical lessons

1. Prefix Sums, Windows and Interval Invariants — prerequisite Lists.
2. String State and Interval Dynamic Programming — prerequisite Methods.
3. Binary Search on a Feasibility Predicate — prerequisite Prefix Sums/Windows.
4. Graph State, Dependencies and Weighted Routes — prerequisite Binary Search.
5. Exact Scores, Subsets and Adjacent Merges — prerequisite Functions.
6. SQL Joins, Grouping and Consecutive-Day Windows — independent SQL entry point.

Each lesson has theory, a worked example, an editable runnable experiment,
explicit changes to investigate and linked graded practice. Prerequisites are
checked server-side for start, example execution and problem submission. Existing
foundation lessons keep their prior behavior. Passing every published practice
problem completes a lesson in Prisma `LessonProgress`; reopening reads saved state.

Example runs return actual JSON values/rows and do not write Submission,
ProblemCompletion or RewardLedger, nor award XP/coins. Graded work remains in the
canonical Prisma Submission history and is visible to PR #15 profile analytics.
The existing transactional first-completion reward mechanism remains in use.

## Isolated SQL execution

SQL is actually executed, not compared as text. Each fixture starts a disposable
`postgres:17` worker with no network, read-only root filesystem, a bounded tmpfs,
CPU/memory/PID limits and a query timeout. Trusted fixture DDL/rows are loaded as
an admin; player queries run as a separate read-only non-owner role with SELECT
rights and no TEMP/CREATE privileges. The entire query is sent with psql `-c`,
not interpreted as psql file/backslash commands. Account data, credentials and
expected results are never mounted into the worker.

Each query result is converted to JSON rows and compared against exact authored
rows, including column aliases, NULL values and required ordering. SQL samples
cover empty tables, duplicate names/events, missing relationships, negative/NULL
points, leap dates and year boundaries. Runtime errors/timeouts are distinct from
worker infrastructure failures; missing images return 503 without storing a
fabricated verdict. Workers are reaped even after timeout.

## Run and review

Stacked on the verified shared-comments PR #18. Apply Prisma's additive
`20261117030000_learning_pack` after the earlier migrations; the profile Alembic
view remains owned by PR #15. Use the shared DATABASE_URL/FASTAPI_DATABASE_URL
configuration from `gpt2-shared-comments-contract.md`. Production migrations and
main merging remain a team decision.

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
# Trusted local worker images for learning/examples:
docker pull python:3.12-alpine
docker pull postgres:17
# Start FastAPI and Express as in the comments integration guide.
```

Only trusted repository reference solutions are executed by the Python oracle
script. Player code always runs inside its isolated worker.

```sh
npm test
python scripts/verify-learning-references.py
# Dedicated localhost *_test PostgreSQL only, after migrate/seed/profile view:
node --test --test-concurrency=1 services/learning-backend/integration/learning-pack.integration.test.js
python scripts/verify-learning-browser.py
```

Manual browser paths: Lessons → Python (11 lessons) or SQL (one workshop);
Challenges → choose one of five practice difficulty levels. Open the SQL workshop,
change/run its example, then solve its three SQL tasks. Repeat a correct submission
and confirm no extra reward. Reload the completed lesson and verify saved progress
and profile activity. The CI browser script exercises this path and saves evidence.

The initial audit and reference format checks consulted [LeetCode study-plan
coverage](https://leetcode.com/studyplan/top-interview-150/), [Codeforces tags and
difficulty filters](https://codeforces.com/problemset), [W3Schools interactive
lesson structure](https://www.w3schools.com/python/) and [PostgreSQL's hands-on SQL
tutorial](https://www.postgresql.org/docs/current/tutorial.html). Statements,
examples, fixtures and explanations in this pack were authored for WorldOfCodes.
