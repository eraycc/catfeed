import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  let url = process.env.DATABASE_URL || ""

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const params = new URLSearchParams(url.split("?")[1] || "")

    if (!params.has("pgbouncer")) {
      params.set("pgbouncer", "true")
    }
    if (!params.has("connection_limit")) {
      params.set("connection_limit", "1")
    }
    if (!params.has("pool_timeout")) {
      params.set("pool_timeout", "0")
    }

    const baseUrl = url.split("?")[0]
    url = `${baseUrl}?${params.toString()}`
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
