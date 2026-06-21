export async function initializeDatabase() {
  const results: string[] = []
  const { PrismaClient } = await import("@prisma/client")

  let url = process.env.DATABASE_URL || ""

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const params = new URLSearchParams(url.split("?")[1] || "")

    if (!params.has("pgbouncer")) {
      params.set("pgbouncer", "true")
    }
    if (!params.has("connection_limit")) {
      params.set("connection_limit", "1")
    }
    if (!params.has("pool_timeout")) {
      params.set("pool_timeout", "0")
    }

    const baseUrl = url.split("?")[0]
    url = `${baseUrl}?${params.toString()}`
  }

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    datasources: {
      db: { url },
    },
  })

  try {
    await prisma.community.count()
    results.push("Tables already exist")
  } catch (error) {
    console.log("Tables do not exist, creating...")
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS catfeed_feed_logs CASCADE`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS catfeed_cameras CASCADE`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS catfeed_feeders CASCADE`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS catfeed_system_configs CASCADE`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS catfeed_users CASCADE`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS catfeed_communities CASCADE`)
      results.push("Cleaned existing tables")

      await prisma.$executeRawUnsafe(`
        CREATE TABLE catfeed_communities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          location TEXT,
          cover_image TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `)
      results.push("catfeed_communities created")

      await prisma.$executeRawUnsafe(`
        CREATE TABLE catfeed_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          name TEXT,
          role TEXT NOT NULL DEFAULT 'USER',
          is_active BOOLEAN DEFAULT TRUE,
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `)
      results.push("catfeed_users created")

      await prisma.$executeRawUnsafe(`
        CREATE TABLE catfeed_cameras (
          id TEXT PRIMARY KEY,
          community_id TEXT NOT NULL REFERENCES catfeed_communities(id),
          name TEXT NOT NULL,
          stream_url TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'OFFLINE',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `)
      results.push("catfeed_cameras created")

      await prisma.$executeRawUnsafe(`
        CREATE TABLE catfeed_feeders (
          id TEXT PRIMARY KEY,
          community_id TEXT NOT NULL REFERENCES catfeed_communities(id),
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'SIMULATED',
          status TEXT NOT NULL DEFAULT 'OFFLINE',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `)
      results.push("catfeed_feeders created")

      await prisma.$executeRawUnsafe(`
        CREATE TABLE catfeed_system_configs (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          label TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `)
      results.push("catfeed_system_configs created")

      await prisma.$executeRawUnsafe(`
        CREATE TABLE catfeed_feed_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES catfeed_users(id),
          camera_id TEXT NOT NULL REFERENCES catfeed_cameras(id),
          feeder_id TEXT NOT NULL REFERENCES catfeed_feeders(id),
          amount INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)
      results.push("catfeed_feed_logs created")

      await prisma.$executeRawUnsafe(`
        CREATE INDEX idx_catfeed_feed_logs_user_id ON catfeed_feed_logs(user_id)
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX idx_catfeed_feed_logs_camera_id ON catfeed_feed_logs(camera_id)
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX idx_catfeed_feed_logs_created_at ON catfeed_feed_logs(created_at)
      `)
      results.push("Indexes created")

    } catch (e: any) {
      console.error("Failed to create tables:", e)
      await prisma.$disconnect()
      throw new Error(`Database initialization failed: ${e.message}`)
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456"

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const bcrypt = await import("bcryptjs")
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    await prisma.user.create({
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
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    })
  }
  results.push("System configs initialized")

  const communityCount = await prisma.community.count()
  if (communityCount === 0) {
    const c1 = await prisma.community.create({
      data: {
        name: "阳光社区流浪猫救助站",
        description: "位于阳光社区花园旁，常年有20余只流浪猫生活",
        location: "阳光社区花园东侧",
      },
    })

    const c2 = await prisma.community.create({
      data: {
        name: "和平公园动物之家",
        description: "和平公园内官方救助点，配有专业护理人员",
        location: "和平公园南门",
      },
    })

    await prisma.camera.createMany({
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

    await prisma.feeder.createMany({
      data: [
        { communityId: c1.id, name: "1号投喂器", type: "SIMULATED", status: "ONLINE" },
        { communityId: c2.id, name: "2号投喂器", type: "SIMULATED", status: "ONLINE" },
      ],
    })

    results.push("Seed data created: 2 communities, 3 cameras, 2 feeders")
  } else {
    results.push("Seed data already exists")
  }

  await prisma.$disconnect()
  return results
}