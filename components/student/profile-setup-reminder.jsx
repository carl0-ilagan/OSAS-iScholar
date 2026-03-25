"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, UserCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

function hasDisplayableProfilePhoto(firestorePhoto, authUserPhoto) {
  const u = String(firestorePhoto || authUserPhoto || "").trim()
  if (!u) return false
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:image/")
}

export default function StudentProfileSetupReminder() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setChecking(false)
      setShowReminder(false)
      return
    }

    const onProfilePage =
      pathname === "/student/profile" || (pathname?.startsWith("/student/profile/") ?? false)
    if (onProfilePage) {
      setChecking(false)
      setShowReminder(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid))
        const firestorePhoto = snap.exists() ? snap.data()?.photoURL : null
        const authPhoto = user.photoURL || user.providerData?.[0]?.photoURL || null
        if (cancelled) return
        setShowReminder(!hasDisplayableProfilePhoto(firestorePhoto, authPhoto))
      } catch {
        if (!cancelled) {
          const authPhoto = user.photoURL || user.providerData?.[0]?.photoURL || null
          setShowReminder(!hasDisplayableProfilePhoto(null, authPhoto))
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.uid, user?.photoURL, pathname])

  if (checking || !showReminder) return null

  return (
    <div
      role="status"
      className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-amber-50/95 to-orange-50/80 px-3 py-2.5 shadow-sm dark:border-amber-800/60 dark:from-amber-950/50 dark:via-amber-950/40 dark:to-orange-950/30 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2"
    >
      <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200">
          <UserCircle className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Finish setting up your profile</p>
          <p className="text-xs leading-snug text-amber-900/85 dark:text-amber-200/90">
            Add a profile photo and complete your details so admins can recognize you and your records stay accurate.
          </p>
        </div>
      </div>
      <Link
        href="/student/profile"
        className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-900 dark:bg-amber-600 dark:hover:bg-amber-500 sm:py-1.5"
      >
        Go to profile
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  )
}
