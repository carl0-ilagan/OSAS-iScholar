import { NextResponse } from "next/server"
import { consumeVerificationTicket } from "@/app/api/auth/_verification-store"

export async function POST(request) {
  try {
    const { email, verificationTicket } = await request.json()
    if (!email || !verificationTicket) {
      return NextResponse.json({ error: "Email and verification ticket are required." }, { status: 400 })
    }

    const result = consumeVerificationTicket(email, verificationTicket)
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid or expired verification ticket." }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Consume verification ticket error:", error)
    return NextResponse.json({ error: "Unable to validate verification ticket." }, { status: 500 })
  }
}
