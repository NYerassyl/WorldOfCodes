# Battle database handoff — GPT 2 → GPT 3 / GPT 1

**Status: model shape, enums and shared judge interface approved by GPT 3 in chat.** Runtime/branch verification and GPT 1 provider approval remain pending.

## Implemented schema
- `Match`: id (String UUID), type (`MatchType`), status (`MatchStatus` default PENDING), required `problemId`, nullable `winnerId`, nullable timestamps; references existing Problem and User.
- `MatchPlayer`: `@@id([matchId,userId])` and `@@unique([matchId,seat])`; submittedAt/verdict/ratingBefore/ratingDelta nullable, verdict reuses `SubmissionStatus`.
- `Rating`: one-to-one User via `userId` primary key, points defaults to 1000, wins/losses/draws default zero, Prisma-managed `updatedAt`.
- `FriendBattle`: id, unique matchId (1:1 with Match), unique inviteCode, required createdById → User, expiresAt and createdAt.
- Reverse relations added to `User`: matchPlayers, wonMatches (named relation), rating, createdFriendBattles; to `Problem`: matches.
- GPT 3 approved `MatchType`: `RANKED`, `FRIENDLY` and `MatchStatus`: `PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `EXPIRED`.
- `MatchPlayer.verdict`: `SubmissionStatus?` (`ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT`).
- `User.xp` and `User.coins` remain **learning rewards**; `Rating.points` is exclusively duel rating.
- Both `[type, status]` and the GPT 3-requested `[status, type]` Match indexes are included in schema; the additional index is delivered in a follow-up migration.

## Migration plan
`prisma/migrations/20261103000000_init/migration.sql` has **not** been edited. New `prisma/migrations/20261103170000_add_battle_models/migration.sql` creates 2 enums, 4 tables, 3 unique indices and 7 foreign keys. The addition references User and Problem from the first migration; no data updates or existing-table drops.

The GPT 3-requested `Match @@index([status, type])` is introduced in **another additive migration** `20261103220000_match_status_type_index` to avoid rewriting the existing Battle migration.

**Do not run `prisma migrate deploy` against an existing shared DB until GPT 1 confirms the provider and schema ownership**. GPT 1's frontend contract currently proposes SQLite; these are PostgreSQL-only migrations. A new empty PostgreSQL DB is the only migration sequence for which these files are designed.

## Data and game invariants delegated to GPT 3
1. `Match.winnerId` must be a member of that match (`MatchPlayer`); schema only enforces User existence.
2. Every `FriendBattle.matchId` must refer to a match with `type=FRIENDLY`; schema only enforces unique foreign key.
3. Limit seats to the agreed 1v1 mapping, enforce 30-minute invitation expiry and no double join in the match service.
4. Treat `ratingBefore` and `ratingDelta` as nullable for friendly; friendly must never alter `Rating`. Ranked uses classic Elo (K=32), initial 1000, no beginner protection in MVP.
5. In one DB transaction: conditionally transition match status to COMPLETED, then settle both players' ratings and results; a failed conditional update must skip duplicate settlement.
6. On Judge error 503, do not select a winner or award rating; use server-only hidden tests.
7. Ranked creation explicitly sets `ACTIVE` (Prisma status default is `PENDING`). Friendly creation sets `PENDING`, second-player join transitions to `ACTIVE`; settled match to `COMPLETED`. Only participants can submit; spectators are read-only.

## Validation and outstanding signoffs
- Static schema/migration regression tests in `tests/battle-schema.test.js` check table, index, FK and enum alignment and that the original init migration is untouched.
- Prisma CLI `validate`, generated migration diff, a real PostgreSQL migration execution, and GPT 3 runtime integration are **not yet confirmed**.
- GPT 3 **has approved** enum names/values, MatchPlayer fields, Elo K=32, match lifecycle and Judge API. FK deletion semantics and any runtime-specific migration changes still require review.
- GPT 1 must select PostgreSQL or SQLite and approve the shared integration plan.
