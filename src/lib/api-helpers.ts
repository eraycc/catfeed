import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

/**
 * 验证当前会话是否为管理员，返回 session 或错误响应
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "未授权，请先登录" }, { status: 401 }) }
  }
  return { session }
}

/**
 * 统一的 API 错误处理包装函数
 * 捕获所有异常，返回通用错误消息，仅在服务端记录详细错误
 */
export function apiHandler(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return handler().catch((e) => {
    console.error("[API Error]", e)
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  })
}
