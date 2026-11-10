import { AppError } from '../lib/errors.js';
import { createMatch, newQueueTicket } from './service.js';

export class MatchmakingQueue {
  constructor(prisma, { maxWaitMs = 60_000, validateUser } = {}) {
    this.prisma = prisma;
    this.maxWaitMs = maxWaitMs;
    this.validateUser = validateUser || (async userId => {
      if (!prisma.authSession?.findFirst) return true;
      const session = await prisma.authSession.findFirst({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true }
      });
      return Boolean(session);
    });
    this.waiting = new Map();
    this.pairingUsers = new Set();
  }

  async join(userId) {
    this.prune();
    if (this.pairingUsers.has(userId)) throw new AppError(409, 'MATCHMAKING_IN_PROGRESS', 'Your match is being created');
    if (!(await this.validateUser(userId))) {
      this.leave(userId);
      throw new AppError(401, 'SESSION_INVALID', 'An active session is required');
    }
    if ([...this.waiting.values()].some(ticket => ticket.userId === userId)) {
      throw new AppError(409, 'ALREADY_QUEUED', 'You are already waiting for an opponent');
    }

    let opponent;
    for (const ticket of this.waiting.values()) {
      if (ticket.userId === userId) continue;
      if (await this.validateUser(ticket.userId)) { opponent = ticket; break; }
      this.waiting.delete(ticket.ticketId);
    }
    if (!opponent) {
      const ticket = newQueueTicket(userId);
      this.waiting.set(ticket.ticketId, ticket);
      return { status: 'QUEUED', ticketId: ticket.ticketId };
    }

    this.waiting.delete(opponent.ticketId);
    this.pairingUsers.add(opponent.userId);
    this.pairingUsers.add(userId);
    try {
      const [joiningValid, waitingValid] = await Promise.all([
        this.validateUser(userId), this.validateUser(opponent.userId)
      ]);
      if (!joiningValid) throw new AppError(401, 'SESSION_INVALID', 'An active session is required');
      if (!waitingValid) throw new AppError(409, 'OPPONENT_SESSION_INVALID', 'The waiting player session is no longer active');
      const match = await createMatch(this.prisma, { userIds: [opponent.userId, userId], type: 'RANKED' });
      return { status: 'MATCHED', match };
    } catch (error) {
      if (opponent.joinedAt >= Date.now() - this.maxWaitMs &&
          await this.validateUser(opponent.userId).catch(() => false)) this.waiting.set(opponent.ticketId, opponent);
      throw error;
    } finally {
      this.pairingUsers.delete(opponent.userId);
      this.pairingUsers.delete(userId);
    }
  }

  leave(userId) {
    if (this.pairingUsers.has(userId)) throw new AppError(409, 'MATCHMAKING_IN_PROGRESS', 'A match is already being created');
    for (const [id, ticket] of this.waiting) if (ticket.userId === userId) this.waiting.delete(id);
    return { status: 'LEFT_QUEUE' };
  }


  getStatus(userId) {
    this.prune();
    if (this.pairingUsers.has(userId)) return { status: 'MATCHMAKING' };
    const entries = [...this.waiting.entries()];
    const index = entries.findIndex(([, ticket]) => ticket.userId === userId);
    if (index < 0) return { status: 'NOT_QUEUED' };
    const [ticketId, ticket] = entries[index];
    return { status: 'QUEUED', ticketId, position: index + 1, joinedAt: new Date(ticket.joinedAt).toISOString() };
  }

  prune() {
    const cutoff = Date.now() - this.maxWaitMs;
    for (const [id, ticket] of this.waiting) if (ticket.joinedAt < cutoff) this.waiting.delete(id);
  }
}
