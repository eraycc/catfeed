"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function AuthStatusChecker() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session")
        const session = await res.json()

        if (session?.user?.id) {
          // 用户已登录，检查用户是否在数据库中存在
          const userRes = await fetch("/api/auth/check-user")
          const userData = await userRes.json()

          if (!userData.exists) {
            // 用户在数据库中不存在，自动登出
            await signOut({ redirect: false })
            router.push("/login?reason=session_expired")
          }
        }
      } catch {
        // 网络错误，忽略
      } finally {
        setChecked(true)
      }
    }

    checkAuth()
  }, [router])

  return null
}