import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const getEmailConfig = () => {
  const user = (process.env.EMAIL_USER || '').trim()
  const pass = (process.env.EMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_APP_PASSWORD must be set in .env.local')
  }
  return { user, pass }
}

export async function POST(request) {
  try {
    const { to, subject, html, text } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    const emailConfig = getEmailConfig()
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    })

    const mailOptions = {
      from: `MOCAS <${emailConfig.user}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '') // Plain text fallback
    }

    const info = await transporter.sendMail(mailOptions)
    
    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}

