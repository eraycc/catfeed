import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      )
    }

    const { cameraId, feederId } = await req.json()

    if (!cameraId || !feederId) {
      return NextResponse.json(
        { error: "缺少参数" },
        { status: 400 }
      )
    }

    const camera = await db.camera.findUnique({
      where: { id: cameraId },
    })

    if (!camera) {
      return NextResponse.json(
        { error: "摄像头不存在" },
        { status: 404 }
      )
    }

    const feeder = await db.feeder.findUnique({
      where: { id: feederId },
    })

    if (!feeder) {
      return NextResponse.json(
        { error: "投喂器不存在" },
        { status: 404 }
      )
    }

    const feedLog = await db.feedLog.create({
      data: {
        userId: session.user.id,
        cameraId,
        feederId,
        amount: 1,
      },
    })

    return NextResponse.json({
      success: true,
      feedLogId: feedLog.id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "投喂失败，请稍后重试" },
      { status: 500 }
    )
  }
}
