"use client"

import { useEffect, useRef } from "react"
import Hls from "hls.js"

interface LivePlayerProps {
  streamUrl: string
}

export function LivePlayer({ streamUrl }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    if (streamUrl.endsWith(".m3u8") && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {})
      })
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [streamUrl])

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
      />
      <div className="absolute top-2 left-2">
        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
          ● LIVE
        </span>
      </div>
    </div>
  )
}
