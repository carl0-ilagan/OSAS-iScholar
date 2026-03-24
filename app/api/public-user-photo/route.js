import { NextResponse } from "next/server"
import { getAdminAuth } from "@/lib/firebase-admin"

/** Firebase Admin needs Node; used to show avatars when Firestore has no photoURL but Auth does. */
export const runtime = "nodejs"

export async function GET(request) {
  const uid = request.nextUrl.searchParams.get("uid")
  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ photoURL: null, displayName: null }, { status: 400 })
  }

  try {
    const auth = getAdminAuth()
    const record = await auth.getUser(uid.trim())
    return NextResponse.json({
      photoURL: record.photoURL || null,
      displayName: record.displayName || null,
    })
  } catch {
    return NextResponse.json({ photoURL: null, displayName: null })
  }
}
