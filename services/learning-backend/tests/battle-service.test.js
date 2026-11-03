import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, createFriendlyInvite, joinFriendlyInvite } from '../src/battle/service.js';

function problemMocks() {
  return {
    problem: {
      findMany: async () => [{ id: 'problem-1' }],
      findFirst: async () => ({
        id: 'problem-1', language: 'python', functionName: 'solve',
        testCases: [{ argsJson: '[]', expectedJson: '0' }]
      })
    }
  };
}

test('ranked match starts ACTIVE and initializes both ratings in one transaction', async () => {
  const calls = { ratings: [], match: null, isolation: null };
  const prisma = {
    ...problemMocks(),
    $transaction: async (callback, options) => {
      calls.isolation = options?.isolationLevel;
      return callback({
        rating: { upsert: async args => { calls.ratings.push(args.where.userId); return { points: 1000 }; } },
        match: { create: async args => { calls.match = args.data; return { id: 'ranked-1', ...args.data }; } }
      });
    }
  };

  await createMatch(prisma, { userIds: ['user-a', 'user-b'], problemId: 'problem-1' });
  assert.deepEqual(calls.ratings.sort(), ['user-a', 'user-b']);
  assert.equal(calls.match.type, 'RANKED');
  assert.equal(calls.match.status, 'ACTIVE');
  assert.ok(calls.match.startedAt instanceof Date);
  assert.equal(calls.isolation, 'Serializable');
  assert.deepEqual(calls.match.players.create.map(p => p.seat), [0, 1]);
});

test('ranked match rejects duplicate players and non-ranked types', async () => {
  const prisma = problemMocks();
  await assert.rejects(
    createMatch(prisma, { userIds: ['same', 'same'], problemId: 'problem-1' }),
    error => error.code === 'INVALID_PLAYERS'
  );
  await assert.rejects(
    createMatch(prisma, { userIds: ['a', 'b'], type: 'FRIENDLY', problemId: 'problem-1' }),
    error => error.code === 'INVALID_MATCH_TYPE'
  );
});

test('friendly invite creates a PENDING one-player match', async () => {
  const calls = { match: null, invite: null, isolation: null };
  const prisma = {
    ...problemMocks(),
    $transaction: async (callback, options) => {
      calls.isolation = options?.isolationLevel;
      return callback({
        match: { create: async args => { calls.match = args.data; return { id: 'friendly-1' }; } },
        friendBattle: { create: async args => { calls.invite = args.data; return args.data; } }
      });
    }
  };

  const result = await createFriendlyInvite(prisma, 'creator');
  assert.equal(calls.match.type, 'FRIENDLY');
  assert.equal(calls.match.status, 'PENDING');
  assert.equal(calls.match.startedAt, null);
  assert.deepEqual(calls.match.players.create, [{ userId: 'creator', seat: 0 }]);
  assert.equal(calls.invite.matchId, result.matchId);
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(result.expiresInSeconds, 1800);
});

test('joining a friendly invite adds seat 1 and atomically activates the match', async () => {
  const calls = { player: null, matchUpdate: null, deletedInvite: null, isolation: null };
  const invite = {
    id: 'invite-1', inviteCode: 'ABC123', matchId: 'friendly-1', createdById: 'creator',
    expiresAt: new Date(Date.now() + 60_000),
    match: { type: 'FRIENDLY', status: 'PENDING', players: [{ userId: 'creator', seat: 0 }] }
  };
  const prisma = {
    $transaction: async (callback, options) => {
      calls.isolation = options?.isolationLevel;
      return callback({
        friendBattle: {
          findUnique: async () => invite,
          delete: async args => { calls.deletedInvite = args.where.id; }
        },
        matchPlayer: { create: async args => { calls.player = args.data; } },
        match: {
          updateMany: async args => { calls.matchUpdate = args; return { count: 1 }; },
          findUnique: async () => ({ id: 'friendly-1', status: 'ACTIVE', type: 'FRIENDLY' })
        }
      });
    }
  };

  const match = await joinFriendlyInvite(prisma, 'guest', 'abc123');
  assert.deepEqual(calls.player, { matchId: 'friendly-1', userId: 'guest', seat: 1 });
  assert.equal(calls.matchUpdate.where.status, 'PENDING');
  assert.equal(calls.matchUpdate.data.status, 'ACTIVE');
  assert.ok(calls.matchUpdate.data.startedAt instanceof Date);
  assert.equal(calls.deletedInvite, 'invite-1');
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(match.status, 'ACTIVE');
});

test('friendly invite cannot be joined by its creator or after expiry', async () => {
  const baseInvite = {
    id: 'invite-1', matchId: 'friendly-1', createdById: 'creator',
    expiresAt: new Date(Date.now() + 60_000),
    match: { type: 'FRIENDLY', status: 'PENDING', players: [{ userId: 'creator', seat: 0 }] }
  };
  const makePrisma = invite => ({
    $transaction: callback => callback({
      friendBattle: { findUnique: async () => invite },
      matchPlayer: { create: async () => assert.fail('must not add player') },
      match: { updateMany: async () => assert.fail('must not activate') }
    })
  });

  await assert.rejects(
    joinFriendlyInvite(makePrisma(baseInvite), 'creator', 'invite-code'),
    error => error.code === 'CANNOT_JOIN_OWN_INVITE'
  );
  await assert.rejects(
    joinFriendlyInvite(makePrisma({ ...baseInvite, expiresAt: new Date(Date.now() - 1) }), 'guest', 'invite-code'),
    error => error.code === 'INVITE_NOT_FOUND'
  );
});
