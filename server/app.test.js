import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { buildApp, socketCors } from "./app.js";
import { attachBattleSocket } from "../services/learning-backend/src/battle/socket.js";

const TOKEN = "t".repeat(40);

function fakePrisma() {
  return {
    authSession: {
      findUnique: async ({ where }) =>
        where?.tokenHash
          ? {
              id: "session-1",
              userId: "user-1",
              expiresAt: new Date(Date.now() + 60_000),
              revokedAt: null,
              user: { id: "user-1" },
            }
          : null,
    },
  };
}

async function withServer(app, fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn(base);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("battle REST is mounted once under /api and uses the injected queue", async () => {
  const calls = [];
  const queue = {
    join: async (userId) => {
      calls.push(["join", userId]);
      return { status: "QUEUED", ticketId: "ticket-1" };
    },
    leave: (userId) => {
      calls.push(["leave", userId]);
      return { status: "LEFT_QUEUE" };
    },
  };
  const { app, battleQueue } = buildApp({
    prisma: fakePrisma(),
    battleQueue: queue,
  });
  assert.equal(battleQueue, queue);
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/battle/ranked/queue`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), {
      status: "QUEUED",
      ticketId: "ticket-1",
    });
  });
  assert.deepEqual(calls, [["join", "user-1"]]);
});

test("protected battle routes reject anonymous requests with JSON", async () => {
  const { app } = buildApp({
    prisma: fakePrisma(),
    battleQueue: { join: async () => ({}), leave: () => ({}) },
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/battle/rating/me`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "UNAUTHORIZED");
  });
});

test("unknown /api routes return a JSON 404", async () => {
  const { app } = buildApp({
    prisma: fakePrisma(),
    battleQueue: { join: async () => ({}), leave: () => ({}) },
  });
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/does-not-exist`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "NOT_FOUND");
  });
});

test("Socket.IO shares the same matchmaking queue and authenticates the session", async () => {
  const calls = [];
  const queue = {
    join: async (userId) => {
      calls.push(["join", userId]);
      return { status: "QUEUED", ticketId: "ticket-1" };
    },
    leave: (userId) => {
      calls.push(["leave", userId]);
      return { status: "LEFT_QUEUE" };
    },
  };
  const { battleQueue } = buildApp({
    prisma: fakePrisma(),
    battleQueue: queue,
  });

  class FakeSocketServer {
    constructor(_server, options) {
      this.options = options;
      this.middleware = [];
      this.connectionHandler = null;
    }
    use(fn) {
      this.middleware.push(fn);
    }
    on(event, fn) {
      if (event === "connection") this.connectionHandler = fn;
    }
    to() {
      return { emit() {} };
    }
  }

  const io = await attachBattleSocket({}, fakePrisma(), {
    queue: battleQueue,
    cors: socketCors([]),
    ServerClass: FakeSocketServer,
  });
  assert.equal(battleQueue, queue);
  assert.deepEqual(io.options.cors, { origin: false });

  const handlers = new Map();
  const socket = {
    data: {},
    handshake: { auth: { token: TOKEN } },
    join: async () => {},
    on: (event, fn) => handlers.set(event, fn),
  };
  await new Promise((resolve, reject) =>
    io.middleware[0](socket, (error) => (error ? reject(error) : resolve())),
  );
  assert.equal(socket.data.userId, "user-1");

  io.connectionHandler(socket);
  let acknowledgement;
  await handlers.get("ranked:leave")(undefined, (payload) => {
    acknowledgement = payload;
  });
  assert.deepEqual(acknowledgement, { ok: true, status: "LEFT_QUEUE" });
  assert.deepEqual(calls, [["leave", "user-1"]]);
});

test("CORS headers are only sent for configured origins", async () => {
  const { app } = buildApp({
    prisma: fakePrisma(),
    battleQueue: { join: async () => ({}), leave: () => ({}) },
    corsOrigins: ["http://localhost:5180"],
  });
  await withServer(app, async (base) => {
    const allowed = await fetch(`${base}/api/does-not-exist`, {
      headers: { origin: "http://localhost:5180" },
    });
    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      "http://localhost:5180",
    );

    const blocked = await fetch(`${base}/api/does-not-exist`, {
      headers: { origin: "https://evil.example" },
    });
    assert.equal(blocked.headers.get("access-control-allow-origin"), null);

    const preflight = await fetch(`${base}/api/battle/ranked/queue`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5180",
        "access-control-request-method": "POST",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get("access-control-allow-origin"),
      "http://localhost:5180",
    );
  });
  assert.deepEqual(socketCors([]), { origin: false });
  assert.deepEqual(socketCors(["http://localhost:5180"]), {
    origin: ["http://localhost:5180"],
  });
});
