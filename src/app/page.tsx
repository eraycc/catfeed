import { db } from "@/lib/db"
import { Header } from "@/components/Header"
import { CommunityCard } from "@/components/CommunityCard"

export const dynamic = 'force-dynamic'

async function ensureInit() {
  const count = await db.community.count()
  if (count > 0) return

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456"

  const bcrypt = await import("bcryptjs")
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const existingAdmin = await db.adminSetting.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    await db.adminSetting.create({
      data: { email: adminEmail, passwordHash },
    })
    const existingUser = await db.user.findUnique({
      where: { email: adminEmail },
    })
    if (!existingUser) {
      await db.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: "管理员",
          role: "ADMIN",
        },
      })
    }
  }

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
}

export default async function HomePage() {
  await ensureInit()

  const communities = await db.community.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { cameras: true, feeders: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">社区救助站</h1>
          <p className="text-muted-foreground">
            选择一个社区，观看流浪动物直播并远程投喂
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <CommunityCard
              key={community.id}
              id={community.id}
              name={community.name}
              description={community.description}
              location={community.location}
              cameraCount={community._count.cameras}
              feederCount={community._count.feeders}
            />
          ))}
        </div>

        {communities.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            暂无社区数据，请先在管理后台添加
          </div>
        )}
      </main>
    </div>
  )
}
