"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Sparkles, ArrowRight, GraduationCap, Award, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export default function WelcomeLoginModal({ isOpen, onClose, userId }) {
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
        className="w-[calc(100%-2rem)] max-w-lg p-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Hidden Title for Accessibility */}
          <DialogTitle className="sr-only">Welcome Back</DialogTitle>
          
          {/* Header with Animation */}
          <div className="bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient-x p-8 text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-in zoom-in-95 duration-500">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                Welcome Back!
              </h2>
              <p className="text-white/90 text-sm md:text-base font-light animate-in fade-in slide-in-from-bottom-4 duration-700">
                {userData?.fullName || userData?.displayName || "Student"}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Welcome Message */}
                <div className="text-center space-y-2">
                  <p className="text-base md:text-lg text-foreground font-light">
                    You've successfully logged in to your iScholar account
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ready to explore scholarships and manage your applications
                  </p>
                </div>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                    <GraduationCap className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground">{userData?.course || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">Course</p>
                  </div>
                  <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 text-center">
                    <BookOpen className="w-5 h-5 text-secondary mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground">{userData?.yearLevel || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">Year Level</p>
                  </div>
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-center">
                    <Award className="w-5 h-5 text-accent mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      {userData?.campus || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Campus</p>
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3.5 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

