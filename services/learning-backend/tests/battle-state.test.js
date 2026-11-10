import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchmakingQueue } from '../src/battle/matchmaking.js';
import { createBattleRouter } from '../src/battle/router.js';
import { getActiveMatchForUser } from '../src/battle/service.js';

function routeHandler(router, method, path) {
  const layer = router.stack.find(item => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `Missing route ${method.toUpperCase()} ${path}`);
  // Protected Express routes register auth middleware before the async handler.
  return layer.route.stack.at(-1).handle;
}

async function readBattleState({ prisma, queue, userId = 'player-1' }) {
  const router = createBattleRouter(prisma, (_req, _res, next) => next(), { queue });
  const handler = routeHandler(router, 'get', '/battle/state');
  let response;
  await handler({ auth: { userId } }, {
    json(payload) { response = payload; return this; }
  }, error => { throw error; });
  return response;
}

test('queue state reports queued ticket, position, and not-queued state', () => {
  const queue = new MatchmakingQueue({});
  const first = { userId: 'player-1', ticketId: 'ticket-1', joinedAt: Date.now() };
  const second = { userId: 'player-2', ticketId: 'ticket-2', joinedAt: Date.now() + 1 };
  queue.waiting.set(first.ticketId, first);
  queue.waiting.set(second.ticketId, second);
  assert.deepEqual(queue.getStatus('player-1'), {
    status: 'QUEUED', ticketId: first.ticketId, position: 1,
    joinedAt: new Date(first.joinedAt).toISOString()
  });
  assert.deepEqual(queue.getStatus('player-2'), {
    status: 'QUEUED', ticketId: second.ticketId, position: 2,
    joinedAt: new Date(second.joinedAt).toISOString()
  });
  assert.deepEqual(queue.getStatus('player-3'), { status: 'NOT_QUEUED' });
  queue.leave('player-1');
  assert.equal(queue.getStatus('player-1').status, 'NOT_QUEUED');
  assert.equal(queue.getStatus('player-2').position, 1);
});

test('queue state exposes MATCHMAKING while a pair is being created', () => {
  const queue = new MatchmakingQueue({});
  queue.pairingUsers.add('player-1');
  assert.deepEqual(queue.getStatus('player-1'), { status: 'MATCHMAKING' });
});

test('active match recovery is scoped to the authenticated participant', async () => {
  const expected = { id: 'match-1', status: 'ACTIVE', players: [{ userId: 'player-1' }] };
  let query;
  const result = await getActiveMatchForUser({
    match: { findFirst: async args => { query = args; return expected; } }
  }, 'player-1');
  assert.equal(result, expected);
  assert.deepEqual(query.where, { status: 'ACTIVE', players: { some: { userId: 'player-1' } } });
  assert.equal(query.orderBy.startedAt, 'desc');
});

test('re-entering Battle restores the waiting queue ticket and position', async () => {
  const queue = new MatchmakingQueue({});
  const ticket = { userId: 'player-1', ticketId: 'ticket-state', joinedAt: Date.now() };
  queue.waiting.set(ticket.ticketId, ticket);
  const prisma = { match: { findFirst: async () => null } };

  // Simulate a fresh page load/reconnect: the client asks the recovery endpoint again.
  const state = await readBattleState({ prisma, queue });
  assert.equal(state.match, null);
  assert.deepEqual(state.queue, {
    status: 'QUEUED',
    ticketId: ticket.ticketId,
    position: 1,
    joinedAt: new Date(ticket.joinedAt).toISOString()
  });
});

test('re-entering Battle restores the active match from the database', async () => {
  const activeMatch = {
    id: 'match-active-1',
    status: 'ACTIVE',
    players: [{ userId: 'player-1' }, { userId: 'player-2' }]
  };
  // Queue is empty: the active match must be recovered from persistent DB state.
  const queue = new MatchmakingQueue({});
  const prisma = {
    match: {
      findFirst: async args => {
        assert.deepEqual(args.where, {
          status: 'ACTIVE',
          players: { some: { userId: 'player-1' } }
        });
        return activeMatch;
      }
    }
  };

  const state = await readBattleState({ prisma, queue });
  assert.deepEqual(state.match, activeMatch);
  assert.deepEqual(state.queue, { status: 'NOT_QUEUED' });
});
