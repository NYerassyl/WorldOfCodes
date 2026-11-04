import http from "node:http";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAuthRouter,
  createCopyRouter,
  createLearningRouter,
  makeRequireAuth,
  createProblemsRouter,
  judgePython,
} from "../services/learning-backend/src/index.js";
import {
  MatchmakingQueue,
  attachBattleSocket,
  createBattleRouter,
} from "../services/learning-backend/src/battle/index.js";
import {
  AppError,
  errorMiddleware,
} from "../services/learning-backend/src/lib/errors.js";
import { readConfig } from "./config.js";
import { createJudgeQueue } from "./judge-queue.js";

export function parseOrigins(value = "") {
  return String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function socketCors(origins = []) {
  return origins.length ? { origin: origins } : { origin: false };
}

export function createApp({
  prisma,
  config = readConfig(),
  judge = judgePython,
  judgeQueue,
  battleQueue = new MatchmakingQueue(prisma),
  staticDirectory = resolve("frontend/dist"),
} = {}) {
  if (!prisma) throw new Error("Prisma client is required");
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxyHops);
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    cors({
      origin(origin, done) {
        if (!origin || config.origins.includes(origin)) return done(null, true);
        done(
          new AppError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed"),
        );
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false,
      maxAge: 600,
    }),
  );
  const limiter = (limit, windowMs, code) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: { code, message: "Too many requests. Try again later." },
      },
    });
  app.use(
    ["/api/auth/login", "/api/auth/register"],
    limiter(config.authLimit, config.authWindow, "AUTH_RATE_LIMITED"),
  );
  const api = express.Router();
  const auth = makeRequireAuth(prisma);
  api.use(express.json({ limit: config.bodyLimit }));
  api.use(
    [
      "/problems/:id/submit",
      "/copy-exercises/:id/submit",
      "/battle/matches/:matchId/submit",
    ],
    limiter(
      config.submissionLimit,
      config.submissionWindow,
      "SUBMISSION_RATE_LIMITED",
    ),
  );
  const queuedJudge =
    judgeQueue ??
    createJudgeQueue(judge, {
      concurrency: config.judgeConcurrency,
      maxQueued: config.judgeQueueLimit,
    });
  api.get("/health", (_req, res) => res.json({ status: "ok" }));
  api.use(createAuthRouter(prisma));
  api.use(createLearningRouter(prisma, auth));
  api.use(createProblemsRouter(prisma, auth, { judge: queuedJudge }));
  api.use(createCopyRouter(prisma, auth));
  api.use(
    createBattleRouter(prisma, auth, { queue: battleQueue, judge: queuedJudge }),
  );
  api.use((_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "API route not found")),
  );
  app.use("/api", api);
  if (existsSync(staticDirectory)) {
    app.use(express.static(staticDirectory));
    app.get("*", (_req, res) =>
      res.sendFile(resolve(staticDirectory, "index.html")),
    );
  }
  app.use(errorMiddleware);
  return app;
}

export function buildApp({
  prisma,
  battleQueue,
  corsOrigins = [],
  config = readConfig(),
  judge = judgePython,
  staticDirectory,
} = {}) {
  const queue = battleQueue ?? new MatchmakingQueue(prisma);
  const mergedConfig = corsOrigins.length
    ? { ...config, origins: corsOrigins }
    : config;
  const app = createApp({
    prisma,
    config: mergedConfig,
    judge,
    battleQueue: queue,
    staticDirectory,
  });
  return { app, battleQueue: queue };
}

export async function startServer({
  prisma,
  config = readConfig(),
  judge = judgePython,
  staticDirectory,
} = {}) {
  const battleQueue = new MatchmakingQueue(prisma);
  const judgeQueue = createJudgeQueue(judge, {
    concurrency: config.judgeConcurrency,
    maxQueued: config.judgeQueueLimit,
  });
  const app = createApp({
    prisma,
    config,
    judgeQueue,
    battleQueue,
    staticDirectory,
  });
  const server = http.createServer(app);
  const io = await attachBattleSocket(server, prisma, {
    queue: battleQueue,
    judge: judgeQueue,
    cors: socketCors(config.origins),
  });
  io.use((socket, next) => {
    const origin = socket.handshake.headers?.origin;
    if (origin && !config.origins.includes(origin)) {
      return next(new Error("ORIGIN_NOT_ALLOWED"));
    }
    return next();
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolveListen();
    });
  });
  return { app, server, io, battleQueue };
}
