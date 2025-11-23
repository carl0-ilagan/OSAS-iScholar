"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

const ADMIN_EMAIL = "contact.ischolar@gmail.com"

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

    // Redirect to login if not authenticated or not authorized
    if (!user || user.email !== ADMIN_EMAIL) {
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
  if (pathname !== "/admin/login" && (!user || user.email !== ADMIN_EMAIL)) {
    return null
  }

  return <>{children}</>
}

