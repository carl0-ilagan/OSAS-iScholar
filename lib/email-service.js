/**
 * Email Service Utility
 * Handles sending emails for various actions in the iScholar system
 */

const ADMIN_EMAIL = 'contact.ischolar@gmail.com'

/**
 * Send email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {string} text - Email plain text content (optional)
 */
export async function sendEmail(to, subject, html, text) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send email')
    }

    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

/**
 * Get email template for verification approved
 */
function getVerificationApprovedTemplate(studentName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Verification Approved</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>Great news! Your account verification has been <strong>approved</strong>.</p>
          <p>Your account is now verified and you can access all features of the iScholar platform.</p>
          <p>You can now:</p>
          <ul>
            <li>Apply for scholarships</li>
            <li>Submit testimonials</li>
            <li>Track your applications</li>
            <li>Access all platform features</li>
          </ul>
          <p>Thank you for your patience during the verification process.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email template for verification declined
 */
function getVerificationDeclinedTemplate(studentName, reason) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Verification Update</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>We regret to inform you that your account verification has been <strong>declined</strong>.</p>
          ${reason ? `
          <div class="reason-box">
            <strong>Reason:</strong><br>
            ${reason}
          </div>
          ` : ''}
          <p>Please review the reason above and resubmit your verification with the necessary corrections.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email template for application submitted
 */
function getApplicationSubmittedTemplate(studentName, scholarshipName, trackerCode) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .tracker-box { background: #e7f3ff; border: 2px solid #2196F3; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px; }
        .tracker-code { font-size: 24px; font-weight: bold; color: #2196F3; letter-spacing: 2px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Submitted Successfully</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>Your scholarship application for <strong>${scholarshipName}</strong> has been submitted successfully!</p>
          <div class="tracker-box">
            <p style="margin: 0 0 10px 0;"><strong>Your Tracker Code:</strong></p>
            <div class="tracker-code">${trackerCode}</div>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Use this code to track your application status</p>
          </div>
          <p>Your application is now under review. We will notify you once a decision has been made.</p>
          <p>You can track your application status in your dashboard.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email template for application approved
 */
function getApplicationApprovedTemplate(studentName, scholarshipName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Application Approved!</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <div class="success-box">
            <p style="margin: 0;"><strong>Congratulations!</strong></p>
            <p style="margin: 10px 0 0 0;">Your application for <strong>${scholarshipName}</strong> has been <strong>approved</strong>!</p>
          </div>
          <p>We are pleased to inform you that your scholarship application has been reviewed and approved.</p>
          <p>You will receive further instructions regarding the next steps soon.</p>
          <p>Congratulations on this achievement!</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email template for application declined
 */
function getApplicationDeclinedTemplate(studentName, scholarshipName, reason) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Status Update</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>We regret to inform you that your application for <strong>${scholarshipName}</strong> has been <strong>declined</strong>.</p>
          ${reason ? `
          <div class="reason-box">
            <strong>Reason:</strong><br>
            ${reason}
          </div>
          ` : ''}
          <p>We encourage you to apply for other available scholarships that may be a better fit for your profile.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email template for testimonial submitted
 */
function getTestimonialSubmittedTemplate(studentName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Testimonial Submitted</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>Thank you for sharing your testimonial with us!</p>
          <p>Your testimonial has been submitted successfully and is now under review. Once approved, it will be displayed on the platform.</p>
          <p>We appreciate your feedback and contribution to the iScholar community.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email template for new announcement
 */
function getNewAnnouncementTemplate(studentName, announcementTitle, announcementDescription) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .announcement-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📢 New Announcement</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>We have an important announcement for you:</p>
          <div class="announcement-box">
            <h2 style="margin-top: 0; color: #667eea;">${announcementTitle}</h2>
            <p>${announcementDescription}</p>
          </div>
          <p>Please log in to your iScholar account to view the full announcement and take any necessary action.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email template for new scholarship
 */
function getNewScholarshipTemplate(studentName, scholarshipName, scholarshipDescription) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .scholarship-box { background: white; border: 2px solid #f5576c; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 New Scholarship Available!</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>Great news! A new scholarship opportunity is now available:</p>
          <div class="scholarship-box">
            <h2 style="margin-top: 0; color: #f5576c;">${scholarshipName}</h2>
            <p>${scholarshipDescription}</p>
          </div>
          <p>Don't miss this opportunity! Log in to your iScholar account to view details and apply now.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Export email sending functions
export async function sendVerificationApprovedEmail(studentEmail, studentName) {
  const subject = 'Account Verification Approved - iScholar'
  const html = getVerificationApprovedTemplate(studentName)
  return await sendEmail(studentEmail, subject, html)
}

export async function sendVerificationDeclinedEmail(studentEmail, studentName, reason) {
  const subject = 'Account Verification Update - iScholar'
  const html = getVerificationDeclinedTemplate(studentName, reason)
  return await sendEmail(studentEmail, subject, html)
}

export async function sendApplicationSubmittedEmail(studentEmail, studentName, scholarshipName, trackerCode) {
  const subject = 'Application Submitted Successfully - iScholar'
  const html = getApplicationSubmittedTemplate(studentName, scholarshipName, trackerCode)
  return await sendEmail(studentEmail, subject, html)
}

export async function sendApplicationApprovedEmail(studentEmail, studentName, scholarshipName) {
  const subject = '🎉 Application Approved - iScholar'
  const html = getApplicationApprovedTemplate(studentName, scholarshipName)
  return await sendEmail(studentEmail, subject, html)
}

export async function sendApplicationDeclinedEmail(studentEmail, studentName, scholarshipName, reason) {
  const subject = 'Application Status Update - iScholar'
  const html = getApplicationDeclinedTemplate(studentName, scholarshipName, reason)
  return await sendEmail(studentEmail, subject, html)
}

export async function sendTestimonialSubmittedEmail(studentEmail, studentName) {
  const subject = 'Testimonial Submitted - iScholar'
  const html = getTestimonialSubmittedTemplate(studentName)
  return await sendEmail(studentEmail, subject, html)
}

export async function sendNewAnnouncementEmail(studentEmail, studentName, announcementTitle, announcementDescription) {
  const subject = '📢 New Announcement - iScholar'
  const html = getNewAnnouncementTemplate(studentName, announcementTitle, announcementDescription)
  return await sendEmail(studentEmail, subject, html)
}

export async function sendNewScholarshipEmail(studentEmail, studentName, scholarshipName, scholarshipDescription) {
  const subject = '🎓 New Scholarship Available - iScholar'
  const html = getNewScholarshipTemplate(studentName, scholarshipName, scholarshipDescription)
  return await sendEmail(studentEmail, subject, html)
}

/**
 * Get email template for new document requirement
 */
function getNewDocumentRequirementTemplate(studentName, requirementName, requirementDescription, isRequired) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .requirement-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .required-badge { display: inline-block; padding: 5px 15px; background: #dc3545; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
        .optional-badge { display: inline-block; padding: 5px 15px; background: #6c757d; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 New Document Requirement</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>A new document requirement has been added to your iScholar account:</p>
          <div class="requirement-box">
            <h2 style="margin-top: 0; color: #667eea;">
              ${requirementName}
              ${isRequired ? '<span class="required-badge">REQUIRED</span>' : '<span class="optional-badge">OPTIONAL</span>'}
            </h2>
            ${requirementDescription ? `<p>${requirementDescription}</p>` : ''}
          </div>
          ${isRequired ? '<p><strong>⚠️ This is a required document.</strong> Please upload it as soon as possible to avoid any delays in your application process.</p>' : '<p>This is an optional document. You may upload it if you have it available.</p>'}
          <p>Please log in to your iScholar account and go to the Requirements section to upload this document.</p>
          <p>Best regards,<br>iScholar Team</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function sendNewDocumentRequirementEmail(studentEmail, studentName, requirementName, requirementDescription, isRequired) {
  const subject = '📄 New Document Requirement - iScholar'
  const html = getNewDocumentRequirementTemplate(studentName, requirementName, requirementDescription, isRequired)
  return await sendEmail(studentEmail, subject, html)
}

