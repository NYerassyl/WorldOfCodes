# Live Arena verification (GPT 4)

Date: 2026-11-10
Branch: `feat/arena-live-battle-gpt4` (based on `integration/all` @ `68d6c4e`)

This document records the end-to-end verification of the live Arena page
(friendly and ranked Battle REST). Everything below was observed in two
independent browser sessions with two real accounts; no status, code or verdict
was written by hand. Server-side facts were cross-checked against
`GET /api/battle/state` and `GET /api/battle/matches/:id`.

## Environment

| Item | Value |
|------|-------|
| Express API | `node server/index.js` on `http://127.0.0.1:4001` |
| Frontend | Vite dev server on `http://127.0.0.1:5173` / `http://localhost:5173` |
| Database | PostgreSQL `worldofcodes` (migrations + seed applied) |
| Judge | `docker run python:3.12-alpine`, Colima `virtiofs` (only `/Users` is shared) |
| Session A | in-app browser, `127.0.0.1:5173`, account `AlphaAce` |
| Session B | separate Chrome process (`--headless=new`, own profile), `localhost:5173`, account `BetaBlitz` |

The two origins keep separate `localStorage` tokens, so both accounts stayed
signed in at the same time. The judge needed `TMPDIR` inside the Colima-shared
home directory, because `docker` cannot bind-mount the macOS `$TMPDIR`
(`/var/folders/...`) into the VM. The API was started with
`TMPDIR=/Users/<user>/.cache/woc-judge`; without it every submit returns
`503 JUDGE_UNAVAILABLE` and no verdict is stored.

## Test results

```
frontend          51 passed, 0 failed
learning-backend  66 passed, 0 failed
server             8 passed, 0 failed
total            125 passed, 0 failed
npm run build    passed (tsc -b + vite build)
```

New frontend coverage: `frontend/tests/battle-session.test.mjs` (session
restore, pending invite hint, error mapping, queue join/cancel, matched ticket,
queue recovery, accepted/rejected submission, 401 expiry) and the updated
`frontend/tests/battle-api.test.mjs`.

## Friendly match (full run)

| Step | Session | Observed result |
|------|---------|-----------------|
| 1 | A | `#friends` -> **Create invitation** -> code `BWEETIE1`, panel "Your friend has a seat.", state `FRIENDLY · PENDING` |
| 2 | B | `#friends` -> paste `BWEETIE1` -> **Join invitation**; server returns `ACTIVE` match `577881e7-5712-4e21-879f-21f887132adf` |
| 3 | A | after reload, `FRIENDLY · ACTIVE`, same match ID, players `AlphaAce (You)` / `BetaBlitz (Opponent)` |
| 4 | A + B | both render problem **Edges** (`first_and_last`), same example `Arguments: [[4,5,6]] / Returns: [4,6]`, same starter code |
| 5 | A | submit `def first_and_last(nums): return []` -> verdict `WRONG ANSWER 0 / 3`, match stays `ACTIVE` |
| 6 | B | submit `def first_and_last(nums): return [nums[0], nums[-1]]` -> `SERVER RESULT: BetaBlitz won.` |
| 7 | A | refresh -> identical `SERVER RESULT: BetaBlitz won.`; players show `ACCEPTED` / `No accepted submission`; banner "Your rating is unchanged." |

The verdict and the winner are produced by the server judge
(`POST /api/battle/matches/:id/submit`); the client only renders
`GET /api/battle/matches/:id`. A friendly win never changes rating
(`AlphaAce` and `BetaBlitz` stayed at 1000 after this match).

## Invitation error messages

| Input | Session | Message shown |
|-------|---------|---------------|
| `ZZZZZZZZ` (unknown) | B | "This invitation code is invalid, expired, or has already been used." |
| `BWEETIE1` (already consumed) | B | same message |

`frontend/src/lib/battle-session.ts` maps `INVITE_NOT_FOUND`, `INVITE_ALREADY_USED`,
`INVALID_INVITE`, `CANNOT_JOIN_OWN_INVITE`, `MATCH_FULL` and `SESSION_INVALID` to
readable English text, so a wrong or expired code never surfaces a raw code.

## Ranked queue

| Step | Session | Observed result |
|------|---------|-----------------|
| 1 | A | `#duel` -> **Find ranked opponent** -> `MATCHMAKING` "Finding your next rival…" |
| 2 | A | **Cancel queue** -> idle "Ready when you are." + notice "You have left the ranked queue." |
| 3 | A | joins again -> queued |
| 4 | B | **Find ranked opponent** -> instant `RANKED · ACTIVE` match `ebb8ac90-6099-44f3-96ae-645b865dc758`, problem "Edges" |
| 5 | A | reload while still queued -> `#duel` restores the match (same ID) from `GET /battle/state` |
| 6 | B | submits the correct solution -> `SERVER RESULT: BetaBlitz won.`, `+16 rating` for BetaBlitz, `-16 rating` for AlphaAce |
| 7 | A | **Refresh server state** -> identical result and deltas |
| 8 | API | `AlphaAce 984 (0W 1L)`, `BetaBlitz 1016 (1W 0L)` |

## Reconnect / refresh recovery

| Scenario | Observed result |
|----------|-----------------|
| Reload during a friendly `ACTIVE` match (A and B) | page restores the same match ID, problem and editor from `GET /api/battle/state` |
| Reload while `PENDING` (A) | invitation code `NUPSI0GB` is still shown after reload; `FRIENDLY · PENDING` is restored from the server plus the saved code hint |
| Reload while queued (A) | `MATCHMAKING` panel and "Cancel queue" are restored from `GET /api/battle/state` |
| Reload after `COMPLETED` | `GET /api/battle/state` returns no active match, so the page returns to idle and keeps the saved rating |

`GET /battle/state` (merged from the battle-recovery branch) is the single
authority: it returns the `ACTIVE`/`PENDING` match for this account and the queue
ticket state (`NOT_QUEUED`, `QUEUED` with position/joinedAt, `MATCHMAKING`). The
client polls it, plus the current match, every 2.5 s while a match is open.

## Invitation cancellation

A `PENDING` friendly invitation previously had no exit: `/battle/state` returns
active matches only, and the client restored the saved invitation hint with no
way to free the seat. Both players could create an invitation and get stuck.

- `DELETE /api/battle/matches/:matchId` cancels a `PENDING` friendly match for
  its owner: the match becomes `CANCELLED` and the invite code row is deleted, so
  the code can no longer be joined.
- `404 BATTLE_NOT_FOUND` when the account has no pending invitation with that ID;
  `409 MATCH_NOT_PENDING` when the battle already started.
- The pending panel now shows **Cancel invitation**; cancelling clears the local
  hint and returns to the idle Arena state with a readable notice.

Verified on 2026-11-10 through the public Vercel deployment (real REST calls with
the browser `Origin`): create invite `201`, cancel `200 CANCELLED`, match
`CANCELLED` with `completedAt`, `GET /battle/state` → `{"match":null}`, joining
the cancelled code → `404 INVITE_NOT_FOUND`, and a new invitation can be created
and cancelled afterwards. `OPTIONS` preflight for `DELETE` returns `204` with
`Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS`.

## Notes and limitations

- Background tabs throttle timers, so a hidden tab may show stale "Last server
  check" time until it is focused, `Refresh server state` is clicked or the page
  is reloaded. The server state was always correct in the API checks.
- Judge availability depends on Docker + the `TMPDIR` requirement above. When the
  judge is unreachable the API returns `503 JUDGE_UNAVAILABLE` and the UI says
  "The judge is unavailable. No win or rating change was awarded." — no fake
  `ACCEPTED` result is produced.
- The accounts `arena.alpha@worldofcodes.dev` / `arena.beta@worldofcodes.dev`
  and their matches remain in the local database only.
- No change was made to `package.json`, `package-lock.json`, `server/index.js` or
  Prisma schemas. The only shared backend changes are the already merged
  `GET /battle/state` route and the `DELETE /battle/matches/:matchId`
  cancellation route described above.
