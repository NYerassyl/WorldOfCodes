# WorldOfCodes — multi-agent coordination (week 1)

This file records **scope boundaries and integration proposals**, not a claim that every API decision has been approved. Do not silently freeze an unresolved contract.

## Ownership
- GPT 1 (integrator): frontend/design, root `package.json`, lockfile, shared server entrypoint, deployment and integration.
- GPT 2 (branch `feat/learning-backend`): auth/profile, courses/lessons, algorithm problem bank, safe judging adapter, exact-code-copy exercises, learning rewards, learning Prisma schema.
- GPT 3 (branch `feat/battle-backend`): ranked duel, friendly battle, Socket.IO, match settlement, ratings, anti-rematch reward logic.

## Rules
- Read `README.md` and `docs/contracts.md` before editing.
- Use an isolated clone/worktree and your assigned feature branch.
- Keep work on your own feature branch; PR to `main`; do not commit directly to `main` or merge your own PR.
- Do not change files owned by other agents without explicit agreement. In particular, leave the root manifest and frontend to GPT 1.
- Backend modules live in `services/learning-backend`. The package manifest there is service-local, **not** the shared root package.
- Shared endpoint and schema proposal is `docs/contracts.md`. Proposed choices require review by GPT 1 and GPT 3 before production integration.
- Agree on shared interfaces before dependent implementation.
- GPT 3 has supplied Match/MatchPlayer/Rating/FriendBattle model shapes. GPT 2 prepared relationships and a separate additive PostgreSQL migration; GPT 3 confirmed model enums, lifecycle and Judge interface; deletion policies and Battle runtime compatibility still require review. GPT 1 has selected PostgreSQL + Prisma as the shared provider. Do not create competing User/Problem models.
- GPT 3 may use `getPublicProblemBank`, `getJudgableProblem` and `judgePython` from `services/learning-backend/src/index.js`. Hidden tests must NEVER be serialized to clients.
- Duel results, ratings and matchmaking are GPT 3's responsibility. Learning XP/coins must not be changed by duel code.
- Never execute untrusted code with `eval` or in the API process. Judge infra failures return UNAVAILABLE, never fabricated ACCEPTED.
- Rewards are server-calculated, first-completion-only, and database-transactional.
- Do not deploy migrations until shared model ownership and integration contracts are reviewed.
- Do not overwrite another agent's changes or expose credentials.
- Report actual tests and limitations; mocks are not working integrations.

## What's not in week 1
Guilds, shop, world editor, chat, AI agent, subscription checkout, and payments.

## Status
The integration branch combines the week-one frontend, the Learning & Account backend and GPT 1's shared Express/Socket.IO server with the Battle runtime. Real PostgreSQL/Docker end-to-end verification and GPT 4's final sign-off are still outstanding; main remains unchanged. Verification notes live in docs/integration-report.md and docs/battle-integration-review.md.
