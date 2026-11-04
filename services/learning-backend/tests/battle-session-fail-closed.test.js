import test from 'node:test';
import assert from 'node:assert/strict';
import { attachBattleSocket } from '../src/battle/socket.js';

class FakeSocketServer {
  static instance;
  constructor(_server, options) { this.options = options; this.middleware = null; this.connectionHandler = null; FakeSocketServer.instance = this; }
  use(fn) { this.middleware = fn; }
  on(event, fn) { if (event === 'connection') this.connectionHandler = fn; }
  to() { return { emit() {} }; }
  async connect(token) {
    const socket = {
      handshake: { auth: { token } }, data: {}, handlers: {}, disconnected: false,
      on(event, fn) { this.handlers[event] = fn; },
      join: async () => {},
      disconnect() { this.disconnected = true; },
      async trigger(event, ...args) { return this.handlers[event](...args); }
    };
    await new Promise((resolve, reject) => this.middleware(socket, error => error ? reject(error) : resolve()));
    this.connectionHandler(socket);
    return socket;
  }
}

test('Socket.IO fails closed and disconnects when session revalidation hits a database error', async () => {
  const token = 'B'.repeat(43);
  let reads = 0;
  let queueLeaves = 0;
  const prisma = { authSession: { findUnique: async () => {
    reads += 1;
    if (reads > 1) throw new Error('database unavailable');
    return { id: 's1', userId: 'player-1', expiresAt: new Date(Date.now() + 60_000), revokedAt: null };
  } } };
  const queue = { join: async () => ({ status: 'QUEUED', ticketId: 'ticket-1' }), leave: () => { queueLeaves += 1; return { status: 'LEFT_QUEUE' }; } };
  await attachBattleSocket({}, prisma, { ServerClass: FakeSocketServer, queue });
  const socket = await FakeSocketServer.instance.connect(token);
  let ack;
  await socket.trigger('ranked:join', {}, result => { ack = result; });
  assert.equal(ack.ok, false);
  assert.equal(ack.code, 'SESSION_UNAVAILABLE');
  assert.equal(socket.disconnected, true);
  assert.equal(queueLeaves, 1);
  assert.equal(queue.waiting?.size, undefined);
});
