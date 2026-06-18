import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{name}</CardTitle>
        </CardHeader>
        <CardContent>
          {description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {description}
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {location && <Badge variant="secondary">{location}</Badge>}
            <Badge variant="outline">{cameraCount} 个摄像头</Badge>
            <Badge variant="outline">{feederCount} 个投喂器</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
