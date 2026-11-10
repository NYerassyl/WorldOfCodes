import assert from "node:assert/strict";
import http from "node:http";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../server/app.js";

const prisma = new PrismaClient();
const app = createApp({ prisma, staticDirectory: "/tmp/worldofcodes-trace-ci-nonexistent" });
const server = http.createServer(app);
let userId = null;

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function json(path, options = {}) {
  const result = await fetch(base + path, options);
  return { status: result.status, body: await result.json().catch(() => null) };
}

try {
  const email = `trace-ci-${Date.now()}@worldofcodes.dev`;
  const register = await json("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "TraceCI-Pass-123",
      nickname: `traceci${Date.now()}`.slice(0, 24),
    }),
  });
  assert.equal(register.status, 201, JSON.stringify(register.body));
  const token = register.body.token;
  userId = register.body.user.id;
  const before = await prisma.user.findUnique({ where: { id: userId } });

  const listing = await json("/api/trace/exercises?level=3&difficulty=medium");
  assert.equal(listing.status, 200);
  assert.equal(listing.body.exercises.length, 10);
  assert.ok(listing.body.exercises.every((entry) => !("expectedOutput" in entry)));

  const detail = await json("/api/trace/exercises/trace-1-01");
  assert.equal(detail.status, 200);
  assert.ok(!("expectedOutput" in detail.body.exercise));
  assert.ok(!("explanation" in detail.body.exercise));

  const attempt = await json("/api/trace/exercises/trace-1-01/attempts", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ output: "3 15\n6 76\nstep 5" }),
  });
  assert.equal(attempt.status, 201, JSON.stringify(attempt.body));
  assert.equal(attempt.body.verdict, "CORRECT");
  assert.equal(attempt.body.correct, true);
  assert.equal(attempt.body.expectedOutput, "3 15\n6 76\nstep 5");
  const rows = await prisma.traceAttempt.findMany({ where: { userId } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].exerciseId, "trace-1-01");
  assert.equal(rows[0].isCorrect, true);
  assert.equal(rows[0].submittedOutput, "3 15\n6 76\nstep 5");
  const after = await prisma.user.findUnique({ where: { id: userId } });
  assert.equal(after.xp, before.xp);
  assert.equal(after.coins, before.coins);

  const logout = await fetch(base + "/api/auth/logout", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(logout.status, 204);
  const revoked = await json("/api/trace/exercises/trace-1-01/attempts", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ output: "anything" }),
  });
  assert.equal(revoked.status, 401);
  assert.equal(await prisma.traceAttempt.count({ where: { userId } }), 1);

  await prisma.user.delete({ where: { id: userId } });
  userId = null;
  assert.equal(await prisma.traceAttempt.count({ where: { userId: before.id } }), 0);
  console.log("Real PostgreSQL + Express Bearer + persisted attempt + revocation + no rewards + cascade: PASS");
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect();
}
