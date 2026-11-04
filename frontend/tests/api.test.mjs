import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testsDir = fileURLToPath(new URL(".", import.meta.url));
const frontendDir = fileURLToPath(new URL("..", import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), "woc-api-"));
const bundlePath = join(tempDir, "api.mjs");

execFileSync(
  fileURLToPath(import.meta.resolve('esbuild/bin/esbuild')),
  [
    join(frontendDir, "src", "lib", "api.ts"),
    "--bundle",
    "--format=esm",
    "--platform=node",
    `--outfile=${bundlePath}`,
    "--log-level=warning",
  ],
  { cwd: frontendDir, stdio: "inherit" },
);

const api = await import(pathToFileURL(bundlePath).href);

let handler = null;
let requests = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    const record = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: body ? JSON.parse(body) : null,
    };
    requests.push(record);
    handler(record, res);
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
api.configureApi({ baseUrl });

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

const user = {
  id: "u1",
  email: "ada@example.com",
  nickname: "Ada",
  avatarUrl: null,
  xp: 120,
  level: 2,
  coins: 30,
  nicknameChanges: 0,
  nextNicknameChange: "FREE",
};

beforeEach(() => {
  api.setToken(null);
  handler = null;
  requests = [];
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  rmSync(tempDir, { recursive: true, force: true });
});

test("register posts credentials and returns the session", async () => {
  handler = (_req, res) => json(res, 201, { token: "token-one", user });
  const result = await api.register({
    email: "ada@example.com",
    password: "correct horse",
    nickname: "Ada",
  });
  assert.equal(result.token, "token-one");
  assert.equal(result.user.nickname, "Ada");
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].url, "/auth/register");
  assert.deepEqual(requests[0].body, {
    email: "ada@example.com",
    password: "correct horse",
    nickname: "Ada",
  });
  assert.match(requests[0].headers["content-type"], /application\/json/);
});

test("me sends the bearer token and returns the current user", async () => {
  api.setToken("live-token");
  handler = (_req, res) => json(res, 200, user);
  const result = await api.me();
  assert.equal(result.email, "ada@example.com");
  assert.equal(requests[0].url, "/users/me");
  assert.equal(requests[0].headers.authorization, "Bearer live-token");
});

test("an expired session clears the stored token", async () => {
  api.setToken("stale-token");
  handler = (_req, res) =>
    json(res, 401, {
      error: { code: "UNAUTHORIZED", message: "Invalid or expired session" },
    });
  await assert.rejects(api.me(), (error) => {
    assert.ok(error instanceof api.ApiError);
    assert.equal(error.status, 401);
    assert.equal(error.code, "UNAUTHORIZED");
    assert.equal(error.message, "Invalid or expired session");
    return true;
  });
  assert.equal(api.getToken(), null);
});

test("a forbidden response keeps the valid session token", async () => {
  api.setToken("live-token");
  handler = (_req, res) =>
    json(res, 403, {
      error: { code: "FORBIDDEN", message: "Not allowed" },
    });
  await assert.rejects(api.me(), (error) => {
    assert.ok(error instanceof api.ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.code, "FORBIDDEN");
    return true;
  });
  assert.equal(api.getToken(), "live-token");
});

test("a rejected login keeps the previous token intact", async () => {
  api.setToken("keep-me");
  handler = (_req, res) =>
    json(res, 401, {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });
  await assert.rejects(
    api.login({ email: "ada@example.com", password: "wrong" }),
    (error) => error instanceof api.ApiError && error.status === 401,
  );
  assert.equal(api.getToken(), "keep-me");
});

test("logout accepts an empty 204 response", async () => {
  api.setToken("live-token");
  handler = (_req, res) => {
    res.writeHead(204);
    res.end();
  };
  assert.equal(await api.logout(), undefined);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].url, "/auth/logout");
});

test("profile updates patch the server and return the merged user", async () => {
  api.setToken("live-token");
  handler = (_req, res) =>
    json(res, 200, { ...user, nickname: "Ada_L", nicknameChanges: 1 });
  const result = await api.updateProfile({
    nickname: "Ada_L",
    avatarUrl: null,
  });
  assert.equal(result.nickname, "Ada_L");
  assert.equal(requests[0].method, "PATCH");
  assert.equal(requests[0].url, "/users/me");
  assert.deepEqual(requests[0].body, { nickname: "Ada_L", avatarUrl: null });
});

test("public profiles encode the nickname in the path", async () => {
  handler = (_req, res) =>
    json(res, 200, {
      id: "u1",
      nickname: "ada l",
      avatarUrl: null,
      xp: 120,
      level: 2,
      completedLessons: 3,
    });
  const result = await api.getPublicProfile("ada l");
  assert.equal(result.completedLessons, 3);
  assert.equal(requests[0].url, "/users/ada%20l");
});

test("non-json failures fall back to the http status", async () => {
  handler = (_req, res) => {
    res.writeHead(502, { "content-type": "text/html" });
    res.end("<h1>bad gateway</h1>");
  };
  await assert.rejects(api.me(), (error) => {
    assert.ok(error instanceof api.ApiError);
    assert.equal(error.status, 502);
    assert.equal(error.code, "HTTP_502");
    return true;
  });
});

test("an unreachable server raises a network error", async () => {
  const closed = http.createServer();
  await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const closedPort = closed.address().port;
  await new Promise((resolve) => closed.close(resolve));
  api.configureApi({ baseUrl: `http://127.0.0.1:${closedPort}` });
  try {
    await assert.rejects(api.me(), (error) => {
      assert.ok(error instanceof api.ApiError);
      assert.equal(error.status, 0);
      assert.equal(error.code, "NETWORK_ERROR");
      return true;
    });
  } finally {
    api.configureApi({ baseUrl });
  }
});

test("tokens round-trip without browser storage", () => {
  api.setToken("memory-token");
  assert.equal(api.getToken(), "memory-token");
  api.setToken(null);
  assert.equal(api.getToken(), null);
});
