import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456"

  // 检查是否已存在管理员用户
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "管理员",
        role: "ADMIN",
      },
    })

    console.log(`Admin user created: ${adminEmail}`)
  } else {
    console.log("Admin user already exists, skipping")
  }

  // 初始化系统配置
  const systemConfigs = [
    { key: "allow_feed", value: "true", label: "是否允许投喂" },
    { key: "max_feed_per_day", value: "10", label: "每用户每日最大投喂次数" },
  ]

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    })
  }

  console.log("System configs initialized")

  // 检查是否有社区数据
  const communityCount = await prisma.community.count()
  if (communityCount === 0) {
    const community1 = await prisma.community.create({
      data: {
        name: "阳光社区流浪猫救助站",
        description: "位于阳光社区花园旁，常年有20余只流浪猫生活",
        location: "阳光社区花园东侧",
      },
    })

    const community2 = await prisma.community.create({
      data: {
        name: "和平公园动物之家",
        description: "和平公园内官方救助点，配有专业护理人员",
        location: "和平公园南门",
      },
    })

    await prisma.camera.createMany({
      data: [
        {
          communityId: community1.id,
          name: "花园全景摄像头",
          streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
          status: "ONLINE",
        },
        {
          communityId: community1.id,
          name: "喂食区摄像头",
          streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
          status: "ONLINE",
        },
        {
          communityId: community2.id,
          name: "公园主摄像头",
          streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
          status: "ONLINE",
        },
      ],
    })

    await prisma.feeder.createMany({
      data: [
        {
          communityId: community1.id,
          name: "1号投喂器",
          type: "SIMULATED",
          status: "ONLINE",
        },
        {
          communityId: community2.id,
          name: "2号投喂器",
          type: "SIMULATED",
          status: "ONLINE",
        },
      ],
    })

    console.log("Seed data created: 2 communities, 3 cameras, 2 feeders")
  } else {
    console.log("Communities already exist, skipping seed data")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
