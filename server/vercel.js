import { PrismaClient } from "./prisma.js";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const globalState = globalThis;
const prisma = globalState.__worldOfCodesPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalState.__worldOfCodesPrisma = prisma;
}

const app = createApp({
  prisma,
  config: readConfig(),
  staticDirectory: "/var/empty/worldofcodes-static",
});

export default app;
