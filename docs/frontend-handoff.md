# Frontend handoff

## Status

Frontend branch: feat/frontend. React + TypeScript application in frontend/.
The six week-one areas are implemented as client-side UI. Lessons cover six language
tracks with 30 lessons (300 checked quiz tasks) plus 30 hands-on code labs. Account
registration, sign-in, sign-out and profile editing now use GPT 2's auth API; learning
progress is still device-local because no progress endpoints exist yet.

## Ownership

GPT 1 owns frontend/ and integration. GPT 2 owns learning/auth and database schema.
GPT 3 owns battle services. Keep backend changes outside frontend/ unless coordinated.
Root contracts.md is still a draft. This file specifies UI needs, not finalized endpoints.

## UI routes

- #home: dashboard
- #learn: language picker (Python, JavaScript, HTML, CSS, Java, C++)
- #learn/:language: lesson list; five correct quiz answers unlock the next lesson
- #learn/:language/:lesson: expanded lecture (objectives, theory, deep dive, key terms,
  common mistakes), ten checked quiz tasks and one code lab
- #algorithms: searchable catalog
- #algorithms/:id: editor and problem statement
- #duel: rated 1v1 configuration (offline rehearsal currently)
- #friends: private room creation/join UI (offline rehearsal currently)
- #copy: typing practice
- #profile: local profile editing

## Account and session integration

Implemented against the auth section of GPT 2's contract on
`origin/feat/learning-backend`:

- `frontend/src/lib/api.ts` is the typed client. The opaque Bearer token is stored under
  `worldofcodes-session-v1`, requests time out after 20 seconds, `{error:{code,message}}`
  becomes `ApiError`, 204 is supported, and a 401 on a non-auth route clears the token.
  `configureApi` exists for tests.
- `frontend/src/lib/auth.tsx` restores the session with `GET /users/me` when a token
  exists and exposes `loading | anonymous | authenticated | unavailable` with a retry.
  Login and registration store the token before loading the private profile. Logout
  clears the local token even when the server cannot be reached.
- The Profile page has an Account panel for register, sign-in, sign-out, nickname and
  avatar URL updates. Server level, XP, coins and completedLessons appear only in this
  panel. Preview XP/coins stay device-local and are never uploaded.
- When a server session is active, its nickname is adopted by the sidebar and profile
  hero so the displayed identity matches the authenticated account. `avatarUrl` renders
  in the sidebar, header and account panel, with the nickname initial as a fallback when
  the image is empty or fails to load.
- While signed in, the local "Display name" field is replaced by a note pointing to the
  Account nickname, so a device save cannot overwrite or fight the server identity. Bio
  and avatar frame remain device-local preferences.
- Per `docs/integration-decisions.md`, the signed-in shell and profile identity render the
  server level `floor(xp / 100) + 1`, server XP progress and server coins. The local
  preview cards keep the demo 200-XP data and stay labeled PREVIEW DATA.
- Only a 401 clears the session and returns to sign-in. A 403 keeps the valid token and
  surfaces the server's permission message.
- `frontend/vite.config.ts` proxies `/api` to `http://127.0.0.1:4001` in development.
  The standalone backend sends no CORS headers, so production must serve the SPA and
  API from one origin or add a reviewed CORS policy.

Requested error handling is visible in the UI: a 402
`NICKNAME_CHANGE_PAYMENT_REQUIRED` explains that paid nickname changes are unavailable,
invalid credentials show the server message, and an unreachable server offers retry.

Not implemented, because the backend has no matching models or routes:

- Quiz task attempts and lab runs are not sent to the server.
- The Prisma schema has no quiz-task model; `LessonProgress` is only completed through
  problem submissions, and this curriculum's labs are not published `Problem` rows.
- `GET /users/me` exposes `completedLessons` as a count without per-lesson detail.
- No seed script or seed data exists for courses, lessons or tasks. No PostgreSQL or
  Docker is available in this agent's environment, so only contract-level and stub-backed
  browser verification was possible here.

## GPT 2 integration requirements

Replace local demo state in src/lib/store.tsx with authenticated server state.
Do not upload the current demo coins, XP, completions or rename flags as trusted data.
Needed operations: session lookup, profile update, nickname eligibility, courses and
lessons, server-verified lesson submissions, problem catalog, code submissions/status,
typing exercises/submissions and authoritative progress/activity.
Public and private profile DTOs must be separate. Practice answer indices are visible in
the demo curriculum and must not be shipped with production graded questions; task checks
need server verification. Each lesson has ten quiz tasks, and five correct tasks pass it.

Code labs are separate from the quiz. The learner writes code and presses "Run & check".
Python, JavaScript, Java and C++ are compiled and executed for real in the public Judge0 CE
sandbox (`ce.judge0.com`, language IDs 113, 102, 91 and 105). Each lab has one or two
`LabTest` entries; every test is a separate submission with its own stdin, and stdout must
match `expectedStdout` exactly after trailing-whitespace normalization. "Accepted" is shown
only after the runner returns an accepted status and the output matches. HTML and CSS labs
render locally in a hidden sandboxed iframe (`sandbox="allow-same-origin"`, CSP blocks
scripts and external assets) and `renderChecks` inspect the real DOM, attributes and
computed styles; CSS labs supply a `fixture` document. The UI discloses that run-language
code is sent to a third party and never grants the one-time 10 XP/5 coins demo reward when
the runner is unavailable or a test fails. A completed lab is recorded locally and does not
gate the next lesson.

This is still a client-side demo integration: the public endpoint has no uptime or privacy
guarantee, is rate-limited, and executes untrusted learner code outside this repository's
control. Production must route submissions through our own isolated judge and verify
rewards server-side. Do not enable competitive or XP-bearing submissions until that judge
and server verification exist.

Define loading, retryable failure, unauthenticated and empty results when connecting APIs.

The current 40 XP/15 coins per lesson, 10 XP/5 coins per lab and 20 XP/5 coins per typing
exercise are demo values, not production economic rules.

## GPT 3 integration requirements

Replace Arena.tsx's rehearsal state with authenticated server match state.
Needed operations/events: join/cancel queue, create/join room, player readiness,
match started (server deadline), submissions, result, disconnect/reconnect and snapshot.
Use server-authoritative time, final result and rating deltas. Do not send client-local
quiz progression or timer outcomes as authoritative match data.
Friendly battles never update competitive rating. Rating protection thresholds remain
unfinalized; the UI must render the server's eligibility and deltas.
Do not enable submit until the isolated code judge is available.

## Frontend checks

npm test covers one-time rewards, independent rewards, exact typing and XP thresholds,
plus a curriculum audit: 30 lessons with 10 well-formed tasks each, expanded lecture
metadata, executable lab schemas (`tests` for Python/JS/Java/C++ and `renderChecks` plus
`fixture` for HTML/CSS), no stale structure-check wording and a reference solution for
every lab id. `node tests/judge-smoke.mjs` bundles the real curriculum and runner modules,
submits all 40 run-lab solution tests to Judge0 CE and requires exact stdout matches
(add `--starters` to confirm the starter snippets fail). `node tests/render-smoke.mjs`
loads the real render-check module in headless Chrome and verifies every render check on
the ten HTML/CSS reference solutions while confirming each starter fails at least one.
npm run build performs strict TypeScript checking and the production bundle build.
`node tests/api.test.mjs` (included in npm test) runs the API client against a
`node:http` stub and covers registration, Bearer headers, 204 responses, 401 token
clearing, non-auth 401 handling, profile PATCH, encoded public profiles, non-JSON errors,
network failure and token round-trips in a non-browser environment.
Browser QA is automated in tests/browser-qa.mjs. With the dev server running on port 5180
(`npm run dev -- --port 5180`), run `node tests/browser-qa.mjs`. It drives headless Chrome
over CDP against a cleared demo localStorage and checks language switching, lesson
unlock at five correct quiz answers, retry behavior, reload persistence, a real JavaScript
lab run (starter failure, accepted verdict, one-time reward), a real CSS render lab with
the sandboxed preview and computed-style checks, profile rename, account registration and
nickname update through the `/api` proxy, server avatar rendering, signed-in profile
device preferences, session restore after reload, sign-out, rejected credentials,
algorithm filtering, typing completion, demo arena cancel/timeout, friendly room-code
validation and 390px/1440px layouts. Browser QA starts its own auth stub on port
4001, so stop a real learning backend on that port first, and it needs network access to
Judge0 CE.

## Proposal to the integrator

These shared changes are proposals only; this branch does not modify the root manifest,
lockfile or server entrypoint.

1. Serve one production origin. Either mount the built SPA and `/api` behind one host or
   put both behind a reverse proxy. The standalone learning backend currently sends no CORS
   headers, and the frontend calls same-origin `/api`.
2. Add agreed root scripts for running the frontend and backend together, or document the
   two-terminal flow (`npm run dev` in frontend/, `node src/standalone.js` in
   services/learning-backend/). Root script changes need integrator review.
3. Provide PostgreSQL provisioning plus a seed command for courses, lessons and tasks.
   Without seed data the Lessons UI cannot switch from bundled content to server content.
4. Define progress endpoints and models for quiz attempts and lab runs, with idempotent,
   transactional rewards and server-side verification. Client answer indices must not be
   trusted and should not ship for production-graded content.
5. Decide session authentication for Socket.IO with GPT 3. That belongs to the duel
   service and is outside this slice.
