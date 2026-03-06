"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { User } from "lucide-react"
import ApplicationFormViewer from "./application-form-viewer"

export default function FormViewModal({ isOpen, onClose, formData, formType, userPhoto, formName, loading = false }) {
  const [isClosing, setIsClosing] = useState(false)
  const modalRef = useRef(null)

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on navigation buttons or their containers
      const target = event.target
      if (
        target.closest('button[type="button"]') ||
        target.closest('.navigation-footer') ||
        target.closest('[data-navigation]')
      ) {
        return
      }
      
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose()
      }
    }

    if (isOpen) {
      // Use a slight delay to allow button clicks to register first
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true)
      }, 100)
      document.body.style.overflow = 'hidden'
      
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside, true)
        document.body.style.overflow = 'unset'
      }
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

  if (!isOpen) return null

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] ${
          isClosing 
            ? 'animate-out fade-out duration-200' 
            : 'animate-in fade-in duration-200'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
        <div
          ref={modalRef}
          className={`bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] sm:h-[90vh] md:h-[85vh] overflow-hidden flex flex-col md:flex-row my-auto ${
            isClosing
              ? 'animate-out fade-out zoom-out-95 slide-out-to-bottom-4 duration-200'
              : 'animate-in zoom-in-95 fade-in duration-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Side - Photo (Desktop) / Top (Mobile) */}
          <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-border/30 flex flex-col items-center justify-center">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-primary/30 shadow-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt="Student Photo"
                  className="w-full h-full object-cover"
                  onClick={() => {
                    // Handle image click if needed
                  }}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <User className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-primary/60" />
              )}
            </div>
            <div className="mt-4 sm:mt-6 text-center">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1">
                {formData.name || formData.fullName || "Student Name"}
              </h2>
              {formData.email && (
                <p className="text-xs sm:text-sm text-muted-foreground">{formData.email}</p>
              )}
              {formData.studentIdNumber || formData.studentNumber ? (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {formData.studentIdNumber || formData.studentNumber}
                </p>
              ) : null}
            </div>
          </div>

          {/* Right Side - Form Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header - Enhanced */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-border bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{formName}</h2>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                  <span className="text-xs font-semibold text-primary">View Mode</span>
                </div>
              </div>
            </div>

            {/* Content - Full Height Container */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {loading || !formData ? (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
                    {/* Header Skeleton */}
                    <div className="h-8 w-48 bg-muted rounded"></div>
                    {/* Form Fields Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(6)].map((_, index) => (
                        <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                          <div className="h-3 w-24 bg-muted rounded mb-3"></div>
                          <div className="h-4 w-full bg-muted rounded"></div>
                        </div>
                      ))}
                    </div>
                    {/* Navigation Skeleton */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="h-10 w-24 bg-muted rounded"></div>
                      <div className="flex gap-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-2 w-2 bg-muted rounded-full"></div>
                        ))}
                      </div>
                      <div className="h-10 w-20 bg-muted rounded"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <ApplicationFormViewer
                    formData={formData}
                    formType={formType}
                    userPhoto={userPhoto}
                    onClose={null}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  // Render modal using portal
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}

