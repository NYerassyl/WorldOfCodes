import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createApp } from "../server/app.js";
import { readConfig } from "../server/config.js";
import { resolveSession } from "../server/socket-auth.js";
import { judgePython } from "../services/learning-backend/src/index.js";
import { solutions } from "./solutions.mjs";
const db = new URL(process.env.DATABASE_URL ?? "http://missing");
if (
  !["localhost", "127.0.0.1"].includes(db.hostname) ||
  !db.pathname.endsWith("_test")
)
  throw Error(
    "Integration tests require an isolated localhost database ending in _test",
  );
const prisma = new PrismaClient();
const serve = async (app) =>
  new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () =>
      resolve({ server: s, url: `http://127.0.0.1:${s.address().port}/api` }),
    );
  });
const suffix = Date.now().toString(36);
let token, user, other;
let server, url;
async function request(
  path,
  { method = "GET", body, auth = token, base = url } = {},
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    body: res.status === 204 ? null : await res.json(),
  };
}
const submit = (id, code = solutions[id]) =>
  request(`/problems/${id}/submit`, { method: "POST", body: { code } });
test(
  "PostgreSQL + HTTP + Docker integration",
  { timeout: 240000 },
  async (t) => {
    ({ server, url } = await serve(
      createApp({
        prisma,
        config: readConfig({
          AUTH_RATE_LIMIT: "100",
          SUBMISSION_RATE_LIMIT: "200",
        }),
        staticDirectory: "/missing",
      }),
    ));
    try {
      await t.test("migration history and seed counts", async () => {
        const migrations =
          await prisma.$queryRaw`SELECT migration_name, checksum, finished_at FROM _prisma_migrations ORDER BY migration_name`;
        assert.equal(migrations.length, 4);
        for (const m of migrations) {
          assert.ok(m.finished_at);
          const source = await readFile(
            `services/learning-backend/prisma/migrations/${m.migration_name}/migration.sql`,
          );
          assert.equal(
            createHash("sha256").update(source).digest("hex"),
            m.checksum,
          );
        }
        assert.equal(await prisma.problem.count(), 16);
        assert.equal(await prisma.lesson.count(), 6);
        assert.equal(await prisma.copyExercise.count(), 3);
      });
      await t.test(
        "registration, login, session restoration, profile privacy and authorization",
        async () => {
          const r = await request("/auth/register", {
            method: "POST",
            auth: null,
            body: {
              email: `integration-${suffix}@example.test`,
              nickname: `it_${suffix}`,
              password: "LongTestPassword_123",
            },
          });
          assert.equal(r.status, 201);
          ({ token, user } = r.body);
          assert.equal((await request("/users/me")).body.id, user.id);
          const bad = await request("/auth/login", {
            method: "POST",
            auth: null,
            body: { email: user.email, password: "wrong_password" },
          });
          assert.equal(bad.status, 401);
          const second = await request("/auth/register", {
            method: "POST",
            auth: null,
            body: {
              email: `second-${suffix}@example.test`,
              nickname: `second_${suffix}`,
              password: "LongTestPassword_123",
            },
          });
          assert.equal(second.status, 201);
          other = second.body.user;
          assert.equal(
            (
              await request("/users/me", {
                method: "PATCH",
                body: { userId: other.id, nickname: "intruder" },
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(`/users/${other.nickname}`, {
                method: "PATCH",
                body: { nickname: "intruder" },
              })
            ).status,
            404,
          );
          assert.equal(
            (
              await request("/users/me", {
                method: "PATCH",
                body: { xp: 9999, coins: 9999 },
              })
            ).status,
            400,
          );
          const publicProfile = (
            await request(`/users/${other.nickname}`, { auth: null })
          ).body;
          assert.deepEqual(
            Object.keys(publicProfile).sort(),
            [
              "id",
              "nickname",
              "avatarUrl",
              "xp",
              "level",
              "completedLessons",
            ].sort(),
          );
          const own = await request("/users/me", {
            method: "PATCH",
            body: { nickname: `renamed_${suffix}` },
          });
          assert.equal(own.status, 200);
          user = own.body;
          assert.equal(
            (
              await request("/users/me", {
                method: "PATCH",
                body: { nickname: `again_${suffix}` },
              })
            ).status,
            402,
          );
          assert.equal((await resolveSession(prisma, token)).userId, user.id);
        },
      );
      const bank = (await request("/problems", { auth: null })).body.problems;
      await t.test(
        "all 16 starter functions are public; hidden tests stay private",
        async () => {
          assert.equal(bank.length, 16);
          for (const p of bank) {
            assert.ok(p.starterCode.startsWith("def "));
            assert.equal(p.examples.length, 1);
            assert.ok(!("testCases" in p));
            assert.equal(
              (await request(`/problems/${p.id}`)).body.problem.starterCode,
              p.starterCode,
            );
          }
          assert.ok(
            (
              await request("/problems?topic=sorting&difficulty=EASY")
            ).body.problems.every(
              (p) => p.topicSlug === "sorting" && p.difficulty === "EASY",
            ),
          );
        },
      );
      await t.test(
        "wrong and runtime-error submissions cannot award rewards or finish a lesson",
        async () => {
          await request("/learning/lessons/py-variables-lesson/start", {
            method: "POST",
          });
          assert.equal(
            (await submit("py-double", "def double(n):\n    return 0")).body
              .status,
            "WRONG_ANSWER",
          );
          assert.equal(
            (
              await submit(
                "py-double",
                "def double(n):\n    raise ValueError()",
              )
            ).body.status,
            "RUNTIME_ERROR",
          );
          assert.equal((await request("/users/me")).body.xp, 0);
          assert.equal(
            (await request("/learning/progress")).body.lessons[0].state,
            "IN_PROGRESS",
          );
        },
      );
      await t.test(
        "concurrent first completions award exactly once",
        async () => {
          const results = await Promise.all([
            submit("py-double"),
            submit("py-double"),
          ]);
          for (const r of results) {
            assert.equal(r.status, 200);
            assert.equal(r.body.status, "ACCEPTED");
          }
          assert.equal(results.filter((r) => r.body.rewarded).length, 1);
          assert.equal((await request("/users/me")).body.xp, 20);
          assert.equal((await submit("py-double")).body.earnedXp, 0);
          assert.equal(
            (await request("/learning/progress")).body.lessons[0].state,
            "IN_PROGRESS",
          );
        },
      );
      await t.test(
        "six topics complete only after successful practices; all algorithm functions execute",
        async () => {
          const courses = (await request("/learning/courses")).body.courses;
          assert.equal(courses[0].topics.length, 6);
          for (const topic of courses[0].topics) {
            for (const l of topic.lessons) {
              const lesson = (await request(`/learning/lessons/${l.id}`)).body
                .lesson;
              assert.ok(lesson.theoryMd);
              assert.equal(lesson.problems.length, 2);
              for (const p of lesson.problems) {
                assert.ok(p.starterCode);
                const r = await submit(p.id);
                assert.equal(r.status, 200, JSON.stringify(r.body));
                assert.equal(r.body.status, "ACCEPTED", p.id);
              }
            }
          }
          for (const p of bank.filter((p) => !p.lessonId))
            assert.equal((await submit(p.id)).body.status, "ACCEPTED", p.id);
          const progress = (await request("/learning/progress")).body;
          assert.equal(
            progress.lessons.filter((l) => l.state === "COMPLETED").length,
            6,
          );
          assert.equal(progress.completedProblems.length, 16);
          const me = (await request("/users/me")).body;
          assert.equal(
            me.xp,
            bank.reduce((n, p) => n + p.rewardXp, 0),
          );
          assert.equal(
            me.coins,
            bank.reduce((n, p) => n + p.rewardCoins, 0),
          );
          assert.equal(me.level, Math.floor(me.xp / 100) + 1);
        },
      );
      await t.test(
        "exact-copy comparisons and concurrent duplicate rewards",
        async () => {
          for (const e of (await request("/copy-exercises")).body.exercises) {
            const exercise = (await request(`/copy-exercises/${e.id}`)).body
              .exercise;
            const send = (code) =>
              request(`/copy-exercises/${e.id}/submit`, {
                method: "POST",
                body: { code },
              });
            assert.equal(
              (await send(exercise.templateCode + " ")).body.isExact,
              false,
            );
            const results = await Promise.all([
              send(exercise.templateCode),
              send(exercise.templateCode),
            ]);
            assert.equal(results.filter((r) => r.body.rewarded).length, 1);
            for (const r of results) assert.equal(r.body.isExact, true);
          }
          assert.equal(
            (await request("/copy-exercises/progress")).body.completed.length,
            3,
          );
        },
      );
      await t.test(
        "authenticated submission rate limit returns 429",
        async () => {
          const limited = await serve(
            createApp({
              prisma,
              config: readConfig({ SUBMISSION_RATE_LIMIT: "1" }),
              staticDirectory: "/missing",
            }),
          );
          try {
            const options = {
              method: "POST",
              body: { code: "wrong" },
              base: limited.url,
            };
            assert.equal(
              (await request("/copy-exercises/copy-if/submit", options)).status,
              200,
            );
            assert.equal(
              (await request("/copy-exercises/copy-if/submit", options)).status,
              429,
            );
          } finally {
            await new Promise((r) => limited.server.close(r));
          }
        },
      );
      await t.test(
        "judge infrastructure failure creates no false Accepted or reward",
        async () => {
          const before = await prisma.submission.count({
            where: { userId: user.id },
          });
          const broken = await serve(
            createApp({
              prisma,
              judge: (input) =>
                judgePython({
                  ...input,
                  image: "woc-deliberately-missing:never",
                }),
              staticDirectory: "/missing",
            }),
          );
          try {
            const r = await request("/problems/py-double/submit", {
              method: "POST",
              body: { code: solutions["py-double"] },
              base: broken.url,
            });
            assert.equal(r.status, 503);
            assert.equal(r.body.error.code, "JUDGE_UNAVAILABLE");
            assert.equal(
              await prisma.submission.count({ where: { userId: user.id } }),
              before,
            );
          } finally {
            await new Promise((r) => broken.server.close(r));
          }
        },
      );
      await t.test("time limit stops the container", async () => {
        const began = Date.now();
        const verdict = await judgePython({
          sourceCode: "def hang():\n    while True: pass",
          functionName: "hang",
          cases: [{ argsJson: "[]", expectedJson: "null" }],
          timeoutMs: 1500,
        });
        assert.equal(verdict.status, "TIME_LIMIT");
        assert.ok(
          Date.now() - began < 10000,
          "timeout must promptly stop its container",
        );
        const running = execFileSync(
          "docker",
          ["ps", "--filter", "name=woc-judge-", "--format", "{{.Names}}"],
          { encoding: "utf8" },
        );
        assert.equal(running.trim(), "");
      });
      await t.test(
        "logout revocation, relogin and persistent PostgreSQL progress",
        async () => {
          const before = (await request("/users/me")).body;
          assert.equal(
            await prisma.rewardLedger.count({ where: { userId: user.id } }),
            19,
          );
          assert.equal(
            (await request("/auth/logout", { method: "POST" })).status,
            204,
          );
          assert.equal((await request("/users/me")).status, 401);
          assert.equal(await resolveSession(prisma, token), null);
          const login = await request("/auth/login", {
            method: "POST",
            auth: null,
            body: { email: user.email, password: "LongTestPassword_123" },
          });
          assert.equal(login.status, 200);
          token = login.body.token;
          const restored = (await request("/users/me")).body;
          assert.equal(restored.xp, before.xp);
          assert.equal(restored.coins, before.coins);
          assert.equal(restored.completedLessons, 6);
          assert.equal(
            (await request("/learning/progress")).body.completedProblems.length,
            16,
          );
        },
      );
    } finally {
      await new Promise((r) => server.close(r));
      await prisma.$disconnect();
    }
  },
);
