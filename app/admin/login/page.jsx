"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { Loader2 } from "lucide-react"

const ADMIN_EMAIL = "contact.ischolar@gmail.com"

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { branding } = useBranding()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!authLoading && user && user.email === ADMIN_EMAIL) {
      router.push("/admin")
    }
  }, [user, authLoading, router])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError("")
      const user = await signInWithGoogle()
      
      // Validate admin email
      if (user.email !== ADMIN_EMAIL) {
        setError("Access denied. Only authorized administrators can access this page.")
        // Sign out if not authorized
        await signOut()
        setLoading(false)
        return
      }
      
      // Success - redirect to admin dashboard
      router.push("/admin")
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
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-8 text-center">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              {branding?.logo ? (
                <img 
                  src={branding.logo} 
                  alt={branding.name || "Logo"} 
                  className="w-12 h-12 object-contain p-1"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">iA</span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-white/90 text-sm">{branding?.name || "iScholar"} Portal Administration</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="text-center space-y-2 mb-6">
                <p className="text-sm text-muted-foreground">
                  Sign in with your authorized Google account
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  Only authorized administrators can access
                </p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md font-medium"
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

              <div className="text-center pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Authorized email: {ADMIN_EMAIL}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-white/80">
            © 2024 iScholar Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

