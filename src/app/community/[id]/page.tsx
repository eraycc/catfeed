import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Header } from "@/components/Header"
import { CameraCard } from "@/components/CameraCard"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CommunityPage({ params }: Props) {
  const { id } = await params
  const community = await db.community.findUnique({
    where: { id },
    include: {
      cameras: true,
      feeders: true,
    },
  })

  if (!community) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 mb-2 hover:bg-accent hover:text-accent-foreground">
            ← 返回列表
          </Link>
          <h1 className="text-2xl font-bold">{community.name}</h1>
          {community.description && (
            <p className="text-muted-foreground mt-1">
              {community.description}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            {community.location && (
              <Badge variant="secondary">{community.location}</Badge>
            )}
            <Badge variant="outline">
              {community.cameras.length} 个摄像头
            </Badge>
            <Badge variant="outline">
              {community.feeders.length} 个投喂器
            </Badge>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">摄像头列表</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {community.cameras.map((camera) => {
            const feeder = community.feeders[0] || null
            return (
              <CameraCard
                key={camera.id}
                id={camera.id}
                name={camera.name}
                status={camera.status}
                feederName={feeder?.name || null}
              />
            )
          })}
        </div>

        {community.cameras.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            暂无摄像头，请先在管理后台添加
          </div>
        )}
      </main>
    </div>
  )
}
