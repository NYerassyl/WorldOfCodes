import http from "node:http";
import express from "express";
import {
  createAuthRouter,
  createCopyRouter,
  createLearningRouter,
  makeRequireAuth,
  createProblemsRouter,
} from "../services/learning-backend/src/index.js";
import {
  MatchmakingQueue,
  attachBattleSocket,
  createBattleRouter,
} from "../services/learning-backend/src/battle/index.js";
import { errorMiddleware } from "../services/learning-backend/src/lib/errors.js";

export function parseOrigins(value = "") {
  return String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createCorsMiddleware(origins = []) {
  const allowed = new Set(origins);
  return (req, res, next) => {
    const origin = req.get("origin");
    if (origin && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PATCH,DELETE,OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization,Content-Type",
      );
      res.setHeader("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  };
}

export function socketCors(origins = []) {
  return origins.length ? { origin: origins } : { origin: false };
}

export function buildApp({
  prisma,
  battleQueue = new MatchmakingQueue(prisma),
  corsOrigins = [],
} = {}) {
  if (!prisma) throw new Error("A Prisma client is required");
  const app = express();
  app.disable("x-powered-by");
  app.use(createCorsMiddleware(corsOrigins));
  app.use(express.json({ limit: "32kb" }));
  const auth = makeRequireAuth(prisma);
  app.use("/api", createAuthRouter(prisma));
  app.use("/api", createLearningRouter(prisma, auth));
  app.use("/api", createProblemsRouter(prisma, auth));
  app.use("/api", createCopyRouter(prisma, auth));
  app.use("/api", createBattleRouter(prisma, auth, { queue: battleQueue }));
  app.use("/api", (_req, res) =>
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Route not found" } }),
  );
  app.use(errorMiddleware);
  return { app, battleQueue };
}

export async function startServer({
  prisma,
  port = Number(process.env.PORT || 4001),
  host = process.env.HOST || "127.0.0.1",
  corsOrigins = [],
} = {}) {
  const { app, battleQueue } = buildApp({ prisma, corsOrigins });
  const server = http.createServer(app);
  const io = await attachBattleSocket(server, prisma, {
    queue: battleQueue,
    cors: socketCors(corsOrigins),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  return { app, server, io, battleQueue };
}
