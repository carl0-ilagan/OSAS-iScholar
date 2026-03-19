"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { getCampusAdminProfileByEmail, normalizeCampus } from "@/lib/campus-admin-config"

export default function CampusAdminLoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, signInWithEmail, signOut } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    const role = String(user?.appRole || user?.role || "").toLowerCase()
    if (role === "campus_admin") {
      router.push("/campus-admin")
      return
    }
  }, [authLoading, user, router])

  const handleCampusAdminLogin = async (event) => {
    event.preventDefault()
    try {
      if (!email.trim() || !password.trim()) {
        setError("Please enter email and password.")
        return
      }

      setLoading(true)
      setError("")

      const signedInUser = await signInWithEmail(email.trim(), password)
      const campusProfile = getCampusAdminProfileByEmail(signedInUser.email)

      const userDocRef = doc(db, "users", signedInUser.uid)
      const existing = await getDoc(userDocRef)
      const existingData = existing.exists() ? existing.data() : {}
      const existingRole = String(existingData?.role || "").trim().toLowerCase()
      const canAccess = Boolean(campusProfile) || existingRole === "campus_admin"

      if (!canAccess) {
        setError("Access denied. This account is not listed as campus admin.")
        await signOut()
        setLoading(false)
        return
      }

      const resolvedCampus = normalizeCampus(existingData?.campus || campusProfile?.campus || null)
      const displayName =
        existingData?.fullName ||
        existingData?.displayName ||
        signedInUser.displayName ||
        campusProfile?.label ||
        "Campus Admin"

      await setDoc(
        userDocRef,
        {
          uid: signedInUser.uid,
          email: signedInUser.email,
          displayName,
          fullName: displayName,
          role: "campus_admin",
          ...(resolvedCampus ? { campus: resolvedCampus } : {}),
          status: "online",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      router.push("/campus-admin")
    } catch (loginError) {
      console.error("Campus admin login error:", loginError)
      setError(loginError?.message || "Failed to login. Please try again.")
      try {
        await signOut()
      } catch {}
      setLoading(false)
    }
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
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/30 bg-emerald-950/55 shadow-2xl shadow-emerald-950/35 backdrop-blur-md">
        <div className="border-b border-white/15 px-8 pb-8 pt-10 text-center text-white">
          <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/45 bg-white shadow-lg">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName || "Logo"} className="h-full w-full scale-[2.15] object-contain" />
            ) : (
              <span className="text-3xl font-bold text-primary">M</span>
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Campus Admin Login</h1>
          <p className="mt-2 text-sm text-emerald-50/90">Sign in with your assigned campus admin email</p>
          <p className="mt-3 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100/95">
            MOCAS Campus Console
          </p>
        </div>

        <div className="p-8 sm:p-10">
          {error && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/15 p-3 text-sm text-red-100">{error}</div>}

          <form onSubmit={handleCampusAdminLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Campus admin email"
              className="w-full rounded-xl border border-white/35 bg-white/95 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-white/35 bg-white/95 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full rounded-xl bg-white px-6 py-3.5 font-semibold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-800" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">Log in</span>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-white/15 pt-4 text-center">
            <p className="text-xs text-emerald-50/80">Restricted to registered campus admin accounts only.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
