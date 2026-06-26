import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, apiHandler } from "@/lib/api-helpers"

export async function GET() {
  return apiHandler(async () => {
    const communities = await db.community.findMany({
      include: {
        _count: { select: { cameras: true, feeders: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(communities)
  })
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

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
  })
}
