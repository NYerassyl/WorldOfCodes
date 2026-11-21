import { jwtVerify } from 'jose';
import { AppError } from '../lib/errors.js';
import { hashSessionToken } from '../lib/security.js';

const OPAQUE = /^[A-Za-z0-9_-]{32,128}$/;
const ISSUER = 'worldofcodes-auth';
const AUDIENCE = 'worldofcodes-api';
const REQUIRED = ['sub', 'iat', 'exp', 'jti', 'iss', 'aud'];

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new AppError(503, 'JWT_NOT_CONFIGURED', 'JWT authentication is not configured.');
  }
  return new TextEncoder().encode(secret);
}

async function verifySiteJwt(token) {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: REQUIRED,
      clockTolerance: 0,
    });
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== 'string' || !payload.sub
      || typeof payload.jti !== 'string' || !payload.jti
      || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)
      || payload.iat > now || payload.exp <= payload.iat) return null;
    return payload;
  } catch (error) {
    // Configuration failures are service errors, never authentication success.
    if (error instanceof AppError) throw error;
    return null; // signature, malformed claims, expired JWT, wrong issuer/audience
  }
}

// Shared HTTP + Socket.IO verifier. A JWT-shaped token never falls back
// to legacy opaque sessions, even if its SHA-256 hash exists in PostgreSQL.
export async function resolveAuthSession(prisma, token, { includeUser = false } = {}) {
  if (typeof token !== 'string' || token.length < 1 || token.length > 8192) return null;
  const isJwt = token.includes('.');
  const claims = isJwt ? await verifySiteJwt(token) : null;
  if (isJwt && !claims) return null;
  if (!isJwt && !OPAQUE.test(token)) return null;

  // JWT requires actual User existence even for Socket.IO (includeUser=false).
  const loadUser = isJwt || includeUser;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    ...(loadUser ? { include: { user: true } } :
      { select: { id: true, userId: true, expiresAt: true, revokedAt: true } }),
  });
  if (!session || session.revokedAt != null
    || !(session.expiresAt instanceof Date) || session.expiresAt <= new Date()
    || (loadUser && (!session.user || session.user.id !== session.userId))
    || (isJwt && claims.sub !== session.userId)) return null;

  return {
    userId: session.userId,
    sessionId: session.id,
    ...(includeUser ? { user: session.user } : {}),
  };
}
