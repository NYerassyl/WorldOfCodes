import { PrismaClient } from "./prisma.js";
import { startServer } from "./app.js";
import { readConfig } from "./config.js";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required. See .env.example.");

const config = readConfig();
const prisma = new PrismaClient();
await prisma.$connect();
const { server, io } = await startServer({ prisma, config });
const { address, port } = server.address();

console.log(`WorldOfCodes listening on http://${address}:${port}`);
console.log(
  config.origins.length
    ? `CORS allowlist: ${config.origins.join(", ")}`
    : "CORS: same-origin only (set CORS_ORIGINS to allow other origins)",
);

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} received; closing server`);
  await new Promise((resolve) => io.close(resolve));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
