"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { Loader2 } from "lucide-react"

export default function LoginModal({ open, onOpenChange }) {
  const router = useRouter()
  const { signInWithMicrosoft, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleMicrosoftSignIn = async () => {
    try {
      setLoading(true)
      setError("")
      const user = await signInWithMicrosoft()
      
      // Validate email domain for students
      if (user.email && !user.email.endsWith("@minsu.edu.ph")) {
        setError("Only @minsu.edu.ph email addresses are allowed for student accounts.")
        // Sign out if invalid email
        await signOut()
        return
      }
      
      // Check if user is registered in Firestore
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (!userDoc.exists()) {
          // User is not registered, sign them out
          await signOut()
          setError("Your account was not registered. Please sign up first before you log in.")
          return
        }
        
        // Update photoURL and status
        const updateData = {
          status: "online",
          lastSeen: serverTimestamp(),
          updatedAt: new Date().toISOString(),
        }
        
        if (user.photoURL && user.photoURL !== userDoc.data()?.photoURL) {
          updateData.photoURL = user.photoURL
        }
        
        await updateDoc(userDocRef, updateData)
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError)
        // If it's a permissions error, still check if user exists
        // But also sign out and show appropriate message
        await signOut()
        if (firestoreError.code === "permission-denied" || firestoreError.message?.includes("Missing or insufficient permissions")) {
          setError("Your account was not registered. Please sign up first before you log in.")
        } else {
          setError("Unable to verify your account. Please try again or sign up first.")
        }
        return
      }
      
      // User is registered, proceed with login
      // Success - close modal and redirect to student dashboard
      onOpenChange(false)
      router.push("/student")
    } catch (error) {
      console.error("Login error:", error)
      setError(error.message || "Failed to sign in. Please try again.")
      // Sign out on error to ensure clean state
      try {
        await signOut()
      } catch (signOutError) {
        console.error("Sign out error:", signOutError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden" showCloseButton={false}>
        <div className="grid md:grid-cols-2 min-h-[500px]">
          {/* Left Side - Content */}
          <div className="flex flex-col justify-center p-8 md:p-12">
            <DialogHeader className="text-left space-y-3 mb-8">
              <DialogTitle className="text-3xl md:text-4xl font-light text-foreground tracking-tight">
                Welcome Back
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-light">
                Sign in to your iScholar account using your Microsoft account
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {error && (
                <div className="bg-destructive/5 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <button
                onClick={handleMicrosoftSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center px-6 py-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
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
                    className="h-8 w-auto"
                    priority
                  />
                )}
              </button>

              <p className="text-xs text-muted-foreground font-light">
                Only @minsu.edu.ph email addresses are allowed for student accounts
              </p>
            </div>
          </div>

          {/* Right Side - Visual */}
          <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-8 md:p-12">
            <div className="text-center space-y-6 max-w-sm">
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-light text-foreground mb-2">Secure Access</h3>
                <p className="text-sm text-muted-foreground font-light">
                  Your account is protected with Microsoft's enterprise security
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

