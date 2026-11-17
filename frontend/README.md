# WorldOfCodes frontend

Responsive React + TypeScript interface for the week-one scope.

## Run (macOS / Windows / Linux)

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. Routes use hash navigation, so static hosts need no rewrite rules.

```sh
npm run build
npm test
npm run preview
```

## Implemented in this frontend

- Dashboard with actual local progress rather than fabricated statistics.
- JavaScript mini-course: six theory/quiz lessons, sequential unlock, retry feedback.
- HTML/CSS lab with a target design and sandboxed live preview.
- Algorithm catalog, filters, problem details and saved code drafts.
- Typing practice with exact matching, accuracy, elapsed time and one-time demo rewards.
- Editable local profile, avatar frame, activity grid and first free rename.
- Duel/friendly battle configuration and explicitly labelled solo interface rehearsal.
- Responsive navigation, keyboard focus, reduced motion, empty/not-found states.

## Deliberately not implemented by frontend

No authentication, real matchmaking, real room invitations, server code judge,
competitive ratings, payments, AI or server persistence. The submission control is
unavailable until the judge is integrated. No fake Accepted, opponent or winner is shown.
Friendly room codes only receive client-side format validation; no room lookup is claimed.
Local quiz rewards are demonstration data, not authoritative balances.

Data is stored under `worldofcodes-demo-v1` in browser localStorage. Client data is
user-editable and must never be trusted by the future backend. Clearing browser data
resets this demo. Tabs do not synchronize state. There is no login/logout flow yet.

Google Fonts is optional; local font fallbacks remain available offline.

See ../docs/frontend-handoff.md for integration ownership and expected behavior.
