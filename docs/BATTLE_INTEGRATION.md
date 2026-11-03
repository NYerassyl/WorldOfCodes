# Battle backend integration notes

## Runtime contract

Battle HTTP routes and Socket.IO must share the **same** `MatchmakingQueue` instance. Creating a queue independently for REST and Socket.IO creates two unrelated in-memory queues and players will not be paired across transports.

The integration API is exported from `services/learning-backend/src/battle/index.js`:

- `createBattleRouter(prisma, auth, { queue })`
- `new MatchmakingQueue(prisma)`
- `attachBattleSocket(httpServer, prisma, { queue, cors })`

Example for the shared application entrypoint (GPT 1 owns the actual shared entrypoint):

```js
import {
  createBattleRouter,
  MatchmakingQueue,
  attachBattleSocket
} from './services/learning-backend/src/battle/index.js';

const battleQueue = new MatchmakingQueue(prisma);
app.use('/api', createBattleRouter(prisma, requireAuth, { queue: battleQueue }));
const io = await attachBattleSocket(httpServer, prisma, {
  queue: battleQueue,
  cors: { origin: allowedOrigins, credentials: true }
});
```

The shared HTTP server must be created with `http.createServer(app)` before Socket.IO attaches. Keep the existing central error middleware and authentication factory. Do not create a second PrismaClient for Battle.

## Socket events

Client → server:
- `ranked:join` — join the shared ranked queue; callback receives `QUEUED` or `MATCHED`.
- `ranked:leave` — leave the waiting queue.
- `match:watch` — `{ matchId }`; only a match participant can join its room.
- `match:submit` — `{ matchId, code }`; same server-side judge and settlement path as the REST endpoint.

Server → client:
- `battle:matched` — sent to both authenticated user rooms.
- `match:updated` — verdict and public match-completion state; never includes source code or test cases.
- `battle:completed` — match ID and winner ID.

Authentication:
- Handshake: `auth: { token: '<opaque session token>' }`.
- The token is hashed with the same SHA-256 helper used by HTTP sessions. Revoked and expired sessions are rejected.
- Do not send user IDs as trusted client identity.

## Scaling and operational constraints

- `MatchmakingQueue` is an in-memory, single-process MVP. It is not safe for multiple application instances or server restarts. Use Redis or a PostgreSQL advisory-lock queue before horizontal scaling.
- The Socket.IO module dynamically imports `socket.io`; the learning-backend package must declare a compatible runtime dependency before this adapter is deployed.
- Socket.IO should be attached to the same HTTP server and origin policy as the API. Configure production CORS explicitly.
- Judge execution remains synchronous in the submission request. Move it to an isolated worker/queue before production traffic.
- Do not expose hidden test cases through REST responses or Socket.IO events.
