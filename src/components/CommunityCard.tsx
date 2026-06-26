import Link from "next/link"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CommunityCardProps {
  id: string
  name: string
  description: string | null
  location: string | null
  cameraCount: number
  feederCount: number
}

export function CommunityCard({
  id,
  name,
  description,
  location,
  cameraCount,
  feederCount,
}: CommunityCardProps) {
  return (
    <Link href={`/community/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2">{name}</h3>
          {description && (
            <CardDescription className="mb-3 line-clamp-2">
              {description}
            </CardDescription>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {location && (
              <Badge variant="outline" className="text-xs">
                📍 {location}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              📹 {cameraCount} 个摄像头
            </Badge>
            <Badge variant="secondary" className="text-xs">
              🍖 {feederCount} 个投喂器
            </Badge>
          </div>
          <div className="text-sm text-primary font-medium">
            点击进入 →
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
