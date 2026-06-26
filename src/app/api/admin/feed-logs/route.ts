import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, apiHandler } from "@/lib/api-helpers"

export async function GET(req: Request) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

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
  })
}

export async function DELETE(req: Request) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const { ids } = await req.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请选择要删除的记录" }, { status: 400 })
    }

    await db.feedLog.deleteMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({ success: true, deleted: ids.length })
  })
}
