# WorldOfCodes

An English learning workspace for Python foundations, algorithm practice and typing exercises, with account progress stored in PostgreSQL.

## Run the integrated application

Requirements: Node.js 22.12+, PostgreSQL, and a running Docker engine for Python judging.

```sh
npm ci
cp .env.example .env
# Set DATABASE_URL to your own database and CORS_ORIGINS to your frontend origin.
npm run db:validate
npm run db:migrate
npm run db:seed
docker pull python:3.12-alpine
npm run build
npm start
```

`npm ci` installs both workspaces (`frontend`, `services/learning-backend`) and
generates the Prisma client. The API listens on `127.0.0.1:4001` by default
(`PORT`, `HOST` in `.env`). `CORS_ORIGINS` is a comma-separated allowlist used by
both REST and Socket.IO; an empty value means same-origin only. Request bodies
are capped by `REQUEST_BODY_LIMIT` (32 KB), login/register by `AUTH_RATE_LIMIT`,
and learning/copy/battle submissions by `SUBMISSION_RATE_LIMIT`; judge work
shares `JUDGE_CONCURRENCY` / `JUDGE_QUEUE_LIMIT`.

Open http://127.0.0.1:4001. For frontend development, run `npm run dev:web` separately; Vite proxies `/api` to port 4001. PostgreSQL credentials are server-only. Never put DATABASE_URL in a VITE_ variable or commit .env files.

The judge creates temporary files that Docker must be able to mount. On macOS/Colima set TMPDIR to a directory mounted into the VM and set DOCKER_HOST to that profile's socket. The API never executes user Python in its own process.

## Verification

```sh
npm test
npm run build
# Point .env.test at an isolated localhost PostgreSQL database ending in _test.
# Apply the same migrations and seed there first; tests never reset a database.
npm run test:integration
# With Playwright available and the app running:
node tests/browser-integration.mjs
```

Browser test overrides: APP_URL, PLAYWRIGHT_MODULE and CHROME_PATH. Test accounts are unique per run and remain in the isolated test database.

## Integration status and ownership

See [integration report](docs/integration-report.md), [API contracts](docs/contracts.md) and [Battle review](docs/battle-integration-review.md).

- GPT 1: frontend, root manifest, server entrypoint, environment wiring and integration tests.
- GPT 2: Learning & Account backend, Prisma, judging and learning rewards.
- GPT 3: Battle endpoints, Socket.IO, matchmaking and rating settlement.
- GPT 4: integration tests, audit, CI and server protections.
- GPT 5: Battle frontend.

The integration branch preserves the existing frontend and GPT 2 history. Battle REST and Socket.IO run on the shared server; GPT 5's Battle UI lands in a follow-up merge. Five non-Python language tracks remain local practice, without account XP or coins.

Do not merge into main until integration and contract reviews pass. Never reset a shared database to resolve migration drift.
