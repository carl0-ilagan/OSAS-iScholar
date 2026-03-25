"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle, ChevronRight, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, doc, getDocs, onSnapshot, query, where } from "firebase/firestore"
import { PROFILE_SETUP_REMINDER_SESSION_KEY } from "@/lib/profile-setup-reminder-session"
import { isStudentProfileSetupComplete } from "@/lib/student-profile-complete"
import { cn } from "@/lib/utils"

const REMINDER_ANIM_MS = 300

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
  const [userDocData, setUserDocData] = useState(null)
  const [userDocReady, setUserDocReady] = useState(false)
  const [hasApprovedScholarshipApplication, setHasApprovedScholarshipApplication] = useState(false)
  const [scholarshipQueryDone, setScholarshipQueryDone] = useState(false)
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [exiting, setExiting] = useState(false)
  const exitTimerRef = useRef(null)

  useEffect(() => {
    try {
      setSessionDismissed(sessionStorage.getItem(PROFILE_SETUP_REMINDER_SESSION_KEY) === "1")
    } catch {
      setSessionDismissed(false)
    } finally {
      setSessionHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!user?.uid || hideByRoute) {
      setHasApprovedScholarshipApplication(false)
      setScholarshipQueryDone(true)
      return
    }

    setScholarshipQueryDone(false)
    let cancelled = false
    ;(async () => {
      try {
        const q = query(collection(db, "applications"), where("userId", "==", user.uid))
        const snap = await getDocs(q)
        const any = snap.docs.some((d) => {
          const x = d.data()
          return (
            String(x.status || "").toLowerCase() === "approved" &&
            String(x.scholarshipName || "").trim().length > 0
          )
        })
        if (!cancelled) setHasApprovedScholarshipApplication(any)
      } catch {
        if (!cancelled) setHasApprovedScholarshipApplication(false)
      } finally {
        if (!cancelled) setScholarshipQueryDone(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.uid, hideByRoute])

  useEffect(() => {
    if (!user?.uid || hideByRoute) {
      setUserDocData(null)
      setUserDocReady(true)
      return
    }

    setUserDocReady(false)
    const ref = doc(db, "users", user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setUserDocData(snap.exists() ? snap.data() : null)
        setUserDocReady(true)
      },
      () => {
        setUserDocData(null)
        setUserDocReady(true)
      },
    )
    return () => unsub()
  }, [user?.uid, hideByRoute])

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [])

  const ready = hideByRoute || !user?.uid || (scholarshipQueryDone && userDocReady && sessionHydrated)
  const incomplete =
    !hideByRoute &&
    user?.uid &&
    scholarshipQueryDone &&
    userDocReady &&
    !isStudentProfileSetupComplete(userDocData, user, {
      hasApprovedScholarshipApplication,
    })

  const showReminder = incomplete && !sessionDismissed
  const renderStrip = showReminder || exiting

  const handleDismiss = () => {
    if (exiting) return
    try {
      sessionStorage.setItem(PROFILE_SETUP_REMINDER_SESSION_KEY, "1")
    } catch {
      /* ignore */
    }
    setExiting(true)
    exitTimerRef.current = setTimeout(() => {
      setSessionDismissed(true)
      setExiting(false)
      exitTimerRef.current = null
    }, REMINDER_ANIM_MS)
  }

  if (!ready || hideByRoute || !renderStrip) return null

  return (
    <>
      {/* Reserves space so page content does not sit under the fixed strip */}
      <div
        aria-hidden
        className={cn(
          "shrink-0 overflow-hidden transition-[height,opacity] duration-300 ease-out",
          exiting ? "h-0 opacity-0" : "h-[5.75rem] opacity-100",
        )}
      />
      <div
        role="alert"
        className={cn(
          "fixed left-0 right-0 top-16 z-40 w-full overflow-hidden border-b border-amber-300/90 bg-gradient-to-r from-amber-100 via-amber-50 to-orange-50/90 shadow-sm transition-[transform,opacity] duration-300 ease-out dark:border-amber-700/80 dark:from-amber-950/90 dark:via-amber-950/70 dark:to-orange-950/50",
          exiting ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-amber-950 dark:text-amber-50">
                Please complete your profile setup
              </p>
              <p className="mt-0.5 text-xs leading-snug text-amber-900/90 dark:text-amber-200/95">
                Include scholarship (approved application or external listing), Indigenous Peoples (IP), and Person with
                Disability (PWD), plus your photo, student number, course, year level, and campus.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/student/profile"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-950 dark:bg-amber-600 dark:hover:bg-amber-500 sm:flex-initial sm:py-2"
            >
              Complete profile
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-900/20 bg-amber-900/5 text-amber-900 transition-colors hover:bg-amber-900/15 dark:border-amber-100/20 dark:bg-white/5 dark:text-amber-100 dark:hover:bg-white/10"
              aria-label="Dismiss profile reminder"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
