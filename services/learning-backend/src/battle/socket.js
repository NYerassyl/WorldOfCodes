import { hashSessionToken } from '../lib/security.js';
import { MatchmakingQueue } from './matchmaking.js';
import { getMatchForUser, submitBattleSolution } from './service.js';

const USER_ROOM = userId => `user:${userId}`;
const MATCH_ROOM = matchId => `match:${matchId}`;

function safeAck(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

/**
 * Attach to the shared HTTP server. Pass the same queue instance to the HTTP
 * router and Socket.IO adapter so REST and realtime clients share matchmaking.
 * Socket payloads never contain hidden tests or judge inputs.
 */
export async function attachBattleSocket(server, prisma, {
  queue = new MatchmakingQueue(prisma),
  cors = {},
  ServerClass,
  submissionCooldownMs = 1500,
  judge
} = {}) {
  const SocketServer = ServerClass || (await import('socket.io')).Server;
  const io = new SocketServer(server, {
    cors,
    serveClient: false,
    maxHttpBufferSize: 16 *  1024
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
        return next(new Error('UNAUTHORIZED'));
      }
      const session = await prisma.authSession.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        select: { id: true, userId: true, expiresAt: true, revokedAt: true }
      });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        return next(new Error('UNAUTHORIZED'));
      }
      socket.data.userId = session.userId;
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', socket => {
    const userId = socket.data.userId;
    const lastSubmissionAt = new Map();
    socket.join(USER_ROOM(userId));

    socket.on('ranked:join', async (_payload, ack) => {
      try {
        const result = await queue.join(userId);
        if (result.status === 'MATCHED') {
          const players = result.match.players || [];
          for (const player of players) {
            io.to(USER_ROOM(player.userId)).emit('battle:matched', result.match);
          }
        }
        safeAck(ack, { ok: true, ...result });
      } catch (error) {
        safeAck(ack, {
          ok: false,
          code: error.code || 'QUEUE_FAILED',
          message: error.message || 'Unable to join ranked queue'
        });
      }
    });

    socket.on('ranked:leave', (_payload, ack) => {
      try {
        safeAck(ack, { ok: true, ...queue.leave(userId) });
      } catch (error) {
        safeAck(ack, { ok: false, code: error.code || 'QUEUE_FAILED', message: error.message });
      }
    });

    socket.on('match:watch', async (payload = {}, ack) => {
      try {
        const matchId = payload?.matchId;
        if (typeof matchId !== 'string' || !matchId) {
          safeAck(ack, { ok: false, code: 'INVALID_MATCH_ID' });
          return;
        }
        const match = await getMatchForUser(prisma, matchId, userId);
        await socket.join(MATCH_ROOM(matchId));
        safeAck(ack, { ok: true, match });
      } catch (error) {
        safeAck(ack, { ok: false, code: error.code || 'BATTLE_NOT_FOUND' });
      }
    });

    socket.on('match:submit', async (payload = {}, ack) => {
      try {
        const { matchId, code } = payload || {};
        if (typeof matchId !== 'string' || !matchId || typeof code !== 'string') {
          safeAck(ack, { ok: false, code: 'INVALID_INPUT', message: 'matchId and code are required' });
          return;
        }
        const previous = lastSubmissionAt.get(matchId) || 0;
        if (Date.now() - previous < submissionCooldownMs) {
          safeAck(ack, { ok: false, code: 'RATE_LIMITED', message: 'Please wait before submitting again' });
          return;
        }
        lastSubmissionAt.set(matchId, Date.now());

        const result = await submitBattleSolution(prisma, {
          matchId,
          userId,
          sourceCode: code,
          judge
        });
        safeAck(ack, { ok: true, result });
        io.to(MATCH_ROOM(matchId)).emit('match:updated', {
          matchId,
          matchCompleted: Boolean(result.matchCompleted),
          winnerId: result.winnerId || null,
          verdict: result.status
        });
        if (result.matchCompleted) {
          io.to(MATCH_ROOM(matchId)).emit('battle:completed', {
            matchId,
            winnerId: result.winnerId || null
          });
        }
      } catch (error) {
        safeAck(ack, {
          ok: false,
          code: error.code || 'SUBMISSION_FAILED',
          message: error.message || 'Unable to submit solution'
        });
      }
    });

    socket.on('disconnect', () => {
      try { queue.leave(userId); } catch { /* A pairing already in progress must finish. */ }
    });
  });

  return io;
}
