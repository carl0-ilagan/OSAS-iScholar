"use client"

import { useState, useEffect } from "react"
import VerificationForm from "@/components/student/verification-form"
import VerificationFormSkeleton from "@/components/student/verification-form-skeleton"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { Clock, ShieldCheck, CheckCircle } from "lucide-react"

export default function VerifyPage() {
  const [step, setStep] = useState(1)
  const [userData, setUserData] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isClient, setIsClient] = useState(false)
  const { user } = useAuth()

  // Set client-side flag to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Detect sidebar width for desktop banner positioning
  useEffect(() => {
    if (!isClient) return

    const detectSidebarWidth = () => {
      if (typeof window === 'undefined' || window.innerWidth < 768) return
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth)
      }
    }

    detectSidebarWidth()
    const observer = new ResizeObserver(detectSidebarWidth)
    const sidebar = document.querySelector('aside')
    if (sidebar) observer.observe(sidebar)
    window.addEventListener('resize', detectSidebarWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', detectSidebarWidth)
    }
  }, [isClient])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])


  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          // Fetch user data
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setUserData(userDoc.data())
          }

          // Check verification status
          try {
            const verificationsQuery = query(
              collection(db, "verifications"),
              where("userId", "==", user.uid),
              orderBy("submittedAt", "desc"),
              limit(1)
            )
            const verificationSnapshot = await getDocs(verificationsQuery)
            
            if (!verificationSnapshot.empty) {
              const verificationData = verificationSnapshot.docs[0].data()
              setVerificationStatus(verificationData.status || "pending")
            } else {
              // No verification found, set to null
              setVerificationStatus(null)
            }
          } catch (queryError) {
            // If orderBy fails (no index), try without orderBy
            if (queryError.code === 'failed-precondition') {
              try {
                const simpleQuery = query(
                  collection(db, "verifications"),
                  where("userId", "==", user.uid),
                  limit(1)
                )
                const simpleSnapshot = await getDocs(simpleQuery)
                if (!simpleSnapshot.empty) {
                  const verificationData = simpleSnapshot.docs[0].data()
                  setVerificationStatus(verificationData.status || "pending")
                } else {
                  setVerificationStatus(null)
                }
              } catch (simpleError) {
                console.log("No verification found or query error:", simpleError)
                setVerificationStatus(null)
              }
            } else {
              console.log("Verification query error:", queryError)
              setVerificationStatus(null)
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [user])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (loading) {
  return (
      <div className="relative">
        {/* Floating Banner - Skeleton */}
        <div 
          className="fixed top-20 md:top-4 z-40 transition-all duration-300"
          style={isClient ? { 
            left: window.innerWidth >= 768 
              ? `${sidebarWidth + 16}px` 
              : '1rem',
            right: window.innerWidth >= 768 ? '1.5rem' : '1rem'
          } : {
            left: '1rem',
            right: '1rem'
          }}
        >
          <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 md:p-5 rounded-2xl shadow-lg animate-pulse">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded animate-pulse" />
                <div className="space-y-1">
                  <div className="h-4 bg-white/20 rounded w-40 animate-pulse" />
                  <div className="h-3 bg-white/20 rounded w-56 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                <div className="w-4 h-4 bg-white/20 rounded animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 bg-white/20 rounded w-16 animate-pulse" />
                  <div className="h-2 bg-white/20 rounded w-24 hidden sm:block animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Skeleton */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Header Skeleton */}
          <div className="text-center mb-6 md:mb-8">
            <div className="h-7 bg-muted rounded w-48 mx-auto mb-2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-64 mx-auto animate-pulse" />
          </div>

          {/* Progress Indicators Skeleton */}
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted animate-pulse" />
                {step < 3 && (
                  <div className="h-1 w-12 md:w-16 bg-muted rounded animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* Form Skeleton */}
          <div className="relative h-[450px] md:h-[500px] mb-8">
            <VerificationFormSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
        {/* Floating Banner - Both Mobile and Desktop */}
        <div 
          className="fixed top-20 md:top-4 z-40 transition-all duration-300"
          style={{ 
            left: typeof window !== 'undefined' && window.innerWidth >= 768 
              ? `${sidebarWidth + 16}px` 
              : '1rem',
            right: typeof window !== 'undefined' && window.innerWidth >= 768 ? '1.5rem' : '1rem'
          }}
        >
          <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 md:p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                <div>
                  <h2 className="text-base md:text-lg font-semibold">Account Verification</h2>
                  <p className="text-xs text-white/80">Verify your account to access all features</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4" />
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatTime(currentTime)}</div>
                  <div className="text-xs text-white/70 hidden sm:block">{formatDate(currentTime)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Centered with margin-top from banner */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header - Centered */}
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Account Verification
              </h1>
              <p className="text-sm text-muted-foreground">
                Complete the steps below to verify your account
              </p>
            </div>

            {/* Progress Indicators - Centered with Status */}
            {verificationStatus ? (
              <div className="flex items-center justify-center gap-2 mb-6 md:mb-8">
                {verificationStatus === "verified" ? (
                  <>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <span className="text-sm md:text-base font-medium text-foreground">Fully Verified</span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="text-sm md:text-base font-medium text-foreground">Please wait to verify</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
                {[1, 2, 3].map((stepNum) => (
                  <div key={stepNum} className="flex items-center gap-3 md:gap-4">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                        step >= stepNum 
                          ? "bg-primary text-white" 
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > stepNum ? "✓" : stepNum}
                    </div>
                    {stepNum < 3 && (
                      <div 
                        className={`h-1 w-12 md:w-16 transition-all ${
                          step > stepNum ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
              </div>
            ))}
              </div>
            )}

            {/* Form Container - Consistent height, centered */}
            <div className="relative h-[450px] md:h-[500px] mb-8">
              <VerificationForm step={step} setStep={setStep} userData={userData} verificationStatus={verificationStatus} />
            </div>
          </div>
        </div>
    </div>
  )
}
