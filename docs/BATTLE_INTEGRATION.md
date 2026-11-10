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
| GET | /api/battle/state | Recover current active match and local queue state |
| POST | /api/battle/ranked/queue | Join ranked queue |
| DELETE | /api/battle/ranked/queue | Leave ranked queue |
| POST | /api/battle/friendly | Create a 30-minute invite |
| POST | /api/battle/friendly/:inviteCode/join | Join invite |
| GET | /api/battle/matches/:matchId | Read own match |
| POST | /api/battle/matches/:matchId/submit | Submit Python code |

### Battle state recovery

Authenticated `GET /api/battle/state` returns:

```json
{
  "match": null,
  "queue": { "status": "QUEUED", "ticketId": "opaque-ticket-id", "position": 1, "joinedAt": "2026-11-04T10:00:00.000Z" }
}
```

When a match is active, `match` contains the same participant-only public match projection returned by `GET /api/battle/matches/:matchId`. Queue states are `QUEUED`, `MATCHMAKING`, or `NOT_QUEUED`. The database is authoritative for active matches; the queue ticket is process-local and visible only to the server instance handling the request. In a multi-instance deployment, use a shared queue adapter before claiming cross-instance recovery.

REST submit body: { "code": "..." }. Unknown body keys are rejected. Source is limited to 20,000 characters. Both transports must use the same injected Judge Queue and settlement service.

## Socket authentication and origin

Connect using the existing token: io(API_ORIGIN, { auth: { token: opaqueSessionToken } }).

The server uses the canonical `resolveAuthSession` helper and validates the opaque session at handshake and before every protected event. A revoked or expired session is rejected, disconnected and removed from queue when it is the user's last connected tab. A database error during revalidation fails closed with `SESSION_UNAVAILABLE`; it never authorizes the action.

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

- UNAUTHORIZED: invalid handshake session.
- SESSION_INVALID: session expired or revoked after connection.
- SESSION_UNAVAILABLE: session store cannot be checked; event fails closed.
- ALREADY_QUEUED: user already has a queue ticket.
- MATCHMAKING_IN_PROGRESS: pair creation is in progress.
- OPPONENT_SESSION_INVALID: waiting player's session is no longer active.
- INVALID_MATCH_ID / INVALID_INPUT: malformed payload.
- BATTLE_NOT_FOUND: match does not belong to this user.
- ACTIVE_MATCH_NOT_FOUND: no active participant match.
- ALREADY_SOLVED: accepted submission was already recorded.
- SUBMISSION_ALREADY_PROCESSED: concurrent accepted submission was processed first.
- JUDGE_UNAVAILABLE: judge infrastructure failed; no winner is awarded.
- RATE_LIMITED: submission cooldown is active.

## Operational limitations

- MatchmakingQueue is in-memory and process-local. Run one application instance for the MVP, or replace it with a shared queue before horizontal scaling.
- Judge execution must use GPT 1's bounded shared Judge Queue. Never instantiate a second queue or execute untrusted code in the Node process.
- Run the PostgreSQL migrations only against an approved isolated or provisioned database. Never reset a shared database to make tests pass.
