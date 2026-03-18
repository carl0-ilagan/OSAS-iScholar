"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import WelcomeLoginModal from "./welcome-login-modal"

export default function LoginModal({ open, onOpenChange }) {
  const { signInWithEmail, resetPassword, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [loggedInUserId, setLoggedInUserId] = useState(null)
  const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value)

  useEffect(() => {
    if (!open) {
      setError("")
      setSuccess("")
      setEmail("")
      setPassword("")
    }
  }, [open])

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email first, then click Forgot Password.")
      setSuccess("")
      return
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address.")
      setSuccess("")
      return
    }

    try {
      setLoading(true)
      setError("")
      setSuccess("")
      await resetPassword(email.trim())
      setSuccess("Password reset link sent to your email.")
    } catch (resetError) {
      console.error("Reset password error:", resetError)
      setSuccess("")
      setError("Unable to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.")
      return
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address.")
      return
    }

    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const user = await signInWithEmail(email.trim(), password)

      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        await signOut()
        setError("Your account was not registered. Please sign up first before you log in.")
        return
      }

      await updateDoc(userDocRef, {
        status: "online",
        lastSeen: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      })

      setLoggedInUserId(user.uid)
      onOpenChange(false)
      setShowWelcomeModal(true)
    } catch (authError) {
      console.error("Email login error:", authError)
      setError("Invalid credentials or account not found. Please sign up first.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md md:max-w-lg max-h-[90vh] p-0 overflow-hidden" showCloseButton={false}>
        <div className="max-h-[90vh]">
          <div className="flex flex-col justify-center p-5 md:p-7 overflow-y-auto">
            <DialogHeader className="items-center text-center space-y-2 mb-6">
              <DialogTitle className="w-full text-center text-2xl md:text-3xl font-light text-foreground tracking-tight">
                Welcome Back
              </DialogTitle>
              <DialogDescription className="w-full text-center text-sm text-muted-foreground font-light">
                Sign in with Email + Password
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {error && (
                <div className="bg-destructive/5 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-200">
                  {success}
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-input focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-input focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                </div>
                <button
                  onClick={handleEmailSignIn}
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </div>

              <p className="text-xs text-muted-foreground font-light">Use the same email you registered with.</p>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Welcome Login Modal */}
      <WelcomeLoginModal
        isOpen={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false)
        }}
        userId={loggedInUserId}
      />
    </Dialog>
  )
}

