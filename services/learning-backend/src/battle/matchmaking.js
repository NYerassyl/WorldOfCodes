import { AppError } from '../lib/errors.js';
import { createMatch, newQueueTicket } from './service.js';

export const SEARCH_WINDOWS = Object.freeze([
  Object.freeze({ belowMs: 15_000, range: 100 }),
  Object.freeze({ belowMs: 30_000, range: 200 }),
  Object.freeze({ belowMs: 60_000, range: 400 }),
]);

export function searchWindow(waitedMs) {
  const waited = Number.isFinite(waitedMs) && waitedMs > 0 ? waitedMs : 0;
  for (const step of SEARCH_WINDOWS) if (waited < step.belowMs) return step.range;
  return Infinity;
}

/** Both players' current windows must cover the rating gap. */
export function pairWindow(left, right, now = Date.now()) {
  return Math.min(searchWindow(now - left.joinedAt), searchWindow(now - right.joinedAt));
}

export function canPair(left, right, now = Date.now()) {
  return Math.abs(left.rating - right.rating) <= pairWindow(left, right, now);
}

/** Nearest rating first; equal distance goes to the player who waited longest. */
export function bestOpponent(tickets, candidate, now = Date.now()) {
  return tickets
    .filter(ticket => ticket.userId !== candidate.userId && canPair(ticket, candidate, now))
    .sort((left, right) =>
      Math.abs(left.rating - candidate.rating) - Math.abs(right.rating - candidate.rating)
      || left.joinedAt - right.joinedAt
      || left.ticketId.localeCompare(right.ticketId))[0] || null;
}

export class MatchmakingQueue {
  constructor(prisma, { maxWaitMs = 10 * 60_000, validateUser } = {}) {
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

  async ratingOf(userId) {
    if (!this.prisma.rating?.findUnique) return 1000;
    const rating = await this.prisma.rating.findUnique({ where: { userId }, select: { points: true } });
    return Number.isInteger(rating?.points) ? rating.points : 1000;
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

    const now = Date.now();
    const candidate = newQueueTicket(userId, await this.ratingOf(userId));
    for (const ticket of [...this.waiting.values()]) {
      if (!(await this.validateUser(ticket.userId))) this.waiting.delete(ticket.ticketId);
    }
    const opponent = bestOpponent([...this.waiting.values()], candidate, now);
    if (!opponent) {
      this.waiting.set(candidate.ticketId, candidate);
      return { status: 'QUEUED', ticketId: candidate.ticketId };
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
      if (!this.waiting.has(opponent.ticketId) && this.restorable(opponent) &&
          await this.validateUser(opponent.userId).catch(() => false)) this.waiting.set(opponent.ticketId, opponent);
      throw error;
    } finally {
      this.pairingUsers.delete(opponent.userId);
      this.pairingUsers.delete(userId);
    }
  }

  /** Re-evaluates tickets already in the queue, without waiting for a new player to join. */
  async sweep(now = Date.now()) {
    this.prune(now);
    const matches = [];
    const tickets = [...this.waiting.values()]
      .sort((left, right) => left.joinedAt - right.joinedAt || left.ticketId.localeCompare(right.ticketId));
    for (const first of tickets) {
      if (!this.waiting.has(first.ticketId) || this.pairingUsers.has(first.userId)) continue;
      const pool = [...this.waiting.values()]
        .filter(ticket => ticket.ticketId !== first.ticketId && !this.pairingUsers.has(ticket.userId));
      const second = bestOpponent(pool, first, now);
      if (!second) continue;

      this.waiting.delete(first.ticketId);
      this.waiting.delete(second.ticketId);
      this.pairingUsers.add(first.userId);
      this.pairingUsers.add(second.userId);
      try {
        const [firstValid, secondValid] = await Promise.all([
          this.validateUser(first.userId), this.validateUser(second.userId)
        ]);
        if (!firstValid || !secondValid) {
          if (firstValid && this.restorable(first)) this.waiting.set(first.ticketId, first);
          if (secondValid && this.restorable(second)) this.waiting.set(second.ticketId, second);
          continue;
        }
        matches.push(await createMatch(this.prisma, { userIds: [first.userId, second.userId], type: 'RANKED' }));
      } catch {
        if (this.restorable(first) && await this.validateUser(first.userId).catch(() => false)) {
          this.waiting.set(first.ticketId, first);
        }
        if (this.restorable(second) && await this.validateUser(second.userId).catch(() => false)) {
          this.waiting.set(second.ticketId, second);
        }
      } finally {
        this.pairingUsers.delete(first.userId);
        this.pairingUsers.delete(second.userId);
      }
    }
    return matches;
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

  restorable(ticket) {
    return ticket.joinedAt >= Date.now() - this.maxWaitMs;
  }

  prune(now = Date.now()) {
    const cutoff = now - this.maxWaitMs;
    for (const [id, ticket] of this.waiting) if (ticket.joinedAt < cutoff) this.waiting.delete(id);
  }
}
