# GPT 2 cross-branch compatibility audit — WorldOfCodes

**Audited:** 2026-11-04. **Scope:** GitHub tree/PR review and confirmed CI evidence; this is not a new combined browser/WebSocket acceptance run.

**Canonical integration destination:** `integration/all`, owned by GPT 1; no merge into `main` authorized.

## Branches verified

| Branch | Head SHA | Current role / observation |
|---|---|---|
| `main` | `6dc80c48dea33967884e2ef63cde077570511a07` | Baseline README-only branch; not changed |
| `feat/frontend` | `8a082022a8734dd256cf5c81ec7006c9bdedb4c0` | Frontend history/source; PR #1 open |
| `feat/learning-backend` | `5255f6e28254347c0db00cb8f8b02c22fc61c679` | GPT 2: Account/Learning/Prisma/Judge; PR #2 Draft |
| `feat/battle-backend` | `44c24257583cbbacbd01559f79fdb4db39396717` | Old GPT 3 baseline; superseded by hardening |
| `feat/battle-backend-hardening` | `c536aa387dfd2098d3afd8e90fe8c2fa7d952f81` | GPT 3: hardened Battle/Socket.IO |
| `feat/backend-integration` | `e0126048a5c1df5006ad3e53320adb16b02aa9ff` | GPT 4 source for learning integration; PR #4 closed without merge, content preserved in PR #3 |
| `feat/battle-frontend` | `5f0b7bc1412275d089f90efc8e25d79d3227e4ae` | GPT 5 real Battle UI source; PR #6 closed without merge, incomplete integration into `integration/all` |
| `docs/gpt4-team-audit` | `300f48426f77aad773e713c782a5ea2881b68571` | GPT 4 audit docs; PR #5 merged into `integration/all` |
| `integration/all` | `c907eab63713f45415e9bd556082932c9f285c1c` | GPT 1 shared server & workspace; PR #3 open; current Arena is still rehearsal |

## GPT 2 owned code: no conflicting learning migrations / imports

Compared GitHub Git blob SHA values for `feat/learning-backend` and `integration/all`:
- `src/auth/session.js`, `src/problems/dockerJudge.js`, `src/problems/router.js`, `src/problems/service.js`, and `prisma/schema.prisma` are **byte-for-byte identical**.
- Four historical PostgreSQL `migration.sql` blobs are **byte-for-byte identical**. Keep their history immutable.
- Root `integration/all/package.json`, service `package.json` and root `package-lock.json` all declare Socket.IO `^4.8.4`. Root lockfile is GPT 1-owned; no nested service lockfile.
- [GPT 2 root install + real PostgreSQL/Docker CI](https://github.com/NYerassyl/WorldOfCodes/actions/runs/41782463093): installed the **pinned `integration/all` SHA** with root `npm ci` (221 packages), Prisma 6.19.3 validate/generate, Socket.IO 4.8.4 ESM import and 18 Prisma delegates; **39/39 unit** and **13/13 isolated PostgreSQL/Docker** results passed. Repeat migration/seed preserved account/progress/rewards. Do **not** extrapolate to a future integration SHA with new frontend dependencies.

## Concrete cross-agent findings

### GPT 1 — Live Arena missing from current integration baseline

On `integration/all`, `frontend/src/pages/Arena.tsx` still displays **"Your practice arena"** / **"Solo rehearsal"** and a disabled `Submit solution`. `frontend/src/lib/battle-session.ts` and `frontend/src/components/battle/battle.css` live in `feat/battle-frontend` but not the integration baseline. `integration/all/frontend/package.json` lacks `socket.io-client` while GPT 5's manifest declares `^4.8.1`.

**Action:** selectively integrate GPT 5's newer UI/session/stylesheet components, add `socket.io-client` to the frontend workspace, regenerate the authoritative root lockfile and run clean `npm ci`, frontend TS/build/tests and real two-account Battle browser flows. The `src/battle/socket.js` blob in `integration/all` already matches GPT 3's latest hardening SHA; **do not overwrite it with GPT 5's older socket blob**.

### GPT 5 — Public problem contract mismatch

`frontend/src/lib/battle-api.ts` declares `PublicBattleProblem.testCases: {argsJson,expectedJson}[]`. The actual `GET /api/problems/:id` returns `{problem: {..., functionName, starterCode, examples:[{args,expected}]}}` and **never returns `testCases`**. `GET /api/problems` also exposes public `examples` only.

**Action:** replace the public type with `examples: {args: unknown[]; expected: unknown}[]`, remove `testCases`, add API contract tests and ensure that no client code expects or requests the server-only hidden test bank. Keep the public response unchanged.

### GPT 3 — Socket.IO transport/application size mismatch

The hardened `src/battle/socket.js` sets `maxHttpBufferSize: 16*1024` bytes while it accepts `match:submit` `code.length <= 20_000` characters and `src/battle/service.js` permits the same. A legitimate 17–20 KB payload can be rejected by the transport before reaching validation.

**Action:** either raise the bounded Socket.IO transport budget to accommodate the 20k-character JSON/Socket.IO envelope (e.g. 32 KiB with explicit limits) or align both HTTP/Socket/user-facing limits. Add real websocket boundary tests, including UTF-8 byte sizes. Keep per-event session revocation checks and the notifier intact.

### GPT 4 — Full combined acceptance remains unverified

Real GPT 2 PostgreSQL/Docker component acceptance does not prove end-to-end browser + Socket.IO + Battle settlement after GPT 5 frontend incorporation.

**Action:** independently test exactly the final integrated SHA: Ranked/Friendly with two real users, REST/socket mixed queue, idempotent Elo, friendly no rating, logout while connected, reconnection/multi-tab, invalid origins, hidden test privacy, Judge failure, clean root `npm ci` and migrations on **isolated** PostgreSQL. Publish exact SHA, counts and blockers.

### GPT 1 — Unresolved npm advisory

The pinned `integration/all` root lock audit returned **three HIGH findings** (and 0 critical) through a single `deepmerge-ts@7.1.5` / `@prisma/config` / `prisma@6.19.3` advisory. This issue is documented in `docs/SECURITY_AUDIT_GPT2.md`. `npm audit` steps are non-blocking in GPT 2 CI; green build **does not** mean zero vulnerabilities.

**Action:** GPT 1 owns root override/lock/security decision; evaluate a patched compatible transitive dependency in an isolated worktree and rerun Prisma validation, generated client, migrations, seed, Docker, and full app regression tests. Do not force-upgrade Prisma major without approval. Rerun audit on the final integrated lockfile.

## Communications

- GPT 1 integration/principal and GPT 3 Socket.IO limit: actionable comments on [PR #3](https://github.com/NYerassyl/WorldOfCodes/pull/3).
- GPT 5 public problem shape + Arena handoff: actionable comment on [PR #6](https://github.com/NYerassyl/WorldOfCodes/pull/6).

**Status:** GPT 2 implementation and Prisma migration history already match the current integration baseline; this audit records confirmed cross-branch discrepancies. Do not merge to `main` until the owning agents resolve issues and GPT 4 verifies the final combined build. No shared/production migration or reset was performed.
