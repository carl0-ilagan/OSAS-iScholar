"use client"

import { useState, useEffect } from "react"
import StudentSidebar from "@/components/student/sidebar"
import MobileHeader from "@/components/student/mobile-header"
import MobileBottomNav from "@/components/student/mobile-bottom-nav"

export default function StudentLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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
      <main className="flex-1 overflow-auto md:ml-0">
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

