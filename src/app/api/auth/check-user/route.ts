import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ exists: false, loggedIn: false })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })

    return NextResponse.json({ exists: !!user, loggedIn: true })
  } catch {
    return NextResponse.json({ exists: false, loggedIn: false })
  }
}