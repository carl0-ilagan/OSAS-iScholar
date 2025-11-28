"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
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
  const { signInWithMicrosoft, signOut, user } = useAuth()
  const [step, setStep] = useState(1)
  const [prevStep, setPrevStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
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

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1)
      setPrevStep(1)
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
      formData.email.endsWith("@minsu.edu.ph")
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
    // Validate email domain
    if (!formData.email.endsWith("@minsu.edu.ph")) {
      setError("Email must be a @minsu.edu.ph address")
      return
    }

    if (validateStep1()) {
      setError("")
      setPrevStep(step)
      setStep(2)
    } else {
      setError("Please fill in all required fields")
    }
  }

  const handleSubmit = async () => {
    if (!validateStep2()) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      // Validate email matches form data
      if (formData.email && !formData.email.endsWith("@minsu.edu.ph")) {
        setError("Email must be a @minsu.edu.ph address")
        setLoading(false)
        return
      }
      
      // Sign in with Microsoft (this will create account if new user)
      const user = await signInWithMicrosoft()
      
      // Validate email domain from Microsoft account
      if (user.email && !user.email.endsWith("@minsu.edu.ph")) {
        setError("Only @minsu.edu.ph email addresses are allowed for student accounts.")
        // Sign out if invalid email
        await signOut()
        setLoading(false)
        return
      }
      
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
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl md:max-w-4xl lg:max-w-5xl h-[600px] md:h-[650px] overflow-hidden p-0" showCloseButton={false}>
        <div className="grid md:grid-cols-2 h-full">
          {/* Left Side - Form */}
          <div className="overflow-y-auto p-8 md:p-12 flex flex-col min-h-0 scrollbar-hide">
            <DialogHeader className="text-left space-y-2 mb-6">
              <DialogTitle className="text-3xl md:text-4xl font-light text-foreground tracking-tight">
                Create Your Account
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-light">
                Step {step} of 2
              </DialogDescription>
            </DialogHeader>

            {/* Simple Progress Bar */}
            <div className="flex gap-2 mb-8">
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? "bg-primary" : "bg-border"}`}></div>
              <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? "bg-primary" : "bg-border"}`}></div>
            </div>

            <div className="space-y-5 relative flex-1 flex flex-col min-h-0">
          {error && (
            <div className="bg-destructive/5 text-destructive text-sm p-3 rounded-lg border border-destructive/20 animate-in fade-in slide-in-from-top-2 z-10 flex-shrink-0">
              {error}
            </div>
          )}

          <div className="relative flex-1 min-h-0 overflow-hidden">
          {step === 1 ? (
            <div 
              key="step1"
              className={`space-y-5 absolute inset-0 w-full transition-transform duration-500 ease-in-out ${
                step === 1 && prevStep === 1
                  ? "translate-x-0 opacity-100" 
                  : step === 1 && prevStep === 2
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-full opacity-0 pointer-events-none"
              }`}
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
                  className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-light placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.name@minsu.edu.ph"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-light placeholder:text-muted-foreground/50"
                />
                {formData.email && !formData.email.endsWith("@minsu.edu.ph") && (
                  <p className="text-xs text-destructive mt-1.5">Must be a @minsu.edu.ph email address</p>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={!validateStep1()}
                className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-sm hover:shadow-md"
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
                    className="text-primary hover:underline font-medium"
                  >
                    Login
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div 
              key="step2"
              className={`space-y-3 absolute inset-0 w-full flex flex-col min-h-0 transition-transform duration-500 ease-in-out ${
                step === 2 && prevStep === 1
                  ? "translate-x-0 opacity-100" 
                  : step === 2 && prevStep === 2
                  ? "translate-x-0 opacity-100"
                  : "translate-x-full opacity-0 pointer-events-none"
              }`}
            >
              {/* Student Number - Full Width */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Student Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="studentNumber"
                  value={formData.studentNumber}
                  onChange={handleChange}
                  placeholder="Enter your student number"
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-light placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Campus and Year Level - Side by Side on Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Campus <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.campus}
                    onValueChange={(value) => handleSelectChange("campus", value)}
                  >
                    <SelectTrigger className="w-full h-11 px-4 border border-border rounded-lg bg-input focus:ring-1 focus:ring-primary font-light">
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Year Level <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.yearLevel}
                    onValueChange={(value) => handleSelectChange("yearLevel", value)}
                  >
                    <SelectTrigger className="w-full h-11 px-4 border border-border rounded-lg bg-input focus:ring-1 focus:ring-primary font-light">
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
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Course <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.course}
                  onValueChange={(value) => handleSelectChange("course", value)}
                  disabled={!formData.campus}
                >
                  <SelectTrigger className="w-full h-11 px-4 border border-border rounded-lg bg-input focus:ring-1 focus:ring-primary font-light disabled:opacity-50 disabled:cursor-not-allowed">
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
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Major {availableMajors && availableMajors.length > 0 && <span className="text-destructive">*</span>}
                </label>
                <Select
                  value={(!availableMajors || availableMajors.length === 0) ? "none" : (formData.major || "")}
                  onValueChange={(value) => handleSelectChange("major", value)}
                  disabled={!formData.course || !availableMajors || availableMajors.length === 0}
                >
                  <SelectTrigger className="w-full h-11 px-4 border border-border rounded-lg bg-input focus:ring-1 focus:ring-primary font-light disabled:opacity-50 disabled:cursor-not-allowed">
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

              <div className="flex flex-col sm:flex-row gap-3 pt-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPrevStep(step)
                    setStep(1)
                    setError("")
                  }}
                  className="w-full sm:flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!validateStep2() || loading}
                  className="w-full sm:flex-1 bg-white hover:bg-gray-50 border border-gray-300 font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md min-h-[48px] overflow-hidden"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    </>
                  ) : (
                    <Image 
                      src="/Microsoft.png" 
                      alt="Microsoft" 
                      width={140} 
                      height={32}
                      className="h-8 w-auto max-w-full object-contain"
                      priority
                    />
                  )}
                </button>
              </div>
            </div>
          )}
          </div>
            </div>
          </div>

          {/* Right Side - Visual/Info */}
          <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-8 md:p-12 border-l border-border/50">
            <div className="text-center space-y-6 max-w-sm">
              {step === 1 ? (
                <div key="step1" className="animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 mx-auto bg-accent/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-light text-foreground mb-2">Get Started</h3>
                    <p className="text-sm text-muted-foreground font-light">
                      Create your account in just a few simple steps
                    </p>
                  </div>
                </div>
              ) : (
                <div key="step2" className="animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 0 12 20.904a48.62 48.62 0 0 0 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443a55.381 55.381 0 0 1 5.25 2.882V15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-light text-foreground mb-2">Complete Your Profile</h3>
                    <p className="text-sm text-muted-foreground font-light">
                      Provide your student information to finish registration
                    </p>
                  </div>
                </div>
              )}
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

