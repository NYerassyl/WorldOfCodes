import test from 'node:test';
import assert from 'node:assert/strict';
import { getThread, listConversations, markThreadRead, mergeConversationPeers, sendMessage } from '../src/chat/service.js';

const BASE = Date.parse('2026-11-17T10:00:00Z');

function chatFixture() {
  const users = {
    u1: { id: 'u1', username: 'hero', nickname: 'Hero', avatarUrl: null },
    u2: { id: 'u2', username: 'rival', nickname: 'Rival', avatarUrl: null },
    u3: { id: 'u3', username: 'observer', nickname: 'Observer', avatarUrl: null }
  };
  const messages = [];
  let sequence = 0;
  const newest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  const threadMatch = (message, where) =>
    where.OR.some((clause) => message.senderId === clause.senderId && message.recipientId === clause.recipientId);
  return {
    messages,
    prisma: {
      user: {
        findUnique: async ({ where }) => users[where.id] ?? null,
        findMany: async ({ where }) => where.id.in.map((id) => users[id]).filter(Boolean)
      },
      directMessage: {
        groupBy: async ({ by, where }) => {
          if (by[0] === 'recipientId') {
            const groups = new Map();
            for (const message of messages.filter((row) => row.senderId === where.senderId)) {
              const current = groups.get(message.recipientId);
              if (!current || new Date(message.createdAt) > current) groups.set(message.recipientId, message.createdAt);
            }
            return [...groups].map(([recipientId, createdAt]) => ({ recipientId, _max: { createdAt } }));
          }
          if (!('readAt' in where)) {
            const groups = new Map();
            for (const message of messages.filter((row) => row.recipientId === where.recipientId)) {
              const current = groups.get(message.senderId);
              if (!current || new Date(message.createdAt) > current) groups.set(message.senderId, message.createdAt);
            }
            return [...groups].map(([senderId, createdAt]) => ({ senderId, _max: { createdAt } }));
          }
          const groups = new Map();
          for (const message of messages.filter((row) => row.recipientId === where.recipientId && row.readAt === null)) {
            groups.set(message.senderId, (groups.get(message.senderId) ?? 0) + 1);
          }
          return [...groups].map(([senderId, count]) => ({ senderId, _count: { _all: count } }));
        },
        findFirst: async ({ where }) => messages.filter((message) => threadMatch(message, where)).sort(newest)[0] ?? null,
        findMany: async ({ where, take }) => messages.filter((message) => threadMatch(message, where)).sort(newest).slice(0, take),
        create: async ({ data }) => {
          const row = { id: `m${++sequence}`, body: data.body, readAt: null, createdAt: new Date(BASE + sequence * 1000), ...data };
          messages.push(row);
          return row;
        },
        updateMany: async ({ where, data }) => {
          let count = 0;
          for (const message of messages) {
            if (message.senderId !== where.senderId || message.recipientId !== where.recipientId) continue;
            if (where.readAt === null && message.readAt !== null) continue;
            message.readAt = data.readAt;
            count += 1;
          }
          return { count };
        }
      }
    }
  };
}

async function seed(prisma, senderId, recipientId, body, createdAt) {
  return prisma.directMessage.create({ data: { senderId, recipientId, body, createdAt } });
}

test('conversation peers merge both directions and sort by newest message', () => {
  const peers = mergeConversationPeers(
    [{ recipientId: 'u2', _max: { createdAt: new Date('2026-11-15T09:00:00Z') } }],
    [
      { senderId: 'u2', _max: { createdAt: new Date('2026-11-16T09:00:00Z') } },
      { senderId: 'u3', _max: { createdAt: new Date('2026-11-14T09:00:00Z') } }
    ]
  );
  assert.deepEqual(peers.map((peer) => peer.peerId), ['u2', 'u3']);
});

test('the conversation list returns one history per person with its last message and unread count', async () => {
  const { prisma } = chatFixture();
  await seed(prisma, 'u1', 'u2', 'first', new Date('2026-11-17T08:00:00Z'));
  await seed(prisma, 'u2', 'u1', 'second', new Date('2026-11-17T09:00:00Z'));
  await seed(prisma, 'u3', 'u1', 'hello hero', new Date('2026-11-16T09:00:00Z'));

  const list = await listConversations(prisma, { userId: 'u1' });
  assert.equal(list.items.length, 2);
  assert.deepEqual(list.items.map((item) => item.peer.username), ['rival', 'observer']);
  assert.equal(list.items[0].lastMessage.body, 'second');
  assert.equal(list.items[0].unread, 1);
  assert.equal(list.items[1].lastMessage.body, 'hello hero');
  assert.equal(list.items[1].unread, 1);
});

test('a third account only sees its own conversations and thread', async () => {
  const { prisma } = chatFixture();
  await seed(prisma, 'u1', 'u2', 'private plan', new Date('2026-11-17T08:00:00Z'));
  await seed(prisma, 'u2', 'u1', 'private reply', new Date('2026-11-17T09:00:00Z'));

  const observerList = await listConversations(prisma, { userId: 'u3' });
  assert.deepEqual(observerList.items, []);

  const observerThread = await getThread(prisma, { userId: 'u3', peerId: 'u1' });
  assert.deepEqual(observerThread.messages, []);
});

test('a thread contains only messages exchanged with the requested peer', async () => {
  const { prisma } = chatFixture();
  await seed(prisma, 'u1', 'u2', 'to rival', new Date('2026-11-17T08:00:00Z'));
  await seed(prisma, 'u1', 'u3', 'to observer', new Date('2026-11-17T09:00:00Z'));

  const thread = await getThread(prisma, { userId: 'u1', peerId: 'u2' });
  assert.deepEqual(thread.messages.map((message) => message.body), ['to rival']);
  assert.equal(thread.peer.username, 'rival');
});

test('sending trims the body and rejects empty, oversized, self and unknown peers', async () => {
  const { prisma } = chatFixture();
  const sent = await sendMessage(prisma, { userId: 'u1', peerId: 'u2', body: '  hi there  ' });
  assert.equal(sent.message.body, 'hi there');
  assert.equal(sent.peer.username, 'rival');
  const created = await sendMessage(prisma, { userId: 'u2', peerId: 'u1', body: 'x'.repeat(1000) });
  assert.equal(created.message.body.length, 1000);

  await assert.rejects(sendMessage(prisma, { userId: 'u1', peerId: 'u2', body: '   ' }), /empty/);
  await assert.rejects(sendMessage(prisma, { userId: 'u1', peerId: 'u2', body: 'x'.repeat(1001) }), /1000/);
  await assert.rejects(sendMessage(prisma, { userId: 'u1', peerId: 'u1', body: 'hi' }), /yourself/);
  await assert.rejects(sendMessage(prisma, { userId: 'u1', peerId: 'missing', body: 'hi' }), (error) => error.status === 404);
});

test('marking a thread read only clears incoming unread messages from that peer', async () => {
  const { prisma, messages } = chatFixture();
  const first = await seed(prisma, 'u2', 'u1', 'unread from rival', new Date('2026-11-17T08:00:00Z'));
  const second = await seed(prisma, 'u1', 'u2', 'sent by me', new Date('2026-11-17T09:00:00Z'));
  const other = await seed(prisma, 'u3', 'u1', 'unread from observer', new Date('2026-11-17T09:30:00Z'));

  const result = await markThreadRead(prisma, { userId: 'u1', peerId: 'u2' });
  assert.equal(result.read, 1);
  assert.ok(first.readAt instanceof Date);
  assert.equal(second.readAt, null);
  assert.equal(other.readAt, null);
  assert.equal(messages.filter((message) => message.readAt).length, 1);
});
