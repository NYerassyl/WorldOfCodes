import { createRequire } from "node:module";

const requireFromService = createRequire(
  new URL("../services/learning-backend/package.json", import.meta.url),
);

// Resolve Prisma from the service package so the shared server and the
// learning/battle modules use the single client generated from that schema.
export const { PrismaClient } = requireFromService("@prisma/client");
