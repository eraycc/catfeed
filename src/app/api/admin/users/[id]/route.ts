import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
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
    const updateData: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ id: user.id, email: user.email })
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const { id } = await params
    const data = await req.json()

    // PATCH 仅更新传入的字段
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.role !== undefined) updateData.role = data.role
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12)

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ id: user.id, email: user.email })
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { error, session } = await requireAdmin()
    if (error) return error

    const { id } = await params

    if (id === session!.user.id) {
      return NextResponse.json({ error: "不能删除自己" }, { status: 400 })
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
