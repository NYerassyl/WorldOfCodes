import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createApp } from "./app.js";
import {
  findTraceExercise,
  gradeTraceOutput,
  listTraceExercises,
} from "../services/learning-backend/src/trace/catalog.js";

const ACTIVE = "a".repeat(40);
const REVOKED = "r".repeat(40);
const EXPIRED = "e".repeat(40);
const USER_ID = "trace-user-1";

function fakePrisma() {
  let nextId = 0;
  const persisted = [];
  const prisma = {
    authSession: {
      findUnique: async ({ where }) => {
        if (!where?.tokenHash) return null;
        // A valid token may be active, revoked, or expired. The HTTP auth
        // middleware is the one rejecting revoked/expired sessions.
        const { hashSessionToken } = await import(
          "../services/learning-backend/src/lib/security.js"
        );
        if (where.tokenHash === hashSessionToken(REVOKED)) {
          return {
            id: "revoked-session",
            userId: USER_ID,
            user: { id: USER_ID },
            expiresAt: new Date(Date.now() + 60000),
            revokedAt: new Date(),
          };
        }
        if (where.tokenHash === hashSessionToken(EXPIRED)) {
          return {
            id: "expired-session",
            userId: USER_ID,
            user: { id: USER_ID },
            expiresAt: new Date(Date.now() - 60000),
            revokedAt: null,
          };
        }
        return where.tokenHash === hashSessionToken(ACTIVE)
          ? {
              id: "active-session",
              userId: USER_ID,
              user: { id: USER_ID },
              expiresAt: new Date(Date.now() + 60000),
              revokedAt: null,
            }
          : null;
      },
    },
    traceAttempt: {
      create: async ({ data }) => {
        const saved = {
          id: `trace-attempt-${++nextId}`,
          exerciseId: data.exerciseId,
          submittedOutput: data.submittedOutput,
          isCorrect: data.isCorrect,
          createdAt: new Date("2026-11-10T12:00:00.000Z"),
          userId: data.userId,
        };
        persisted.push(saved);
        return saved;
      },
    },
    user: {
      update: async () => {
        throw new Error("Trace attempts must never award XP/coins");
      },
    },
  };
  return { prisma, persisted };
}

async function withApi(testCallback, opts = {}) {
  const { prisma, persisted } = fakePrisma();
  const app = createApp({ prisma, ...opts });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, init) => fetch(origin + path, init);
  try {
    return await testCallback({ request, persisted, prisma });
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

function postBody(output, token = ACTIVE) {
  return {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ output }),
  };
}

test("the original Python catalog is reused (five levels × ten)", () => {
  assert.equal(listTraceExercises().length, 50);
  for (let level = 1; level <= 5; level += 1) {
    assert.equal(listTraceExercises({ level }).length, 10);
    const path = new URL(
      `../services/fastapi-backend/trace/catalog/level${level}.json`,
      import.meta.url,
    );
    const original = JSON.parse(readFileSync(path, "utf8"));
    assert.deepEqual(
      original.map(({ id, title, difficulty }) => ({ id, title, difficulty })),
      listTraceExercises({ level }).map(({ id, title, difficulty }) => ({
        id,
        title,
        difficulty,
      })),
    );
  }
});

test("GET list and detail are public but never expose answer or explanation", async () => {
  await withApi(async ({ request }) => {
    const response = await request("/api/trace/exercises");
    assert.equal(response.status, 200);
    const items = (await response.json()).exercises;
    assert.equal(items.length, 50);
    assert.ok(items.every((item) => !("expected_stdout" in item)));
    assert.ok(items.every((item) => !("explanation" in item)));
    const detailed = await request("/api/trace/exercises/trace-5-01");
    assert.equal(detailed.status, 200);
    const body = (await detailed.json()).exercise;
    assert.match(body.code, /def search/);
    assert.equal(body.level, 5);
    assert.equal(typeof body.instructions, "string");
    assert.ok(!("expected_stdout" in body));
    assert.ok(!("expectedOutput" in body));
    assert.ok(!("explanation" in body));
    assert.ok(!("answer" in body));
  });
});

test("level, difficulty, and topic filters work together", async () => {
  await withApi(async ({ request }) => {
    for (const [level, difficulty] of [
      [1, "easy"],
      [2, "easy-medium"],
      [3, "medium"],
      [4, "medium-hard"],
      [5, "hard"],
    ]) {
      const response = await request(
        `/api/trace/exercises?level=${level}&difficulty=${difficulty}`,
      );
      assert.equal(response.status, 200);
      const exercises = (await response.json()).exercises;
      assert.equal(exercises.length, 10);
      assert.ok(exercises.every((item) => item.level === level && item.difficulty === difficulty));
    }
    const narrowed = await request(
      "/api/trace/exercises?level=5&difficulty=hard&topic=BACKTRACKING-DFS-MEMOIZATION",
    );
    assert.equal(narrowed.status, 200);
    assert.equal((await narrowed.json()).exercises.length, 10);
    const mismatch = await request("/api/trace/exercises?level=1&difficulty=hard");
    assert.deepEqual((await mismatch.json()).exercises, []);
  });
});

test("invalid filters and nonexistent exercise return structured errors", async () => {
  await withApi(async ({ request }) => {
    for (const q of [
      "level=0",
      "level=6",
      "level=2.5",
      "level=1&level=2",
      "difficulty=EXPERT",
      "topic=%3Cscript%3E",
      "unknown=1",
    ]) {
      const response = await request(`/api/trace/exercises?${q}`);
      assert.equal(response.status, 400, q);
      assert.equal((await response.json()).error.code, "INVALID_INPUT");
    }
    const notFound = await request("/api/trace/exercises/unknown");
    assert.equal(notFound.status, 404);
    assert.equal((await notFound.json()).error.code, "TRACE_EXERCISE_NOT_FOUND");
  });
});

test("attempts require valid Bearer sessions, never a client-supplied user id", async () => {
  await withApi(async ({ request, persisted }) => {
    const url = "/api/trace/exercises/trace-1-01/attempts";
    const anon = await request(url, {
      method: "POST",
      headers: { "content-type": "application/json", "X-User-Id": USER_ID },
      body: JSON.stringify({ output: "test" }),
    });
    assert.equal(anon.status, 401);
    for (const token of [REVOKED, EXPIRED, "invalid"]) {
      const response = await request(url, postBody("test", token));
      assert.equal(response.status, 401);
    }
    assert.equal(persisted.length, 0);
    const spoof = await request(url, {
      ...postBody("wrong"),
      body: JSON.stringify({ output: "wrong", userId: "someone-else" }),
    });
    assert.equal(spoof.status, 400);
    assert.equal(persisted.length, 0);
  });
});

test("correct and incorrect stdout persist attempts; explanation appears only on POST", async () => {
  await withApi(async ({ request, persisted }) => {
    const id = "trace-5-01";
    const exercise = findTraceExercise(id);
    const url = `/api/trace/exercises/${id}/attempts`;
    const first = await request(url, postBody("not correct"));
    assert.equal(first.status, 201);
    const bad = await first.json();
    assert.equal(bad.correct, false);
    assert.equal(bad.verdict, "INCORRECT");
    assert.equal(bad.expectedOutput, exercise.expected_stdout.slice(0, -1));
    assert.equal(bad.explanation, exercise.explanation);
    assert.equal(bad.submittedOutput, "not correct");
    const correctOutput = exercise.expected_stdout.slice(0, -1).replaceAll("\n", "\r\n");
    const second = await request(url, postBody(correctOutput));
    assert.equal(second.status, 201);
    const good = await second.json();
    assert.equal(good.correct, true);
    assert.equal(good.verdict, "CORRECT");
    assert.equal(good.submittedOutput, exercise.expected_stdout.slice(0, -1));
    assert.notEqual(good.attemptId, bad.attemptId);
    assert.deepEqual(
      persisted.map((record) => record.userId),
      [USER_ID, USER_ID],
    );
    assert.deepEqual(persisted.map((record) => record.isCorrect), [false, true]);
  });
});

test("whitespace must match; terminal newline may be omitted", async () => {
  const exercise = findTraceExercise("trace-1-01");
  const expected = exercise.expected_stdout.slice(0, -1);
  assert.equal(gradeTraceOutput(exercise, expected).correct, true);
  assert.equal(gradeTraceOutput(exercise, expected + "\n").correct, true);
  assert.equal(gradeTraceOutput(exercise, expected.replaceAll("\n", "\r\n")).correct, true);
  assert.equal(gradeTraceOutput(exercise, expected + " ").correct, false);
  assert.equal(gradeTraceOutput(exercise, expected.replaceAll("\n", " ")).correct, false);
});

test("bad POSTs do not persist and cannot modify profile rewards", async () => {
  await withApi(async ({ request, persisted }) => {
    const url = "/api/trace/exercises/trace-1-01/attempts";
    for (const body of [
      {},
      { answer: "wrong property" },
      { output: 123 },
      { output: "a".repeat(2001) },
      { output: "x", userId: USER_ID },
    ]) {
      const response = await request(url, {
        ...postBody("x"),
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
    }
    const unknown = await request("/api/trace/exercises/unknown/attempts", postBody("x"));
    assert.equal(unknown.status, 404);
    assert.equal(persisted.length, 0);
  });
});
