import { Router } from 'express';
import { AppError, asyncRoute } from '../lib/errors.js';

/** Same-origin bridge: the browser's real Bearer token is rechecked by FastAPI. */
export function createCommentsBridge(requireAuth, { fetchImpl = fetch } = {}) {
  const router = Router();
  const forward = asyncRoute(async (req, res) => {
    const base = process.env.FASTAPI_INTERNAL_URL || 'http://127.0.0.1:8000';
    let url;
    try {
      url = new URL(`/api/problems/${encodeURIComponent(req.params.id)}/comments${req.params.commentId ? '/' + encodeURIComponent(req.params.commentId) : ''}`, base);
      for (const key of ['limit', 'before']) if (typeof req.query[key] === 'string') url.searchParams.set(key, req.query[key]);
    } catch {
      throw new AppError(503, 'COMMENTS_UNAVAILABLE', 'Comments service is unavailable.');
    }
    let upstream;
    try {
      upstream = await fetchImpl(url, {
        method: req.method,
        headers: { Accept: 'application/json', ...(req.get('authorization') ? { Authorization: req.get('authorization') } : {}),
                   ...(req.method === 'POST' || req.method === 'PATCH' ? {'Content-Type':'application/json'} : {}) },
        ...(req.method === 'POST' || req.method === 'PATCH' ? { body: JSON.stringify(req.body) } : {}),
        signal: AbortSignal.timeout(10000), redirect: 'error',
      });
    } catch {
      throw new AppError(503, 'COMMENTS_UNAVAILABLE', 'Comments service is unavailable. Try again.');
    }
    if (upstream.status === 204) return res.status(204).end();
    const payload = await upstream.json().catch(() => null);
    if (!payload || upstream.status >= 500) throw new AppError(503, 'COMMENTS_UNAVAILABLE', 'Comments service is unavailable. Try again.');
    res.status(upstream.status).json(payload);
  });
  router.get('/problems/:id/comments', forward);
  router.post('/problems/:id/comments', requireAuth, forward);
  router.patch('/problems/:id/comments/:commentId', requireAuth, forward);
  router.delete('/problems/:id/comments/:commentId', requireAuth, forward);
  return router;
}
