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
    const camera = await db.camera.update({
      where: { id },
      data: {
        communityId: data.communityId,
        name: data.name,
        streamUrl: data.streamUrl,
        status: data.status,
      },
    })
    return NextResponse.json(camera)
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
    await db.camera.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
