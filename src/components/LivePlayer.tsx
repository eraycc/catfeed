"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Hls from "hls.js"

interface LivePlayerProps {
  streamUrl: string
}

export function LivePlayer({ streamUrl }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [muted, setMuted] = useState(true)
  const [retryKey, setRetryKey] = useState(0)

  const initPlayer = useCallback(() => {
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
        video.play().catch(() => {
          // 自动播放被阻止
        })
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setIsLoading(false)
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("网络连接失败，请检查网络")
              hls?.destroy()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("视频加载失败，请点击重试")
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

  useEffect(() => {
    const cleanup = initPlayer()
    return () => {
      if (cleanup) cleanup()
    }
  }, [streamUrl, retryKey, initPlayer])

  const handleRetry = () => {
    setRetryKey((k) => k + 1)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (video) {
      video.muted = !video.muted
      setMuted(video.muted)
    }
  }

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
            onClick={handleRetry}
            className="text-sm text-blue-400 hover:underline"
          >
            点击重试
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
      {!error && !isLoading && (
        <>
          {/* LIVE 标记 */}
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
          {/* 静音/取消静音按钮 */}
          <button
            onClick={toggleMute}
            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
            title={muted ? "取消静音" : "静音"}
          >
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="22" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="22" y2="15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </>
      )}
    </div>
  )
}
