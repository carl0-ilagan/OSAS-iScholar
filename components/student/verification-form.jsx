"use client"

import { useState, useEffect, useMemo } from "react"
import { Upload, CheckCircle, ArrowRight, ArrowLeft, User, FileText, Send, AlertCircle, Loader2, MapPin, X } from "lucide-react"
import { toast } from "sonner"
import { collection, addDoc, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

export default function VerificationForm({ step, setStep, userData, verificationStatus }) {
  const [formData, setFormData] = useState({
    studentNumber: "",
    course: "",
    yearLevel: "",
    campus: "",
    address: "",
    idFront: null,
    idBack: null,
    cor: null,
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        studentNumber: userData.studentNumber || "",
        course: userData.course || "",
        yearLevel: userData.yearLevel || "",
        campus: userData.campus || "",
        address: userData.address || "",
      }))
      console.log('Form data initialized from userData:', userData)
    }
  }, [userData])

  // Check if verification already exists (pending or verified)
  useEffect(() => {
    if (verificationStatus === "pending" || verificationStatus === "verified") {
      setIsSubmitted(true)
    }
  }, [verificationStatus])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    if (files && files.length > 0) {
      setFormData(prev => ({ ...prev, [name]: files[0] }))
      console.log('File uploaded:', name, files[0].name)
    } else {
      // Clear the file
      setFormData(prev => ({ ...prev, [name]: null }))
    }
  }

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  // Validation function - using useMemo for reactive updates
  const isStepValid = useMemo(() => {
    if (step === 1) {
      const yearLevel = formData.yearLevel || ''
      const address = formData.address || ''
      const hasYearLevel = yearLevel.trim() !== '' && yearLevel !== 'Select Year Level'
      const hasAddress = address.trim().length > 0
      const isValid = hasYearLevel && hasAddress
      console.log('Step 1 validation check:', { yearLevel, hasYearLevel, address, hasAddress, isValid, formData })
      return isValid
    } else if (step === 2) {
      const isValid = !!(formData.idFront && formData.idBack && formData.cor)
      console.log('Step 2 validation check:', { idFront: !!formData.idFront, idBack: !!formData.idBack, cor: !!formData.cor, isValid, formData })
      return isValid
    } else if (step === 3) {
      return true
    }
    return false
  }, [step, formData.yearLevel, formData.address, formData.idFront, formData.idBack, formData.cor, formData])

  // Handle next step navigation with smooth transition
  const handleNext = () => {
    if (!isStepValid) {
      if (step === 1) {
        toast.error("Please fill in all required fields", {
          icon: <AlertCircle className="w-4 h-4" />,
          description: "Year Level and Address are required.",
        })
      } else if (step === 2) {
        toast.error("Please upload all required documents", {
          icon: <AlertCircle className="w-4 h-4" />,
          description: "Student ID (Front), Student ID (Back), and COR are required.",
        })
      }
      return
    }

    if (step < 3) {
      setStep(step + 1)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // If not on step 3, just go to next step
    if (step < 3) {
      handleNext()
      return
    }
    
    // Only submit to Firebase on step 3
    if (step === 3) {
      console.log('Submitting to Firebase on step 3')
      // Submit verification to Firebase
      setIsSubmitting(true)
      try {
        // Convert files to base64
        const idFrontBase64 = formData.idFront ? await fileToBase64(formData.idFront) : null
        const idBackBase64 = formData.idBack ? await fileToBase64(formData.idBack) : null
        const corBase64 = formData.cor ? await fileToBase64(formData.cor) : null

        // Save to Firestore
        const verificationData = {
          userId: user?.uid,
          studentNumber: formData.studentNumber,
          course: formData.course,
          yearLevel: formData.yearLevel,
          campus: formData.campus,
          address: formData.address || "",
          idFront: idFrontBase64,
          idBack: idBackBase64,
          cor: corBase64,
          status: "pending",
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        await addDoc(collection(db, "verifications"), verificationData)
        
        // Send email notifications
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const studentName = userData.fullName || userData.displayName || "Student"
            const secondaryEmail = userData.secondaryEmail
            const ADMIN_EMAIL = "contact.ischolar@gmail.com"
            
            // Send email to student
            if (secondaryEmail) {
              await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: secondaryEmail,
                  subject: 'Verification Request Submitted - iScholar',
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
                          <h1>Verification Request Submitted</h1>
                        </div>
                        <div class="content">
                          <p>Dear ${studentName},</p>
                          <p>Your account verification request has been submitted successfully!</p>
                          <p>Your verification is now under review. We will notify you via email once a decision has been made.</p>
                          <p>Thank you for your patience.</p>
                          <p>Best regards,<br>iScholar Team</p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `
                })
              })
            }
            
            // Send email to admin
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: ADMIN_EMAIL,
                subject: 'New Verification Request - iScholar',
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #005c2b 0%, #23b14d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                      .info-box { background: white; border-left: 4px solid #005c2b; padding: 15px; margin: 20px 0; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>New Verification Request</h1>
                      </div>
                      <div class="content">
                        <p>Hello Admin,</p>
                        <p>A new account verification request has been submitted and requires your review.</p>
                        <div class="info-box">
                          <p style="margin: 0;"><strong>Student Name:</strong> ${studentName}</p>
                          <p style="margin: 5px 0;"><strong>Student Number:</strong> ${formData.studentNumber}</p>
                          <p style="margin: 5px 0;"><strong>Course:</strong> ${formData.course}</p>
                          <p style="margin: 5px 0;"><strong>Year Level:</strong> ${formData.yearLevel}</p>
                          <p style="margin: 5px 0;"><strong>Campus:</strong> ${formData.campus}</p>
                          <p style="margin: 5px 0;"><strong>Address:</strong> ${formData.address}</p>
                        </div>
                        <p>Please log in to the admin dashboard to review this verification request.</p>
                        <p>Best regards,<br>iScholar System</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `
              })
            })
          }
        } catch (emailError) {
          console.error("Error sending verification email:", emailError)
        }
        
        setIsSubmitted(true)
        toast.success("Verification request submitted successfully!", {
          icon: <CheckCircle className="w-4 h-4" />,
          description: "Your verification is now under review. You'll receive an email confirmation shortly.",
          duration: 5000,
        })
      } catch (error) {
        console.error("Error submitting verification:", error)
        toast.error("Failed to submit verification", {
          icon: <AlertCircle className="w-4 h-4" />,
          description: error.message || "Please try again later.",
          duration: 5000,
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  // Show submitted state
  if (isSubmitted || verificationStatus === "pending" || verificationStatus === "verified") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6">
        <div className="text-center">
          {verificationStatus === "verified" ? (
            <>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Account Verified!</h3>
              <p className="text-muted-foreground">Your account has been successfully verified.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Verification Pending</h3>
              <p className="text-muted-foreground">Your verification request is under review.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 md:p-6 animate-in fade-in duration-300">
            <div className="mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-light text-foreground mb-1">Personal Information</h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-light">Fill in your personal details</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 sm:space-y-5">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-light text-foreground">Student Number</label>
                    <input
                      type="text"
                      name="studentNumber"
                      value={formData.studentNumber}
                      readOnly
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-border rounded-lg bg-muted/30 text-foreground/70 font-light"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-light text-foreground">Course</label>
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      readOnly
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-border rounded-lg bg-muted/30 text-foreground/70 font-light"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-light text-foreground">
                      Year Level <span className="text-destructive">*</span>
                    </label>
                    <select
                      name="yearLevel"
                      value={formData.yearLevel}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-light"
                      required
                    >
                      <option value="">Select Year Level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-light text-foreground">Campus</label>
                    <input
                      type="text"
                      name="campus"
                      value={formData.campus}
                      readOnly
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-border rounded-lg bg-muted/30 text-foreground/70 font-light"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-light text-foreground">
                    Address <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your complete address (Street, Barangay, City, Province)"
                    required
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all font-light"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 md:p-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b flex-shrink-0">
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Document Upload</h2>
                <p className="text-xs text-muted-foreground">Upload required documents</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-5">
                <FileUploadField 
                  label="Student ID (Front)" 
                  name="idFront" 
                  onChange={handleFileChange}
                  file={formData.idFront}
                />
                <FileUploadField 
                  label="Student ID (Back)" 
                  name="idBack" 
                  onChange={handleFileChange}
                  file={formData.idBack}
                />
                <FileUploadField 
                  label="COR / Proof of Enrollment" 
                  name="cor" 
                  onChange={handleFileChange}
                  file={formData.cor}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 md:p-6 animate-in fade-in duration-300">
            <div className="mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-light text-foreground mb-1">Review & Submit</h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-light">Review your information before submitting</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 sm:space-y-5">
                <div className="bg-primary/5 border border-primary/20 p-4 sm:p-5 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-light text-sm sm:text-base mb-1 text-foreground">Ready to Submit</p>
                      <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
                        Please review all your information. Once submitted, your verification request will be sent for admin approval.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="border border-border rounded-lg p-4 sm:p-5">
                    <h3 className="font-light text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 uppercase tracking-wide">Personal Information</h3>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light">Student Number:</span>
                        <span className="text-xs sm:text-sm font-light text-foreground text-right break-words">{formData.studentNumber}</span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light">Course:</span>
                        <span className="text-xs sm:text-sm font-light text-foreground text-right break-words">{formData.course}</span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light">Year Level:</span>
                        <span className="text-xs sm:text-sm font-light text-foreground text-right">{formData.yearLevel}</span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light">Campus:</span>
                        <span className="text-xs sm:text-sm font-light text-foreground text-right break-words">{formData.campus}</span>
                      </div>
                      <div className="pt-2 sm:pt-3 border-t border-border">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light block mb-1">Address:</span>
                        <span className="text-xs sm:text-sm font-light text-foreground break-words">{formData.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4 sm:p-5">
                    <h3 className="font-light text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 uppercase tracking-wide">Documents</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light">Student ID (Front):</span>
                        <span className="text-xs sm:text-sm font-light text-primary text-right truncate ml-2">{formData.idFront ? formData.idFront.name : "Not uploaded"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light">Student ID (Back):</span>
                        <span className="text-xs sm:text-sm font-light text-primary text-right truncate ml-2">{formData.idBack ? formData.idBack.name : "Not uploaded"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground font-light">COR / Proof of Enrollment:</span>
                        <span className="text-xs sm:text-sm font-light text-primary text-right truncate ml-2">{formData.cor ? formData.cor.name : "Not uploaded"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Navigation Buttons */}
      <div className="border-t border-border p-4 sm:p-5 md:p-6 flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className={`px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg font-light transition-all flex items-center gap-2 ${
            step === 1
              ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-background border border-border hover:bg-muted text-foreground"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </button>
        <button
          type={step === 3 ? "submit" : "button"}
          disabled={!isStepValid || isSubmitting}
          onClick={(e) => {
            if (step < 3) {
              e.preventDefault()
              handleNext()
            }
          }}
          className={`px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg font-light transition-all flex items-center gap-2 ${
            !isStepValid || isSubmitting
              ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md cursor-pointer"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Submitting...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : step === 3 ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Submit Verification</span>
              <span className="sm:hidden">Submit</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// File Upload Field Component
function FileUploadField({ label, name, onChange, file, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs sm:text-sm font-light mb-2 text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      <div className="relative group">
        <input
          type="text"
          readOnly
          value={file ? file.name : ""}
          placeholder="No file chosen"
          className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-24 sm:pr-28 border rounded-lg bg-background text-xs sm:text-sm font-light transition-all ${
            file 
              ? "border-primary/50 bg-primary/5" 
              : "border-border hover:border-primary/50 focus:border-primary"
          }`}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {file && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                const input = document.getElementById(name)
                if (input) {
                  input.value = ''
                }
                onChange({ target: { name, files: null } })
              }}
              className="p-1 sm:p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
            </button>
          )}
          <label
            htmlFor={name}
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all cursor-pointer text-xs sm:text-sm font-light whitespace-nowrap"
          >
            Choose File
          </label>
          <input
            type="file"
            id={name}
            name={name}
            onChange={onChange}
            accept="image/*"
            className="hidden"
          />
        </div>
        {file && (
          <div className="mt-1.5 sm:mt-2 flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground font-light">
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        )}
      </div>
    </div>
  )
}
