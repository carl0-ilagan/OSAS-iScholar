"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Loader2, FileText, Image as ImageIcon, ZoomIn, X, MapPin } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import ImageZoomModal from "./image-zoom-modal"

export default function VerificationDetailModal({ isOpen, onClose, verification, onUpdate }) {
  const [isApproving, setIsApproving] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [zoomedImage, setZoomedImage] = useState(null)

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  // Reset remarks when modal opens/closes
  useEffect(() => {
    if (isOpen && verification) {
      setRemarks(verification.declineReason || "")
    } else {
      setRemarks("")
    }
  }, [isOpen, verification])

  if (!isOpen || !verification) return null

  const getStatusBadge = () => {
    const status = verification.status || "pending"
    if (status === "verified") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Approved
        </span>
      )
    } else if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          Declined
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          Pending
        </span>
      )
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const handleApprove = async () => {
    try {
      setIsApproving(true)
      await updateDoc(doc(db, "verifications", verification.id), {
        status: "verified",
        reviewedAt: new Date().toISOString(),
        adminRemarks: remarks.trim() || null,
      })
      
      // Also update user's verification status
      if (verification.userId) {
        try {
          await updateDoc(doc(db, "users", verification.userId), {
            verificationStatus: "verified",
            verified: true,
            updatedAt: new Date().toISOString(),
          })
          
          // Send email notification
          try {
            const userDoc = await getDoc(doc(db, "users", verification.userId))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              const studentName = userData.fullName || userData.displayName || "Student"
              const secondaryEmail = userData.secondaryEmail
              
              if (secondaryEmail) {
                await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: secondaryEmail,
                    subject: 'Account Verification Approved - iScholar',
                    html: `
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
                  })
                })
              }
            }
          } catch (emailError) {
            console.error("Error sending verification approval email:", emailError)
          }
        } catch (error) {
          console.error("Error updating user status:", error)
        }
      }

      toast.success("Verification approved successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        description: "The student's account has been verified.",
        duration: 4000,
        position: "top-center",
      })
      
      if (onUpdate && typeof onUpdate === 'function') {
        await onUpdate()
      }
      setRemarks("")
      onClose()
    } catch (error) {
      console.error("Error approving verification:", error)
      toast.error("Failed to approve verification", {
        icon: <XCircle className="w-5 h-5" />,
        description: error.message || "Please try again later.",
        duration: 4000,
        position: "top-center",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleDecline = async () => {
    if (!remarks.trim()) {
      toast.error("Remarks is required", {
        icon: <XCircle className="w-5 h-5" />,
        description: "Please provide a reason for declining this verification.",
        duration: 3000,
        position: "top-center",
      })
      return
    }

    try {
      setIsDeclining(true)
      await updateDoc(doc(db, "verifications", verification.id), {
        status: "rejected",
        declineReason: remarks.trim(),
        adminRemarks: remarks.trim(),
        reviewedAt: new Date().toISOString(),
      })

      // Send email notification
      try {
        if (verification.userId) {
          const userDoc = await getDoc(doc(db, "users", verification.userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const studentName = userData.fullName || userData.displayName || "Student"
            const secondaryEmail = userData.secondaryEmail
            
            if (secondaryEmail) {
              await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: secondaryEmail,
                  subject: 'Account Verification Update - iScholar',
                  html: `
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
                          <div class="reason-box">
                            <strong>Reason:</strong><br>
                            ${remarks.trim()}
                          </div>
                          <p>Please review the reason above and resubmit your verification with the necessary corrections.</p>
                          <p>If you have any questions, please contact our support team.</p>
                          <p>Best regards,<br>iScholar Team</p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `
                })
              })
            }
          }
        }
      } catch (emailError) {
        console.error("Error sending verification decline email:", emailError)
      }

      toast.success("Verification declined", {
        icon: <XCircle className="w-5 h-5" />,
        description: "The verification request has been declined.",
        duration: 4000,
        position: "top-center",
      })
      
      if (onUpdate && typeof onUpdate === 'function') {
        await onUpdate()
      }
      setRemarks("")
      onClose()
    } catch (error) {
      console.error("Error declining verification:", error)
      toast.error("Failed to decline verification", {
        icon: <XCircle className="w-5 h-5" />,
        description: error.message || "Please try again later.",
        duration: 4000,
        position: "top-center",
      })
    } finally {
      setIsDeclining(false)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const isPending = verification.status === "pending" || !verification.status

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      />

      {/* Modal - Enhanced Design */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Enhanced with Status and Close */}
          <div className="flex items-start justify-between p-4 md:p-5 border-b border-border/50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden ring-1 ring-primary/20 flex-shrink-0">
                {verification.photoURL ? (
                  <img 
                    src={verification.photoURL} 
                    alt={verification.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-semibold text-white text-sm bg-gradient-to-br from-primary to-secondary">
                    {verification.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground truncate">{verification.name}</h2>
                <p className="text-xs text-muted-foreground truncate font-mono">{verification.studentNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted: {formatDate(verification.submittedAt)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 flex-shrink-0">
              {getStatusBadge()}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 scrollbar-hide">
            {/* Student Information - Minimal */}
            <div className="mb-4">
              <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Course:</span>
                    <span className="font-medium text-foreground">{verification.course}</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Year:</span>
                    <span className="font-medium text-foreground">{verification.yearLevel}</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Campus:</span>
                    <span className="font-medium text-foreground">{verification.campus}</span>
                  </div>
                </div>
                {verification.address && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Address</p>
                        <p className="text-sm font-medium text-foreground">{verification.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Submitted Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* ID Front */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">ID Front</div>
                  {verification.idFront ? (
                    <div 
                      className="border border-border rounded-lg overflow-hidden bg-muted/20 cursor-pointer hover:border-primary/50 transition-colors group relative"
                      onClick={() => setZoomedImage({ src: verification.idFront, alt: "ID Front" })}
                    >
                      <img 
                        src={verification.idFront} 
                        alt="ID Front" 
                        className="w-full h-40 object-contain group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg p-6 text-center bg-muted/20">
                      <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">No image</p>
                    </div>
                  )}
                </div>

                {/* ID Back */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">ID Back</div>
                  {verification.idBack ? (
                    <div 
                      className="border border-border rounded-lg overflow-hidden bg-muted/20 cursor-pointer hover:border-primary/50 transition-colors group relative"
                      onClick={() => setZoomedImage({ src: verification.idBack, alt: "ID Back" })}
                    >
                      <img 
                        src={verification.idBack} 
                        alt="ID Back" 
                        className="w-full h-40 object-contain group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg p-6 text-center bg-muted/20">
                      <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">No image</p>
                    </div>
                  )}
                </div>

                {/* COR */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Certificate of Registration</div>
                  {verification.cor ? (
                    <div 
                      className="border border-border rounded-lg overflow-hidden bg-muted/20 cursor-pointer hover:border-primary/50 transition-colors group relative"
                      onClick={() => setZoomedImage({ src: verification.cor, alt: "Certificate of Registration" })}
                    >
                      <img 
                        src={verification.cor} 
                        alt="COR" 
                        className="w-full h-40 object-contain group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg p-6 text-center bg-muted/20">
                      <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">No image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Remarks Section */}
            {isPending && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Admin Remarks {verification.status === "rejected" ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(Optional)</span>}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={verification.status === "rejected" ? "Required: Please provide a reason for declining..." : "Optional: Add any remarks or notes..."}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
                  rows={3}
                  disabled={isApproving || isDeclining}
                />
              </div>
            )}

            {/* Show existing remarks if already reviewed */}
            {!isPending && (verification.declineReason || verification.adminRemarks) && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Admin Remarks</h3>
                <div className={`rounded-lg p-3 border ${
                  verification.status === "rejected" 
                    ? "bg-red-50 border-red-200 text-red-900" 
                    : "bg-muted/30 border-border/50"
                }`}>
                  <p className="text-sm">{verification.declineReason || verification.adminRemarks}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Actions */}
          {isPending && (
            <div className="p-4 md:p-5 border-t border-border/50 flex flex-col-reverse md:flex-row gap-2 md:justify-end">
              <button
                onClick={handleDecline}
                disabled={isApproving || isDeclining}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isDeclining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Decline
                  </>
                )}
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving || isDeclining}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={!!zoomedImage}
        onClose={() => setZoomedImage(null)}
        imageSrc={zoomedImage?.src}
        alt={zoomedImage?.alt}
      />
    </>
  )
}
