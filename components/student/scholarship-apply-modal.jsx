"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, CheckCircle, AlertCircle, FileText, ClipboardCheck, Loader2, ArrowRight, Sparkles, Award, Clock } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, runTransaction, orderBy, increment } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { generateScholarshipCode } from "@/lib/scholarship-tracker"

// Static scholarship data fallback
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

export default function ScholarshipApplyModal({ isOpen, onClose, scholarship, userData, onApplicationSubmitted }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [documentRequirements, setDocumentRequirements] = useState([])
  const [studentDocuments, setStudentDocuments] = useState({})
  const [formStatus, setFormStatus] = useState({
    applicationForm: false,
    studentProfileForm: false
  })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const modalRef = useRef(null)

  // Fetch document requirements and student documents
  useEffect(() => {
    if (!isOpen || !user?.uid || !scholarship) {
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch document requirements for this scholarship
        if (scholarship.documentRequirementIds && scholarship.documentRequirementIds.length > 0) {
          const requirementsPromises = scholarship.documentRequirementIds.map(async (reqId) => {
            try {
              const reqDoc = await getDoc(doc(db, "documentRequirements", reqId))
              if (reqDoc.exists()) {
                return { id: reqDoc.id, ...reqDoc.data() }
              }
              return null
            } catch (error) {
              console.error(`Error fetching requirement ${reqId}:`, error)
              return null
            }
          })
          
          const requirements = (await Promise.all(requirementsPromises)).filter(req => req !== null)
          
          if (!isMounted) return
          setDocumentRequirements(requirements)

          // Fetch student documents for these requirements
          const studentDocsQuery = query(
            collection(db, "studentDocuments"),
            where("userId", "==", user.uid)
          )
          const studentDocsSnapshot = await getDocs(studentDocsQuery)
          
          const docsMap = {}
          
          // Process each document (with async chunk fetching)
          for (const doc of studentDocsSnapshot.docs) {
            const data = doc.data()
            // Reconstruct fileUrl from chunks if needed
            let fileUrl = data.fileUrl || ''
            if (data.isChunked) {
              try {
                const chunksQuery = query(collection(db, "studentDocuments", doc.id, "chunks"), orderBy("index"))
                const chunksSnapshot = await getDocs(chunksQuery)
                const chunks = chunksSnapshot.docs
                  .sort((a, b) => {
                    const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                    const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                    return indexA - indexB
                  })
                  .map(chunkDoc => chunkDoc.data().data)
                fileUrl = fileUrl + chunks.join('')
              } catch (error) {
                console.error("Error fetching chunks:", error)
              }
            }
            
            docsMap[data.requirementId] = {
              id: doc.id,
              fileUrl: fileUrl,
              fileName: data.fileName,
              uploadedAt: data.uploadedAt,
            }
          }
          
          if (!isMounted) return
          setStudentDocuments(docsMap)
        } else {
          if (!isMounted) return
          setDocumentRequirements([])
          setStudentDocuments({})
        }

        // Check form status (APPLICATION FORM and STUDENT'S PROFILE FORM)
        if (user?.uid) {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (!isMounted) return
            setFormStatus({
              applicationForm: userData.applicationFormCompleted || false,
              studentProfileForm: userData.profileFormCompleted || false
            })
          } else {
            if (!isMounted) return
            setFormStatus({
              applicationForm: false,
              studentProfileForm: false
            })
          }
        } else {
          if (!isMounted) return
          setFormStatus({
            applicationForm: false,
            studentProfileForm: false
          })
        }
      } catch (error) {
        console.error("Error fetching requirements:", error)
        if (isMounted) {
          toast.error("Failed to load requirements")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [isOpen, user?.uid, scholarship?.id, scholarship?.documentRequirementIds?.join(',')])

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

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please log in to apply", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })
      return
    }

    // Check if all requirements are met
    const allFormsFilled = formStatus.applicationForm && formStatus.studentProfileForm
    
    const requiredDocs = documentRequirements.filter(req => req.required)
    const allRequiredDocsUploaded = requiredDocs.every(req => studentDocuments[req.id])
    
    if (!allFormsFilled) {
      toast.error("Please fill up both APPLICATION FORM and STUDENT'S PROFILE FORM", {
            icon: <AlertCircle className="w-5 h-5" />,
            duration: 3000,
            position: "top-right",
          })
          return
        }
        
    if (!allRequiredDocsUploaded) {
      const missingDocs = requiredDocs.filter(req => !studentDocuments[req.id])
      toast.error(`Please upload all required documents: ${missingDocs.map(d => d.name).join(', ')}`, {
            icon: <AlertCircle className="w-5 h-5" />,
        duration: 4000,
            position: "top-right",
          })
          return
    }

    // Check if scholarship is temporarily closed
    if (scholarship.temporarilyClosed) {
      toast.error("This scholarship is temporarily closed. Applications are not being accepted at this time.", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 4000,
        position: "top-right",
      })
      return
    }

    // Check if slots are available
    if (scholarship.slots !== null && scholarship.slots !== undefined) {
      const currentSlots = typeof scholarship.slots === 'number' ? scholarship.slots : parseInt(scholarship.slots)
      if (currentSlots <= 0) {
        toast.error("Sorry, no available slots for this scholarship", {
          icon: <AlertCircle className="w-5 h-5" />,
          duration: 4000,
          position: "top-right",
        })
        return
      }
    }

    try {
      setIsSubmitting(true)

      // Generate scholarship tracker code
      const trackerCode = await generateScholarshipCode(scholarship.name)

      // Get benefit data
      const staticData = STATIC_SCHOLARSHIP_DATA[scholarship.name] || {}
      const benefitAmount = scholarship.benefitAmount || 
                           scholarship.amount || 
                           staticData.benefitAmount || 
                           "N/A"
      const benefit = scholarship.benefit || 
                     staticData.benefit || 
                     "N/A"

      // Note: Slots are now decremented when admin approves the application, not when student applies
      // This ensures slots are only taken when applications are approved

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
        status: 'pending',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      await addDoc(collection(db, "applications"), applicationData)
      
      // Send email notifications
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const studentName = userData.fullName || userData.displayName || "Student"
          const secondaryEmail = userData.secondaryEmail
          
          // Send email to student (if secondary email exists)
          if (secondaryEmail) {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: secondaryEmail,
                subject: 'Application Submitted Successfully - iScholar',
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
                        <p>Your scholarship application for <strong>${scholarship.name}</strong> has been submitted successfully!</p>
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
              })
            })
          }

          // Send email to admin
          const adminEmail = "contact.ischolar@gmail.com"
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: adminEmail,
              subject: `New Scholarship Application - ${scholarship.name}`,
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
                    .tracker-box { background: #e7f3ff; border: 2px solid #2196F3; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px; }
                    .tracker-code { font-size: 24px; font-weight: bold; color: #2196F3; letter-spacing: 2px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>New Scholarship Application</h1>
                    </div>
                    <div class="content">
                      <p>Hello Admin,</p>
                      <p>A new scholarship application has been submitted and requires your review.</p>
                      <div class="info-box">
                        <p style="margin: 0;"><strong>Student Name:</strong> ${studentName}</p>
                        <p style="margin: 5px 0;"><strong>Student Number:</strong> ${userData.studentNumber || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Scholarship:</strong> ${scholarship.name}</p>
                        <p style="margin: 5px 0;"><strong>Course:</strong> ${userData.course || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Year Level:</strong> ${userData.yearLevel || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Campus:</strong> ${userData.campus || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email || 'N/A'}</p>
                      </div>
                      <div class="tracker-box">
                        <p style="margin: 0 0 10px 0;"><strong>Tracking ID:</strong></p>
                        <div class="tracker-code">${trackerCode}</div>
                      </div>
                      <p>Please log in to the admin dashboard to review this application.</p>
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
        console.error("Error sending application emails:", emailError)
      }
      
      toast.success("Application submitted successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        description: `Your tracker code: ${trackerCode}. Your application is now under review.`,
        duration: 5000,
        position: "top-right",
      })

      onClose()
      
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

  const allFormsFilled = formStatus.applicationForm && formStatus.studentProfileForm
  const requiredDocs = documentRequirements.filter(req => req.required)
  const optionalDocs = documentRequirements.filter(req => !req.required)
  const allRequiredDocsUploaded = requiredDocs.every(req => studentDocuments[req.id])
  const canSubmit = allFormsFilled && allRequiredDocsUploaded

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
        <div
          ref={modalRef}
          className="bg-card border-2 border-border/50 rounded-xl shadow-2xl w-full max-w-5xl max-h-[96vh] sm:max-h-[94vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col my-1 sm:my-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Header with Gradient */}
          <div className="relative p-3 sm:p-4 md:p-5 border-b border-border/30 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 flex-shrink-0 overflow-hidden">
            {/* Decorative Background Elements - Hidden on mobile */}
            <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="hidden md:block absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative flex items-center gap-2.5 sm:gap-3">
              {scholarship?.logo ? (
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-card border-2 border-border/30 flex items-center justify-center shadow-md ring-2 ring-primary/20 overflow-hidden flex-shrink-0">
                  <img 
                    src={scholarship.logo} 
                    alt={scholarship.name || 'Scholarship'} 
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>'
                    }}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md ring-2 ring-primary/20 flex-shrink-0">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground truncate flex-1 min-w-0">{scholarship?.name || 'Scholarship'}</h2>
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Application Requirements Status</span>
                </p>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5 custom-scrollbar bg-gradient-to-b from-background to-muted/20">
            {loading ? (
              <div className="space-y-4 sm:space-y-5 animate-pulse">
                {/* Forms Skeleton */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted"></div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 sm:h-5 bg-muted rounded w-28 sm:w-32"></div>
                      <div className="h-3 bg-muted rounded w-40 sm:w-48 hidden sm:block"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-border/30 bg-muted/30">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-muted"></div>
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3.5 sm:h-4 bg-muted rounded w-3/4"></div>
                              <div className="h-3 bg-muted rounded w-full hidden sm:block"></div>
                            </div>
                          </div>
                          <div className="h-9 sm:h-10 bg-muted rounded-lg sm:rounded-xl"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents Skeleton */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted"></div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 sm:h-5 bg-muted rounded w-36 sm:w-40"></div>
                      <div className="h-3 bg-muted rounded w-48 sm:w-56 hidden sm:block"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-border/30 bg-muted/30">
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted"></div>
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3.5 sm:h-4 bg-muted rounded w-full"></div>
                              <div className="h-3 bg-muted rounded w-5/6 hidden sm:block"></div>
                            </div>
                          </div>
                          <div className="h-9 sm:h-10 bg-muted rounded-lg sm:rounded-xl"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Skeleton */}
                <div className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border-2 border-border/30 bg-muted/30">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted"></div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 sm:h-5 bg-muted rounded w-32 sm:w-40"></div>
                      <div className="h-3 bg-muted rounded w-24 sm:w-32 hidden sm:block"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border/30 bg-card/80">
                        <div className="h-3 bg-muted rounded w-16 sm:w-20 mb-2"></div>
                        <div className="h-5 sm:h-6 bg-muted rounded w-10 sm:w-12 mb-2"></div>
                        <div className="h-2 bg-muted rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Forms Section - Enhanced */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">Required Forms</h3>
                      <p className="text-xs text-muted-foreground hidden sm:block">Complete both forms to proceed</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* APPLICATION FORM */}
                    <div className={`group relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                      formStatus.applicationForm 
                        ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/40' 
                        : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/40'
                    }`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5 flex-1">
                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              formStatus.applicationForm ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {formStatus.applicationForm ? (
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm sm:text-base text-foreground mb-0.5">APPLICATION FORM</p>
                              <p className="text-xs text-muted-foreground hidden sm:block">Fill up the application form to proceed</p>
                            </div>
                          </div>
                        </div>
                        {formStatus.applicationForm ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-xs font-semibold text-green-600">Completed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onClose()
                              router.push('/student/application-form')
                            }}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg sm:rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 group/btn"
                          >
                            <span>Fill Form</span>
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* STUDENT'S PROFILE FORM */}
                    <div className={`group relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                      formStatus.studentProfileForm 
                        ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/40' 
                        : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/40'
                    }`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5 flex-1">
                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              formStatus.studentProfileForm ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {formStatus.studentProfileForm ? (
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm sm:text-base text-foreground mb-0.5">STUDENT'S PROFILE FORM</p>
                              <p className="text-xs text-muted-foreground hidden sm:block">Fill up your profile form to proceed</p>
                            </div>
                          </div>
                        </div>
                        {formStatus.studentProfileForm ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-xs font-semibold text-green-600">Completed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onClose()
                              router.push('/student/profile-form')
                            }}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg sm:rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 group/btn"
                          >
                            <span>Fill Form</span>
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Requirements Section - Enhanced */}
                {documentRequirements.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground">Document Requirements</h3>
                        <p className="text-xs text-muted-foreground hidden sm:block">Upload required documents for your application</p>
                      </div>
                    </div>

                    {/* Required Documents */}
                    {requiredDocs.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                          <p className="text-xs sm:text-sm font-bold text-foreground">Required Documents ({requiredDocs.length})</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                          {requiredDocs.map((req) => {
                            const isUploaded = !!studentDocuments[req.id]
                            return (
                              <div
                                key={req.id}
                                className={`group p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                                  isUploaded
                                    ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/40'
                                    : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/40'
                                }`}
                              >
                                <div className="flex flex-col gap-2.5">
                                  <div className="flex items-start gap-2.5">
                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      isUploaded ? 'bg-green-500/20' : 'bg-red-500/20'
                                    }`}>
                                      {isUploaded ? (
                                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                      ) : (
                                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs sm:text-sm text-foreground mb-0.5 line-clamp-1">{req.name}</p>
                                      {req.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 hidden sm:block">{req.description}</p>
                                      )}
                                      {isUploaded && studentDocuments[req.id]?.fileName && (
                                        <p className="text-xs text-green-600 mt-1.5 font-medium flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" />
                                          <span className="truncate">{studentDocuments[req.id].fileName}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isUploaded ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                      <span className="text-xs font-semibold text-green-600">Uploaded</span>
                                    </div>
                                  ) : (
                                    <a
                                      href="/student/requirements"
                                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg sm:rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 group/btn"
                                    >
                                      <span>Upload</span>
                                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Optional Documents */}
                    {optionalDocs.length > 0 && (
                      <div className="space-y-2.5 mt-4 sm:mt-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                          <p className="text-xs sm:text-sm font-bold text-foreground">Optional Documents ({optionalDocs.length})</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                          {optionalDocs.map((req) => {
                            const isUploaded = !!studentDocuments[req.id]
                            return (
                              <div
                                key={req.id}
                                className={`group p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                                  isUploaded
                                    ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/40'
                                    : 'bg-muted/30 border-border/30 hover:border-primary/30'
                                }`}
                              >
                                <div className="flex flex-col gap-2.5">
                                  <div className="flex items-start gap-2.5">
                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      isUploaded ? 'bg-blue-500/20' : 'bg-muted'
                                    }`}>
                                      {isUploaded ? (
                                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                      ) : (
                                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs sm:text-sm text-foreground mb-0.5 line-clamp-1">{req.name}</p>
                                      {req.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 hidden sm:block">{req.description}</p>
                                      )}
                                      {isUploaded && studentDocuments[req.id]?.fileName && (
                                        <p className="text-xs text-blue-600 mt-1.5 font-medium flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" />
                                          <span className="truncate">{studentDocuments[req.id].fileName}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isUploaded ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                      <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                                      <span className="text-xs font-semibold text-blue-600">Uploaded</span>
                                    </div>
                                  ) : (
                                    <a
                                      href="/student/requirements"
                                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border-2 border-border text-foreground rounded-lg sm:rounded-xl hover:bg-muted hover:border-primary/50 transition-all text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 group/btn"
                                    >
                                      <span>Upload</span>
                                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary - Enhanced */}
                <div className="relative p-3 sm:p-4 md:p-5 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 rounded-lg sm:rounded-xl border-2 border-primary/20 shadow-md overflow-hidden">
                  {/* Decorative Elements - Hidden on mobile */}
                  <div className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
                  <div className="hidden md:block absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl"></div>
                  
                  <div className="relative">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground">Application Summary</h3>
                        <p className="text-xs text-muted-foreground hidden sm:block">Review your application progress</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                      <div className="p-3 md:p-4 bg-card/80 backdrop-blur-sm rounded-lg md:rounded-xl border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Forms</span>
                          <span className={`text-base md:text-lg font-bold ${allFormsFilled ? 'text-green-600' : 'text-red-600'}`}>
                            {allFormsFilled ? '2/2' : `${(formStatus.applicationForm ? 1 : 0) + (formStatus.studentProfileForm ? 1 : 0)}/2`}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              allFormsFilled ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${((formStatus.applicationForm ? 1 : 0) + (formStatus.studentProfileForm ? 1 : 0)) / 2 * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="p-3 md:p-4 bg-card/80 backdrop-blur-sm rounded-lg md:rounded-xl border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Required Docs</span>
                          <span className={`text-base md:text-lg font-bold ${allRequiredDocsUploaded ? 'text-green-600' : 'text-red-600'}`}>
                            {requiredDocs.filter(req => studentDocuments[req.id]).length}/{requiredDocs.length}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              allRequiredDocsUploaded ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${requiredDocs.length > 0 ? (requiredDocs.filter(req => studentDocuments[req.id]).length / requiredDocs.length * 100) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="p-3 md:p-4 bg-card/80 backdrop-blur-sm rounded-lg md:rounded-xl border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Optional Docs</span>
                          <span className="text-base md:text-lg font-bold text-blue-600">
                            {optionalDocs.filter(req => studentDocuments[req.id]).length}/{optionalDocs.length}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${optionalDocs.length > 0 ? (optionalDocs.filter(req => studentDocuments[req.id]).length / optionalDocs.length * 100) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer - Enhanced */}
          <div className="p-3 sm:p-4 md:p-5 border-t-2 border-border/30 flex-shrink-0 bg-gradient-to-r from-muted/50 to-background">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 sm:py-2.5 bg-muted text-foreground font-semibold rounded-lg hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border/30 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting || loading}
                className="flex-1 px-4 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg disabled:shadow-none text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </div>
            {!canSubmit && !loading && (
              <div className="mt-2.5 sm:mt-3 p-2 sm:p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-600 font-medium text-center flex items-center justify-center gap-1.5 flex-wrap">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{!allFormsFilled && "Please complete both forms. "}</span>
                  <span>{!allRequiredDocsUploaded && "Please upload all required documents."}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
