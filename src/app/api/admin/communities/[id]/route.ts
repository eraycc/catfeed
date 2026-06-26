import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, apiHandler } from "@/lib/api-helpers"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

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
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const { id } = await params
    await db.community.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
