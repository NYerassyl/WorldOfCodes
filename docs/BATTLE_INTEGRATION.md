# Battle backend integration contract

## Shared application wiring

REST and Socket.IO must use the same Prisma client, MatchmakingQueue, bounded Judge function and notifier instance. GPT 1 owns the shared server entrypoint and must inject its existing queuedJudge.

```js
import http from 'node:http';
import {
  createBattleRouter, MatchmakingQueue, attachBattleSocket, createBattleNotifier
} from './services/learning-backend/src/battle/index.js';

const battleQueue = new MatchmakingQueue(prisma);
const battleNotifier = createBattleNotifier();
const server = http.createServer(app);

app.use('/api', createBattleRouter(prisma, requireAuth, {
  queue: battleQueue, judge: queuedJudge, notifier: battleNotifier
}));
const io = await attachBattleSocket(server, prisma, {
  queue: battleQueue, judge: queuedJudge, notifier: battleNotifier,
  cors: { origin: allowedOrigins, credentials: true }, allowedOrigins
});
server.listen(PORT);
```

Do not create a second PrismaClient, queue or Judge Queue for Battle. Start the shared HTTP server after Socket.IO is attached.

## REST endpoints

All routes are mounted under /api. Except the leaderboard, routes require the existing opaque Bearer session.

| Method | Path | Purpose |
|---|---|---|
| GET | /api/battle/leaderboard | Public rating leaderboard |
| GET | /api/battle/rating/me | Current user's rating |
| GET | /api/battle/state | Recover the caller's active match and ranked queue state |
| POST | /api/battle/ranked/queue | Join ranked queue |
| DELETE | /api/battle/ranked/queue | Leave ranked queue |
| POST | /api/battle/friendly | Create a 30-minute invite |
| POST | /api/battle/friendly/:inviteCode/join | Join invite |
| GET | /api/battle/matches/:matchId | Read own match |
| POST | /api/battle/matches/:matchId/submit | Submit Python code |

REST submit body: { "code": "..." }. Unknown body keys are rejected. Source is limited to 20,000 characters. Both transports must use the same injected Judge Queue and settlement service.

## Socket authentication and origin

Connect using the existing token: io(API_ORIGIN, { auth: { token: opaqueSessionToken } }).

The shared `resolveAuthSession` helper hashes the opaque token with SHA-256 and validates it at handshake and before every protected event. A revoked or expired session is rejected and disconnected with `SESSION_INVALID`; a session-store/database error fails closed with `SESSION_UNAVAILABLE`. In either case, the queue ticket is removed when this is the user's last connected tab. Never trust a userId supplied by the client.

WebSocket Origin is checked against an explicit allowlist. Missing and unlisted origins are rejected. Configure allowedOrigins as an array of exact origins or a trusted predicate; do not use wildcard origins with credentials.

## Client to server events

| Event | Payload | Acknowledgement |
|---|---|---|
| ranked:join | {} | { ok:true, status:"QUEUED", ticketId } or { ok:true, status:"MATCHED", match } |
| ranked:leave | {} | { ok:true, status:"LEFT_QUEUE" } |
| match:watch | { matchId:string } | { ok:true, match } |
| match:submit | { matchId:string, code:string } | { ok:true, result } |

Only participants can watch or submit. Payloads are validated; code is limited to 20,000 characters. Ack callbacks are guarded.

## Server to client events

| Event | Payload | Meaning |
|---|---|---|
| battle:matched | Public match snapshot | Ranked pair or friendly invite activated |
| match:updated | { matchId, matchCompleted, winnerId, verdict } | Submission or match state changed |
| battle:completed | { matchId, winnerId } | Settlement completed |

The public match snapshot is allowlisted and excludes source code, hidden tests and judge inputs. REST-originated match changes are broadcast through the shared notifier so both transports converge.

## Error codes

UNAUTHORIZED: invalid handshake session.
SESSION_INVALID: session expired or revoked after connection.
SESSION_UNAVAILABLE: session validation store is temporarily unavailable; the socket is disconnected.
ALREADY_QUEUED: user already has a queue ticket.
MATCHMAKING_IN_PROGRESS: pair creation is in progress.
OPPONENT_SESSION_INVALID: waiting player's session is no longer active.
INVALID_MATCH_ID / INVALID_INPUT: malformed payload.
BATTLE_NOT_FOUND: match does not belong to this user.
ACTIVE_MATCH_NOT_FOUND: no active participant match.
ALREADY_SOLVED: accepted submission was already recorded.
SUBMISSION_ALREADY_PROCESSED: concurrent accepted submission was processed first.
RATE_LIMITED: user-level socket submission cooldown.
JUDGE_UNAVAILABLE: judge infrastructure failed; no winner is awarded.
INTERNAL_ERROR: unexpected server failure.

## Reconnect and multiple tabs

Reconnect using the opaque token. Call GET /api/battle/state after initial load and every reconnect. It returns `{ match, queue }`, where `match` is the caller's active participant match or `null`, and `queue` is `QUEUED` (ticketId, position, joinedAt), `MATCHMAKING`, or `NOT_QUEUED`. If a match is returned, call GET /api/battle/matches/:matchId for its full public snapshot and rejoin the room with match:watch for realtime updates. The database is authoritative for active matches; the in-memory queue state is process-local and is lost on server restart.

Multiple local tabs are tracked per authenticated user. Closing one tab does not remove another tab's queue ticket. The queue ticket is removed when the last local socket disconnects or its session is invalidated. Socket submission cooldown is keyed by userId rather than socket ID, so reconnecting or opening another tab does not reset it.

## Scope and operational notes

Ranked/Friendly lifecycle, Elo and conditional transactional settlement remain as implemented. Friendly matches do not change competitive rating; Learning XP/coins remain separate.

Beginner protection, spectator access and algorithm-filtered matching are NOT implemented and must not be advertised. Queue and cooldown are process-local MVP mechanisms; use a shared store/lock before horizontal scaling.

GPT 4 must run end-to-end checks with two real accounts, PostgreSQL, Docker Judge and Socket.IO. Unit tests alone do not prove production integration.
