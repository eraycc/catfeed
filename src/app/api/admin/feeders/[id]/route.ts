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
    const feeder = await db.feeder.update({
      where: { id },
      data: {
        communityId: data.communityId,
        name: data.name,
        type: data.type,
        status: data.status,
        httpConfig: data.httpConfig !== undefined ? data.httpConfig : undefined,
        yamlConfig: data.yamlConfig !== undefined ? data.yamlConfig : undefined,
      },
    })
    return NextResponse.json(feeder)
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
    await db.feeder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
