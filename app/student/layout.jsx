"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { canAccessRoute } from "@/lib/role-check"
import StudentHeader from "@/components/student/student-header"
import StudentProfileSetupReminder from "@/components/student/profile-setup-reminder"

export default function StudentLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const isConsultationRoute = pathname?.startsWith("/student/consultations")

  // Role-based access control for student area
  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      router.replace("/")
      return
    }

    if (!canAccessRoute(user, "/student")) {
      router.replace("/unauthorized")
      return
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !canAccessRoute(user, "/student")) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-background to-background dark:from-emerald-950/25 dark:via-background dark:to-background">
      {isConsultationRoute ? (
        <main className="h-screen">{children}</main>
      ) : (
        <>
          <StudentHeader />
          {/* pt-16 matches StudentHeader row height (h-16) + fixed profile strip uses top-16 */}
          <main className="min-h-screen pb-12 pt-16">
            {/* Full-width strip directly under the header (not constrained to max-w-7xl) */}
            <StudentProfileSetupReminder />
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-1">
              {children}
            </div>
          </main>
        </>
      )}
    </div>
  )
}
