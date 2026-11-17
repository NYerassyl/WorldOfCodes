import { badRequest, notFound } from '../lib/errors.js';
import { createMessageNotification } from '../notifications/service.js';

const PEER = { id: true, nickname: true, displayName: true, avatarUrl: true };
const MESSAGE = { id: true, senderId: true, recipientId: true, body: true, createdAt: true, readAt: true };
const THREAD_LIMIT = 200;

export function mergeConversationPeers(sent, received) {
  const latest = new Map();
  const consider = (peerId, at) => {
    const time = new Date(at).getTime();
    if (!latest.has(peerId) || time > latest.get(peerId)) latest.set(peerId, time);
  };
  for (const row of sent) consider(row.recipientId, row._max.createdAt);
  for (const row of received) consider(row.senderId, row._max.createdAt);
  return [...latest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([peerId, lastMessageAt]) => ({ peerId, lastMessageAt: new Date(lastMessageAt) }));
}

function publicMessage(row) {
  return {
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    body: row.body,
    createdAt: row.createdAt,
    readAt: row.readAt ?? null,
  };
}

function threadWhere(userId, peerId) {
  return { OR: [{ senderId: userId, recipientId: peerId }, { senderId: peerId, recipientId: userId }] };
}

async function peerOrThrow(prisma, userId, peerId) {
  if (typeof peerId !== 'string' || !peerId) throw notFound();
  if (peerId === userId) throw badRequest('You cannot message yourself');
  const peer = await prisma.user.findUnique({ where: { id: peerId }, select: PEER });
  if (!peer) throw notFound();
  return peer;
}

export async function listConversations(prisma, { userId }) {
  const [sent, received, unread] = await Promise.all([
    prisma.directMessage.groupBy({ by: ['recipientId'], where: { senderId: userId }, _max: { createdAt: true } }),
    prisma.directMessage.groupBy({ by: ['senderId'], where: { recipientId: userId }, _max: { createdAt: true } }),
    prisma.directMessage.groupBy({ by: ['senderId'], where: { recipientId: userId, readAt: null }, _count: { _all: true } }),
  ]);
  const peers = mergeConversationPeers(sent, received);
  if (!peers.length) return { items: [] };
  const unreadBy = new Map(unread.map((group) => [group.senderId, typeof group._count === 'number' ? group._count : group._count._all]));
  const [users, latest] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: peers.map((peer) => peer.peerId) } }, select: PEER }),
    Promise.all(peers.map((peer) => prisma.directMessage.findFirst({
      where: threadWhere(userId, peer.peerId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: MESSAGE,
    }))),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const items = peers.flatMap((peer, index) => {
    const user = usersById.get(peer.peerId);
    const lastMessage = latest[index];
    if (!user || !lastMessage) return [];
    return [{ peer: user, lastMessage: publicMessage(lastMessage), unread: unreadBy.get(peer.peerId) ?? 0 }];
  });
  return { items: items.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)) };
}

export async function getThread(prisma, { userId, peerId }) {
  const peer = await peerOrThrow(prisma, userId, peerId);
  const rows = await prisma.directMessage.findMany({
    where: threadWhere(userId, peer.id),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: THREAD_LIMIT,
    select: MESSAGE,
  });
  return { peer, messages: rows.reverse().map(publicMessage) };
}

export async function sendMessage(prisma, { userId, peerId, body }) {
  const peer = await peerOrThrow(prisma, userId, peerId);
  if (typeof body !== 'string') throw badRequest('Message must be a string of up to 1000 chars');
  const text = body.trim();
  if (!text) throw badRequest('Message cannot be empty');
  if (text.length > 1000) throw badRequest('Message must be a string of up to 1000 chars');
  const row = await prisma.$transaction(async (tx) => {
    const message = await tx.directMessage.create({
      data: { senderId: userId, recipientId: peer.id, body: text },
    });
    await createMessageNotification(tx, { message });
    return message;
  });
  return { peer, message: publicMessage(row) };
}

export async function markThreadRead(prisma, { userId, peerId }) {
  const peer = await peerOrThrow(prisma, userId, peerId);
  const result = await prisma.directMessage.updateMany({
    where: { senderId: peer.id, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { peer, read: result.count };
}
