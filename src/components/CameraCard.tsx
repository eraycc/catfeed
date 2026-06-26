import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CameraCardProps {
  id: string
  name: string
  status: string
  feederName: string | null
}

export function CameraCard({ id, name, status, feederName }: CameraCardProps) {
  return (
    <Link href={`/live/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium truncate">{name}</h3>
            <Badge variant={status === "ONLINE" ? "default" : "secondary"}>
              {status === "ONLINE" ? "在线" : "离线"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              {status === "ONLINE" ? "📹" : "📷"} 观看直播
            </span>
            {feederName && (
              <span className="text-xs">🍖 {feederName}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
