import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

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
  const updateData: any = {
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

  if (id === session.user.id) {
    return NextResponse.json({ error: "不能删除自己" }, { status: 400 })
  }

  await db.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
