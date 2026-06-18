import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "请填写所有字段" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少6位" },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}
