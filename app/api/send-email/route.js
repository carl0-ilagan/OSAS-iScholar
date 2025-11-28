import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Create transporter with Gmail using environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'contact.ischolar@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || 'wsfu yrce eiwr dftc' // App password
  }
})

export async function POST(request) {
  try {
    const { to, subject, html, text } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    const mailOptions = {
      from: `iScholar <${process.env.EMAIL_USER || 'contact.ischolar@gmail.com'}>`,
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

