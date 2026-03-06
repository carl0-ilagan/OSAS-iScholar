"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, ArrowRight, GraduationCap, BookOpen, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export default function SuccessSignupModal({ isOpen, onClose, userId }) {
  const router = useRouter()
  const { user } = useAuth()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId && !user?.uid) {
        setLoading(false)
        return
      }

      try {
        const uid = userId || user?.uid
        const userDoc = await getDoc(doc(db, "users", uid))
        if (userDoc.exists()) {
          setUserData(userDoc.data())
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchUserData()
    }
  }, [isOpen, userId, user])

  const handleContinue = () => {
    onClose()
    router.push("/student")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[calc(100%-1rem)] max-w-2xl p-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Hidden Title for Accessibility */}
          <DialogTitle className="sr-only">Account Created</DialogTitle>
          
          {/* Simple Header */}
          <div className="bg-emerald-600 text-white px-5 py-5 md:px-7 md:py-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold">Account Created!</h2>
            <p className="text-white/90 text-sm mt-1">
              Welcome, {userData?.fullName || userData?.displayName || "Student"}
            </p>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Your account is ready. You can now continue to your student dashboard.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="border border-border rounded-lg p-2.5 bg-muted/20">
                    <User className="w-4 h-4 text-primary mb-1" />
                    <p className="text-[11px] text-muted-foreground">Student ID</p>
                    <p className="text-xs font-semibold text-foreground truncate">{userData?.studentNumber || "N/A"}</p>
                  </div>
                  <div className="border border-border rounded-lg p-2.5 bg-muted/20">
                    <GraduationCap className="w-4 h-4 text-primary mb-1" />
                    <p className="text-[11px] text-muted-foreground">Course</p>
                    <p className="text-xs font-semibold text-foreground truncate">{userData?.course || "N/A"}</p>
                  </div>
                  <div className="border border-border rounded-lg p-2.5 bg-muted/20">
                    <BookOpen className="w-4 h-4 text-primary mb-1" />
                    <p className="text-[11px] text-muted-foreground">Year Level</p>
                    <p className="text-xs font-semibold text-foreground">{userData?.yearLevel || "N/A"}</p>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

