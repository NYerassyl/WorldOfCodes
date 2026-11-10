import test from 'node:test';
import assert from 'node:assert/strict';
import { attachBattleSocket } from '../src/battle/socket.js';
import { hashSessionToken } from '../src/lib/security.js';

class FakeSocketServer {
  static instance;
  constructor(server, options) {
    this.server = server;
    this.options = options;
    this.middleware = null;
    this.connectionHandler = null;
    this.rooms = [];
    this.emitted = [];
    FakeSocketServer.instance = this;
  }
  use(fn) { this.middleware = fn; }
  on(event, fn) { if (event === 'connection') this.connectionHandler = fn; }
  to(room) {
    return { emit: (event, payload) => this.emitted.push({ room, event, payload }) };
  }
  async connect(token, userId = 'player-1') {
    const socket = {
      handshake: { auth: { token } },
      data: {},
      handlers: {},
      joined: [],
      on(event, fn) { this.handlers[event] = fn; },
      async join(room) { this.joined.push(room); },
      async trigger(event, ...args) { return this.handlers[event](...args); }
    };
    await new Promise((resolve, reject) => {
      this.middleware(socket, error => error ? reject(error) : resolve());
    });
    socket.data.userId = userId;
    this.connectionHandler(socket);
    return socket;
  }
}

const validToken = 'A'.repeat(43);
const session = {
  id: 'session-1', userId: 'player-1',
  expiresAt: new Date(Date.now() + 60_000), revokedAt: null
};

test('Socket.IO authenticates sessions and rejects expired or revoked sessions', async () => {
  const prisma = {
    authSession: { findUnique: async ({ where }) => {
      assert.equal(where.tokenHash, hashSessionToken(validToken));
      return session;
    } }
  };
  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer });
  const io = FakeSocketServer.instance;
  const socket = await io.connect(validToken);
  assert.equal(socket.data.userId, 'player-1');

  const expiredPrisma = {
    authSession: { findUnique: async () => ({ ...session, expiresAt: new Date(Date.now() - 1) }) }
  };
  await attachBattleSocket({}, expiredPrisma, { ServerClass: FakeSocketServer });
  await assert.rejects(FakeSocketServer.instance.connect(validToken), /UNAUTHORIZED/);
});

test('Socket.IO ranked matchmaking emits the match to both authenticated user rooms', async () => {
  const match = {
    id: 'ranked-1', type: 'RANKED', status: 'ACTIVE', problemId: 'p1',
    players: [{ userId: 'player-1', seat: 0 }, { userId: 'player-2', seat: 1 }]
  };
  const queue = { join: async () => ({ status: 'MATCHED', match }), leave: () => ({ status: 'LEFT_QUEUE' }) };
  const prisma = { authSession: { findUnique: async () => session } };
  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer, queue });
  const io = FakeSocketServer.instance;
  const socket = await io.connect(validToken);
  let ack;
  await socket.trigger('ranked:join', {}, result => { ack = result; });

  assert.equal(ack.ok, true);
  assert.equal(ack.status, 'MATCHED');
  assert.equal(io.emitted.length, 2);
  assert.deepEqual(io.emitted.map(item => item.room).sort(), ['user:player-1', 'user:player-2']);
  assert.ok(io.emitted.every(item => item.event === 'battle:matched'));
  assert.ok(io.emitted.every(item => !('testCases' in item.payload)));
});

test('Socket.IO watches only participant matches and broadcasts friendly completion', async () => {
  let status = 'ACTIVE';
  const match = {
    id: 'friendly-1', type: 'FRIENDLY', status: 'ACTIVE', problemId: 'problem-1',
    players: [{ userId: 'player-1', seat: 0 }, { userId: 'player-2', seat: 1 }]
  };
  const prisma = {
    authSession: { findUnique: async () => session },
    match: {
      findFirst: async () => match,
      findUnique: async ({ include }) => include
        ? { ...match, status }
        : { status, winnerId: 'player-1' }
    },
    problem: { findFirst: async () => ({
      id: 'problem-1', language: 'python', functionName: 'solve',
      testCases: [{ argsJson: '[]', expectedJson: '1' }]
    }) },
    $transaction: async callback => callback({
      match: {
        findUnique: async () => ({ ...match, status }),
        updateMany: async () => { status = 'COMPLETED'; return { count: 1 }; }
      },
      matchPlayer: { updateMany: async () => ({ count: 1 }) }
    })
  };
  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer, submissionCooldownMs: 0, judge: async () => ({ status: 'ACCEPTED', passedCases: 1, totalCases: 1 }) });
  const io = FakeSocketServer.instance;
  const socket = await io.connect(validToken);
  let watchAck;
  await socket.trigger('match:watch', { matchId: 'friendly-1' }, result => { watchAck = result; });
  assert.equal(watchAck.ok, true);
  assert.ok(socket.joined.includes('match:friendly-1'));

  let submitAck;
  await socket.trigger('match:submit', { matchId: 'friendly-1', code: 'def solve(): return 1' }, result => { submitAck = result; });
  assert.equal(submitAck.ok, true);
  assert.equal(submitAck.result.matchCompleted, true);
  assert.ok(io.emitted.some(item => item.event === 'match:updated'));
  assert.ok(io.emitted.some(item => item.event === 'battle:completed'));
});


test('protected socket events revalidate revoked sessions and remove the last tab from queue', async () => {
  const mutableSession = { ...session, revokedAt: null };
  let leaveCalls = 0;
  const queue = {
    join: async () => ({ status: 'QUEUED', ticketId: 'ticket-1' }),
    leave: () => { leaveCalls += 1; return { status: 'LEFT_QUEUE' }; }
  };
  const prisma = { authSession: { findUnique: async () => mutableSession } };
  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer, queue });
  const socket = await FakeSocketServer.instance.connect(validToken);
  socket.disconnected = false;
  socket.disconnect = () => { socket.disconnected = true; };
  mutableSession.revokedAt = new Date();

  let ack;
  await socket.trigger('ranked:join', {}, result => { ack = result; });
  assert.equal(ack.ok, false);
  assert.equal(ack.code, 'SESSION_INVALID');
  assert.equal(socket.disconnected, true);
  assert.equal(leaveCalls, 1);
});



test('Socket.IO transport limit accepts max-code ASCII JSON and rejects multibyte overflow', async () => {
  const prisma = { authSession: { findUnique: async () => session } };
  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer });
  const limit = FakeSocketServer.instance.options.maxHttpBufferSize;
  assert.equal(limit, 32 * 1024);
  const maxCodeAscii = JSON.stringify({ matchId: 'm', code: 'a'.repeat(20_000) });
  const maxCodeUtf8 = JSON.stringify({ matchId: 'm', code: 'é'.repeat(20_000) });
  const transportOverflow = JSON.stringify({ matchId: 'm', code: 'é'.repeat(17_000) });
  assert.ok(Buffer.byteLength(maxCodeAscii, 'utf8') < limit);
  assert.ok(Buffer.byteLength(maxCodeUtf8, 'utf8') > limit);
  assert.ok(Buffer.byteLength(transportOverflow, 'utf8') > limit);
});


test('match:submit rejects oversized match IDs without consuming the submission cooldown', async () => {
  let matchLookupCalls = 0;
  const prisma = {
    authSession: { findUnique: async () => ({ ...session, userId: 'player-regression' }) },
    match: {
      findFirst: async () => {
        matchLookupCalls += 1;
        return null;
      }
    }
  };
  await attachBattleSocket({}, prisma, {
    ServerClass: FakeSocketServer,
    submissionCooldownMs: 60_000
  });
  const socket = await FakeSocketServer.instance.connect(validToken, 'player-regression');

  let invalidAck;
  await socket.trigger('match:submit', {
    matchId: 'm'.repeat(129),
    code: 'print("hello")'
  }, result => { invalidAck = result; });

  assert.equal(invalidAck.ok, false);
  assert.equal(invalidAck.code, 'INVALID_INPUT');
  assert.equal(matchLookupCalls, 0);

  let validAck;
  await socket.trigger('match:submit', {
    matchId: 'valid-match-id',
    code: 'print("hello")'
  }, result => { validAck = result; });

  assert.equal(validAck.ok, false);
  assert.notEqual(validAck.code, 'RATE_LIMITED');
  assert.equal(validAck.code, 'ACTIVE_MATCH_NOT_FOUND');
  assert.equal(matchLookupCalls, 1);
});
