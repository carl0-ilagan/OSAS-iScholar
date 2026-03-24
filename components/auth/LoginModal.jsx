"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import WelcomeLoginModal from "./welcome-login-modal"

export default function LoginModal({ open, onOpenChange }) {
  const { signInWithEmail, resetPassword, signOut } = useAuth()
  const { branding } = useBranding()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [loggedInUserId, setLoggedInUserId] = useState(null)
  const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value)

  useEffect(() => {
    if (!open) {
      setError("")
      setSuccess("")
      setEmail("")
      setPassword("")
      setShowPassword(false)
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
      const code = authError?.code || ""
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/invalid-email") {
        setError(
          "Wrong email or password. If you registered with Google only, use Continue with Google or set a password via Forgot password.",
        )
      } else if (code === "auth/user-not-found") {
        setError("No account with this email. Please sign up first.")
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.")
      } else {
        setError("Sign-in failed. Check your email/password and Firebase Auth settings (Email/Password enabled, authorized domains).")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-hidden rounded-3xl border border-emerald-100/70 p-0 shadow-2xl shadow-emerald-950/30 sm:max-w-5xl" showCloseButton={false}>
        <div className="grid min-h-[560px] md:grid-cols-2">
          <div className="flex flex-col justify-center bg-white p-7 md:p-12">
            <DialogHeader className="mb-7 space-y-2 text-left">
              <DialogTitle className="text-3xl font-bold tracking-tight text-emerald-950 md:text-4xl">
                Welcome Back!
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-emerald-900/70">
                Sign in to continue to your {branding?.name || "MOCAS"} account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-emerald-950">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-emerald-950">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 pr-12 text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/80 hover:text-emerald-800"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-50"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                onClick={handleEmailSignIn}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 text-base font-semibold text-white shadow-lg shadow-emerald-700/25 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
              </button>

              <p className="pt-1 text-xs text-emerald-900/65">Use the same email you registered with.</p>
            </div>
          </div>

          <div
            className="relative hidden items-center justify-center overflow-hidden md:flex"
            style={{
              backgroundImage: "url('/BG.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-emerald-950/55" />
            <div className="absolute inset-x-10 inset-y-12 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-sm" />
            <div className="relative z-10 text-center text-white">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white p-2.5 shadow-xl">
                <img
                  src={branding?.logo || "/MOCAS-removebg-preview.png"}
                  alt={branding?.name || "MOCAS"}
                  className="h-full w-full object-contain"
                />
              </div>
              <h3 className="text-5xl font-bold tracking-tight">{branding?.name || "MOCAS"}</h3>
              <p className="mt-2 text-lg text-emerald-50/90">Office of Admission and Scholarship</p>
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

