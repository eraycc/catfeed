"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FeedAnimation } from "./FeedAnimation"

interface FeedButtonProps {
  cameraId: string
  feederId: string | null
}

export function FeedButton({ cameraId, feederId }: FeedButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)

  const handleFeed = async () => {
    if (!session) {
      router.push("/login")
      return
    }

    if (!feederId) {
      toast.error("无法投喂", {
        description: "该摄像头没有配套的投喂器",
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId, feederId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "投喂失败")
      }

      setShowAnimation(true)
      setTimeout(() => setShowAnimation(false), 3000)

      toast.success("投喂成功！", {
        description: "小动物们正在享用美食 🐾",
      })

      router.refresh()
    } catch (error: any) {
      toast.error("投喂失败", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <Button
        size="lg"
        className="w-full text-lg py-6"
        onClick={handleFeed}
        disabled={loading || !feederId}
      >
        {loading ? "投喂中..." : "🍖 投喂一次"}
      </Button>
      {!feederId && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          该摄像头暂无配套投喂器
        </p>
      )}
      {showAnimation && <FeedAnimation />}
    </div>
  )
}
