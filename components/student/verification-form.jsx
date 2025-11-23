"use client"

import { useState, useEffect } from "react"
import { Upload, CheckCircle, ArrowRight, ArrowLeft, User, FileText, Send, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

export default function VerificationForm({ step, setStep, userData, verificationStatus }) {
  const [formData, setFormData] = useState({
    studentNumber: "",
    course: "",
    yearLevel: "",
    campus: "",
    idFront: null,
    idBack: null,
    cor: null,
  })
  const [direction, setDirection] = useState("forward")
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
      }))
    }
  }, [userData])

  // Check if verification already exists (pending or verified)
  useEffect(() => {
    if (verificationStatus === "pending" || verificationStatus === "verified") {
      setIsSubmitted(true)
    }
  }, [verificationStatus])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    setFormData({ ...formData, [name]: files[0] })
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

  // Validation function
  const isStepValid = () => {
    if (step === 1) {
      // Step 1: All fields should be auto-filled, but check anyway
      return formData.studentNumber && formData.course && formData.yearLevel && formData.campus
    } else if (step === 2) {
      // Step 2: All documents must be uploaded
      return formData.idFront && formData.idBack && formData.cor
    } else if (step === 3) {
      // Step 3: Ready to submit
      return true
    }
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate current step
    if (!isStepValid()) {
      if (step === 2) {
        toast.error("Please upload all required documents", {
          icon: <AlertCircle className="w-4 h-4" />,
          description: "Student ID (Front), Student ID (Back), and COR are required.",
        })
      }
      return
    }

    if (step < 3) {
      setDirection("forward")
      setStep(step + 1)
    } else {
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
          idFront: idFrontBase64,
          idBack: idBackBase64,
          cor: corBase64,
          status: "pending",
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        await addDoc(collection(db, "verifications"), verificationData)
        
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
    setDirection("backward")
    setStep(step - 1)
  }

  const getAnimationClass = (stepNum) => {
    if (step === stepNum) {
      return direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
    }
    return "hidden"
  }

  // Check if already verified or has pending submission
  const isVerified = verificationStatus === "verified"
  const hasPendingSubmission = verificationStatus === "pending"
  
  // Show Spongebob GIF after submission, if verified, or if has pending submission
  if (isSubmitted || isVerified || hasPendingSubmission) {
    return (
      <div className="relative w-full h-full bg-card border border-border rounded-lg p-4 md:p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          {isVerified ? (
            <>
              <div className="relative inline-block mb-4">
                <img 
                  src="https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif" 
                  alt="Spongebob verified" 
                  className="w-48 h-48 md:w-64 md:h-64 mx-auto rounded-lg"
                />
                <div className="absolute -top-2 -right-2 w-12 h-12 md:w-16 md:h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                  <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Already Verified
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Your account has been verified successfully!
              </p>
            </>
          ) : (
            <>
              <img 
                src="https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif" 
                alt="Spongebob waiting" 
                className="w-48 h-48 md:w-64 md:h-64 mx-auto mb-4 rounded-lg"
              />
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Already Submitted
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Please wait to verify
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="relative w-full h-full">
      {/* Step 1: Personal Info */}
        <div 
          className={`absolute inset-0 bg-card border border-border rounded-lg p-4 md:p-5 transition-opacity ${
            step === 1 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          } ${getAnimationClass(1)}`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b flex-shrink-0">
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Personal Information</h2>
                <p className="text-xs text-muted-foreground">Auto-filled from signup</p>
              </div>
          </div>

            <div className="overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-4">
            <div>
                  <label className="block text-sm font-medium mb-2">Student Number</label>
              <input
                type="text"
                name="studentNumber"
                value={formData.studentNumber}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
            <div>
                  <label className="block text-sm font-medium mb-2">Course</label>
              <input
                type="text"
                name="course"
                value={formData.course}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
            <div>
                  <label className="block text-sm font-medium mb-2">Year Level</label>
              <select
                name="yearLevel"
                value={formData.yearLevel}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-muted"
              >
                <option value="">Select Year Level</option>
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
              </select>
            </div>
            <div>
                  <label className="block text-sm font-medium mb-2">Campus</label>
              <input
                type="text"
                name="campus"
                value={formData.campus}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Step 2: Document Upload */}
        <div 
          className={`absolute inset-0 bg-card border border-border rounded-lg p-4 md:p-5 transition-opacity ${
            step === 2 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          } ${getAnimationClass(2)}`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b flex-shrink-0">
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Document Upload</h2>
                <p className="text-xs text-muted-foreground">Upload required documents</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 py-2">
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
                  className="md:col-span-2"
                />
              </div>
          </div>
          </div>
        </div>

      {/* Step 3: Review */}
        <div 
          className={`absolute inset-0 bg-card border border-border rounded-lg p-4 md:p-5 transition-opacity ${
            step === 3 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          } ${getAnimationClass(3)}`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b flex-shrink-0">
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Submit & Wait</h2>
                <p className="text-xs text-muted-foreground">Review your submission</p>
              </div>
          </div>

            <div className="overflow-y-auto">
              <div className="bg-muted p-4 md:p-5 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1 text-sm md:text-base">Verification request submitted!</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
              Your verification status will update shortly. Check your email for confirmation.
            </p>
                  </div>
                </div>
                <div className="bg-card p-3 md:p-4 rounded border">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="font-medium">Pending Review</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">Expected review time: 2-5 business days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Navigation Buttons - Back on left, Next/Submit on right */}
      <div className="flex justify-between items-center gap-3 mt-4">
        <div>
        {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-2 border rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isStepValid() || isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : step === 3 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Submit
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

function FileUploadField({ label, name, onChange, file, className = "" }) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }, [file])

  return (
    <div className={className}>
      <input
        type="file"
        name={name}
        onChange={onChange}
        className="hidden"
        id={name}
        accept="image/*"
      />
      <label
        htmlFor={name}
        className={`block border-2 border-dashed rounded-lg p-2 md:p-3 hover:border-primary transition-colors cursor-pointer ${
          preview ? "border-primary" : ""
        }`}
      >
        {preview ? (
          <div className="flex flex-col">
            <img src={preview} alt={label} className="w-full h-20 md:h-24 object-cover rounded mb-2" />
            <p className="text-xs font-medium text-center">{label}</p>
            <p className="text-xs text-muted-foreground text-center truncate mt-1">{file.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 min-h-[100px] md:min-h-[120px]">
            <Upload className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs md:text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
        </div>
          </div>
        )}
      </label>
    </div>
  )
}
