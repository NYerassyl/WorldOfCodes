import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchmakingQueue } from '../src/battle/matchmaking.js';

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
