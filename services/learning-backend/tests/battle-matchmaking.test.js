import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MatchmakingQueue, bestOpponent, canPair, pairWindow, searchWindow,
} from '../src/battle/matchmaking.js';

test('ranked queue rejects duplicate tickets and supports leaving', async () => {
  const queue = new MatchmakingQueue({});
  const queued = await queue.join('player-1');
  assert.equal(queued.status, 'QUEUED');
  await assert.rejects(queue.join('player-1'), error => error.code === 'ALREADY_QUEUED');
  assert.deepEqual(queue.leave('player-1'), { status: 'LEFT_QUEUE' });
  assert.equal(queue.waiting.size, 0);
});

test('ranked queue blocks a player from rejoining while a pair is being created', async () => {
  let releaseProblem;
  const problemGate = new Promise(resolve => { releaseProblem = resolve; });
  const prisma = {
    problem: {
      findMany: async () => [{ id: 'problem-1' }],
      findFirst: async () => {
        await problemGate;
        return { id: 'problem-1', language: 'python', functionName: 'solve',
          testCases: [{ argsJson: '[]', expectedJson: '0' }] };
      }
    },
    $transaction: async callback => callback({
      rating: { upsert: async ({ where }) => ({ userId: where.userId, points: 1000 }) },
      match: { create: async ({ data }) => ({ id: 'ranked-1', ...data }) }
    })
  };
  const queue = new MatchmakingQueue(prisma);
  await queue.join('player-1');
  const pairing = queue.join('player-2');
  await new Promise(resolve => setImmediate(resolve));

  await assert.rejects(queue.join('player-2'), error => error.code === 'MATCHMAKING_IN_PROGRESS');
  assert.throws(() => queue.leave('player-2'), error => error.code === 'MATCHMAKING_IN_PROGRESS');

  releaseProblem();
  const result = await pairing;
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.match.status, 'ACTIVE');
  assert.equal(queue.pairingUsers.size, 0);
});


test('ranked pairing drops a waiting ticket whose session is no longer valid', async () => {
  const validUsers = new Set(['player-2']);
  const prisma = {
    problem: {
      findMany: async () => [{ id: 'problem-1' }],
      findFirst: async () => ({ id: 'problem-1', language: 'python', functionName: 'solve',
        testCases: [{ argsJson: '[]', expectedJson: '0' }] })
    },
    $transaction: async callback => callback({
      rating: { upsert: async ({ where }) => ({ userId: where.userId, points: 1000 }) },
      match: { create: async ({ data }) => ({ id: 'ranked-valid', ...data }) }
    })
  };
  const queue = new MatchmakingQueue(prisma, { validateUser: async userId => validUsers.has(userId) });
  validUsers.add('player-1');
  await queue.join('player-1');
  validUsers.delete('player-1');
  const result = await queue.join('player-2');
  assert.equal(result.status, 'QUEUED');
  assert.equal(queue.waiting.size, 1);
  assert.equal([...queue.waiting.values()][0].userId, 'player-2');
});

test('search windows widen at 15, 30 and 60 seconds', () => {
  assert.equal(searchWindow(0), 100);
  assert.equal(searchWindow(14_999), 100);
  assert.equal(searchWindow(15_000), 200);
  assert.equal(searchWindow(29_999), 200);
  assert.equal(searchWindow(30_000), 400);
  assert.equal(searchWindow(59_999), 400);
  assert.equal(searchWindow(60_000), Infinity);
  assert.equal(searchWindow(600_000), Infinity);
});

test('both players windows must cover the rating gap', () => {
  const now = 1_000_000;
  const fresh = { userId: 'c', rating: 1000, joinedAt: now, ticketId: 'c' };
  const waited20 = { userId: 'a', rating: 1200, joinedAt: now - 20_000, ticketId: 'a' };
  assert.equal(pairWindow(waited20, fresh, now), 100);
  assert.equal(canPair(waited20, fresh, now), false);
  const bothWaited20 = { ...fresh, joinedAt: now - 20_000 };
  assert.equal(canPair(waited20, bothWaited20, now), true);
  const longA = { userId: 'a', rating: 1900, joinedAt: now - 70_000, ticketId: 'a' };
  const longB = { userId: 'b', rating: 1000, joinedAt: now - 65_000, ticketId: 'b' };
  assert.equal(canPair(longA, longB, now), true);
});

test('nearest rating wins and an equal gap goes to the longest wait', () => {
  const now = 1_000_000;
  const candidate = { userId: 'me', rating: 1000, joinedAt: now, ticketId: 'me' };
  const tickets = [
    { userId: 'far', rating: 1040, joinedAt: now - 1_000, ticketId: 'far' },
    { userId: 'recent-near', rating: 1030, joinedAt: now - 20_000, ticketId: 'recent-near' },
    { userId: 'waiting-near', rating: 1030, joinedAt: now - 40_000, ticketId: 'waiting-near' },
    { userId: 'elite', rating: 1400, joinedAt: now - 70_000, ticketId: 'elite' },
  ];
  assert.equal(bestOpponent(tickets, candidate, now).userId, 'waiting-near');
});

test('pairing prefers the closest eligible rating over a distant ticket', async () => {
  const ratings = { elite: 1300, close: 1040, joining: 1000 };
  const prisma = {
    rating: { findUnique: async ({ where }) => ({ points: ratings[where.userId] }) },
    problem: {
      findMany: async () => [{ id: 'problem-1' }],
      findFirst: async () => ({ id: 'problem-1', language: 'python', functionName: 'solve',
        testCases: [{ argsJson: '[]', expectedJson: '0' }] })
    },
    $transaction: async callback => callback({
      rating: { upsert: async ({ where }) => ({ userId: where.userId, points: ratings[where.userId] }) },
      match: { create: async ({ data }) => ({ id: 'ranked-near', ...data }) }
    })
  };
  const queue = new MatchmakingQueue(prisma);
  assert.equal((await queue.join('elite')).status, 'QUEUED');
  assert.equal((await queue.join('close')).status, 'QUEUED');
  const result = await queue.join('joining');
  assert.equal(result.status, 'MATCHED');
  assert.deepEqual(result.match.players.create.map(player => player.userId), ['close', 'joining']);
  assert.equal(queue.waiting.size, 1);
  assert.equal([...queue.waiting.values()][0].userId, 'elite');
});
