import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const data = await req.json()
  const community = await db.community.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      location: data.location || null,
      coverImage: data.coverImage || null,
      isActive: data.isActive,
    },
  })
  return NextResponse.json(community)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await db.community.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
