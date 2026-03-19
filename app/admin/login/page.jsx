"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { getCampusAdminProfileByEmail, normalizeCampus } from "@/lib/campus-admin-config"
import { ADMIN_EMAILS, isAdminEmail } from "@/lib/role-check"

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if already logged in as admin
  useEffect(() => {
    const role = String(user?.appRole || user?.role || "").toLowerCase()
    const canAccessAdmin = user && (isAdminEmail(user.email) || role === "admin" || role === "campus_admin")
    if (!authLoading && canAccessAdmin) {
      if (role === "campus_admin" && !isAdminEmail(user?.email)) {
        router.push("/campus-admin")
        return
      }
      router.push("/admin")
    }
  }, [user, authLoading, router])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError("")
      const user = await signInWithGoogle()
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      const role = String(userDoc.exists() ? userDoc.data()?.role : "").trim().toLowerCase()
      const campusAdminProfile = getCampusAdminProfileByEmail(user.email)
      const canAccessAdmin =
        isAdminEmail(user.email) || role === "admin" || role === "campus_admin" || Boolean(campusAdminProfile)

      if (!canAccessAdmin) {
        setError("Access denied. Only authorized administrators can access this page.")
        // Sign out if not authorized
        await signOut()
        setLoading(false)
        return
      }

      if (isAdminEmail(user.email)) {
        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Administrator",
            photoURL: user.photoURL || null,
            role: "admin",
            status: "online",
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
      }

      if (campusAdminProfile) {
        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || campusAdminProfile.label,
            photoURL: user.photoURL || null,
            role: "campus_admin",
            campus: normalizeCampus(campusAdminProfile.campus),
            status: "online",
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
      }
      
      // Success - redirect to role portal
      if ((role === "campus_admin" || campusAdminProfile) && !isAdminEmail(user.email)) {
        router.push("/campus-admin")
      } else {
        router.push("/admin")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(error.message || "Failed to sign in. Please try again.")
      // Sign out on error to ensure clean state
      try {
        await signOut()
      } catch (signOutError) {
        console.error("Sign out error:", signOutError)
      }
      setLoading(false)
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('/BG.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundImage: "url('/BG.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      <div className="w-full max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-white/30 bg-emerald-950/55 shadow-2xl shadow-emerald-950/35 backdrop-blur-md">
          {/* Header */}
          <div className="border-b border-white/15 px-8 pb-8 pt-10 text-center">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/45 bg-white shadow-lg">
              {brandLogo ? (
                <img 
                  src={brandLogo} 
                  alt={brandName || "Logo"} 
                  className="h-full w-full scale-[1.8] object-contain"
                />
              ) : (
                <span className="text-3xl font-bold text-primary">M</span>
              )}
            </div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">Admin Login</h1>
            <p className="text-sm text-emerald-50/90">{brandName} Portal Administration</p>
          </div>

          {/* Content */}
          <div className="space-y-7 p-8 sm:p-10">
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/15 p-4 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="mb-6 space-y-2 text-center">
                <p className="text-sm text-emerald-50/90">
                  Sign in with your authorized Google account
                </p>
                <p className="text-xs font-medium text-emerald-100/80">
                  Only authorized administrators can access
                </p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/45 bg-white px-6 py-4 font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    <span className="text-gray-700">Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-gray-700">Continue with Google</span>
                  </>
                )}
              </button>

              <div className="border-t border-white/15 pt-4 text-center">
                <p className="text-xs text-emerald-50/80">
                  Authorized administrators only
                </p>
                <Link href="/campus-admin/login" className="mt-2 inline-block text-xs font-semibold text-emerald-200 hover:text-white hover:underline">
                  Campus Admin Login
                </Link>
              </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-white/95">
            © 2024 MOCAS Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

