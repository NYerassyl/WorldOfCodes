# GPT 2 — dependency security audit and remediation handoff

**Date:** 2026-11-04

**Evidence:** GitHub Actions run [41782463093](https://github.com/NYerassyl/WorldOfCodes/actions/runs/41782463093), job *Root workspace npm ci, Prisma/Socket.IO imports and npm audit*. The job checked out **exact** integration commit `c907eab63713f45415e9bd556082932c9f285c1c` read-only and installed with its authoritative root `package-lock.json`.

## Verified dependency versions and install

- `npm ci --no-audit --no-fund` succeeded and installed 221 packages.
- `prisma@6.19.3`, `@prisma/client@6.19.3`; `prisma validate` and `prisma generate` both succeeded.
- `socket.io@4.8.4`; Node.js ESM import of `Server` and `Socket` succeeded.
- All 18 expected Prisma delegates, including Match/MatchPlayer/Rating/FriendBattle, were generated and accessible.
- Root lock metadata matches both root and Learning service manifests (`socket.io ^4.8.4`).

## npm audit — outstanding HIGH issue

Both `npm audit --json` (full) and `npm audit --omit=dev --json` (npm-classified production tree) returned:

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 3 |
| Moderate | 0 |
| Low | 0 |

The **three high findings are one underlying advisory reported along three packages**:

1. `deepmerge-ts@7.1.5`: [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), CVE-2026-40345 — stack exhaustion / uncontrolled recursion with crafted circular object graphs; versions **below 8.0.0** are affected.
2. `@prisma/config`: indirect finding because it depends on affected `deepmerge-ts`.
3. `prisma@6.19.3`: indirect finding because it depends on `@prisma/config`.

**Exposure assessment:** This issue requires cyclic recursive objects passed into the merge function. Plain JSON cannot directly represent cycles; no user-controlled trigger has been proven in WorldOfCodes. Prisma configuration/build/migration execution may be exposed under different operational conditions, so **this is not proof that the application is safe**. The `npm audit --omit=dev` finding remains visible and cannot be dismissed merely because `prisma` is declared as a devDependency.

**The audit steps intentionally report rather than automatically fail CI.** A successful GitHub Actions run does not certify zero vulnerabilities.

## Recommended GPT 1 remediation (root dependency owner)

1. Keep **Prisma 6** unchanged until a compatibility decision is approved. Do **not** run `npm audit fix --force` or silently move to Prisma 7/8.
2. In a **separate temporary branch/worktree**, evaluate a root npm `overrides` entry pinning patched `deepmerge-ts >=8.0.0` (for example `"overrides": {"deepmerge-ts": "^8.0.2"}`). This is a **major transitive dependency update**, not automatically safe. First review `@prisma/config` compatibility and the upstream Prisma issue [#30052](https://github.com/prisma/orm/issues/30052).
3. Regenerate only the **root** lockfile, run `npm ci`, `npm audit` (all and production), `prisma validate`, `prisma generate`, four isolated PostgreSQL migrations/seed/reseed and real app/Judge tests. Compare dependency output. Revert the override if compatibility fails; never reset a shared database.
4. Alternatively adopt a compatible upstream Prisma patch after reviewing its changes. If no vetted remediation is ready, keep this issue recorded as a release risk with owner and retest date; obtain explicit deployment risk acceptance.
5. Re-audit the **final integration head and lockfile** after GPT 5's frontend dependencies are incorporated. The audited `c907eab6` snapshot does not yet include that Battle frontend workspace change.

**Status:** Open security finding; root lockfile and any overrides are controlled by **GPT 1**. GPT 2 did not modify them. This document records confirmed CI facts, not a claim that the advisory is fixed.
