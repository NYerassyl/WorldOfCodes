import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { readConfig } from "../server/config.js";
import { createJudgeQueue } from "../server/judge-queue.js";
import { resolveSession, createSocketAuth } from "../server/socket-auth.js";
const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
test("API boundary: origins, auth limit, body limits, canonical paths", async () => {
  const server = await listen(
    createApp({
      prisma: {},
      config: readConfig({ AUTH_RATE_LIMIT: "2", REQUEST_BODY_LIMIT: "1kb" }),
      staticDirectory: "/nonexistent",
    }),
  );
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(url + "/api/health")).status, 200);
    assert.equal((await fetch(url + "/api/api/health")).status, 404);
    const denied = await fetch(url + "/api/health", {
      headers: { Origin: "https://attacker.invalid" },
    });
    assert.equal(denied.status, 403);
    const allowed = await fetch(url + "/api/health", {
      headers: { Origin: "http://localhost:5173" },
    });
    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    assert.equal((await fetch(url + "/api/users/me")).status, 401);
    assert.equal(
      (
        await fetch(url + "/api/problems/py-double/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "x".repeat(2000) }),
        })
      ).status,
      413,
    );
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await fetch(url + "/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          })
        ).status,
        400,
      );
    assert.equal(
      (await fetch(url + "/api/auth/register", { method: "POST" })).status,
      429,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test("judge queue caps running and waiting work", async () => {
  let finish;
  const queued = createJudgeQueue(
    () =>
      new Promise((r) => {
        finish = r;
      }),
    { concurrency: 1, maxQueued: 0 },
  );
  const first = queued({});
  await new Promise((r) => setImmediate(r));
  await assert.rejects(queued({}), (e) => e.code === "JUDGE_BUSY");
  finish({ status: "ACCEPTED" });
  await first;
});
test("socket handshake uses opaque sessions, checks origin, expiry and revocation", async () => {
  const token = "a".repeat(40);
  let session = {
    id: "s",
    userId: "u",
    user: { id: "u" },
    expiresAt: new Date(Date.now() + 10000),
    revokedAt: null,
  };
  const prisma = { authSession: { findUnique: async () => session } };
  assert.equal((await resolveSession(prisma, token)).userId, "u");
  const socket = {
    handshake: {
      headers: { origin: "http://localhost:5173" },
      auth: { token },
    },
    data: {},
  };
  await new Promise((resolve, reject) =>
    createSocketAuth(prisma, { origins: ["http://localhost:5173"] })(
      socket,
      (e) => (e ? reject(e) : resolve()),
    ),
  );
  assert.equal(socket.data.auth.userId, "u");
  session = { ...session, revokedAt: new Date() };
  assert.equal(await resolveSession(prisma, token), null);
  session = { ...session, revokedAt: null, expiresAt: new Date(0) };
  assert.equal(await resolveSession(prisma, token), null);
});
