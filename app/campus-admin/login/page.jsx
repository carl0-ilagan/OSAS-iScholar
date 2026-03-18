"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { getCampusAdminProfileByEmail, normalizeCampus } from "@/lib/campus-admin-config"

export default function CampusAdminLoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, signInWithEmail, signOut } = useAuth()
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
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary p-8 text-center text-white">
          <h1 className="text-3xl font-bold">Campus Admin Login</h1>
          <p className="mt-2 text-sm text-white/90">Sign in with your assigned campus admin email</p>
        </div>

        <div className="p-8">
          {error && <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <form onSubmit={handleCampusAdminLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Campus admin email"
              className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">Log in</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
