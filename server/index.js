import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required. See .env.example.");
const config = readConfig();
const prisma = new PrismaClient();
await prisma.$connect();
const app = createApp({ prisma, config });
const server = app.listen(config.port, config.host, () =>
  console.log(`WorldOfCodes listening on http://${config.host}:${config.port}`),
);
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
