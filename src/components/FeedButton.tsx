"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FeedAnimation } from "./FeedAnimation"

interface FeedButtonProps {
  cameraId: string
  feederId: string | null
  maxFeedPerDay?: number
  todayFeedCount?: number
}

export function FeedButton({ 
  cameraId, 
  feederId, 
  maxFeedPerDay = 10, 
  todayFeedCount = 0 
}: FeedButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [currentCount, setCurrentCount] = useState(todayFeedCount)
  const lastClickTime = useRef<number>(0)

  const remainingFeeds = maxFeedPerDay - currentCount
  const canFeed = remainingFeeds > 0 && feederId && !loading

  const handleFeed = async () => {
    // 防抖：距离上次点击小于1秒则忽略
    const now = Date.now()
    if (now - lastClickTime.current < 1000) {
      return
    }
    lastClickTime.current = now

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

    if (remainingFeeds <= 0) {
      toast.error("今日投喂次数已用完", {
        description: `明天再来投喂吧，每天最多投喂 ${maxFeedPerDay} 次`,
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
      setTimeout(() => setShowAnimation(false), 2000)
      setCurrentCount(data.todayFeedCount)

      toast.success("投喂成功！", {
        description: `今日已投喂 ${data.todayFeedCount}/${maxFeedPerDay} 次 🐾`,
      })

      // 使用 router.refresh() 只会刷新数据，不会重新加载整个页面
      router.refresh()
    } catch (error: any) {
      toast.error("投喂失败", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Button
          size="lg"
          className="w-full text-lg py-6"
          onClick={handleFeed}
          disabled={!canFeed}
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
      
      {/* 投喂次数提示 */}
      <div className="text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <span className="text-muted-foreground">今日剩余投喂次数：</span>
          <span className={`font-semibold ${remainingFeeds <= 3 ? "text-orange-500" : "text-green-600"}`}>
            {remainingFeeds}/{maxFeedPerDay}
          </span>
        </div>
        {remainingFeeds <= 0 && (
          <p className="text-orange-500 mt-1">今日投喂次数已用完，明天再来吧！</p>
        )}
      </div>
    </div>
  )
}
