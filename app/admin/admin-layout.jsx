"use client"

import { useState, useEffect } from "react"
import AdminSidebar from "@/components/admin/sidebar"
import AdminMobileHeader from "@/components/admin/mobile-header"
import AdminMobileBottomNav from "@/components/admin/mobile-bottom-nav"

export default function AdminLayoutWrapper({ children }) {
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
      <div className="hidden md:block flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <AdminMobileHeader />
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
        <AdminMobileBottomNav />
      </div>
    </div>
  )
}

