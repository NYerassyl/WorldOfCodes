# GPT 1 → GPT 3: integration review

Reviewed `feat/battle-backend` at `44c24257583cbbacbd01559f79fdb4db39396717` on 2026-11-03. Your branch is preserved and has not been merged or edited. Learning integration uses GPT 2 commit `8df21e9e6277019aafa7f479517eb33238f2b0b1`.

## Shared contract

Use the existing PostgreSQL Prisma User, Problem, Match, MatchPlayer, Rating and FriendBattle models. No duplicate models are needed. Preserve all four migrations, including the newer starterCode migration missing from your branch snapshot. Shared Battle models are unchanged.

Learning/account routers are mounted once in `server/app.js` under `/api`. Battle's router should be mounted alongside them after these blockers pass. HTTP and Socket.IO must receive the same MatchmakingQueue instance. Keep your Battle endpoints, lifecycle and rating settlement in your module.

## Required fixes before mounting Battle

1. **Ranked never becomes active.** `src/battle/service.js:44` creates a Match without status or startedAt. Prisma defaults to PENDING; `submitBattleSolution` searches ACTIVE. Reproduced against the isolated real PostgreSQL database: createMatch returns PENDING, submission throws ACTIVE_MATCH_NOT_FOUND. Explicitly create ranked matches as ACTIVE with startedAt.
2. **Friendly invites cannot be joined.** Creation at line 56 correctly defaults PENDING, but join at line 67 requires ACTIVE. Reproduced: a fresh invite immediately throws INVITE_NOT_FOUND. Join must atomically claim an unexpired PENDING invitation, create seat 1, transition to ACTIVE and set startedAt. Concurrent join must accept exactly one second player.
3. **Socket sessions survive logout.** `src/battle/socket.js` checks AuthSession only during handshake. Revalidate before every protected event and disconnect revoked/expired sessions; queued users must also be checked before pairing. Use `server/socket-auth.js`'s resolveSession or equivalent shared lookup. Its tests verify the same hashed opaque tokens and revocation as REST. Never serialize the returned user object (it is internal). The runtime itself has not passed socket E2E verification yet.
4. **Protect socket events as well as REST.** Apply origin allowlisting to websocket upgrades (CORS alone only covers polling), per-user event limits, payload type checks and safe acknowledgement handling. Malformed ack values must not escape async handlers as unhandled errors. Socket maxHttpBufferSize already exists.
5. **Use the bounded shared judge.** Accept an injected judge in createBattleRouter and pass it to submitBattleSolution; share the integration judge queue. Add the Battle submit route to submission limits and allow DELETE in CORS when mounting the queue cancellation endpoint. Keep Battle settlement separate from learning rewards.

Before signoff, verify concurrent accepted submissions settle both ratings exactly once, friendly results leave ratings unchanged, spectators cannot submit, duplicate/repeated queue joins cannot put one user in multiple active matches, and judge 503 never settles a match. Existing rating tests alone do not verify these flows.

## Product scope note

Your current classic Elo K=32 differs from the user's original beginner protection requirement. Do not claim beginner loss protection, algorithm-filtered matching or spectator access is implemented unless those behaviors are added and tested. Current getMatchForUser only permits participants.

## Ready on the integration branch

Opaque Bearer authentication, server-side logout revocation, PostgreSQL schema/migrations, real Python judge, public problem starterCode, central error responses, explicit CORS, rate/body limits, and authenticated frontend account/learning flows. Judge timeout now force-kills the Docker CLI and removes its named container before freeing the worker slot.
