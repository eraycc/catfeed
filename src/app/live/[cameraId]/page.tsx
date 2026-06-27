import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Header } from "@/components/Header"
import { LivePlayer } from "@/components/LivePlayer"
import { FeedButton } from "@/components/FeedButton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ cameraId: string }>
}

export default async function LivePage({ params }: Props) {
  const { cameraId } = await params
  const session = await auth()
  
  const camera = await db.camera.findUnique({
    where: { id: cameraId },
    include: {
      community: true,
      feeder: true,
    },
  })

  if (!camera) {
    notFound()
  }

  // 直接使用摄像头绑定的投喂器
  const feeder = camera.feeder

  // 获取系统配置
  const maxFeedConfig = await db.systemConfig.findUnique({
    where: { key: "max_feed_per_day" },
  })
  const maxFeedPerDay = maxFeedConfig ? parseInt(maxFeedConfig.value) : 10

  // 获取今日投喂次数
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 如果用户已登录，获取该用户今日的投喂次数
  const userId = session?.user?.id
  const todayCount = userId
    ? await db.feedLog.count({
        where: { 
          userId,
          createdAt: { gte: today },
        },
      })
    : 0

  // 获取该摄像头的总投喂次数和最近记录
  const [totalCount, recentLogs] = await Promise.all([
    db.feedLog.count({
      where: { cameraId },
    }),
    db.feedLog.findMany({
      where: { cameraId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-4">
          <Link href={`/community/${camera.communityId}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 hover:bg-accent hover:text-accent-foreground">
            ← 返回 {camera.community.name}
          </Link>
        </div>

        <h1 className="text-xl font-bold mb-2">{camera.name}</h1>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={camera.status === "ONLINE" ? "default" : "secondary"}>
            {camera.status === "ONLINE" ? "在线" : "离线"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {camera.community.name}
          </span>
        </div>

        <LivePlayer streamUrl={camera.streamUrl} />

        <div className="mt-4">
          <FeedButton 
            cameraId={cameraId} 
            feederId={feeder?.id || null}
            maxFeedPerDay={maxFeedPerDay}
            todayFeedCount={todayCount}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日投喂</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todayCount}</div>
              <p className="text-xs text-muted-foreground">次</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">累计投喂</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">次</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-lg font-semibold mt-6 mb-3">投喂记录</h2>
        <div className="space-y-2">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                      {log.user.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.user.name || "匿名用户"}</p>
                      <p className="text-xs text-muted-foreground">投喂 x{log.amount}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              还没有投喂记录，快来投喂吧 🐾
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
