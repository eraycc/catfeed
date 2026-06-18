"use client"

export function FeedAnimation() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-bounce text-6xl">🐾</div>
      <div
        className="absolute animate-ping text-4xl"
        style={{ top: "30%", left: "40%" }}
      >
        🐱
      </div>
      <div
        className="absolute animate-pulse text-3xl"
        style={{ top: "50%", right: "30%" }}
      >
        🐶
      </div>
    </div>
  )
}
