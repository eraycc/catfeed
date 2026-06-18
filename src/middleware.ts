import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const path = req.nextUrl.pathname

  if (path.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (path === "/profile" && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/admin/:path*", "/profile"],
}
