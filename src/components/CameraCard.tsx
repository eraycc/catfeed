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
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center">
            <span className="text-4xl">📷</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{name}</h3>
            <Badge variant={status === "ONLINE" ? "default" : "secondary"}>
              {status === "ONLINE" ? "在线" : "离线"}
            </Badge>
          </div>
          {feederName && (
            <p className="text-xs text-muted-foreground mt-1">
              配套投喂器: {feederName}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
