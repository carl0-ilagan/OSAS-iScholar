"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import SuccessSignupModal from "./success-signup-modal"

// Courses data by campus
const coursesByCampus = {
  "Main Campus": [
    { name: "BS Agriculture", majors: ["Crop Science", "Animal Science"] },
    { name: "BS Horticulture", majors: null },
    { name: "BS Agroforestry", majors: null },
    { name: "BS Environmental Science", majors: null },
    { name: "BS Entrepreneurship", majors: null },
    { name: "BS Agricultural & Biosystems Engineering", majors: null },
    { name: "Bachelor of Elementary Education", majors: null },
    { name: "Bachelor of Secondary Education", majors: ["Mathematics", "English", "Filipino", "Biological Science"] },
    { name: "Bachelor of Arts in English Language", majors: null },
  ],
  "Calapan City Campus": [
    { name: "Bachelor of Secondary Education", majors: ["Physical Sciences", "Mathematics", "English", "Filipino"] },
    { name: "Bachelor of Technical-Vocational Teacher Education (ladderized)", majors: null },
    { name: "BS Hotel & Tourism Management", majors: null },
    { name: "BS Criminology (ladderized)", majors: null },
    { name: "BS Information Technology (ladderized)", majors: null },
  ],
  "Bongabong Campus": [
    { name: "BS Information Technology", majors: null },
    { name: "BS Computer Engineering", majors: null },
    { name: "BS Hotel & Restaurant Management (ladderized)", majors: null },
    { name: "Bachelor of Secondary Education", majors: ["Biology", "English", "Mathematics"] },
    { name: "Bachelor in Elementary Education", majors: null },
    { name: "BS Criminology (ladderized)", majors: null },
    { name: "BS Fisheries", majors: null },
  ],
}

export default function SignupModal({ open, onOpenChange, onSwitchToLogin }) {
  const router = useRouter()
  const { signUpWithEmail } = useAuth()
  const { branding } = useBranding()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [inputCode, setInputCode] = useState("")
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [codeMessage, setCodeMessage] = useState("")
  const [codeMessageType, setCodeMessageType] = useState("neutral")
  const [verificationTicket, setVerificationTicket] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [signedUpUserId, setSignedUpUserId] = useState(null)
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    studentNumber: "",
    course: "",
    major: "none",
    yearLevel: "",
    campus: "",
  })

  // Get available courses based on selected campus
  const availableCourses = formData.campus ? coursesByCampus[formData.campus] || [] : []
  
  // Get available majors based on selected course
  const selectedCourseData = availableCourses.find(c => c.name === formData.course)
  const availableMajors = selectedCourseData?.majors || null
  const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value)

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1)
      setFormData({
        fullName: "",
        email: "",
        studentNumber: "",
        course: "",
        major: "none",
        yearLevel: "",
        campus: "",
      })
      setError("")
      setPassword("")
      setConfirmPassword("")
      setSendingCode(false)
      setCodeSent(false)
      setInputCode("")
      setVerifyingCode(false)
      setCodeVerified(false)
      setCodeMessage("")
      setCodeMessageType("neutral")
      setVerificationTicket("")
    }
  }, [open])

  // Auto-set major to "none" when course has no majors
  useEffect(() => {
    if (formData.course && (!availableMajors || availableMajors.length === 0)) {
      setFormData(prev => ({ ...prev, major: "none" }))
    }
  }, [formData.course, availableMajors])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
      // Reset course and major when campus changes
      ...(name === "campus" && { course: "", major: "" }),
      // Reset major when course changes
      ...(name === "course" && { major: "" }),
    })
    setError("")
    if (name === "email") {
      setCodeSent(false)
      setInputCode("")
      setVerifyingCode(false)
      setCodeVerified(false)
      setCodeMessage("")
      setCodeMessageType("neutral")
      setVerificationTicket("")
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
      // Reset course and major when campus changes
      ...(name === "campus" && { course: "", major: "none" }),
      // Reset major to "none" when course changes
      ...(name === "course" && { major: "none" }),
    })
    setError("")
  }

  // Validation functions
  const validateStep1 = () => {
    return (
      formData.fullName.trim() !== "" &&
      formData.email.trim() !== "" &&
      isValidEmail(formData.email.trim()) &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword
    )
  }

  const validateStep2 = () => {
    const hasRequiredFields = (
      formData.studentNumber.trim() !== "" &&
      formData.course.trim() !== "" &&
      formData.yearLevel !== "" &&
      formData.campus.trim() !== ""
    )
    
    // If course has majors, major is required (cannot be "none")
    if (hasRequiredFields && availableMajors && availableMajors.length > 0) {
      return formData.major.trim() !== "" && formData.major !== "none"
    }
    
    return hasRequiredFields
  }

  const handleNext = () => {
    // Validate email format
    if (!isValidEmail(formData.email.trim())) {
      setError("Please enter a valid email address.")
      return
    }

    if (!codeVerified) {
      setError("Please verify the 6-digit confirmation code sent to your email.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.")
      return
    }

    if (validateStep1()) {
      setError("")
      setStep(2)
    } else {
      setError("Please fill in all required fields")
    }
  }

  const handleSendCode = async () => {
    if (!formData.email.trim() || !isValidEmail(formData.email.trim())) {
      setError("Please enter a valid email before requesting a code.")
      return
    }

    try {
      setSendingCode(true)
      setError("")
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to send confirmation code.")
      }
      setCodeSent(true)
      setCodeVerified(false)
      setVerificationTicket("")
      setInputCode("")
      setCodeMessage("")
      setCodeMessageType("neutral")
    } catch (sendError) {
      console.error("Error sending confirmation code:", sendError)
      setError(sendError.message || "Unable to send confirmation code. Please try again.")
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async (codeValue = inputCode.trim()) => {
    if (!codeValue) {
      setError("Please enter the 6-digit code.")
      return
    }

    try {
      setVerifyingCode(true)
      setCodeMessage("Verifying code...")
      setCodeMessageType("neutral")
      const response = await fetch("/api/auth/verify-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          code: codeValue,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setCodeVerified(false)
        setVerificationTicket("")
        setCodeMessage(payload?.error || "Invalid or expired confirmation code. Please try again.")
        setCodeMessageType("error")
        return
      }

      const payload = await response.json()
      setError("")
      setCodeVerified(true)
      setVerificationTicket(payload?.verificationTicket || "")
      setCodeMessage("Email verified successfully.")
      setCodeMessageType("success")
    } catch (verifyError) {
      console.error("Error verifying code:", verifyError)
      setCodeVerified(false)
      setVerificationTicket("")
      setCodeMessage("Unable to verify code right now. Please try again.")
      setCodeMessageType("error")
    } finally {
      setVerifyingCode(false)
    }
  }

  useEffect(() => {
    if (!codeSent) return
    if (codeVerified) return
    if (verifyingCode) return
    if (inputCode.length !== 6) return
    handleVerifyCode(inputCode)
  }, [inputCode, codeSent, codeVerified, verifyingCode])

  const handleSubmit = async () => {
    if (!validateStep2()) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      // Validate email format
      if (formData.email && !isValidEmail(formData.email.trim())) {
        setError("Please enter a valid email address.")
        setLoading(false)
        return
      }

      if (!verificationTicket) {
        setError("Your verification session expired. Please verify your 6-digit code again.")
        setLoading(false)
        return
      }

      const ticketCheck = await fetch("/api/auth/consume-verification-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          verificationTicket,
        }),
      })

      if (!ticketCheck.ok) {
        setVerificationTicket("")
        setCodeVerified(false)
        setError("Verification expired or invalid. Please request and verify a new 6-digit code.")
        setLoading(false)
        return
      }
      
      if (password.length < 6) {
        setError("Password must be at least 6 characters.")
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError("Password and confirm password do not match.")
        setLoading(false)
        return
      }

      const user = await signUpWithEmail(formData.email.trim(), password)
      
      // Save user data to Firestore
      try {
        const userDocRef = doc(collection(db, "users"), user.uid)
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || formData.fullName,
          fullName: formData.fullName,
          photoURL: user.photoURL || null,
          studentNumber: formData.studentNumber,
          course: formData.course,
          major: formData.major !== "none" ? formData.major : null,
          yearLevel: formData.yearLevel,
          campus: formData.campus,
          role: "student",
          status: "online",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true })
        
        console.log("User data saved to Firestore successfully")
      } catch (firestoreError) {
        console.error("Error saving user data to Firestore:", firestoreError)
        // Don't block the signup process if Firestore save fails
        // The user is already authenticated
      }
      
      // Show success modal instead of redirecting immediately
      setSignedUpUserId(user.uid)
      onOpenChange(false)
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Signup error:", error)
      setError(error.message || "Failed to create account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-hidden rounded-3xl border border-emerald-100/70 p-0 shadow-2xl shadow-emerald-950/30 sm:max-w-5xl" showCloseButton={false}>
        <div className="grid max-h-[92vh] md:grid-cols-2">
          {/* Left Side - Form */}
          <div className="scrollbar-hide flex min-h-0 flex-col overflow-y-auto bg-white p-6 md:p-10">
            <DialogHeader className="mb-5 space-y-1 text-left">
              <DialogTitle className="w-full text-3xl font-bold tracking-tight text-emerald-950 md:text-4xl">
                Create Your Account
              </DialogTitle>
              <DialogDescription className="w-full text-sm text-emerald-900/70">
                Step {step} of 2
              </DialogDescription>
            </DialogHeader>

            {/* Simple Progress Bar */}
            <div className="flex gap-2 mb-4">
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? "bg-emerald-600" : "bg-emerald-100"}`}></div>
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? "bg-emerald-600" : "bg-emerald-100"}`}></div>
            </div>

            <div className="space-y-3 relative flex-1 flex flex-col min-h-0">
          {error && (
            <div className="z-10 flex-shrink-0 animate-in slide-in-from-top-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 fade-in">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-0 pr-1">
          {step === 1 ? (
            <div 
              key="step1"
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-emerald-950">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                {formData.email && !isValidEmail(formData.email.trim()) && (
                  <p className="text-xs text-destructive mt-1.5">Please enter a valid email address</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-emerald-950">
                  Password <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-emerald-950">
                  Confirm Password <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                <p className="text-xs text-emerald-800/80">Enter the 6-digit verification code sent to your email before creating your account.</p>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || !formData.email || !isValidEmail(formData.email.trim())}
                  className="w-full rounded-lg bg-emerald-700 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {sendingCode ? "Sending code..." : codeSent ? "Resend 6-digit code" : "Send 6-digit code"}
                </button>
                {codeSent && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      disabled={verifyingCode || codeVerified}
                      className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                    />
                    {verifyingCode && (
                      <div className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border flex items-center">
                        Checking...
                      </div>
                    )}
                  </div>
                )}
                {codeMessage && (
                  <p
                    className={`text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200 ${
                      codeMessageType === "success"
                        ? "text-green-600"
                        : codeMessageType === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {codeMessage}
                  </p>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={!validateStep1() || !codeVerified}
                className="mt-3 w-full rounded-xl bg-emerald-700 py-2.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      if (onSwitchToLogin) {
                        setTimeout(() => onSwitchToLogin(), 100)
                      }
                    }}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    Login
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div 
              key="step2"
              className="space-y-2.5 w-full flex flex-col min-h-0"
            >
              {/* Student Number - Full Width */}
              <div>
                <label className="block text-sm font-medium text-emerald-950 mb-1.5">
                  Student Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="studentNumber"
                  value={formData.studentNumber}
                  onChange={handleChange}
                  placeholder="Enter your student number"
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              {/* Campus and Year Level - Side by Side on Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-emerald-950 mb-1.5">
                    Campus <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.campus}
                    onValueChange={(value) => handleSelectChange("campus", value)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-200">
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Campus">Main Campus</SelectItem>
                      <SelectItem value="Calapan City Campus">Calapan City Campus</SelectItem>
                      <SelectItem value="Bongabong Campus">Bongabong Campus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-950 mb-1.5">
                    Year Level <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.yearLevel}
                    onValueChange={(value) => handleSelectChange("yearLevel", value)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-200">
                      <SelectValue placeholder="Select year level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Year</SelectItem>
                      <SelectItem value="2nd">2nd Year</SelectItem>
                      <SelectItem value="3rd">3rd Year</SelectItem>
                      <SelectItem value="4th">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Course - Full Width */}
              <div>
                <label className="block text-sm font-medium text-emerald-950 mb-1.5">
                  Course <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.course}
                  onValueChange={(value) => handleSelectChange("course", value)}
                  disabled={!formData.campus}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">
                    <SelectValue placeholder={formData.campus ? "Select course" : "Select campus first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.map((course, index) => (
                      <SelectItem key={index} value={course.name}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Major - Always visible */}
              <div>
                <label className="block text-sm font-medium text-emerald-950 mb-1.5">
                  Major {availableMajors && availableMajors.length > 0 && <span className="text-destructive">*</span>}
                </label>
                <Select
                  value={(!availableMajors || availableMajors.length === 0) ? "none" : (formData.major || "")}
                  onValueChange={(value) => handleSelectChange("major", value)}
                  disabled={!formData.course || !availableMajors || availableMajors.length === 0}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">
                    <SelectValue placeholder="Select major" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMajors && availableMajors.length > 0 ? (
                      availableMajors.map((major, index) => (
                        <SelectItem key={index} value={major}>
                          {major}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none">None</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {!availableMajors || availableMajors.length === 0 && formData.course ? (
                  <p className="text-xs text-muted-foreground mt-1">This course does not require a major</p>
                ) : null}
              </div>

              <div className="space-y-2 pt-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1)
                    setError("")
                  }}
                  className="w-full rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!validateStep2() || loading}
                  className="flex min-h-[42px] w-full items-center justify-center rounded-xl bg-emerald-700 py-2.5 font-semibold text-white shadow-lg shadow-emerald-700/25 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="font-medium">Create Account</span>
                  )}
                </button>
              </div>
            </div>
          )}
          </div>
            </div>
          </div>

          {/* Right Side - Visual/Info */}
          <div
            className="relative hidden flex-col items-center justify-center overflow-hidden border-l border-white/15 p-8 md:flex"
            style={{
              backgroundImage: "url('/BG.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-emerald-950/55" />
            <div className="absolute inset-x-10 inset-y-12 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-sm" />
            <div className="relative z-10 max-w-sm space-y-5 px-4 text-center text-white">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white p-2.5 shadow-xl">
                <img
                  src={branding?.logo || "/MOCAS-removebg-preview.png"}
                  alt={branding?.name || "MOCAS"}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                  {branding?.name || "MOCAS"}
                </p>
                <h3 className="mt-2 text-3xl font-bold tracking-tight">
                  {step === 1 ? "Get started" : "Almost there"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
                  {step === 1
                    ? "Create your account and verify your email in a few steps."
                    : "Add your student details so we can match you to scholarships and requirements."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Success Sign Up Modal */}
      <SuccessSignupModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false)
          router.push("/student")
        }}
        userId={signedUpUserId}
      />
    </Dialog>
  )
}

