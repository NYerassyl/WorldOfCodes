import { hashSessionToken } from '../lib/security.js';

// Shared HTTP/Socket.IO session lookup; always check again before protected
// Socket.IO events, since a session can be revoked after the handshake.
// Returns null for malformed, expired and revoked tokens; DB errors propagate
// so the caller can report service unavailability instead of authenticating.
export async function resolveAuthSession(prisma, token, { includeUser = false } = {}) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return null;
  }
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    ...(includeUser ? { include: { user: true } } : {
      select: { id: true, userId: true, expiresAt: true, revokedAt: true }
    })
  });
  if (!session || session.revokedAt !== null && session.revokedAt !== undefined
    || !(session.expiresAt instanceof Date) || session.expiresAt <= new Date()
    || (includeUser && !session.user)) {
    return null;
  }
  return {
    userId: session.userId,
    sessionId: session.id,
    ...(includeUser ? { user: session.user } : {})
  };
}
