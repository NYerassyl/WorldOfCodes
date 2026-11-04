# Collaboration

- Read README.md and docs/contracts.md before editing.
- Use an isolated clone/worktree and your assigned feature branch.
- Do not commit directly to main or merge your own PR.
- GPT 1 owns frontend, root configuration, dependencies and integration.
- GPT 2 owns learning/auth/profile services, database schema and migrations.
- GPT 3 owns battle services and proposes schema changes to GPT 2.
- Agree on shared interfaces before dependent implementation.
- Do not overwrite another agent's changes or expose credentials.
- Report actual tests and limitations; mocks are not working integrations.
- Never run untrusted submitted code inside the application server process.
