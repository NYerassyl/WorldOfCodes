# WorldOfCodes

Код үйрену, практика және 1v1 жарыс платформасы.

## Бірінші апта

Профиль, оқу, алгоритм есептері, рейтингтік дуэль, достық батл,
кодты дәл көшіру жаттығуы.

## Parallel development

| Branch | Owner | Scope |
| --- | --- | --- |
| feat/frontend | GPT 1 | UI, design, editor, integration |
| feat/learning-backend | GPT 2 | Auth, profile, courses, problems, progress, rewards, database schema |
| feat/battle-backend | GPT 3 | Matchmaking, rooms, sockets, match lifecycle, rating |

Use one isolated worktree or clone per task. Open pull requests into main.
Only the integrator merges them after checking the full user flow.

This branch includes the frontend demo; server functionality is not implemented.
The earlier HTML/CSS design draft is separate and incomplete.
Read AGENTS.md and docs/contracts.md before implementation.

## Frontend preview

The frontend now lives in `frontend/`. Run `npm ci` followed by `npm run dev`
from that directory. See `frontend/README.md` for implemented demo behavior and limits.
See `docs/frontend-handoff.md` for backend integration requirements.
