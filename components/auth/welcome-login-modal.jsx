"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Check, ArrowRight, GraduationCap, Award, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

/** Solid emerald header — avoids theme/Tailwind edge cases where bg-emerald-* looks white */
const HEADER_BG = "#064e3b"

export default function WelcomeLoginModal({ isOpen, onClose, userId }) {
  const router = useRouter()
  const { user } = useAuth()
  const { branding } = useBranding()
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
    const role = String(userData?.role || user?.appRole || user?.role || "").trim().toLowerCase()
    onClose()
    if (role === "campus_admin") {
      router.push("/campus-admin")
      return
    }
    if (role === "admin") {
      router.push("/admin")
      return
    }
    router.push("/student")
  }

  const brandName = branding?.name || "MOCAS"
  const displayName = userData?.fullName || userData?.displayName || user?.displayName || "Student"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* One surface only: card = DialogContent (no extra wrapper div) */}
      <DialogContent
        overlayClassName="bg-zinc-950/95 backdrop-blur-0"
        className="fixed !left-1/2 !top-1/2 flex !max-h-[min(90dvh,40rem)] !w-[min(100%-1.5rem,28rem)] !max-w-[min(100%-1.5rem,28rem)] !-translate-x-1/2 !-translate-y-1/2 !flex-col !gap-0 !overflow-hidden !overflow-y-auto !rounded-3xl !border !border-emerald-200/90 !bg-white !p-0 !shadow-xl !shadow-emerald-950/20 outline-none data-[state=open]:!zoom-in-95 dark:!border-emerald-800 dark:!bg-zinc-900"
        showCloseButton={false}
      >
        {/* Header — extra vertical rhythm (was crowded) */}
        <div
          className="px-6 pb-8 pt-10 text-center text-white"
          style={{ backgroundColor: HEADER_BG }}
        >
          <div
            className="relative mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center"
            aria-hidden
          >
            <span className="absolute inset-0 rounded-full bg-emerald-300/30 blur-lg" aria-hidden />
            <span className="absolute inset-[2px] rounded-full ring-2 ring-white/30" aria-hidden />
            <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-emerald-400 shadow-md shadow-black/20">
              <Check
                className="h-7 w-7 stroke-[3] text-white drop-shadow-sm"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/95">{brandName}</p>
          <DialogTitle className="mt-4 text-2xl font-bold tracking-tight text-white">
            Welcome back!
          </DialogTitle>
          <p className="mt-3 text-base font-semibold leading-snug text-white/95">{displayName}</p>
        </div>

        <div className="px-6 pb-7 pt-6">
          {loading ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700 dark:border-emerald-800 dark:border-t-emerald-400" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Loading…</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5 text-center">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Signed in to{" "}
                  <span className="font-semibold text-emerald-800 dark:text-emerald-400">{brandName}</span>
                </p>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Scholarships, applications, and requirements are ready for you.
                </p>
              </div>

              {/* No inner bordered box — rows only + dividers (one less “div in div” feel) */}
              <div className="divide-y divide-emerald-100 rounded-xl bg-emerald-50/60 dark:divide-emerald-800/80 dark:bg-emerald-950/25">
                <div className="flex items-start gap-3 py-3.5 first:pt-1">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <div className="min-w-0 text-left">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Course</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {userData?.course || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-3.5">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <div className="min-w-0 text-left">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Year level</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {userData?.yearLevel || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-3.5 last:pb-1">
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <div className="min-w-0 text-left">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Campus</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {userData?.campus || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 active:scale-[0.99] dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <span>Continue to dashboard</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
