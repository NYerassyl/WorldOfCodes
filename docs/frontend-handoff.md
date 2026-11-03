# Frontend handoff

## Status

Frontend branch: feat/frontend. React + TypeScript application in frontend/.
The six week-one areas are implemented as client-side UI. Backend integration is pending.

## Ownership

GPT 1 owns frontend/ and integration. GPT 2 owns learning/auth and database schema.
GPT 3 owns battle services. Keep backend changes outside frontend/ unless coordinated.
Root contracts.md is still a draft. This file specifies UI needs, not finalized endpoints.

## UI routes

- #home: dashboard
- #learn: course outline
- #learn/:id: theory and quiz
- #learn/html: HTML/CSS practice
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
Public and private profile DTOs must be separate. Quiz answer indices are visible in
the demo data and must not be shipped with production graded questions.
Define loading, retryable failure, unauthenticated and empty results when connecting APIs.
The current 40 XP/15 coins per lesson and 20 XP/5 coins per typing exercise are demo
values, not production economic rules.

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

npm test covers one-time rewards, independent rewards, exact typing and XP thresholds.
npm run build performs strict TypeScript checking and the production bundle build.
Browser QA is automated in tests/browser-qa.mjs. With the dev server running on port 5180
(`npm run dev -- --port 5180`), run `node tests/browser-qa.mjs`. It drives headless Chrome
over CDP against a cleared demo localStorage and checks lesson unlock/retry, reload
persistence, profile rename, algorithm filtering, typing completion, demo arena
cancel/timeout, friendly room-code validation and 390px/1440px layouts.
