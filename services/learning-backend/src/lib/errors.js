export class AppError extends Error {
  constructor(status, code, message) {
    super(message); this.status = status; this.code = code;
  }
}
export const badRequest = message => new AppError(400, 'INVALID_INPUT', message);
export const notFound = () => new AppError(404, 'NOT_FOUND', 'Resource not found');
export const isUniqueError = error => error?.code === 'P2002';
export const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req,res,next)).catch(next);
export function errorMiddleware(err, _req, res, _next) {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed JSON request' } });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  if (err?.code === 'P2002') return res.status(409).json({ error: { code: 'CONFLICT', message: 'Value is already in use' } });
  console.error('Unhandled backend error:', err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
}
export function requireString(value, field, max = 1000) {
  if (typeof value !== 'string' || value.length > max) throw badRequest(`${field} must be a string of up to ${max} chars`);
  return value;
}
export function ensureKeys(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !allowed.includes(k))) {
    throw badRequest(`Allowed fields: ${allowed.join(', ')}`);
  }
}
