"use client"

import { useState, useEffect, useRef } from "react"
import { GraduationCap, Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { generateScholarshipCode } from "@/lib/scholarship-tracker"

// Static scholarship data fallback (from apply page)
const STATIC_SCHOLARSHIP_DATA = {
  "Merit Scholarship": {
    benefit: "Full Tuition + Stipend + Allowance",
    benefitAmount: "Up to ₱80,000/year (SUC)",
  },
  "Needs-Based Grant": {
    benefit: "Tuition support based on family income",
    benefitAmount: "Up to 50% Tuition Coverage",
  },
  "Tertiary Education Subsidy (TES)": {
    benefit: "Annual educational subsidy",
    benefitAmount: "₱20,000/year (SUC)",
  },
  "Teacher Development Program (TDP)": {
    benefit: "Financial support every semester",
    benefitAmount: "₱7,500 per semester (₱15,000/year)",
  },
}

export default function ScholarshipApplyModal({ isOpen, onClose, scholarship, userData }) {
  const [formData, setFormData] = useState({})
  const [files, setFiles] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const modalRef = useRef(null)

  // Initialize form data based on scholarship requirements (only once when modal opens)
  useEffect(() => {
    if (isOpen && scholarship && userData) {
      const initialData = {}
      const initialFiles = {}
      
      scholarship.requirements.forEach((req) => {
        const reqObj = typeof req === 'object' ? req : { type: 'text', label: req, required: true }
        const fieldKey = reqObj.label || req
        
        if (reqObj.type === 'file') {
          // Check if we should auto-fill from user data
          if (reqObj.autoFill === 'idFront' && userData.idFront) {
            // Keep as base64 string for auto-filled files
            initialFiles[fieldKey] = userData.idFront
          } else if (reqObj.autoFill === 'idBack' && userData.idBack) {
            initialFiles[fieldKey] = userData.idBack
          } else {
            // Preserve existing file if already uploaded
            initialFiles[fieldKey] = files[fieldKey] || null
          }
        } else {
          // Auto-fill from user data, but preserve existing input
          if (reqObj.autoFill === 'fullName') {
            initialData[fieldKey] = formData[fieldKey] || userData.fullName || userData.displayName || ''
          } else {
            // Preserve existing input
            initialData[fieldKey] = formData[fieldKey] || ''
          }
        }
      })
      
      // Only update if form is empty (first time opening)
      if (Object.keys(formData).length === 0 && Object.keys(files).length === 0) {
        setFormData(initialData)
        setFiles(initialFiles)
      }
    }
  }, [isOpen, scholarship]) // Removed userData from dependencies to prevent reset

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
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
  }, [isOpen, onClose])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field, file) => {
    if (file) {
      setFiles(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      toast.error("Please log in to apply", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Validate required fields
      const requirements = scholarship.requirements || []
      for (const req of requirements) {
        const reqObj = typeof req === 'object' ? req : { type: 'text', label: req, required: true }
        const fieldKey = reqObj.label || req
        
        if (reqObj.required && reqObj.type === 'file' && !files[fieldKey]) {
          toast.error(`Please upload ${fieldKey}`, {
            icon: <AlertCircle className="w-5 h-5" />,
            duration: 3000,
            position: "top-right",
          })
          setIsSubmitting(false)
          return
        }
        
        if (reqObj.required && reqObj.type !== 'file' && !formData[fieldKey]) {
          toast.error(`Please fill in ${fieldKey}`, {
            icon: <AlertCircle className="w-5 h-5" />,
            duration: 3000,
            position: "top-right",
          })
          setIsSubmitting(false)
          return
        }
      }

      // Convert files to base64
      const fileData = {}
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          // If it's already a base64 string (from auto-fill), use it directly
          if (typeof file === 'string' && file.startsWith('data:')) {
            fileData[key] = file
          } else {
            // Otherwise, convert the file to base64
            fileData[key] = await fileToBase64(file)
          }
        }
      }

      // Generate scholarship tracker code
      const trackerCode = await generateScholarshipCode(scholarship.name)

      // Get benefit data - prefer from scholarship object, then from static fallback
      const staticData = STATIC_SCHOLARSHIP_DATA[scholarship.name] || {}
      const benefitAmount = scholarship.benefitAmount || 
                           scholarship.amount || 
                           staticData.benefitAmount || 
                           "N/A"
      const benefit = scholarship.benefit || 
                     staticData.benefit || 
                     "N/A"

      // Prepare application data
      const applicationData = {
        userId: user.uid,
        scholarshipId: scholarship.id,
        scholarshipName: scholarship.name,
        trackerCode: trackerCode,
        benefitAmount: benefitAmount,
        benefit: benefit,
        studentName: userData?.fullName || userData?.displayName || user.email,
        studentNumber: userData?.studentNumber || '',
        course: userData?.course || '',
        yearLevel: userData?.yearLevel || '',
        campus: userData?.campus || '',
        formData: formData,
        files: fileData,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      await addDoc(collection(db, "applications"), applicationData)
      
      toast.success("Application submitted successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        description: `Your tracker code: ${trackerCode}. Your application is now under review.`,
        duration: 5000,
        position: "top-right",
      })

      // Reset form
      setFormData({})
      setFiles({})
      onClose()
      
      // Notify parent component that application was submitted
      if (onApplicationSubmitted) {
        onApplicationSubmitted()
      }
      
      // Notify parent component that application was submitted
      if (onApplicationSubmitted) {
        onApplicationSubmitted()
      }
    } catch (error) {
      console.error("Error submitting application:", error)
      toast.error("Failed to submit application", {
        icon: <AlertCircle className="w-5 h-5" />,
        description: error.message || "Please try again later.",
        duration: 4000,
        position: "top-right",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !scholarship) return null

  const requirements = scholarship.requirements || []
  const displayRequirements = requirements.map(req => {
    if (typeof req === 'object' && req.label) {
      return req.label
    }
    return req
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal - Horizontal on Desktop, Vertical on Mobile */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 md:p-4 lg:p-6">
        <div
          ref={modalRef}
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] md:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Side - Scholarship Info (Desktop) / Top (Mobile) */}
          <div className="w-full md:w-2/5 lg:w-1/3 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 p-4 md:p-5 lg:p-6 border-b md:border-b-0 md:border-r border-border/50 flex flex-col flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{scholarship.name}</h2>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{scholarship.description}</p>
              </div>
            </div>

            <div className="mb-4 p-3 md:p-4 bg-card/50 rounded-lg border border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Benefit</p>
              <p className="text-base md:text-lg font-bold text-foreground mb-1">{scholarship.benefit}</p>
              <p className="text-sm font-semibold text-primary">{scholarship.benefitAmount}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Requirements:</p>
              <ul className="space-y-1.5 mb-3">
                {displayRequirements.slice(0, 5).map((req, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs">
                    <FileText className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{req}</span>
                  </li>
                ))}
                {displayRequirements.length > 5 && (
                  <li className="text-xs text-muted-foreground italic">
                    + {displayRequirements.length - 5} more requirements
                  </li>
                )}
              </ul>
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Accepted File Formats:</p>
                <p className="text-xs text-muted-foreground">Image, PDF, Word (.doc, .docx)</p>
              </div>
            </div>
          </div>

          {/* Right Side - Application Form (Desktop) / Bottom (Mobile) */}
          <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-5 lg:p-6 border-b border-border/50 flex-shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-foreground">Application Form</h3>
            </div>

            {/* Form Content - Scrollable, No scrollbar on desktop */}
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 lg:p-6 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {requirements.map((req, index) => {
                  const reqObj = typeof req === 'object' ? req : { type: 'text', label: req, required: true }
                  const fieldKey = reqObj.label || req
                  const fieldType = reqObj.type || 'text'

                  return (
                    <div key={index} className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">
                        {fieldKey}
                        {reqObj.required && <span className="text-destructive ml-1">*</span>}
                        {!reqObj.required && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
                      </label>

                      {fieldType === 'select' && (
                        <select
                          value={formData[fieldKey] || ''}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                          required={reqObj.required}
                        >
                          <option value="">Select...</option>
                          {(reqObj.options || ['Yes', 'No']).map((option) => (
                            <option key={option} value={option.toLowerCase()}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}

                      {fieldType === 'number' && (
                        <input
                          type="number"
                          value={formData[fieldKey] || ''}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                          placeholder="Enter value"
                          step="0.01"
                          min="0"
                          required={reqObj.required}
                        />
                      )}

                      {fieldType === 'file' && (
                        <div className="space-y-2">
                          {reqObj.autoFill && (reqObj.autoFill === 'idFront' || reqObj.autoFill === 'idBack') && files[fieldKey] && typeof files[fieldKey] === 'string' ? (
                            <div className="p-3 border border-primary/30 rounded-lg bg-primary/5">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">Auto-filled from account</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This document was already uploaded during account verification.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setFiles(prev => ({ ...prev, [fieldKey]: null }))
                                }}
                                className="mt-2 text-xs text-primary hover:underline"
                              >
                                Upload different file
                              </button>
                            </div>
                          ) : (
                            <>
                              <label className="flex items-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                                <Upload className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-sm text-foreground flex-1 truncate">
                                  {files[fieldKey] && typeof files[fieldKey] !== 'string' ? files[fieldKey].name : 'Click to upload file'}
                                </span>
                                <input
                                  type="file"
                                  onChange={(e) => handleFileChange(fieldKey, e.target.files[0])}
                                  className="hidden"
                                  accept="image/*,.pdf,.doc,.docx"
                                  required={reqObj.required && !files[fieldKey]}
                                />
                              </label>
                              {files[fieldKey] && typeof files[fieldKey] !== 'string' && (
                                <p className="text-xs text-muted-foreground">
                                  Selected: {files[fieldKey].name} ({(files[fieldKey].size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {fieldType === 'text' && (
                        <input
                          type="text"
                          value={formData[fieldKey] || ''}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className={`w-full p-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm ${
                            reqObj.autoFill === 'fullName' && formData[fieldKey] ? 'bg-muted/30 cursor-not-allowed' : ''
                          }`}
                          placeholder={`Enter ${fieldKey}`}
                          required={reqObj.required}
                          disabled={reqObj.autoFill === 'fullName' && !!formData[fieldKey]}
                          readOnly={reqObj.autoFill === 'fullName' && !!formData[fieldKey]}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Submit Button - Fixed at bottom */}
              <div className="mt-6 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
