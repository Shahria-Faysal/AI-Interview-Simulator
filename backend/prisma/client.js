/**
 * prisma/client.js
 * Exports a shared Prisma client instance.
 * Using a singleton avoids creating multiple connection pools in development
 * (hot-reloading would otherwise create a new client on every file change).
 */

const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
