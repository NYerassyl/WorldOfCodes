import { AppError } from '../lib/errors.js';

const failure = () => new AppError(
  503, 'CANONICAL_AUTH_UNAVAILABLE', 'Authentication service is temporarily unavailable.',
);
const RESULTS = {
  register: new Set([201, 400, 401, 409, 422, 503]),
  login: new Set([200, 400, 401, 409, 422, 503]),
  logout: new Set([204, 400, 401, 409, 422, 503]),
};

// This code is ONLY called on the Express side. FastAPI register/login/logout
// are implemented locally and never proxy back to Express.
export async function proxyFastApiAuth(req, res, {
  fastapiOrigin, authTimeoutMs = 8000, route,
} = {}) {
  if (!Object.hasOwn(RESULTS, route)) throw failure();
  if (typeof fastapiOrigin !== 'string' || !fastapiOrigin.trim()) throw failure();
  if (!Number.isInteger(authTimeoutMs) || authTimeoutMs < 100 || authTimeoutMs > 30000) throw failure();
  let url;
  try {
    const base = new URL(fastapiOrigin);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password
      || base.pathname !== '/' || base.search || base.hash) throw failure();
    url = new URL('/api/auth/' + route, base);
  } catch { throw failure(); }
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  const authorization = req.get('authorization');
  if (route === 'logout' && authorization) headers.authorization = authorization;
  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers,
      // Express's existing express.json() has already enforced REQUEST_BODY_LIMIT.
      body: JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(authTimeoutMs),
      redirect: 'error',
    });
  } catch { throw failure(); }

  if (!RESULTS[route].has(upstream.status)) throw failure();
  if (upstream.status === 204) return res.status(204).end();
  let payload;
  try {
    // Bounded upstream response, not an arbitrary proxy stream to a browser.
    const raw = await upstream.text();
    if (Buffer.byteLength(raw, 'utf8') > 128 * 1024) throw failure();
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw failure();
    if (upstream.ok) {
      if (typeof payload.token !== 'string' || !payload.token.includes('.')
        || !payload.user || typeof payload.user.id !== 'string') throw failure();
    } else {
      // FastAPI's default Pydantic 422 response is {"detail":[...]}.
      // DomainError responses use {"error":{"code":...,"message":...}}.
      // Both are canonical JSON errors; never turn validation into a false 503.
      const domainError = payload.error
        && typeof payload.error.code === 'string'
        && typeof payload.error.message === 'string';
      const validationError = upstream.status === 422 && Array.isArray(payload.detail);
      if (!domainError && !validationError) throw failure();
    }
  } catch { throw failure(); }
  return res.status(upstream.status).json(payload);
}
