"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CheckCircle, Clock, User, FileText, Send } from "lucide-react"
import VerificationForm from "./verification-form"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"

export default function VerificationModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1)
  const [userData, setUserData] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Fetch user data and verification status
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid || !isOpen) {
        setLoading(false)
        return
      }

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
    }
    fetchUserData()
  }, [user, isOpen])

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
    }
  }, [isOpen])

  const stepLabels = [
    { num: 1, label: "Personal Info", icon: User },
    { num: 2, label: "Documents", icon: FileText },
    { num: 3, label: "Review", icon: Send }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-2xl md:max-w-3xl p-0 overflow-hidden max-h-[95vh] sm:max-h-[90vh]" showCloseButton={false}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-5 md:p-6 border-b border-border">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-light text-foreground tracking-tight">
                Account Verification
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground font-light">
                Complete the steps below to verify your account
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Progress Indicators - Top */}
          <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-b border-border">
            {verificationStatus ? (
              <div className="flex items-center gap-3">
                {verificationStatus === "verified" ? (
                  <>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-light text-foreground">Fully Verified</p>
                      <p className="text-xs sm:text-sm text-muted-foreground font-light">Your account has been verified</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-light text-foreground">Pending Review</p>
                      <p className="text-xs sm:text-sm text-muted-foreground font-light">Your verification is under review</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                {stepLabels.map((stepInfo, index) => {
                  const Icon = stepInfo.icon
                  return (
                    <div key={stepInfo.num} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                            step >= stepInfo.num 
                              ? "bg-primary text-white" 
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {step > stepInfo.num ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${step === stepInfo.num ? 'text-white' : ''}`} />
                          )}
                        </div>
                        <span className={`text-[10px] sm:text-xs font-light mt-1.5 sm:mt-2 transition-colors text-center ${
                          step >= stepInfo.num ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {stepInfo.label}
                        </span>
                      </div>
                      {index < stepLabels.length - 1 && (
                        <div className="w-8 sm:w-12 md:w-16 mx-1 sm:mx-2 h-px relative">
                          <div 
                            className={`absolute inset-0 transition-all duration-500 ${
                              step > stepInfo.num 
                                ? "bg-primary" 
                                : "bg-border"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {loading ? (
              <div className="p-6 sm:p-8 flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
                <div 
                  key={step}
                  className="flex-1 min-h-0 flex flex-col overflow-y-auto animate-in fade-in duration-300"
                >
                  <VerificationForm 
                    step={step} 
                    setStep={setStep} 
                    userData={userData} 
                    verificationStatus={verificationStatus}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

