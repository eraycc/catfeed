"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"

interface LivePlayerProps {
  streamUrl: string
}

export function LivePlayer({ streamUrl }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setError(null)
    setIsLoading(true)

    let hls: Hls | null = null

    if (streamUrl.endsWith(".m3u8") && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        video.play().catch((e) => {
          // 自动播放被阻止，静音播放
          console.log("Autoplay blocked:", e.message)
        })
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setIsLoading(false)
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("网络连接失败，请检查网络")
              hls?.destroy()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("视频加载失败，请刷新重试")
              hls?.recoverMediaError()
              break
            default:
              setError("视频播放失败")
              hls?.destroy()
              break
          }
        }
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari 原生 HLS 支持
      video.src = streamUrl
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false)
        video.play().catch(() => {})
      })
      video.addEventListener("error", () => {
        setIsLoading(false)
        setError("视频加载失败")
      })
    } else {
      setIsLoading(false)
      setError("您的浏览器不支持此视频格式")
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [streamUrl])

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-2">
          <span className="text-lg">⚠️ {error}</span>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-blue-400 hover:underline"
          >
            点击刷新
          </button>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        muted
      />
      {!error && (
        <div className="absolute top-2 left-2">
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </span>
        </div>
      )}
    </div>
  )
}
