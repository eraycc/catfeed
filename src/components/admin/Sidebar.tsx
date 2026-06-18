"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "仪表盘", icon: "📊" },
  { href: "/admin/communities", label: "社区管理", icon: "🏘️" },
  { href: "/admin/cameras", label: "摄像头管理", icon: "📷" },
  { href: "/admin/feeders", label: "投喂器管理", icon: "🍖" },
  { href: "/admin/feed-logs", label: "投喂记录", icon: "📋" },
  { href: "/admin/users", label: "用户管理", icon: "👥" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r bg-muted/30 min-h-screen p-4">
      <div className="mb-6">
        <Link href="/admin" className="text-lg font-bold">
          🐱 CatFeed 管理
        </Link>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
