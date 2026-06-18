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
  await db.camera.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
