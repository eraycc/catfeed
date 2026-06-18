import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456"

  const existingAdmin = await prisma.adminSetting.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    await prisma.adminSetting.create({
      data: {
        email: adminEmail,
        passwordHash,
      },
    })

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: "管理员",
          role: "ADMIN",
        },
      })
    }

    console.log(`Admin user created: ${adminEmail}`)
  } else {
    console.log("Admin already initialized, skipping env admin creation")
  }

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
