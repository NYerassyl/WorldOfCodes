import test from 'node:test';
import assert from 'node:assert/strict';
import { attachBattleSocket } from '../src/battle/socket.js';

class FakeSocketServer {
  static instance;
  constructor(_server, options) {
    this.options = options;
    this.middleware = null;
    this.connectionHandler = null;
    FakeSocketServer.instance = this;
  }
  use(fn) { this.middleware = fn; }
  on(event, fn) { if (event === 'connection') this.connectionHandler = fn; }
  to() { return { emit() {} }; }
  async connect(token) {
    const socket = {
      handshake: { auth: { token } },
      data: {},
      handlers: {},
      on(event, handler) { this.handlers[event] = handler; },
      join: async () => {},
      disconnect() { this.disconnected = true; }
    };
    await new Promise((resolve, reject) => {
      this.middleware(socket, error => error ? reject(error) : resolve());
    });
    this.connectionHandler(socket);
    return socket;
  }
}

const token = 'B'.repeat(43);
const validSession = {
  id: 'session-recovery',
  userId: 'player-recovery',
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null
};

test('socket fails closed when session storage fails after handshake', async () => {
  let lookups = 0;
  let queueLeaves = 0;
  const prisma = {
    authSession: {
      findUnique: async () => {
        lookups += 1;
        if (lookups === 1) return validSession;
        throw new Error('database unavailable');
      }
    }
  };
  const queue = {
    leave(userId) {
      assert.equal(userId, validSession.userId);
      queueLeaves += 1;
      return { status: 'LEFT_QUEUE' };
    }
  };

  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer, queue });
  const socket = await FakeSocketServer.instance.connect(token);
  let acknowledgement;
  await socket.handlers['ranked:join']({}, value => { acknowledgement = value; });

  assert.equal(acknowledgement.ok, false);
  assert.equal(acknowledgement.code, 'SESSION_UNAVAILABLE');
  assert.equal(socket.disconnected, true);
  assert.equal(queueLeaves, 1);
});

test('socket reconnect authenticates again and rejects a revoked session', async () => {
  let revoked = false;
  const prisma = {
    authSession: {
      findUnique: async () => ({ ...validSession, revokedAt: revoked ? new Date() : null })
    }
  };
  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer });
  const io = FakeSocketServer.instance;
  const first = await io.connect(token);
  assert.equal(first.data.userId, validSession.userId);

  revoked = true;
  await assert.rejects(io.connect(token), /UNAUTHORIZED/);
});
