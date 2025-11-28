"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { isAdmin, isStudent } from "@/lib/role-check"

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(() => {
    // Don't check auth on login page
    if (pathname === "/admin/login") {
      return
    }

    // Wait for auth to load
    if (loading) {
      return
    }

    // If user is authenticated but not admin (i.e., student), redirect to student dashboard
    if (user && isStudent(user)) {
      router.push("/student")
      return
    }

    // Redirect to login if not authenticated or not authorized
    if (!user || !isAdmin(user)) {
      router.push("/admin/login")
    }
  }, [user, loading, pathname, router])

  // Show loading state while checking auth
  if (loading && pathname !== "/admin/login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render protected content if not authorized (except login page)
  // Also don't render if user is a student (they should be redirected)
  if (pathname !== "/admin/login" && (!user || !isAdmin(user))) {
    return null
  }

  // If user is authenticated but not admin, don't render (redirect is happening)
  if (user && isStudent(user)) {
    return null
  }

  return <>{children}</>
}

