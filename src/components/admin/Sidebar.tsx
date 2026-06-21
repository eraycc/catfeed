"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

const navItems = [
  { href: "/admin", label: "仪表盘", icon: "📊" },
  { href: "/admin/communities", label: "社区管理", icon: "🏘️" },
  { href: "/admin/cameras", label: "摄像头管理", icon: "📷" },
  { href: "/admin/feeders", label: "投喂器管理", icon: "🍖" },
  { href: "/admin/feed-logs", label: "投喂记录", icon: "📋" },
  { href: "/admin/users", label: "用户管理", icon: "👥" },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  useEffect(() => {
    onClose()
  }, [pathname])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r bg-background p-4 transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin" className="text-lg font-bold">
            🐱 CatFeed 管理
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted lg:hidden"
          >
            ✕
          </button>
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
    </>
  )
}
