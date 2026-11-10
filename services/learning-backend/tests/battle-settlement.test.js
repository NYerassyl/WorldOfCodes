import test from 'node:test';
import assert from 'node:assert/strict';
import { submitBattleSolution } from '../src/battle/service.js';

function createSubmitPrisma({ type = 'RANKED', alreadyCompleted = false } = {}) {
  const state = {
    matchStatus: alreadyCompleted ? 'COMPLETED' : 'ACTIVE',
    winnerId: alreadyCompleted ? 'player-b' : null,
    ratings: { 'player-a': 1000, 'player-b': 1000 },
    ratingUpdates: [], playerUpdates: [], matchUpdates: 0, transactions: 0
  };
  const players = [
    { userId: 'player-a', seat: 0, submittedAt: null },
    { userId: 'player-b', seat: 1, submittedAt: null }
  ];
  const matchSnapshot = () => ({ id: 'match-1', type, status: state.matchStatus, problemId: 'problem-1', players });
  const prisma = {
    state,
    match: {
      findFirst: async () => state.matchStatus === 'ACTIVE' ? matchSnapshot() : null,
      findUnique: async ({ include }) => include ? matchSnapshot() : { status: state.matchStatus, winnerId: state.winnerId }
    },
    problem: {
      findFirst: async () => ({
        id: 'problem-1', language: 'python', functionName: 'solve',
        testCases: [{ argsJson: '[]', expectedJson: '1' }]
      })
    },
    $transaction: async callback => {
      state.transactions++;
      return callback({
        match: {
          findUnique: async () => matchSnapshot(),
          updateMany: async ({ where, data }) => {
            if (state.matchStatus !== where.status || (where.type && matchSnapshot().type !== where.type)) return { count: 0 };
            state.matchStatus = data.status; state.winnerId = data.winnerId; state.matchUpdates++;
            return { count: 1 };
          }
        },
        matchPlayer: {
          updateMany: async ({ where }) => {
            const player = players.find(item => item.userId === where.userId);
            if (!player || player.submittedAt) return { count: 0 };
            player.submittedAt = new Date(); player.verdict = 'ACCEPTED'; state.playerUpdates.push(where.userId);
            return { count: 1 };
          },
          update: async ({ where, data }) => { state.playerUpdates.push(where.matchId_userId.userId); return data; }
        },
        rating: {
          upsert: async ({ where }) => ({ userId: where.userId, points: state.ratings[where.userId] }),
          update: async ({ where, data }) => {
            const points = data.points.increment;
            state.ratings[where.userId] += points;
            state.ratingUpdates.push({ userId: where.userId, points, wins: data.wins?.increment || 0, losses: data.losses?.increment || 0 });
            return { userId: where.userId };
          }
        }
      });
    }
  };
  return prisma;
}

test('ranked accepted solution completes match and applies Elo exactly once', async () => {
  const prisma = createSubmitPrisma();
  const result = await submitBattleSolution(prisma, {
    matchId: 'match-1', userId: 'player-a', sourceCode: 'def solve(): return 1',
    judge: async () => ({ status: 'ACCEPTED', passedCases: 1, totalCases: 1 })
  });
  assert.equal(result.matchCompleted, true);
  assert.equal(result.winnerId, 'player-a');
  assert.equal(result.settled, true);
  assert.equal(prisma.state.matchStatus, 'COMPLETED');
  assert.deepEqual(prisma.state.ratingUpdates.map(item => item.points), [16, -16]);
  assert.equal(prisma.state.ratingUpdates[0].wins, 1);
  assert.equal(prisma.state.ratingUpdates[1].losses, 1);
  assert.equal(prisma.state.transactions, 1);
});

test('friendly accepted solution completes match without touching Elo ratings', async () => {
  const prisma = createSubmitPrisma({ type: 'FRIENDLY' });
  const result = await submitBattleSolution(prisma, {
    matchId: 'match-1', userId: 'player-b', sourceCode: 'def solve(): return 1',
    judge: async () => ({ status: 'ACCEPTED', passedCases: 1, totalCases: 1 })
  });
  assert.equal(result.matchCompleted, true);
  assert.equal(result.winnerId, 'player-b');
  assert.deepEqual(prisma.state.ratingUpdates, []);
  assert.equal(prisma.state.matchStatus, 'COMPLETED');
});

test('judge infrastructure failure does not create a winner or start settlement', async () => {
  const prisma = createSubmitPrisma();
  await assert.rejects(submitBattleSolution(prisma, {
    matchId: 'match-1', userId: 'player-a', sourceCode: 'def solve(): return 1',
    judge: async () => { throw Object.assign(new Error('Docker unavailable'), { code: 'JUDGE_UNAVAILABLE' }); }
  }), /Docker unavailable/);
  assert.equal(prisma.state.transactions, 0);
  assert.equal(prisma.state.matchStatus, 'ACTIVE');
  assert.deepEqual(prisma.state.ratingUpdates, []);
});

test('a completed match rejects another submission without settling again', async () => {
  const prisma = createSubmitPrisma({ alreadyCompleted: true });
  await assert.rejects(
    submitBattleSolution(prisma, {
      matchId: 'match-1', userId: 'player-a', sourceCode: 'def solve(): return 1',
      judge: async () => ({ status: 'ACCEPTED', passedCases: 1, totalCases: 1 })
    }),
    error => error.code === 'ACTIVE_MATCH_NOT_FOUND'
  );
  assert.equal(prisma.state.transactions, 0);
  assert.deepEqual(prisma.state.ratingUpdates, []);
});
