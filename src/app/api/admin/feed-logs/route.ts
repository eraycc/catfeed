import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")))

  const [feedLogs, total] = await Promise.all([
    db.feedLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
        camera: { select: { name: true } },
        feeder: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.feedLog.count(),
  ])

  return NextResponse.json({
    data: feedLogs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ids } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "请选择要删除的记录" }, { status: 400 })
  }

  await db.feedLog.deleteMany({
    where: { id: { in: ids } },
  })

  return NextResponse.json({ success: true, deleted: ids.length })
}
