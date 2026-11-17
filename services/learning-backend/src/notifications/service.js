import { badRequest } from '../lib/errors.js';

const ACTOR = { id: true, nickname: true, displayName: true, avatarUrl: true };
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const NOTIFICATION_TYPES = Object.freeze({ FOLLOW: 'FOLLOW', MESSAGE: 'MESSAGE' });

export function followDedupeKey(recipientId, actorId) {
  return `follow:${recipientId}:${actorId}`;
}

export function messageDedupeKey(messageId) {
  return `message:${messageId}`;
}

export async function createFollowNotification(db, { recipientId, actorId }) {
  return db.notification.upsert({
    where: { dedupeKey: followDedupeKey(recipientId, actorId) },
    create: {
      recipientId,
      actorId,
      type: NOTIFICATION_TYPES.FOLLOW,
      dedupeKey: followDedupeKey(recipientId, actorId),
    },
    update: { readAt: null, createdAt: new Date() },
  });
}

export async function followWithNotification(db, { followerId, followedId }) {
  return db.$transaction(async (tx) => {
    const created = await tx.follow.createMany({
      data: [{ followerId, followedId }],
      skipDuplicates: true,
    });
    // Repeating the same follow request must not create or revive a notification.
    // Only a newly created relation writes one, in the same transaction.
    if (created.count === 1) {
      await createFollowNotification(tx, { recipientId: followedId, actorId: followerId });
    }
    return { created: created.count === 1 };
  });
}

export async function createMessageNotification(db, { message }) {
  return db.notification.upsert({
    where: { dedupeKey: messageDedupeKey(message.id) },
    create: {
      recipientId: message.recipientId,
      actorId: message.senderId,
      type: NOTIFICATION_TYPES.MESSAGE,
      entityId: message.id,
      dedupeKey: messageDedupeKey(message.id),
    },
    update: {},
  });
}

function encodeCursor(row) {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');
}

function decodeCursor(value) {
  if (typeof value !== 'string' || !value) throw badRequest('cursor is invalid');
  const text = Buffer.from(value, 'base64url').toString('utf8');
  const split = text.indexOf('|');
  if (split <= 0) throw badRequest('cursor is invalid');
  const createdAt = new Date(text.slice(0, split));
  const id = text.slice(split + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) throw badRequest('cursor is invalid');
  return { createdAt, id };
}

function publicNotification(row) {
  return {
    id: row.id,
    type: row.type,
    entityId: row.entityId,
    readAt: row.readAt,
    createdAt: row.createdAt,
    actor: row.actor,
  };
}

export async function listNotifications(db, { userId, limit, cursor }) {
  const take = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const where = { recipientId: userId };
  if (cursor !== undefined) {
    const point = decodeCursor(cursor);
    where.OR = [
      { createdAt: { lt: point.createdAt } },
      { createdAt: point.createdAt, id: { lt: point.id } },
    ];
  }
  const [rows, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: {
        id: true, type: true, entityId: true, readAt: true, createdAt: true,
        actor: { select: ACTOR },
      },
    }),
    db.notification.count({ where: { recipientId: userId, readAt: null } }),
  ]);
  const page = rows.slice(0, take);
  return {
    items: page.map(publicNotification),
    unreadCount,
    nextCursor: rows.length > take ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function unreadNotificationCount(db, { userId }) {
  return { unreadCount: await db.notification.count({ where: { recipientId: userId, readAt: null } }) };
}

export async function markNotificationsRead(db, { userId, body }) {
  const hasIds = Array.isArray(body?.ids);
  const hasAll = body?.all === true;
  if (body?.all !== undefined && body.all !== true) throw badRequest('all must be true when provided');
  if (hasIds === hasAll) throw badRequest('Provide either ids or all, not both');
  let where;
  if (hasAll) {
    where = { recipientId: userId, readAt: null };
  } else {
    const ids = [...new Set(body.ids)];
    if (!ids.length || ids.some((id) => typeof id !== 'string' || !id)) {
      throw badRequest('ids must be a non-empty list of notification ids');
    }
    where = { recipientId: userId, id: { in: ids }, readAt: null };
  }
  const result = await db.notification.updateMany({ where, data: { readAt: new Date() } });
  return {
    updated: result.count,
    unreadCount: await db.notification.count({ where: { recipientId: userId, readAt: null } }),
  };
}
