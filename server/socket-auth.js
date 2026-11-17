import { hashSessionToken } from "../services/learning-backend/src/lib/security.js";
// GPT 3: use with io.use() and revalidate before every protected event.
export async function resolveSession(prisma, token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(token))
    return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date())
    return null;
  return { userId: session.userId, sessionId: session.id, user: session.user };
}
export function createSocketAuth(prisma, { origins = [] } = {}) {
  return async (socket, next) => {
    try {
      const origin = socket.handshake.headers?.origin;
      if (origin && !origins.includes(origin))
        return next(new Error("ORIGIN_NOT_ALLOWED"));
      const auth = await resolveSession(prisma, socket.handshake.auth?.token);
      if (!auth) return next(new Error("UNAUTHORIZED"));
      socket.data.auth = auth;
      next();
    } catch {
      next(new Error("AUTH_UNAVAILABLE"));
    }
  };
}
