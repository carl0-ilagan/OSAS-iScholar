"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, CheckCircle, XCircle, Clock, FileText, User, GraduationCap, MapPin, Calendar, Loader2, FolderOpen, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc, collection, getDocs, query, where, orderBy, runTransaction } from "firebase/firestore"
import ImageZoomModal from "./image-zoom-modal"
import DocumentPreviewModal from "./document-preview-modal"
import FormViewModal from "./form-view-modal"

export default function ApplicationDetailModal({ application, isOpen, onClose, onUpdate }) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [adminRemarks, setAdminRemarks] = useState("")
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [studentDocuments, setStudentDocuments] = useState([])
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [applicationForm, setApplicationForm] = useState(null)
  const [profileForm, setProfileForm] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [isApplicationFormModalOpen, setIsApplicationFormModalOpen] = useState(false)
  const [isProfileFormModalOpen, setIsProfileFormModalOpen] = useState(false)
  const modalRef = useRef(null)
  const hasAutoUpdatedStatus = useRef(false) // Track if we've already auto-updated status

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200) // Match animation duration
  }

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Auto-update status to "under-review" when modal opens (only if status is "pending")
  useEffect(() => {
    const autoUpdateStatus = async () => {
      if (!isOpen || !application?.id) {
        // Reset flag when modal closes
        hasAutoUpdatedStatus.current = false
        return
      }
      
      // Only update if status is "pending" and we haven't updated yet
      // Don't update if already "under-review", "approved", or "rejected"
      if (application.status === "pending" && !hasAutoUpdatedStatus.current) {
        try {
          hasAutoUpdatedStatus.current = true // Mark as updated
          
          const applicationRef = doc(db, "applications", application.id)
          await updateDoc(applicationRef, {
            status: "under-review",
            updatedAt: new Date().toISOString(),
          })
          
          // Update local application state
          if (onUpdate) {
            onUpdate() // This will refresh the applications list
          }
          
          console.log("✅ Auto-updated application status to 'under-review'")
        } catch (error) {
          console.error("Error auto-updating application status:", error)
          hasAutoUpdatedStatus.current = false // Reset on error
          // Don't show error toast, just log it
        }
      }
    }

    autoUpdateStatus()
  }, [isOpen, application?.id, application?.status, onUpdate])

  // Fetch student documents, required documents, and forms
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !application?.userId) {
        setLoadingData(false)
        return
      }

      try {
        setLoadingData(true)

        // Fetch student documents
        try {
          const studentDocsQuery = query(
            collection(db, "studentDocuments"),
            where("userId", "==", application.userId)
          )
          const studentDocsSnapshot = await getDocs(studentDocsQuery)
          const docs = []
          
          // Reconstruct fileUrl from chunks for each document
          for (const docSnap of studentDocsSnapshot.docs) {
            const data = docSnap.data()
            let fileUrl = data.fileUrl || data.file || ''
            
            // If document is chunked, fetch and reconstruct from subcollection
            if (data.isChunked) {
              try {
                let chunksSnapshot
                try {
                  const chunksQuery = query(collection(db, "studentDocuments", docSnap.id, "chunks"), orderBy("index"))
                  chunksSnapshot = await getDocs(chunksQuery)
                } catch (error) {
                  // If orderBy fails, fetch all and sort manually
                  chunksSnapshot = await getDocs(collection(db, "studentDocuments", docSnap.id, "chunks"))
                }
                const chunks = chunksSnapshot.docs
                  .sort((a, b) => {
                    const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                    const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                    return indexA - indexB
                  })
                  .map(chunkDoc => chunkDoc.data().data)
                
                // Reconstruct full base64 string
                if (chunks.length > 0) {
                  const additionalData = chunks.join('')
                  fileUrl = fileUrl + additionalData
                  console.log(`✅ Reconstructed chunked document ${docSnap.id}:`, {
                    initialLength: (data.fileUrl || '').length,
                    chunksCount: chunks.length,
                    additionalLength: additionalData.length,
                    finalLength: fileUrl.length,
                    hasDataPrefix: fileUrl.startsWith('data:')
                  })
                }
              } catch (error) {
                console.error(`❌ Error reconstructing chunks for document ${docSnap.id}:`, error)
              }
            }
            
            // Validate fileUrl format
            if (fileUrl && !fileUrl.startsWith('data:') && fileUrl.length > 0) {
              console.warn(`⚠️ Document ${docSnap.id} fileUrl doesn't start with 'data:' prefix`)
            }
            
            docs.push({
              id: docSnap.id,
              name: data.documentName || data.name || "Document",
              fileName: data.fileName || data.name || "Document", // Actual file name from upload
              fileUrl: fileUrl,
              uploadedAt: data.uploadedAt || data.createdAt,
              requirementId: data.requirementId || null,
            })
          }
          // Sort by uploadedAt descending (most recent first)
          docs.sort((a, b) => {
            const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
            const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
            return dateB - dateA
          })
          setStudentDocuments(docs)
        } catch (error) {
          console.error("Error fetching student documents:", error)
        }

        // Fetch required documents (from scholarship)
        try {
          if (application.scholarshipId) {
            const scholarshipDoc = await getDoc(doc(db, "scholarships", application.scholarshipId))
            if (scholarshipDoc.exists()) {
              const scholarshipData = scholarshipDoc.data()
              const requirementIds = scholarshipData.documentRequirementIds || []
              
              if (requirementIds.length > 0) {
                const requirements = []
                for (const reqId of requirementIds) {
                  try {
                    const reqDoc = await getDoc(doc(db, "documentRequirements", reqId))
                    if (reqDoc.exists()) {
                      requirements.push({
                        id: reqDoc.id,
                        ...reqDoc.data()
                      })
                    }
                  } catch (error) {
                    console.error(`Error fetching requirement ${reqId}:`, error)
                  }
                }
                setRequiredDocuments(requirements)
              }
            }
          }
        } catch (error) {
          console.error("Error fetching required documents:", error)
        }

        // Fetch application form
        try {
          const applicationFormsQuery = query(
            collection(db, "applicationForms"),
            where("userId", "==", application.userId)
          )
          const applicationFormsSnapshot = await getDocs(applicationFormsQuery)
          if (!applicationFormsSnapshot.empty) {
            // Sort by submittedAt descending and get the most recent
            const forms = applicationFormsSnapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            }))
            forms.sort((a, b) => {
              const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
              const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
              return dateB - dateA
            })
            if (forms.length > 0) {
              setApplicationForm(forms[0])
            }
          }
        } catch (error) {
          console.error("Error fetching application form:", error)
        }

        // Fetch student profile form
        try {
          const profileFormsQuery = query(
            collection(db, "studentProfileForms"),
            where("userId", "==", application.userId)
          )
          const profileFormsSnapshot = await getDocs(profileFormsQuery)
          if (!profileFormsSnapshot.empty) {
            // Sort by submittedAt descending and get the most recent
            const forms = profileFormsSnapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            }))
            forms.sort((a, b) => {
              const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
              const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
              return dateB - dateA
            })
            if (forms.length > 0) {
              setProfileForm(forms[0])
            }
          }
        } catch (error) {
          console.error("Error fetching profile form:", error)
        }
      } catch (error) {
        console.error("Error fetching application data:", error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [isOpen, application?.userId, application?.scholarshipId])

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "pending"
    
    if (statusLower === "approved") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 border border-green-500/30 flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      )
    } else if (statusLower === "rejected") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 border border-red-500/30 flex items-center gap-1.5">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      )
    } else if (statusLower === "under-review") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 border border-blue-500/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Under Review
        </span>
      )
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      )
    }
  }

  const handleApprove = async () => {
    try {
      setIsApproving(true)
      
      const applicationRef = doc(db, "applications", application.id)
      await updateDoc(applicationRef, {
        status: "approved",
        adminRemarks: adminRemarks || null,
        reviewedAt: new Date().toISOString(),
        reviewedBy: "admin",
      })

      // Decrement scholarship slots when approved
      if (application.scholarshipId) {
        try {
          const scholarshipRef = doc(db, "scholarships", application.scholarshipId)
          await runTransaction(db, async (transaction) => {
            const scholarshipDoc = await transaction.get(scholarshipRef)
            if (scholarshipDoc.exists()) {
              const scholarshipData = scholarshipDoc.data()
              const currentSlots = scholarshipData.slots
              
              // Only decrement if slots is not null/undefined and greater than 0
              if (currentSlots !== null && currentSlots !== undefined && currentSlots > 0) {
                const newSlots = Math.max(0, (typeof currentSlots === 'number' ? currentSlots : parseInt(currentSlots)) - 1)
                transaction.update(scholarshipRef, { slots: newSlots })
                console.log(`✅ Decremented slots for scholarship ${application.scholarshipId}: ${currentSlots} -> ${newSlots}`)
              }
            }
          })
        } catch (slotError) {
          console.error("Error decrementing scholarship slots:", slotError)
          // Don't block approval if slot decrement fails
        }
      }

      // Send email notification
      try {
        if (application.userId) {
          const userDoc = await getDoc(doc(db, "users", application.userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const studentName = userData.fullName || userData.displayName || application.studentName || "Student"
            // Use secondaryEmail for sending emails
            const userEmail = userData.secondaryEmail || userData.email
            
            if (userEmail) {
              console.log('📧 Sending approval email to:', userEmail)
              const emailResponse = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: userEmail,
                  subject: '🎉 Application Approved - iScholar',
                  html: `
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
                            <p style="margin: 10px 0 0 0;">Your application for <strong>${application.scholarshipName || 'Scholarship'}</strong> has been <strong>approved</strong>!</p>
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
                })
              })
              
              if (!emailResponse.ok) {
                const errorData = await emailResponse.json().catch(() => ({}))
                console.error("Email API error:", errorData)
                throw new Error(`Email API returned ${emailResponse.status}: ${errorData.message || 'Unknown error'}`)
              }
              
              const emailResult = await emailResponse.json()
              console.log('✅ Approval email sent successfully:', emailResult)
            } else {
              console.warn('⚠️ No email address found for user:', application.userId)
            }
          }
        }
      } catch (emailError) {
        console.error("❌ Error sending application approval email:", emailError)
        // Don't block approval if email fails, but log it
        toast.error("Application approved but email notification failed", {
          icon: <XCircle className="w-4 h-4" />,
          duration: 3000,
        })
      }

      toast.success("Application approved successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })

      if (onUpdate) {
        onUpdate()
      }
      onClose()
    } catch (error) {
      console.error("Error approving application:", error)
      toast.error("Failed to approve application", {
        icon: <XCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!adminRemarks.trim()) {
      toast.error("Please provide a reason for rejection", {
        icon: <XCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })
      return
    }

    try {
      setIsRejecting(true)
      
      const applicationRef = doc(db, "applications", application.id)
      await updateDoc(applicationRef, {
        status: "rejected",
        adminRemarks: adminRemarks,
        reviewedAt: new Date().toISOString(),
        reviewedBy: "admin",
      })

      // Send email notification
      try {
        if (application.userId) {
          const userDoc = await getDoc(doc(db, "users", application.userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const studentName = userData.fullName || userData.displayName || application.studentName || "Student"
            // Use secondaryEmail for sending emails
            const userEmail = userData.secondaryEmail || userData.email
            
            if (userEmail) {
              console.log('📧 Sending decline email to:', userEmail)
              const emailResponse = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: userEmail,
                  subject: 'Application Status Update - iScholar',
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
                          <h1>Application Status Update</h1>
                        </div>
                        <div class="content">
                          <p>Dear ${studentName},</p>
                          <p>We regret to inform you that your application for <strong>${application.scholarshipName || 'Scholarship'}</strong> has been <strong>declined</strong>.</p>
                          <div class="reason-box">
                            <strong>Reason:</strong><br>
                            ${adminRemarks}
                          </div>
                          <p>We encourage you to apply for other available scholarships that may be a better fit for your profile.</p>
                          <p>If you have any questions, please contact our support team.</p>
                          <p>Best regards,<br>iScholar Team</p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `
                })
              })
              
              if (!emailResponse.ok) {
                const errorData = await emailResponse.json().catch(() => ({}))
                console.error("Email API error:", errorData)
                throw new Error(`Email API returned ${emailResponse.status}: ${errorData.message || 'Unknown error'}`)
              }
              
              const emailResult = await emailResponse.json()
              console.log('✅ Decline email sent successfully:', emailResult)
            } else {
              console.warn('⚠️ No email address found for user:', application.userId)
            }
          }
        }
      } catch (emailError) {
        console.error("❌ Error sending application decline email:", emailError)
        // Don't block rejection if email fails, but log it
        toast.error("Application rejected but email notification failed", {
          icon: <XCircle className="w-4 h-4" />,
          duration: 3000,
        })
      }

      toast.success("Application rejected", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })

      if (onUpdate) {
        onUpdate()
      }
      onClose()
    } catch (error) {
      console.error("Error rejecting application:", error)
      toast.error("Failed to reject application", {
        icon: <XCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })
    } finally {
      setIsRejecting(false)
    }
  }

  if (!isOpen || !application) return null

  const formData = application.formData || {}
  const files = application.files || {}

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] ${
          isClosing 
            ? 'animate-out fade-out duration-200' 
            : 'animate-in fade-in duration-200'
        }`}
        onClick={handleClose}
      />

      {/* Modal - Horizontal on Desktop, Vertical on Mobile */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
        <div
          ref={modalRef}
          className={`bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] md:h-[85vh] lg:h-[80vh] overflow-hidden flex flex-col md:flex-row my-auto ${
            isClosing
              ? 'animate-out fade-out zoom-out-95 slide-out-to-bottom-4 duration-200'
              : 'animate-in zoom-in-95 fade-in duration-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Side - Student Info & Details (Desktop) / Top (Mobile) */}
          <div className="w-full md:w-2/5 flex flex-col flex-shrink-0 border-b md:border-b-0 md:border-r border-border/30 min-h-0 bg-gradient-to-b from-card to-muted/5">
            {/* Header - Enhanced */}
            <div className="p-3 sm:p-3.5 md:p-4 border-b border-border/30 flex-shrink-0 bg-card/50 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {application.photoURL ? (
                    <img
                      src={application.photoURL}
                      alt={application.name || application.studentName || "Student"}
                      className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl object-cover ring-2 ring-primary/30 shadow-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center ring-2 ring-primary/30 shadow-md flex-shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground break-words line-clamp-2 leading-tight">{application.name || application.studentName}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5 font-mono">{application.studentNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusBadge(application.status)}
                </div>
              </div>
            </div>

            {/* Student Info - Enhanced with Scrollbar */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-4 space-y-3 sm:space-y-4 custom-scrollbar" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
              }}
            >
              
              {/* Scholarship - Enhanced */}
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-3 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Scholarship</p>
                </div>
                <p className="text-sm sm:text-base font-bold text-foreground break-words leading-snug">{application.scholarshipName}</p>
              </div>

              {/* Student Details - Enhanced */}
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                  <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 font-medium">Course</p>
                    <p className="text-sm font-semibold text-foreground break-words">{application.course}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                  <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 font-medium">Year Level</p>
                    <p className="text-sm font-semibold text-foreground">{application.yearLevel}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                  <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 font-medium">Campus</p>
                    <p className="text-sm font-semibold text-foreground break-words">{application.campus}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                  <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 font-medium">Submitted</p>
                    <p className="text-sm font-semibold text-foreground">{application.submittedDate}</p>
                  </div>
                </div>
              </div>

              {/* Form Data - Enhanced */}
              {Object.keys(formData).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Application Details</p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(formData).map(([key, value]) => {
                      // Skip "Full Name" since it's already shown in the header
                      if (key.toLowerCase() === 'full name' || key.toLowerCase() === 'fullname') {
                        return null
                      }
                      return (
                        <div key={key} className="p-3 bg-card rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all shadow-sm">
                          <p className="text-xs text-muted-foreground mb-1.5 font-medium">{key}</p>
                          <p className="text-sm font-semibold text-foreground break-words">{value || "N/A"}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Requirements & Forms Status (Desktop) / Bottom (Mobile) */}
          <div className="w-full md:w-3/5 flex flex-col flex-shrink-0 min-h-0 bg-card">
            {/* Requirements Section */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
              }}
            >
              {loadingData ? (
                <div className="p-4 space-y-6 animate-pulse">
                  {/* Required Documents Skeleton */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-muted rounded-lg"></div>
                      <div className="h-4 w-32 bg-muted rounded"></div>
                    </div>
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-40 bg-muted rounded"></div>
                              <div className="h-3 w-32 bg-muted rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submitted Documents Skeleton */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-muted rounded-lg"></div>
                      <div className="h-4 w-36 bg-muted rounded"></div>
                    </div>
                    <div className="space-y-2">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-40 bg-muted rounded"></div>
                              <div className="h-3 w-24 bg-muted rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Forms Status Skeleton */}
                  <div className="mt-6 pt-6 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-muted rounded-lg"></div>
                      <div className="h-4 w-28 bg-muted rounded"></div>
                    </div>
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="p-4 bg-card rounded-lg border border-border/50">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-muted rounded-lg"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-muted rounded"></div>
                                <div className="h-3 w-48 bg-muted rounded"></div>
                              </div>
                            </div>
                            <div className="w-16 h-8 bg-muted rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  {/* Required Documents */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Required Documents</p>
                    </div>
                    {requiredDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {requiredDocuments.map((req) => {
                          const submittedDoc = studentDocuments.find(doc => doc.requirementId === req.id)
                          return (
                            <div
                              key={req.id}
                              className={`p-3 rounded-lg border transition-all ${
                                submittedDoc
                                  ? 'border-green-500/50 bg-green-500/5'
                                  : 'border-border/50 bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                                    submittedDoc
                                      ? 'bg-green-500/20 text-green-600'
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground break-words">{req.name}</p>
                                    {req.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                                    )}
                                  </div>
                                </div>
                                {submittedDoc ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No required documents set for this scholarship</p>
                    )}
                  </div>

                  {/* Submitted Documents */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted Documents</p>
                  </div>
                    {studentDocuments.length > 0 ? (
                  <div className="space-y-2.5">
                        {studentDocuments.map((doc) => {
                          // Check if it's base64
                          const isBase64 = doc.fileUrl && doc.fileUrl.startsWith('data:')
                          
                          // Determine file type from base64 mime type or file extension
                          let fileType = null
                          if (isBase64) {
                            const mimeType = doc.fileUrl.split(';')[0].split(':')[1]
                            if (mimeType?.startsWith('image/')) {
                              fileType = 'image'
                            } else if (mimeType === 'application/pdf') {
                              fileType = 'pdf'
                            }
                          } else if (doc.fileUrl) {
                            if (doc.fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || doc.fileUrl.startsWith('data:image/')) {
                              fileType = 'image'
                            } else if (doc.fileUrl.toLowerCase().match(/\.(pdf)$/i)) {
                              fileType = 'pdf'
                            }
                          }
                          
                          const handleDocumentClick = (e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (doc.fileUrl) {
                              if (fileType === 'image') {
                                // For images, open preview modal
                                setSelectedDocument({
                                  url: doc.fileUrl,
                                  name: doc.name || doc.documentName || 'Document',
                                  type: fileType
                                })
                                setIsDocumentModalOpen(true)
                              } else if (fileType === 'pdf') {
                                // For PDFs, download directly
                                handleDownloadDocument(doc.fileUrl, doc.fileName || doc.name || 'document')
                              } else {
                                // For other file types, try to open in new tab
                                window.open(doc.fileUrl, '_blank', 'noopener,noreferrer')
                              }
                            }
                          }
                          
                          const handleDownloadDocument = (url, name) => {
                            try {
                              console.log('📥 Download initiated:', { 
                                url: url?.substring(0, 100) + '...', 
                                name,
                                urlLength: url?.length,
                                isBase64: url?.startsWith('data:')
                              })
                              
                              if (!url) {
                                console.error('❌ No file URL available')
                                toast.error("File URL not available", {
                                  icon: <XCircle className="w-4 h-4" />,
                                  duration: 3000,
                                })
                                return
                              }
                              
                              // Validate base64 format
                              if (url.startsWith('data:')) {
                                const matches = url.match(/^data:([^;]+);base64,(.+)$/)
                                if (!matches) {
                                  console.error('❌ Invalid base64 format - missing mime type or data')
                                  toast.error("Invalid file format", {
                                    icon: <XCircle className="w-4 h-4" />,
                                    duration: 3000,
                                  })
                                  return
                                }
                                
                                const mimeType = matches[1]
                                const base64Data = matches[2]
                                
                                console.log('📄 Base64 validation:', {
                                  mimeType,
                                  base64Length: base64Data.length,
                                  isValidBase64: /^[A-Za-z0-9+/=]*$/.test(base64Data.replace(/\s/g, ''))
                                })
                                
                                // Convert to blob for more reliable download
                                try {
                                  const byteCharacters = atob(base64Data)
                                  const byteNumbers = new Array(byteCharacters.length)
                                  for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                                  }
                                  const byteArray = new Uint8Array(byteNumbers)
                                  const blob = new Blob([byteArray], { type: mimeType })
                                  const blobUrl = URL.createObjectURL(blob)
                                  
                                  console.log('✅ Blob created:', {
                                    blobSize: blob.size,
                                    blobType: blob.type,
                                    expectedSize: base64Data.length * 0.75 // Approximate
                                  })
                                  
                                  const link = document.createElement('a')
                                  link.href = blobUrl
                                  link.download = name || 'document'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                  
                                  // Clean up blob URL after a delay
                                  setTimeout(() => {
                                    URL.revokeObjectURL(blobUrl)
                                  }, 100)
                                  
                                  console.log('✅ Download completed:', name)
                                } catch (blobError) {
                                  console.error('❌ Error creating blob:', blobError)
                                  // Fallback to direct download
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = name || 'document'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }
                              } else {
                                // For non-base64 URLs, try direct download
                                const link = document.createElement('a')
                                link.href = url
                                link.download = name || 'document'
                                link.target = '_blank'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }
                            } catch (error) {
                              console.error("❌ Error downloading document:", error)
                              toast.error("Failed to download document", {
                                icon: <XCircle className="w-4 h-4" />,
                                duration: 3000,
                              })
                            }
                          }
                          
                          return (
                            <div
                              key={doc.id}
                              onClick={handleDocumentClick}
                              onMouseDown={(e) => e.stopPropagation()}
                        className={`p-3 rounded-lg border transition-all ${
                                doc.fileUrl
                            ? 'cursor-pointer border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary/50 hover:from-primary/10 hover:to-secondary/10 hover:shadow-md'
                            : 'border-border/30 bg-muted/20 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                                  doc.fileUrl
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground break-words">{doc.name}</p>
                                  {doc.fileUrl && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                      {fileType === 'image' ? 'Click to preview' : fileType === 'pdf' ? 'Click to download' : 'Click to open file'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                          )
                        })}
                </div>
              ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 rounded-full bg-muted/30 mb-3">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No documents submitted</p>
                      </div>
                    )}
                  </div>

                  {/* Forms Status Section */}
                  <div className="mt-6 pt-6 border-t border-border/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <ClipboardList className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Forms Status</p>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Application Form Status */}
                    <div className="p-4 bg-card rounded-lg border border-border/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            applicationForm
                              ? 'bg-green-500/20 text-green-600'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Application Form</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {applicationForm ? 'Form has been submitted' : 'Form not submitted yet'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {applicationForm ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                          {applicationForm && (
                            <button
                              onClick={() => setIsApplicationFormModalOpen(true)}
                              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile Form Status */}
                    <div className="p-4 bg-card rounded-lg border border-border/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            profileForm
                              ? 'bg-green-500/20 text-green-600'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Student Profile Form</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {profileForm ? 'Form has been submitted' : 'Form not submitted yet'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {profileForm ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                          {profileForm && (
                            <button
                              onClick={() => setIsProfileFormModalOpen(true)}
                              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )}
            </div>

            {/* Footer - Actions - Enhanced */}
            <div className="p-3 sm:p-4 md:p-4 border-t border-border/30 flex-shrink-0 bg-gradient-to-t from-card to-muted/5 space-y-3">
              {/* Admin Remarks */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Admin Remarks
                  <span className="text-muted-foreground font-normal text-xs hidden sm:inline">(Optional for approve, Required for reject)</span>
                  <span className="text-muted-foreground font-normal text-xs sm:hidden">(Optional/Required)</span>
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="w-full p-3 border border-border/50 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm shadow-sm transition-all"
                  rows={3}
                  placeholder="Enter remarks or reason for rejection..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end">
                <button
                  onClick={handleReject}
                  disabled={isApproving || isRejecting}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full md:w-auto"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Reject
                    </>
                  )}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full md:w-auto"
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
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isImageModalOpen && selectedImage && (
        <ImageZoomModal
          imageSrc={selectedImage}
          alt="Application Document"
          isOpen={isImageModalOpen}
          onClose={(e) => {
            if (e) {
              e.stopPropagation()
              e.preventDefault()
            }
            setIsImageModalOpen(false)
            setSelectedImage(null)
          }}
        />
      )}

      {/* Document Preview Modal */}
      {isDocumentModalOpen && selectedDocument && (
        <DocumentPreviewModal
          isOpen={isDocumentModalOpen}
          onClose={(e) => {
            if (e) {
              e.stopPropagation()
              e.preventDefault()
            }
            setIsDocumentModalOpen(false)
            setSelectedDocument(null)
          }}
          fileUrl={selectedDocument.url}
          fileName={selectedDocument.name}
          fileType={selectedDocument.type}
        />
      )}

      {/* Application Form Modal */}
      {isApplicationFormModalOpen && (
        <FormViewModal
          isOpen={isApplicationFormModalOpen}
          onClose={() => setIsApplicationFormModalOpen(false)}
          formData={applicationForm}
          formType="applicationForm"
          userPhoto={application.photoURL}
          formName="Application Form"
          loading={loadingData || !applicationForm}
        />
      )}

      {/* Profile Form Modal */}
      {isProfileFormModalOpen && (
        <FormViewModal
          isOpen={isProfileFormModalOpen}
          onClose={() => setIsProfileFormModalOpen(false)}
          formData={profileForm}
          formType="studentProfileForm"
          userPhoto={application.photoURL}
          formName="Student Profile Form"
          loading={loadingData || !profileForm}
        />
      )}
    </>
  )

  // Render modal using portal to body, outside of any container constraints
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}

