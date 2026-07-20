import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { mimexPrisma?: PrismaClient }

export const db = globalForPrisma.mimexPrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.mimexPrisma = db
}
