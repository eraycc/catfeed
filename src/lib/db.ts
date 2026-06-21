import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  let url = process.env.DATABASE_URL || ""

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    if (!url.includes("connection_limit")) {
      url += url.includes("?") ? "&connection_limit=1" : "?connection_limit=1"
    }
    if (!url.includes("pool_timeout")) {
      url += "&pool_timeout=0"
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    datasources: {
      db: { url },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
