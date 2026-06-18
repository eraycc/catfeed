import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const cameras = await db.camera.findMany({
    include: { community: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(cameras)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
}
