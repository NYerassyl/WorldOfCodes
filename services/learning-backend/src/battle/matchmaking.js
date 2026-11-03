import { AppError } from '../lib/errors.js';
import { createMatch, newQueueTicket } from './service.js';

/** Single-process MVP queue. Replace with Redis/advisory-lock matchmaking before horizontal scaling. */
export class MatchmakingQueue {
  constructor(prisma, { maxWaitMs = 60_000 } = {}) {
    this.prisma = prisma;
    this.maxWaitMs = maxWaitMs;
    this.waiting = new Map();
    this.pairingUsers = new Set();
  }
  async join(userId) {
    this.prune();
    if (this.pairingUsers.has(userId)) {
      throw new AppError(409, 'MATCHMAKING_IN_PROGRESS', 'Your match is being created');
    }
    if ([...this.waiting.values()].some(ticket => ticket.userId === userId)) {
      throw new AppError(409, 'ALREADY_QUEUED', 'You are already waiting for an opponent');
    }
    const opponent = [...this.waiting.values()].find(ticket => ticket.userId !== userId);
    if (!opponent) {
      const ticket = newQueueTicket(userId);
      this.waiting.set(ticket.ticketId, ticket);
      return { status: 'QUEUED', ticketId: ticket.ticketId };
    }
    this.waiting.delete(opponent.ticketId);
    this.pairingUsers.add(opponent.userId);
    this.pairingUsers.add(userId);
    try {
      const match = await createMatch(this.prisma, { userIds: [opponent.userId, userId], type: 'RANKED' });
      return { status: 'MATCHED', match };
    } catch (error) {
      // Restore the original ticket only if it has not expired while pairing.
      if (opponent.joinedAt >= Date.now() - this.maxWaitMs) this.waiting.set(opponent.ticketId, opponent);
      throw error;
    } finally {
      this.pairingUsers.delete(opponent.userId);
      this.pairingUsers.delete(userId);
    }
  }
  leave(userId) {
    if (this.pairingUsers.has(userId)) {
      throw new AppError(409, 'MATCHMAKING_IN_PROGRESS', 'A match is already being created');
    }
    for (const [id, ticket] of this.waiting) if (ticket.userId === userId) this.waiting.delete(id);
    return { status: 'LEFT_QUEUE' };
  }
  prune() {
    const cutoff = Date.now() - this.maxWaitMs;
    for (const [id, ticket] of this.waiting) if (ticket.joinedAt < cutoff) this.waiting.delete(id);
  }
}
