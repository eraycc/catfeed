import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, apiHandler } from "@/lib/api-helpers"

export async function GET() {
  return apiHandler(async () => {
    const cameras = await db.camera.findMany({
      include: { community: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(cameras)
  })
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const data = await req.json()
    const camera = await db.camera.create({
      data: {
        communityId: data.communityId,
        name: data.name,
        streamUrl: data.streamUrl,
        status: data.status || "OFFLINE",
      },
    })
    return NextResponse.json(camera)
  })
}
