"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, CheckCircle, XCircle, Clock, FileText, User, GraduationCap, MapPin, Calendar, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import ImageZoomModal from "./image-zoom-modal"

export default function ApplicationDetailModal({ application, isOpen, onClose, onUpdate }) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [adminRemarks, setAdminRemarks] = useState("")
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const modalRef = useRef(null)

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

          {/* Right Side - Documents & Actions (Desktop) / Bottom (Mobile) */}
          <div className="w-full md:w-3/5 flex flex-col flex-shrink-0 min-h-0 bg-card">
            {/* Documents Section - Enhanced with Scrollbar */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-4 custom-scrollbar" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
              }}
            >
              
              {Object.keys(files).length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted Documents</p>
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(files).map(([key, fileData]) => (
                      <div
                        key={key}
                        onClick={() => {
                          if (fileData && typeof fileData === 'string' && fileData.startsWith('data:')) {
                            setSelectedImage(fileData)
                            setIsImageModalOpen(true)
                          }
                        }}
                        className={`p-3 rounded-lg border transition-all ${
                          fileData && typeof fileData === 'string' && fileData.startsWith('data:')
                            ? 'cursor-pointer border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary/50 hover:from-primary/10 hover:to-secondary/10 hover:shadow-md'
                            : 'border-border/30 bg-muted/20 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                            fileData && typeof fileData === 'string' && fileData.startsWith('data:')
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground break-words">{key}</p>
                            {fileData && typeof fileData === 'string' && fileData.startsWith('data:') && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Click to preview
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="p-4 rounded-full bg-muted/30 mb-3">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No documents submitted</p>
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
          onClose={() => {
            setIsImageModalOpen(false)
            setSelectedImage(null)
          }}
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

