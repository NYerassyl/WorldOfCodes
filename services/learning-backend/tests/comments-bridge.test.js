import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createCommentsBridge } from '../src/problems/commentsBridge.js';
import { AppError, errorMiddleware } from '../src/lib/errors.js';

async function withBridge(fetchImpl, fn) {
  const app = express();
  app.use(express.json());
  const auth = (req, _res, next) => req.get('authorization') === 'Bearer actual-session' ? next() : next(new AppError(401, 'UNAUTHORIZED', 'Sign in'));
  app.use('/api', createCommentsBridge(auth, { fetchImpl }));
  app.use(errorMiddleware);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('writes require an authenticated session before contacting FastAPI', async () => {
  let calls = 0;
  await withBridge(async () => { calls++; return new Response('{}'); }, async base => {
    const r = await fetch(base + '/api/problems/py-double/comments', { method: 'POST', headers: { 'Content-Type':'application/json', 'X-User-Id':'1' }, body: JSON.stringify({body:'spoof'}) });
    assert.equal(r.status, 401);
    assert.equal(calls, 0);
  });
});

test('forwards Bearer, problem scope and payload without inventing actor identity', async () => {
  const received = [];
  await withBridge(async (url, init) => {
    received.push({ url, init });
    return new Response(JSON.stringify({error:{code:'FORBIDDEN',message:'Only author'}}), {status:403});
  }, async base => {
    const r = await fetch(base + '/api/problems/py-double/comments/comment-a', {method:'PATCH', headers:{Authorization:'Bearer actual-session','Content-Type':'application/json'}, body:JSON.stringify({body:'B edit'})});
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error.code, 'FORBIDDEN');
    assert.equal(received[0].url.pathname, '/api/problems/py-double/comments/comment-a');
    assert.equal(received[0].init.headers.Authorization, 'Bearer actual-session');
    assert.equal(received[0].init.headers['X-User-Id'], undefined);
    assert.deepEqual(JSON.parse(received[0].init.body), {body:'B edit'});
  });
});

test('upstream failure is a 503 without database details', async () => {
  await withBridge(async () => new Response('private-database-error', {status:500}), async base => {
    const r = await fetch(base + '/api/problems/py-double/comments');
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error.code, 'COMMENTS_UNAVAILABLE');
  });
});
