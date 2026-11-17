import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMessageNotification,
  followWithNotification,
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount
} from '../src/notifications/service.js';

function notificationFixture() {
  const follows = new Set();
  const notifications = [];
  let sequence = 0;
  const prisma = {
    follows,
    notifications,
    follow: {
      createMany: async ({ data }) => {
        const [row] = data;
        const key = `${row.followerId}->${row.followedId}`;
        if (follows.has(key)) return { count: 0 };
        follows.add(key);
        return { count: 1 };
      }
    },
    notification: {
      upsert: async ({ where, create, update }) => {
        const existing = notifications.find((item) => item.dedupeKey === where.dedupeKey);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `n${++sequence}`, readAt: null, createdAt: new Date(), ...create };
        notifications.push(row);
        return row;
      },
      findMany: async ({ where, take }) => {
        let rows = notifications.filter((row) => row.recipientId === where.recipientId);
        if (where.OR) {
          const [older, sameTime] = where.OR;
          rows = rows.filter((row) =>
            row.createdAt < older.createdAt.lt ||
            (row.createdAt.getTime() === sameTime.createdAt.getTime() && row.id < sameTime.id.lt));
        }
        return rows
          .sort((a, b) => b.createdAt - a.createdAt || (b.id > a.id ? 1 : -1))
          .slice(0, take)
          .map((row) => ({ ...row, actor: { id: row.actorId, nickname: row.actorId } }));
      },
      count: async ({ where }) =>
        notifications.filter((row) =>
          row.recipientId === where.recipientId &&
          (where.readAt !== null || row.readAt === null)).length,
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const row of notifications) {
          if (row.recipientId !== where.recipientId) continue;
          if (where.id?.in && !where.id.in.includes(row.id)) continue;
          if (where.readAt === null && row.readAt !== null) continue;
          row.readAt = data.readAt;
          count += 1;
        }
        return { count };
      }
    },
    $transaction: async (callback) => callback(prisma)
  };
  return prisma;
}

test('a repeated follow creates one notification and does not revive a read one', async () => {
  const prisma = notificationFixture();
  await followWithNotification(prisma, { followerId: 'a', followedId: 'b' });
  assert.equal(prisma.notifications.length, 1);
  const first = prisma.notifications[0];
  assert.equal(first.type, 'FOLLOW');
  assert.equal(first.recipientId, 'b');
  assert.equal(first.actorId, 'a');
  assert.equal(first.dedupeKey, 'follow:b:a');

  await markNotificationsRead(prisma, { userId: 'b', body: { ids: [first.id] } });
  assert.ok(first.readAt instanceof Date);
  await followWithNotification(prisma, { followerId: 'a', followedId: 'b' });
  assert.equal(prisma.notifications.length, 1);
  assert.ok(first.readAt instanceof Date, 'duplicate follow must not make the old alert unread');
});

test('unfollow then follow refreshes the same notification as unread', async () => {
  const prisma = notificationFixture();
  await followWithNotification(prisma, { followerId: 'a', followedId: 'b' });
  const row = prisma.notifications[0];
  await markNotificationsRead(prisma, { userId: 'b', body: { ids: [row.id] } });
  const oldCreatedAt = row.createdAt;
  prisma.follows.delete('a->b');
  await new Promise((resolve) => setTimeout(resolve, 5));
  await followWithNotification(prisma, { followerId: 'a', followedId: 'b' });
  assert.equal(prisma.notifications.length, 1);
  assert.equal(row.readAt, null);
  assert.ok(row.createdAt >= oldCreatedAt);
});

test('each stored message creates its own notification and a retry stays idempotent', async () => {
  const prisma = notificationFixture();
  const message = { id: 'm1', senderId: 'a', recipientId: 'b' };
  await createMessageNotification(prisma, { message });
  await createMessageNotification(prisma, { message });
  assert.equal(prisma.notifications.length, 1);
  assert.equal(prisma.notifications[0].dedupeKey, 'message:m1');
  assert.equal(prisma.notifications[0].entityId, 'm1');
  await createMessageNotification(prisma, { message: { ...message, id: 'm2' } });
  assert.equal(prisma.notifications.length, 2);
});

test('notification list is newest first and paginates with the unread count', async () => {
  const prisma = notificationFixture();
  for (const [id, minute] of [['m1', 1], ['m2', 2], ['m3', 3]]) {
    prisma.notifications.push({
      id, recipientId: 'b', actorId: 'a', type: 'MESSAGE', entityId: null,
      dedupeKey: `message:${id}`, readAt: null, createdAt: new Date(Date.parse('2026-11-17T10:00:00Z') + minute * 60_000)
    });
  }
  const page = await listNotifications(prisma, { userId: 'b', limit: 2 });
  assert.deepEqual(page.items.map((item) => item.id), ['m3', 'm2']);
  assert.equal(page.unreadCount, 3);
  assert.equal(typeof page.nextCursor, 'string');
  const next = await listNotifications(prisma, { userId: 'b', limit: 2, cursor: page.nextCursor });
  assert.deepEqual(next.items.map((item) => item.id), ['m1']);
  assert.equal(next.nextCursor, null);
  assert.equal((await unreadNotificationCount(prisma, { userId: 'b' })).unreadCount, 3);
});

test('marking read only touches the signed-in recipient rows and validates both/all input', async () => {
  const prisma = notificationFixture();
  prisma.notifications.push(
    { id: 'own', recipientId: 'b', actorId: 'a', type: 'FOLLOW', entityId: null, dedupeKey: 'follow:b:a', readAt: null, createdAt: new Date() },
    { id: 'foreign', recipientId: 'c', actorId: 'a', type: 'FOLLOW', entityId: null, dedupeKey: 'follow:c:a', readAt: null, createdAt: new Date() }
  );

  await assert.rejects(
    markNotificationsRead(prisma, { userId: 'b', body: { ids: ['own'], all: true } }),
    /either ids or all/
  );
  await assert.rejects(markNotificationsRead(prisma, { userId: 'b', body: {} }), /either ids or all/);
  await assert.rejects(markNotificationsRead(prisma, { userId: 'b', body: { ids: [] } }), /non-empty/);

  const result = await markNotificationsRead(prisma, { userId: 'b', body: { ids: ['own', 'foreign'] } });
  assert.equal(result.updated, 1);
  assert.ok(prisma.notifications.find((row) => row.id === 'own').readAt instanceof Date);
  assert.equal(prisma.notifications.find((row) => row.id === 'foreign').readAt, null);
  assert.equal(result.unreadCount, 0);

  const all = await markNotificationsRead(prisma, { userId: 'c', body: { all: true } });
  assert.equal(all.updated, 1);
  assert.ok(prisma.notifications.find((row) => row.id === 'foreign').readAt instanceof Date);
});
