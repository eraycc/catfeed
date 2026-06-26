import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, apiHandler } from "@/lib/api-helpers"

export async function GET() {
  return apiHandler(async () => {
    const feeders = await db.feeder.findMany({
      include: { community: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(feeders)
  })
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const data = await req.json()
    const feeder = await db.feeder.create({
      data: {
        communityId: data.communityId,
        name: data.name,
        type: data.type || "SIMULATED",
        status: data.status || "OFFLINE",
        httpConfig: data.httpConfig || null,
        yamlConfig: data.yamlConfig || null,
      },
    })
    return NextResponse.json(feeder)
  })
}
