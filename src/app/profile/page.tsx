import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Header } from "@/components/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const feedLogs = await db.feedLog.findMany({
    where: { userId: session.user.id },
    include: {
      camera: { select: { name: true } },
      feeder: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const totalFeeds = await db.feedLog.count({
    where: { userId: session.user.id },
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>个人中心</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                {session.user.name?.charAt(0) || "U"}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{session.user.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <div>
                <p className="text-2xl font-bold">{totalFeeds}</p>
                <p className="text-sm text-muted-foreground">总投喂次数</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold mb-4">投喂记录</h2>
        <div className="space-y-3">
          {feedLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{log.camera.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.feeder.name} · 投喂 x{log.amount}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {feedLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              还没有投喂记录，去投喂一只小动物吧！🐾
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
