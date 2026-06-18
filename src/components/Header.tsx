"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">🐱 CatFeed</span>
        </Link>

        <nav className="flex items-center gap-4">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {session.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuItem className="font-medium">
                  {session.user?.name}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/profile" className="w-full">投喂记录</Link>
                </DropdownMenuItem>
                {session.user?.role === "ADMIN" && (
                  <DropdownMenuItem>
                    <Link href="/admin" className="w-full">管理后台</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 hover:bg-accent hover:text-accent-foreground">
                登录
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90">
                注册
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
