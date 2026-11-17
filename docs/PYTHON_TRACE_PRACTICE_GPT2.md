# Python Trace Practice — GPT 2: 50 verified exercises

Date: 2026-11-10
Branch: `feat/python-trace-content-gpt2`
Base: `integration/all` at `24d5fd45211f2fecfd31634253057378f76da2bf`

## Gameplay and contract

All content shown to players (exercise titles, instructions, explanation text) is **English**.

A player reads a fixed, deterministic Python snippet and predicts its exact
printed output. The service **does not execute player-submitted Python code**.
It compares only the player's predicted text with a server-held answer.
Internal newlines and spaces are significant. A missing *final* terminal
newline is tolerated because ordinary text fields do not ask users to type it;
CRLF input is normalized to LF.

The original FastAPI users, lessons, problems and progress APIs are preserved.
Python Trace Practice adds **exactly these three paths**:

| Method | Path | Response |
|---|---|---|
| GET | `/api/trace/exercises?level=1&difficulty=easy&topic=loops-and-conditionals` | Public summaries, without solution |
| GET | `/api/trace/exercises/{exercise_id}` | Public code and instructions, without solution |
| POST | `/api/trace/exercises/{exercise_id}/submit` | Verdict, expected stdout and explanation **after submitting** |

The POST body is `{"answer":"3 15\n6 76\nstep 5"}`; pass a demo
`X-User-Id: 1` header. The `X-User-Id` header is a **classroom demo identity,
not production-grade authentication**. The POST stores a per-user attempt
counter in the same in-memory `Storage` and resets it on a store reset.

Success: `200` with `correct: true` and `verdict: "CORRECT"`.
Wrong predicted stdout: `200` with `correct: false` and
`verdict: "INCORRECT"` (solution and explanation shown after both outcomes).
Missing `X-User-Id`: `401`; unknown user/exercise: `404`; invalid query,
request field or typed body: `422`.

Filtering accepts five exact difficulty values:
`easy`, `easy-medium`, `medium`, `medium-hard`, `hard`;
`level` is 1–5 and `topic` is a case-insensitive exact match.
The list/detail Pydantic response models have **no** expected-output or
explanation field, keeping solutions hidden before a submission.

## Five complete examples — one from every level

### Level 1 · Easy: Odd-Number Accumulator

**Exercise ID:** `trace-1-01`  
**Topic:** `loops-and-conditionals`  
**Instructions:** Read the Python program without running it. Enter the exact printed output, preserving spaces and line breaks.

```python
total = 0
step = 2
values = [2, 3, 4, 5, 6, 7]
for index, value in enumerate(values, 1):
    if value % 2:
        step += 1
        total += value * step
    else:
        total += value
    if index % 3 == 0:
        print(index, total)
print("step", step)
```

**Verified stdout (shown only after submission):**

```text
3 15
6 76
step 5
```

**Solution explanation:** At iteration 3, the running total is 2 + 9 + 4 = 15. At iteration 6 it is 15 + 20 + 6 + 35 = 76; the odd values increase the multiplier to 5.

### Level 2 · Easy–Medium: First Passing Column

**Exercise ID:** `trace-2-01`  
**Topic:** `nested-loops-and-indices`  
**Instructions:** Trace the nested loops, break/continue branches, and list indices. Enter the exact stdout in order.

```python
grid = [[2, 5, 1], [4, 3, 6], [7, 2, 8]]
total = 0
for row_index, row in enumerate(grid):
    chosen = -1
    for column_index, value in enumerate(row):
        if value % 2 == 0:
            continue
        total += value
        if total > 9:
            chosen = column_index
            break
    print(row_index, chosen, total)
print("total", total)
```

**Verified stdout (shown only after submission):**

```text
0 -1 6
1 -1 9
2 0 16
total 16
```

**Solution explanation:** The inner loop skips even values. Total reaches 6 after row 0 and 9 after row 1, so neither row breaks early. It first exceeds 9 at row 2, column 0.

### Level 3 · Medium: Shared List, Two Helpers

**Exercise ID:** `trace-3-01`  
**Topic:** `functions-and-mutation`  
**Instructions:** Follow function calls, arguments, mutable objects, and return values. Enter the exact stdout.

```python
def extend(values, number):
    values.append(number)
    return len(values)
def measure(values, offset):
    return sum(values[::2]) + offset
items = [2, 3, 4]
first = extend(items, 5)
score = measure(items, first)
print(first, score)
second = extend(items, score % 4)
print(items)
print(measure(items, second))
```

**Verified stdout (shown only after submission):**

```text
4 10
[2, 3, 4, 5, 2]
13
```

**Solution explanation:** extend modifies the shared list before measure reads alternating indices. The second append changes the last alternating-index element.

### Level 4 · Medium–Hard: Before and After the Descent

**Exercise ID:** `trace-4-01`  
**Topic:** `recursion-and-unwinding`  
**Instructions:** Track recursive calls and determine which prints occur on entry and which occur during return. Enter exact stdout.

```python
def walk(n, label):
    if n == 0:
        print(label, "base")
        return 1
    print(label, "enter", n)
    result = walk(n - 1, label)
    if n % 2 == 0:
        print(label, "exit", n, result)
    return result + n
start = 3
answer = walk(start, "A")
print("answer", answer)
```

**Verified stdout (shown only after submission):**

```text
A enter 3
A enter 2
A enter 1
A base
A exit 2 2
answer 7
```

**Solution explanation:** Entry prints occur before descending 3→2→1→0. The even-frame exit prints while unwinding from n=2, when the recursive result is 2.

### Level 5 · Hard: Backtrack to Target Five

**Exercise ID:** `trace-5-01`  
**Topic:** `backtracking-dfs-memoization`  
**Instructions:** Track the search tree, print order, memoized calls, and state restoration during backtracking. Enter the exact stdout.

```python
path = []
def search(start, remaining):
    if remaining == 0:
        print(path[:])
        return
    for value in range(start, 5):
        if value > remaining:
            break
        path.append(value)
        search(value + 1, remaining - value)
        path.pop()
search(1, 5)
print("restored", path)
```

**Verified stdout (shown only after submission):**

```text
[1, 4]
[2, 3]
restored []
```

**Solution explanation:** Depth-first search first reaches [1,4], then [2,3]. pop restores the shared path after every recursive call, so it ends empty.

## Catalog and automated verification

| Level | Difficulty | Count | Topic |
|---|---|---:|---|
| 1 | Easy | 10 | `loops-and-conditionals` |
| 2 | Easy–Medium | 10 | `nested-loops-and-indices` |
| 3 | Medium | 10 | `functions-and-mutation` |
| 4 | Medium–Hard | 10 | `recursion-and-unwinding` |
| 5 | Hard | 10 | `backtracking-dfs-memoization` |

**Total:** 50 exercises, 10 per level. Every snippet has **10–20 nonblank,
noncomment code lines** and prints **1–8 lines**. Inputs are embedded in the
snippets; no random values, external files, network or user code execution.

Run from `services/fastapi-backend`:

```bash
python -m pip install -r requirements.txt
python -m pytest -q
uvicorn main:app --reload
# Open http://127.0.0.1:8000/docs
```

`tests/test_trace_practice.py` is parametrized with all **50 repository
catalog entries**. Each snippet is executed as
`python -I -c <repository-snippet>` in a short-lived isolated-mode Python
child process with a three-second timeout. The captured stdout is compared
**byte-for-byte as Python strings**, including spaces and terminal newline,
with the saved `expected_stdout`. It also asserts no stderr and zero exit
status, 1–8 stdout lines, 10–20 meaningful source lines, uniqueness of code,
title and ID, five exact level counts, solution privacy and API validation.
No exercise answer is regenerated dynamically at API runtime.

**Verified Actions run:**
https://github.com/NYerassyl/WorldOfCodes/actions/runs/42832016005

The CI job succeeded after reconciling manually drafted answers with actual
Python execution. The first run correctly flagged 20 mismatches; those saved
answers and one backtracking pruning condition were corrected before the
successful run. This is an execution-backed test result, not an unverified
claim. Repository data was not changed outside this additive FastAPI module
and its in-memory test bookkeeping.

## GPT 1 and GPT 4 integration handoff

- GPT 1: integrate the feature branch into `integration/all`; preserve the
  existing FastAPI router registrations, Pydantic schemas and test suite.
  Run the Python CI on **the final integrated SHA**.
- GPT 4: exercise all three paths in Swagger, including filtering and 401,
  404, 422, incorrect and correct predicted stdout; assert no answers or
  explanations appear in list/detail. Swagger's demo user header is only
  present on POST.
- No PostgreSQL migration, root npm lock edit or `main` merge is required.
