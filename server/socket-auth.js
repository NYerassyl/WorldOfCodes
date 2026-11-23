import { resolveAuthSession } from "../services/learning-backend/src/auth/session.js";

// Reuse the exact same signed-JWT + Prisma AuthSession validator as HTTP and
// live battle Socket.IO. No independent opaque-only verifier is permitted.
export async function resolveSession(prisma, token) {
  return resolveAuthSession(prisma, token, { includeUser: true });
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
