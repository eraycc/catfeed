export function FeedAnimation() {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="relative w-32 h-32">
        {/* 食物动画 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce text-5xl">🍖</div>
        </div>
        {/* 扩散圆圈 */}
        <div className="absolute inset-0 animate-ping">
          <div className="w-full h-full rounded-full bg-primary/20" />
        </div>
        <div className="absolute inset-0 animate-pulse">
          <div className="w-full h-full rounded-full bg-primary/10" />
        </div>
      </div>
    </div>
  )
}
