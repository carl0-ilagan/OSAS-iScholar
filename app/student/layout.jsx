"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { canAccessRoute } from "@/lib/role-check"
import StudentHeader from "@/components/student/student-header"

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
      {!isConsultationRoute ? <StudentHeader /> : null}

      <main className={isConsultationRoute ? "h-screen" : "min-h-screen pt-[4.5rem]"}>
        <div
          className={
            isConsultationRoute
              ? "h-full"
              : "min-h-[calc(100vh-4.5rem)] mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 pt-1"
          }
        >
          {children}
        </div>
      </main>
    </div>
  )
}
