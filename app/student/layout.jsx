"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { isAdmin } from "@/lib/role-check"
import StudentSidebar from "@/components/student/sidebar"
import MobileHeader from "@/components/student/mobile-header"
import MobileBottomNav from "@/components/student/mobile-bottom-nav"

export default function StudentLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Role-based access control: Prevent admin from accessing student routes
  useEffect(() => {
    // Wait for auth to load
    if (loading) {
      return
    }

    // If user is admin, redirect to admin dashboard
    if (user && isAdmin(user)) {
      router.push("/admin")
      return
    }

    // If user is not authenticated, redirect to landing page
    if (!user) {
      router.push("/")
      return
    }
  }, [user, loading, router])

  // Show loading state while checking auth
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

  // Don't render content if user is admin or not authenticated
  if (!user || isAdmin(user)) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <StudentSidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto scrollbar-hide md:ml-0">
        {/* Mobile padding for header and bottom nav */}
        <div className="pt-16 pb-20 md:pt-0 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  )
}

