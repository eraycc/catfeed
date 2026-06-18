import { db } from "@/lib/db"
import { Header } from "@/components/Header"
import { CommunityCard } from "@/components/CommunityCard"

export const dynamic = 'force-dynamic'

export default async function HomePage() {
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
