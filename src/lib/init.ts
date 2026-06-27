let dbInitialized = false

export async function initializeDatabase() {
  // 模块级标志位：已初始化则跳过，避免每次请求重复执行
  if (dbInitialized) return ["Already initialized (skipped)"]

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

  // 同步 schema：确保所有表和列存在
  try {
    await syncSchema(prisma)
    results.push("Schema synced")
  } catch (e: any) {
    console.error("[init] Schema sync failed:", e.message)
    await prisma.$disconnect()
    throw new Error(`Database initialization failed: ${e.message}`)
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

    await prisma.$transaction([
      prisma.camera.createMany({
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
      prisma.feeder.createMany({
        data: [
          { communityId: c1.id, name: "1号投喂器", type: "SIMULATED", status: "ONLINE" },
          { communityId: c2.id, name: "2号投喂器", type: "SIMULATED", status: "ONLINE" },
          {
            communityId: c1.id,
            name: "HTTP 示例投喂器",
            type: "HTTP",
            status: "OFFLINE",
            httpConfig: JSON.stringify({
              url: "https://httpbin.org/post",
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: { action: "feed", amount: "{{amount}}", device: "demo-feeder" },
              validate: { field: "json.action", equals: "feed", error: "验证失败" },
              timeout: 10000,
            }),
          },
          {
            communityId: c2.id,
            name: "YAML 示例投喂器",
            type: "YAML",
            status: "OFFLINE",
            yamlConfig: `name: "YAML 示例投喂器"
description: "多阶段投喂示例 (使用 httpbin.org 测试)"

env:
  BASE_URL: "https://httpbin.org"

stages:
  - name: "检查状态"
    request:
      url: "{{BASE_URL}}/get"
      method: GET
    validate:
      - field: "url"
        contains: "httpbin"
        error: "服务不可用"
    extract:
      server_url: "url"

  - name: "执行投喂"
    request:
      url: "{{BASE_URL}}/post"
      method: POST
      headers:
        Content-Type: "application/json"
      body:
        action: "feed"
        amount: "{{amount}}"
        server: "{{server_url}}"
    validate:
      - field: "json.action"
        equals: "feed"
        error: "投喂失败"
`,
          },
        ],
      }),
    ])

    results.push("Seed data created: 2 communities, 3 cameras, 2 feeders")
  } else {
    results.push("Seed data already exists")
  }

  await prisma.$disconnect()
  dbInitialized = true
  return results
}

/**
 * 同步数据库 schema：检查表和列是否存在，缺失则创建/添加
 * 使用 Prisma Client 的 $executeRawUnsafe 直接执行 SQL，不依赖 CLI
 */
async function syncSchema(prisma: any) {
  // 1. 确保所有表存在
  const tables = [
    {
      name: "cf_communities",
      sql: `CREATE TABLE cf_communities (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, location TEXT,
        cover_image TEXT, is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
    },
    {
      name: "cf_users",
      sql: `CREATE TABLE cf_users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT,
        name TEXT, role TEXT NOT NULL DEFAULT 'USER', is_active BOOLEAN DEFAULT TRUE,
        avatar_url TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
    },
    {
      name: "cf_cameras",
      sql: `CREATE TABLE cf_cameras (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES cf_communities(id),
        name TEXT NOT NULL, stream_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OFFLINE',
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
    },
    {
      name: "cf_feeders",
      sql: `CREATE TABLE cf_feeders (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES cf_communities(id),
        name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'SIMULATED',
        status TEXT NOT NULL DEFAULT 'OFFLINE',
        http_config TEXT, yaml_config TEXT,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
    },
    {
      name: "cf_system_configs",
      sql: `CREATE TABLE cf_system_configs (
        id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL,
        label TEXT, updated_at TIMESTAMP DEFAULT NOW()
      )`,
    },
    {
      name: "cf_feed_logs",
      sql: `CREATE TABLE cf_feed_logs (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cf_users(id),
        camera_id TEXT NOT NULL REFERENCES cf_cameras(id),
        feeder_id TEXT NOT NULL REFERENCES cf_feeders(id),
        amount INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT NOW()
      )`,
    },
  ]

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`SELECT 1 FROM ${table.name} LIMIT 1`)
    } catch {
      // 表不存在，创建它
      console.log(`[init] Creating table ${table.name}...`)
      await prisma.$executeRawUnsafe(table.sql)
    }
  }

  // 2. 更新 FeederType 枚举：添加 HTTP 和 YAML（兼容旧数据库）
  await prisma.$executeRawUnsafe(`ALTER TYPE "FeederType" ADD VALUE IF NOT EXISTS 'HTTP'`)
  await prisma.$executeRawUnsafe(`ALTER TYPE "FeederType" ADD VALUE IF NOT EXISTS 'YAML'`)

  // 3. 确保 cf_feeders 表有 http_config 和 yaml_config 列（兼容旧数据库）
  // 使用 IF NOT EXISTS 避免并发请求导致 "column already exists" 错误
  await prisma.$executeRawUnsafe(`ALTER TABLE cf_feeders ADD COLUMN IF NOT EXISTS http_config TEXT`)
  await prisma.$executeRawUnsafe(`ALTER TABLE cf_feeders ADD COLUMN IF NOT EXISTS yaml_config TEXT`)

  // 4. 确保索引存在
  const indexes = [
    { name: "idx_cf_feed_logs_user_id", sql: `CREATE INDEX IF NOT EXISTS idx_cf_feed_logs_user_id ON cf_feed_logs(user_id)` },
    { name: "idx_cf_feed_logs_camera_id", sql: `CREATE INDEX IF NOT EXISTS idx_cf_feed_logs_camera_id ON cf_feed_logs(camera_id)` },
    { name: "idx_cf_feed_logs_created_at", sql: `CREATE INDEX IF NOT EXISTS idx_cf_feed_logs_created_at ON cf_feed_logs(created_at)` },
  ]

  for (const idx of indexes) {
    await prisma.$executeRawUnsafe(idx.sql)
  }
}
