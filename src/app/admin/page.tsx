import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [communityCount, cameraCount, feederCount, userCount, feedLogCount] =
    await Promise.all([
      db.community.count(),
      db.camera.count(),
      db.feeder.count(),
      db.user.count(),
      db.feedLog.count(),
    ])

  const stats = [
    { title: "社区数", value: communityCount, icon: "🏘️" },
    { title: "摄像头数", value: cameraCount, icon: "📷" },
    { title: "投喂器数", value: feederCount, icon: "🍖" },
    { title: "用户数", value: userCount, icon: "👥" },
    { title: "投喂总次数", value: feedLogCount, icon: "🐾" },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
