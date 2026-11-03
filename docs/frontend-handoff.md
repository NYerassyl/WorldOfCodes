# Frontend handoff

## Status

Frontend branch: feat/frontend. React + TypeScript application in frontend/.
The six week-one areas are implemented as client-side UI. Lessons cover six language
tracks with 30 lessons (300 checked quiz tasks) plus 30 hands-on code labs. Backend
integration is pending.

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
Browser QA is automated in tests/browser-qa.mjs. With the dev server running on port 5180
(`npm run dev -- --port 5180`), run `node tests/browser-qa.mjs`. It drives headless Chrome
over CDP against a cleared demo localStorage and checks language switching, lesson
unlock at five correct quiz answers, retry behavior, reload persistence, a real JavaScript
lab run (starter failure, accepted verdict, one-time reward), a real CSS render lab with
the sandboxed preview and computed-style checks, profile rename, algorithm filtering,
typing completion, demo arena cancel/timeout, friendly room-code validation and
390px/1440px layouts. Browser QA needs network access to Judge0 CE.
