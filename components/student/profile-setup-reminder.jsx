"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { isStudentProfileSetupComplete } from "@/lib/student-profile-complete"

function shouldHideReminder(pathname) {
  if (!pathname) return true
  if (pathname === "/student/profile" || pathname.startsWith("/student/profile/")) return true
  if (pathname.startsWith("/student/consultations")) return true
  return false
}

export default function StudentProfileSetupReminder() {
  const { user } = useAuth()
  const pathname = usePathname()
  const hideByRoute = useMemo(() => shouldHideReminder(pathname), [pathname])
  const [ready, setReady] = useState(false)
  const [incomplete, setIncomplete] = useState(false)

  useEffect(() => {
    if (!user?.uid || hideByRoute) {
      setReady(true)
      setIncomplete(false)
      return
    }

    setReady(false)
    const ref = doc(db, "users", user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null
        setIncomplete(!isStudentProfileSetupComplete(data, user))
        setReady(true)
      },
      () => {
        setIncomplete(true)
        setReady(true)
      },
    )
    return () => unsub()
  }, [user?.uid, user, hideByRoute])

  if (!ready || hideByRoute || !incomplete) return null

  return (
    <div
      role="alert"
      className="w-full border-b border-amber-300/90 bg-gradient-to-r from-amber-100 via-amber-50 to-orange-50/90 px-4 py-3 shadow-sm dark:border-amber-700/80 dark:from-amber-950/90 dark:via-amber-950/70 dark:to-orange-950/50 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-amber-950 dark:text-amber-50">
              Please complete your profile setup
            </p>
            <p className="mt-0.5 text-xs leading-snug text-amber-900/90 dark:text-amber-200/95">
              Add your photo, student number, course, year level, and campus so your account is ready across the portal.
            </p>
          </div>
        </div>
        <Link
          href="/student/profile"
          className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-950 dark:bg-amber-600 dark:hover:bg-amber-500 sm:w-auto sm:py-2"
        >
          Complete profile
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
