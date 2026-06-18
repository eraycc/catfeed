import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const communities = await db.community.findMany({
    include: {
      _count: { select: { cameras: true, feeders: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(communities)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()
  const community = await db.community.create({
    data: {
      name: data.name,
      description: data.description || null,
      location: data.location || null,
      coverImage: data.coverImage || null,
    },
  })
  return NextResponse.json(community)
}
