# Integration contract — draft

Status: establish the concrete schemas and payloads before parallel implementation.

Proposed stack: React + TypeScript, Express, Socket.IO, Prisma + SQLite.
Do not scaffold conflicting stacks independently.

## Shared rules

- Learning XP, coins and competitive rating are separate values.
- Server verifies progress, rewards and match results.
- Rewards and rating updates are idempotent and transactional.
- Friendly matches never change rating.
- Week one supports solo 1v1 only.
- A working code judge must isolate submissions and enforce resource limits.
- No guilds, team battles, AI subscriptions, payments or world editor this week.

## To finalize with integrator

- Session authentication and socket authentication.
- User/public profile schemas and error response shape.
- Problem, submission and judge result schemas.
- API route names, request and response payloads.
- Socket event names and reconnection behavior.
- New-player protection thresholds and rating formula.
- Time limit, tie, disconnect and judge outage rules.

Do not assume these draft choices are completed or approved implementations.
