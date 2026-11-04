import { PrismaClient } from "./prisma.js";
import { parseOrigins, startServer } from "./app.js";

const prisma = new PrismaClient();
const corsOrigins = parseOrigins(process.env.CORS_ORIGINS);
const { server, io } = await startServer({ prisma, corsOrigins });
const { address, port } = server.address();

console.log(`WorldOfCodes API listening on http://${address}:${port}`);
console.log(
  corsOrigins.length
    ? `CORS allowlist: ${corsOrigins.join(", ")}`
    : "CORS: same-origin only (set CORS_ORIGINS to allow other origins)",
);

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`${signal} received; closing server`);
  await new Promise((resolve) => io.close(resolve));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
