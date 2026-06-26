import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { execSync } from "child_process"

export async function POST() {
  try {
    const results: string[] = []

    // 1. 始终先同步数据库 schema（prisma db push 是幂等的，已有表/列会跳过）
    const dbUrl = process.env.DATABASE_URL || ""
    try {
      execSync("npx prisma db push --skip-generate", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: dbUrl },
      })
      results.push("Schema synced")
    } catch (e: any) {
      console.error("[init] Schema sync failed:", e.message)
      return NextResponse.json(
        { error: "数据库 schema 同步失败" },
        { status: 500 }
      )
    }

    // 2. 检查是否已完成初始化 —— 若管理员和社区数据均存在则跳过
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
    const [existingAdmin, communityCount] = await Promise.all([
      db.user.findUnique({ where: { email: adminEmail } }),
      db.community.count(),
    ])

    if (existingAdmin && communityCount > 0) {
      return NextResponse.json({
        success: true,
        message: "系统已初始化，仅执行了 schema 同步",
        results,
      })
    }

    // 3. 创建管理员（如果不存在）
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123456"

    if (!existingAdmin) {
      const bcrypt = await import("bcryptjs")
      const passwordHash = await bcrypt.hash(adminPassword, 12)

      await db.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: "管理员",
          role: "ADMIN",
        },
      })

      results.push("Admin created")
    } else {
      results.push("Admin already exists")
    }

    // 4. 初始化系统配置
    const systemConfigs = [
      { key: "allow_feed", value: "true", label: "是否允许投喂" },
      { key: "max_feed_per_day", value: "10", label: "每用户每日最大投喂次数" },
    ]

    for (const config of systemConfigs) {
      await db.systemConfig.upsert({
        where: { key: config.key },
        update: {},
        create: config,
      })
    }
    results.push("System configs initialized")

    // 5. 创建种子数据（如果不存在）
    if (communityCount === 0) {
      const c1 = await db.community.create({
        data: {
          name: "阳光社区流浪猫救助站",
          description: "位于阳光社区花园旁，常年有20余只流浪猫生活",
          location: "阳光社区花园东侧",
        },
      })

      const c2 = await db.community.create({
        data: {
          name: "和平公园动物之家",
          description: "和平公园内官方救助点，配有专业护理人员",
          location: "和平公园南门",
        },
      })

      await db.$transaction([
        db.camera.createMany({
          data: [
            {
              communityId: c1.id,
              name: "花园全景摄像头",
              streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
              status: "ONLINE",
            },
            {
              communityId: c1.id,
              name: "喂食区摄像头",
              streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
              status: "ONLINE",
            },
            {
              communityId: c2.id,
              name: "公园主摄像头",
              streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
              status: "ONLINE",
            },
          ],
        }),
        db.feeder.createMany({
          data: [
            { communityId: c1.id, name: "1号投喂器", type: "SIMULATED", status: "ONLINE" },
            { communityId: c2.id, name: "2号投喂器", type: "SIMULATED", status: "ONLINE" },
          ],
        }),
      ])

      results.push("Seed data created: 2 communities, 3 cameras, 2 feeders")
    } else {
      results.push("Seed data already exists")
    }

    return NextResponse.json({ success: true, results })
  } catch (e) {
    console.error("[init] 初始化失败:", e)
    return NextResponse.json(
      { error: "初始化失败，请检查数据库连接和环境变量配置" },
      { status: 500 }
    )
  }
}
