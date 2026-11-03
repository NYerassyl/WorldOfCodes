import { Server } from 'socket.io';
import { hashSessionToken } from '../lib/security.js';
import { MatchmakingQueue } from './matchmaking.js';
import { getMatchForUser } from './service.js';

/** Attach to the shared HTTP server. Socket payloads never contain hidden tests or judge inputs. */
export function attachBattleSocket(server, prisma, { queue = new MatchmakingQueue(prisma), cors = {} } = {}) {
  const io = new Server(server, { cors, serveClient: false, maxHttpBufferSize: 16 * 1024 });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) return next(new Error('UNAUTHORIZED'));
      const session = await prisma.authSession.findUnique({ where: { tokenHash: hashSessionToken(token) }, select: { id: true, userId: true, expiresAt: true, revokedAt: true } });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) return next(new Error('UNAUTHORIZED'));
      socket.data.userId = session.userId;
      next();
    } catch { next(new Error('UNAUTHORIZED')); }
  });
  io.on('connection', socket => {
    socket.on('ranked:join', async (_payload, ack = () => {}) => {
      try {
        const result = await queue.join(socket.data.userId);
        if (result.status === 'MATCHED') {
          const room = `match:${result.match.id}`;
          // Queue pairing may have been initiated by another socket; notify both by user room.
          io.to(`user:${result.match.players[0].userId}`).emit('battle:matched', result.match);
          io.to(`user:${result.match.players[1].userId}`).emit('battle:matched', result.match);
        }
        ack({ ok: true, ...result });
      } catch (error) { ack({ ok: false, code: error.code || 'QUEUE_FAILED', message: error.message }); }
    });
    socket.on('ranked:leave', (_payload, ack = () => {}) => ack({ ok: true, ...queue.leave(socket.data.userId) }));
    socket.on('match:watch', async ({ matchId } = {}, ack = () => {}) => {
      try {
        const match = await getMatchForUser(prisma, matchId, socket.data.userId);
        await socket.join(`match:${matchId}`);
        ack({ ok: true, match });
      } catch (error) { ack({ ok: false, code: error.code || 'BATTLE_NOT_FOUND' }); }
    });
    socket.join(`user:${socket.data.userId}`);
    socket.on('disconnect', () => queue.leave(socket.data.userId));
  });
  return io;
}
