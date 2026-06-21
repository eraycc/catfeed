import { db } from "@/lib/db"

export async function initializeDatabase() {
  const results: string[] = []

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456"

  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  })

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

  const communityCount = await db.community.count()
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

    await db.camera.createMany({
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
    })

    await db.feeder.createMany({
      data: [
        { communityId: c1.id, name: "1号投喂器", type: "SIMULATED", status: "ONLINE" },
        { communityId: c2.id, name: "2号投喂器", type: "SIMULATED", status: "ONLINE" },
      ],
    })

    results.push("Seed data created: 2 communities, 3 cameras, 2 feeders")
  } else {
    results.push("Seed data already exists")
  }

  return results
}
