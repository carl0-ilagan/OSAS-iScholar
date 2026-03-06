import { NextResponse } from "next/server"
import { verifyOtp } from "@/app/api/auth/_verification-store"

export async function POST(request) {
  try {
    const { email, code } = await request.json()
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 })
    }

    const result = verifyOtp(email, String(code))
    if (!result.valid) {
      const errorMessageMap = {
        expired: "Code expired.",
        invalid: "Invalid code.",
        not_found: "No active code found. Please request a new code.",
        too_many_attempts: "Too many invalid attempts. Please request a new code.",
      }
      return NextResponse.json(
        {
          error: errorMessageMap[result.reason] || "Invalid code.",
          attemptsLeft: result.attemptsLeft,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, verificationTicket: result.verificationTicket })
  } catch (error) {
    console.error("Verify code error:", error)
    return NextResponse.json({ error: "Unable to verify code." }, { status: 500 })
  }
}
