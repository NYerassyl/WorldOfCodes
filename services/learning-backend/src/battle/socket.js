import { resolveAuthSession } from '../auth/session.js';
import { MatchmakingQueue } from './matchmaking.js';
import { getMatchForUser, submitBattleSolution } from './service.js';

const USER_ROOM = userId => 'user:' + userId;
const MATCH_ROOM = matchId => 'match:' + matchId;
const USER_SUBMISSION_TIMES = new Map();
const CODE_LIMIT = 20_000;

function safeAck(ack, payload) {
  if (typeof ack === 'function') { try { ack(payload); } catch { /* Ignore client callback errors. */ } }
}
function originAllowed(origin, allowlist) {
  if (!origin) return false;
  if (typeof allowlist === 'function') return Boolean(allowlist(origin));
  return Array.isArray(allowlist) && allowlist.includes(origin);
}
function publicMatch(match) {
  if (!match || typeof match !== 'object') return null;
  return {
    id: match.id, type: match.type, status: match.status, problemId: match.problemId,
    winnerId: match.winnerId || null, startedAt: match.startedAt || null, completedAt: match.completedAt || null,
    players: (match.players || []).map(player => ({
      userId: player.userId, seat: player.seat, submittedAt: player.submittedAt || null,
      verdict: player.verdict || null, ratingDelta: player.ratingDelta ?? null,
      user: player.user ? { nickname: player.user.nickname, avatarUrl: player.user.avatarUrl } : undefined
    }))
  };
}

export async function attachBattleSocket(server, prisma, {
  queue = new MatchmakingQueue(prisma), cors = {},
  allowedOrigins = Array.isArray(cors.origin) ? cors.origin : [],
  ServerClass, submissionCooldownMs = 1500, judge, notifier
} = {}) {
  const SocketServer = ServerClass || (await import('socket.io')).Server;
  const io = new SocketServer(server, {
    cors, serveClient: false, maxHttpBufferSize: 32 * 1024,
    allowRequest: (request, callback) => callback(null, originAllowed(request.headers?.origin, allowedOrigins))
  });

  const socketsByUser = new Map();
  const register = (userId, socket) => {
    if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
    socketsByUser.get(userId).add(socket);
  };
  const unregister = (userId, socket) => {
    const sockets = socketsByUser.get(userId);
    if (!sockets) return 0;
    sockets.delete(socket);
    if (!sockets.size) socketsByUser.delete(userId);
    return sockets.size;
  };
  const readSession = async token => {
    const session = await resolveAuthSession(prisma, token);
    return session;
  };

  io.use(async (socket, next) => {
    try {
      const session = await readSession(socket.handshake.auth?.token);
      if (!session) return next(new Error('UNAUTHORIZED'));
      socket.data.userId = session.userId;
      socket.data.sessionToken = socket.handshake.auth.token;
      return next();
    } catch { return next(new Error('UNAUTHORIZED')); }
  });

  const unsubscribe = notifier?.subscribe(event => {
    if (!event || typeof event !== 'object') return;
    if (event.type === 'battle:matched') {
      const match = publicMatch(event.match);
      if (!match) return;
      for (const player of match.players) io.to(USER_ROOM(player.userId)).emit('battle:matched', match);
      io.to(MATCH_ROOM(match.id)).emit('match:updated', { matchId: match.id, status: match.status });
    } else if (event.type === 'match:updated') {
      io.to(MATCH_ROOM(event.matchId)).emit('match:updated', {
        matchId: event.matchId, matchCompleted: Boolean(event.matchCompleted),
        winnerId: event.winnerId || null, verdict: event.verdict
      });
    } else if (event.type === 'battle:completed') {
      io.to(MATCH_ROOM(event.matchId)).emit('battle:completed', { matchId: event.matchId, winnerId: event.winnerId || null });
    }
  });

  io.on('connection', socket => {
    const userId = socket.data.userId;
    const token = socket.data.sessionToken;
    socket.join(USER_ROOM(userId));
    register(userId, socket);

    const disconnectInvalidSession = () => {
      socket.disconnect(true);
      if (unregister(userId, socket) === 0) {
        try { queue.leave(userId); } catch { /* Pairing owns its in-flight lock. */ }
      }
    };

    const guard = handler => async (...args) => {
      const ack = args[args.length - 1];
      let session;
      try {
        session = await readSession(token);
      } catch {
        safeAck(ack, { ok: false, code: 'SESSION_UNAVAILABLE', message: 'Session validation is temporarily unavailable' });
        disconnectInvalidSession();
        return;
      }
      if (!session || session.userId !== userId) {
        safeAck(ack, { ok: false, code: 'SESSION_INVALID', message: 'Session expired or revoked' });
        disconnectInvalidSession();
        return;
      }
      try {
        await handler(...args);
      } catch (error) {
        safeAck(ack, { ok: false, code: error.code || 'INTERNAL_ERROR', message: error.message || 'Battle action failed' });
      }
    };

    socket.on('ranked:join', guard(async (_payload, ack) => {
      const result = await queue.join(userId);
      if (result.status === 'MATCHED') {
        const match = publicMatch(result.match);
        if (notifier) notifier.publish({ type: 'battle:matched', match });
        else if (match) for (const player of match.players) io.to(USER_ROOM(player.userId)).emit('battle:matched', match);
      }
      safeAck(ack, { ok: true, ...result });
    }));
    socket.on('ranked:leave', guard(async (_payload, ack) =>
      safeAck(ack, { ok: true, ...queue.leave(userId) })));

    socket.on('match:watch', guard(async (payload = {}, ack) => {
      const matchId = payload?.matchId;
      if (typeof matchId !== 'string' || !matchId || matchId.length > 128) {
        safeAck(ack, { ok: false, code: 'INVALID_MATCH_ID' }); return;
      }
      const match = await getMatchForUser(prisma, matchId, userId);
      await socket.join(MATCH_ROOM(matchId));
      safeAck(ack, { ok: true, match: publicMatch(match) });
    }));

    socket.on('match:submit', guard(async (payload = {}, ack) => {
      const { matchId, code } = payload || {};
      if (typeof matchId !== 'string' || !matchId || matchId.length > CODE_LIMIT ||
          typeof code !== 'string' || code.length < 1 || code.length > CODE_LIMIT) {
        safeAck(ack, { ok: false, code: 'INVALID_INPUT', message: 'matchId and code are required; code limit is 20000 characters' });
        return;
      }
      const previous = USER_SUBMISSION_TIMES.get(userId) || 0;
      const now = Date.now();
      if (now - previous < submissionCooldownMs) {
        safeAck(ack, { ok: false, code: 'RATE_LIMITED', message: 'Please wait before submitting again' }); return;
      }
      USER_SUBMISSION_TIMES.set(userId, now);
      try {
        const result = await submitBattleSolution(prisma, { matchId, userId, sourceCode: code, judge });
        safeAck(ack, { ok: true, result });
        const update = {
          type: 'match:updated', matchId, matchCompleted: Boolean(result.matchCompleted),
          winnerId: result.winnerId || null, verdict: result.status
        };
        if (notifier) notifier.publish(update);
        else io.to(MATCH_ROOM(matchId)).emit('match:updated', {
          matchId, matchCompleted: update.matchCompleted, winnerId: update.winnerId, verdict: update.verdict
        });
        if (result.matchCompleted) {
          const completed = { type: 'battle:completed', matchId, winnerId: result.winnerId || null };
          if (notifier) notifier.publish(completed);
          else io.to(MATCH_ROOM(matchId)).emit('battle:completed', { matchId, winnerId: completed.winnerId });
        }
      } catch (error) {
        if (error.code === 'JUDGE_UNAVAILABLE' || error.status >= 500) USER_SUBMISSION_TIMES.delete(userId);
        throw error;
      }
    }));

    socket.on('disconnect', () => {
      if (unregister(userId, socket) === 0) {
        try { queue.leave(userId); } catch { /* Do not interfere with in-flight pairing. */ }
      }
    });
  });

  io.on('close', () => { if (typeof unsubscribe === 'function') unsubscribe(); });
  return io;
}
