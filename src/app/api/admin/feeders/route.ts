import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const feeders = await db.feeder.findMany({
    include: { community: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(feeders)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()
  const feeder = await db.feeder.create({
    data: {
      communityId: data.communityId,
      name: data.name,
      type: data.type || "SIMULATED",
      status: data.status || "OFFLINE",
    },
  })
  return NextResponse.json(feeder)
}
