import { NextResponse } from "next/server"
import { saveOtp } from "@/app/api/auth/_verification-store"
import nodemailer from "nodemailer"

const getEmailConfig = () => {
  const user = (process.env.EMAIL_USER || "").trim()
  const pass = (process.env.EMAIL_APP_PASSWORD || "").replace(/\s+/g, "")
  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_APP_PASSWORD must be set in .env.local")
  }
  return { user, pass }
}

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const isValidEmail = /^\S+@\S+\.\S+$/.test(normalizedEmail)
    if (!isValidEmail) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      )
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const saveResult = saveOtp(normalizedEmail, code)
    if (!saveResult.ok) {
      if (saveResult.reason === "cooldown") {
        return NextResponse.json(
          { error: `Please wait ${saveResult.retryAfterSec}s before requesting another code.` },
          { status: 429 }
        )
      }
      if (saveResult.reason === "rate_limited") {
        return NextResponse.json(
          { error: "Too many code requests. Please try again later." },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: "Unable to create verification code." }, { status: 500 })
    }

    const emailConfig = getEmailConfig()
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    })

    await transporter.sendMail({
      from: `iScholar <${emailConfig.user}>`,
      to: normalizedEmail,
      subject: "iScholar 6-digit confirmation code",
      html: `<p>Your iScholar confirmation code is: <strong style="font-size:18px; letter-spacing:2px;">${code}</strong></p><p>This code expires in 10 minutes.</p>`,
      text: `Your iScholar confirmation code is: ${code}. This code expires in 10 minutes.`,
    })

    return NextResponse.json({ success: true, message: "Verification code sent." })
  } catch (error) {
    console.error("Send verification code error:", error)
    return NextResponse.json(
      { error: error?.message || "Unable to send verification code." },
      { status: 500 }
    )
  }
}
