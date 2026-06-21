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

    // 检查系统配置 - 是否允许投喂
    const allowFeedConfig = await db.systemConfig.findUnique({
      where: { key: "allow_feed" },
    })
    if (allowFeedConfig?.value === "false") {
      return NextResponse.json(
        { error: "当前暂停投喂服务" },
        { status: 403 }
      )
    }

    // 检查每用户每日投喂次数限制
    const maxFeedPerDayConfig = await db.systemConfig.findUnique({
      where: { key: "max_feed_per_day" },
    })
    const maxFeedPerDay = maxFeedPerDayConfig ? parseInt(maxFeedPerDayConfig.value) : 10

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayFeedCount = await db.feedLog.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    if (todayFeedCount >= maxFeedPerDay) {
      return NextResponse.json(
        { error: `今日投喂次数已达上限（${maxFeedPerDay}次）` },
        { status: 403 }
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

    // 验证 camera 和 feeder 是否属于同一个 community
    if (camera.communityId !== feeder.communityId) {
      return NextResponse.json(
        { error: "摄像头和投喂器不属于同一社区" },
        { status: 400 }
      )
    }

    // 根据投喂器类型执行不同的逻辑
    if (feeder.type === "SIMULATED") {
      // 模拟投喂器 - 仅记录日志
      console.log(`[SIMULATED] User ${session.user.id} fed via feeder ${feederId}`)
    } else if (feeder.type === "REAL") {
      // 真实投喂器 - 这里可以添加实际的硬件控制逻辑
      // 例如：发送 MQTT 消息到投喂器硬件
      console.log(`[REAL] User ${session.user.id} triggered feeder ${feederId}`)
    }

    const feedLog = await db.feedLog.create({
      data: {
        userId: session.user.id,
        communityId: camera.communityId,
        cameraId,
        feederId,
        amount: 1,
      },
    })

    return NextResponse.json({
      success: true,
      feedLogId: feedLog.id,
      todayFeedCount: todayFeedCount + 1,
      maxFeedPerDay,
    })
  } catch (error) {
    console.error("Feed error:", error)
    return NextResponse.json(
      { error: "投喂失败，请稍后重试" },
      { status: 500 }
    )
  }
}
