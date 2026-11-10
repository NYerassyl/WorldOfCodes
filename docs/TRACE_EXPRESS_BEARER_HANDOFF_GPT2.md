# GPT 2 → GPT 4: site Python Trace Practice Bearer API contract

Date: 2026-11-10  
Owner: GPT 2 — Express adapter, same 50-exercise JSON catalog  
Site UI: GPT 4 — not modified in this branch  
Target branch: `integration/all`

## Canonical site endpoints (NOT the standalone classroom FastAPI API)

All endpoints are mounted on the **existing Express server at port 4001**.
Use the existing frontend `request()` helper from
`frontend/src/lib/api.ts`: it sends the site Bearer session automatically.
Do **not** call FastAPI port 8000 or send `X-User-Id`.

### 1. List the exercises — public

```http
GET /api/trace/exercises?level=5&difficulty=hard&topic=backtracking-dfs-memoization
```

Response 200:

```json
{
  "exercises": [
    {
      "id": "trace-5-01",
      "level": 5,
      "difficulty": "hard",
      "topic": "backtracking-dfs-memoization",
      "title": "Backtrack to Target Five"
    }
  ]
}
```

Without filters there are **50** entries, ordered level 1→5 and number 01→10.
`level` 1–5, `difficulty` one of `easy`, `easy-medium`, `medium`,
`medium-hard`, `hard`. `topic` is case-insensitive exact match.
Invalid filters return 400 `INVALID_INPUT`.

### 2. Open an exercise — public

```http
GET /api/trace/exercises/trace-5-01
```

Response 200:

```json
{
  "exercise": {
    "id": "trace-5-01",
    "level": 5,
    "difficulty": "hard",
    "topic": "backtracking-dfs-memoization",
    "title": "Backtrack to Target Five",
    "instructions": "Track the search tree, print order, memoized calls, and state restoration during backtracking. Enter the exact stdout.",
    "code": "path = []\ndef search(start, remaining):\n..."
  }
}
```

**No** `expectedOutput`, `expected_stdout`, `answer`, `explanation`,
or other secret solution fields in either GET response.

### 3. Submit guessed stdout — Bearer protected

```http
POST /api/trace/exercises/trace-5-01/attempts
Authorization: Bearer <opaque-site-session-token>
Content-Type: application/json

{"output":"[1, 4]\n[2, 3]\nrestored []"}
```

Response **201**, correct sample:

```json
{
  "attemptId": "<uuid>",
  "exerciseId": "trace-5-01",
  "correct": true,
  "verdict": "CORRECT",
  "submittedOutput": "[1, 4]\n[2, 3]\nrestored []",
  "expectedOutput": "[1, 4]\n[2, 3]\nrestored []",
  "explanation": "Depth-first search first reaches [1,4], then [2,3]. pop restores the shared path after every recursive call, so it ends empty.",
  "createdAt": "<ISO 8601 timestamp>"
}
```

For wrong answers, the same 201 response has `correct:false`,
`verdict:"INCORRECT"` and **still reveals** `expectedOutput` and
`explanation` only after the user's guess.

- `output` is mandatory, string, maximum **2000 UTF-16 code units**; other
  JSON keys are rejected. Invalid input → 400 `INVALID_INPUT`.
- Multiple internal lines and spaces must match. CRLF input is normalized to LF.
  Exactly one final terminal newline is optional for a convenient textarea.
- Unknown exercise → 404 `TRACE_EXERCISE_NOT_FOUND`.
- Missing, expired, or revoked Bearer token → 401 `UNAUTHORIZED`.
- Session database failures cannot authorize submissions; they fail closed.
- The authenticated userId comes **only from the existing token session**;
  never from the URL or body.
- Attempts are inserted into `TraceAttempt` (PostgreSQL via Prisma), survive
  restart, and are deleted if the owner account is deleted. No reward, coins,
  XP, Elo or submitted-code execution is performed.
- PostgreSQL migration `20261110200000_trace_attempts` must be reviewed and
  applied by GPT 1 using the established `prisma migrate deploy` procedure.
  Static exercise JSON files have **no database FK** and **are unchanged**.

### Sample frontend helper (GPT 4 can implement this separately)

```typescript
import { request } from "./api";

export const listTrace = (level?: number, difficulty?: string, topic?: string) => {
  const params = new URLSearchParams();
  if (level !== undefined) params.set("level", String(level));
  if (difficulty) params.set("difficulty", difficulty);
  if (topic) params.set("topic", topic);
  const qs = params.toString();
  return request<{ exercises: TraceSummary[] }>(
    `/trace/exercises${qs ? `?${qs}` : ""}`
  );
};
export const getTrace = (id: string) =>
  request<{ exercise: TraceDetail }>(`/trace/exercises/${encodeURIComponent(id)}`);
export const submitTrace = (id: string, output: string) =>
  request<TraceAttemptResponse>(
    `/trace/exercises/${encodeURIComponent(id)}/attempts`,
    { method: "POST", body: { output } }
  );
```

The TypeScript `TraceSummary`, `TraceDetail`, `TraceAttemptResponse`
should match the JSON examples above. GPT 4 owns the UI and this helper.
