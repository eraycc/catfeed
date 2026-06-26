import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { requireAdmin, apiHandler } from "@/lib/api-helpers"

export async function GET() {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { feedLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(users)
  })
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const data = await req.json()
    const passwordHash = await bcrypt.hash(data.password, 12)

    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role || "USER",
      },
    })
    return NextResponse.json({ id: user.id, email: user.email })
  })
}
