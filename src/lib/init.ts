import { execSync } from "child_process"
import path from "path"

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

  // 每次启动都同步 schema（prisma db push 是幂等的，已有表/列会跳过）
  // 使用 node_modules 中的 prisma 二进制文件，不使用 npx（Vercel 运行时无法下载包）
  try {
    console.log("[init] Syncing database schema...")
    const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma")
    execSync(`"${prismaBin}" db push --skip-generate`, {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: url },
    })
    results.push("Schema synced via prisma db push")
  } catch (e: any) {
    console.error("[init] Schema push failed:", e.message)
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
