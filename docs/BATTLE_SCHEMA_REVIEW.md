# Battle database handoff — GPT 2 → GPT 3 / GPT 1

**Status: proposed, pending acceptance.** Received required model shapes from GPT 3 in the WorldOfCodes chat. The remote repository currently has no separate GPT 3 battle branch, so compatibility with its runtime imports, status names and queries is **not yet confirmed**.

## Implemented schema
- `Match`: id (String UUID), type (`MatchType`), status (`MatchStatus` default PENDING), required `problemId`, nullable `winnerId`, nullable timestamps; references existing Problem and User.
- `MatchPlayer`: `@@id([matchId,userId])` and `@@unique([matchId,seat])`; submittedAt/verdict/ratingBefore/ratingDelta nullable, verdict reuses `SubmissionStatus`.
- `Rating`: one-to-one User via `userId` primary key, points defaults to 1000, wins/losses/draws default zero, Prisma-managed `updatedAt`.
- `FriendBattle`: id, unique matchId (1:1 with Match), unique inviteCode, required createdById → User, expiresAt and createdAt.
- Reverse relations added to `User`: matchPlayers, wonMatches (named relation), rating, createdFriendBattles; to `Problem`: matches.
- Proposed `MatchType`: `RANKED`, `FRIENDLY`; proposed `MatchStatus`: `PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `EXPIRED`.
- `MatchPlayer.verdict`: `SubmissionStatus?` (`ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT`).
- `User.xp` and `User.coins` remain **learning rewards**; `Rating.points` is exclusively duel rating.

## Migration plan
`prisma/migrations/20261103000000_init/migration.sql` has **not** been edited. New `prisma/migrations/20261103170000_add_battle_models/migration.sql` creates 2 enums, 4 tables, 3 unique indices and 7 foreign keys. The addition references User and Problem from the first migration; no data updates or existing-table drops.

**Do not run `prisma migrate deploy` against an existing shared DB until GPT 1 confirms the provider and schema ownership**. GPT 1's frontend contract currently proposes SQLite; these are PostgreSQL-only migrations. A new empty PostgreSQL DB is the only migration sequence for which these files are designed.

## Data and game invariants delegated to GPT 3
1. `Match.winnerId` must be a member of that match (`MatchPlayer`); schema only enforces User existence.
2. Every `FriendBattle.matchId` must refer to a match with `type=FRIENDLY`; schema only enforces unique foreign key.
3. Limit seats to the agreed 1v1 mapping and enforce invitation expiry and no double join in the match service.
4. Treat `ratingBefore` and `ratingDelta` as nullable for friendly; friendly should never alter `Rating`.
5. Use transactions and unique constraints to guarantee idempotent match settlement, even if Socket.IO events repeat.
6. On Judge error 503, do not settle as ACCEPTED or award rating; use server-only hidden tests.

## Validation and outstanding signoffs
- Static schema/migration regression tests in `tests/battle-schema.test.js` check table, index, FK and enum alignment and that the original init migration is untouched.
- Prisma CLI `validate`, generated migration diff, a real PostgreSQL migration execution, and GPT 3 runtime integration are **not yet confirmed**.
- GPT 3 must approve the **enum names/values**, NULL defaults, FK deletion semantics, and any migration changes required by battle runtime.
- GPT 1 must select PostgreSQL or SQLite and approve the shared integration plan.
