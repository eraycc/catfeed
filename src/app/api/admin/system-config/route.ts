import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, apiHandler } from "@/lib/api-helpers"

const DEFAULT_CONFIGS = [
  { key: "site_name", value: "CatFeed", label: "站点名称" },
  { key: "site_description", value: "远程投喂流浪动物平台", label: "站点描述" },
  { key: "allow_register", value: "true", label: "允许用户注册" },
  { key: "allow_login", value: "true", label: "允许普通用户登录" },
  { key: "allow_feed", value: "true", label: "允许投喂操作" },
  { key: "max_feed_per_day", value: "10", label: "每用户每日最大投喂次数" },
]

export async function GET() {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const configs = await db.systemConfig.findMany()
    const configMap = new Map(configs.map((c) => [c.key, c.value]))

    const result = DEFAULT_CONFIGS.map((def) => ({
      key: def.key,
      value: configMap.get(def.key) ?? def.value,
      label: def.label,
    }))

    return NextResponse.json(result)
  })
}

export async function PUT(req: Request) {
  return apiHandler(async () => {
    const { error } = await requireAdmin()
    if (error) return error

    const { configs } = await req.json()

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 })
    }

    // 使用 $transaction 批量更新，确保原子性
    await db.$transaction(
      configs.map((config: { key: string; value: string; label?: string }) =>
        db.systemConfig.upsert({
          where: { key: config.key },
          update: { value: config.value },
          create: {
            key: config.key,
            value: config.value,
            label: config.label || config.key,
          },
        })
      )
    )

    return NextResponse.json({ success: true })
  })
}
