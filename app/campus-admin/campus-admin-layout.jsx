"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import CampusAdminSidebar from "@/components/campus-admin/sidebar"
import CampusAdminMobileBottomNav from "@/components/campus-admin/mobile-bottom-nav"
import CampusAdminTopHeader from "@/components/campus-admin/top-header"

export default function CampusAdminLayoutWrapper({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const pathname = usePathname()
  const isConsultationRoute = pathname?.startsWith("/campus-admin/consultations")

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin-theme") || localStorage.getItem("campus-admin-theme")
    if (savedTheme === "dark") {
      setIsDarkMode(true)
    }
  }, [])

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev
      // Keep campus admin visual theme in sync with admin side
      localStorage.setItem("admin-theme", next ? "dark" : "light")
      localStorage.setItem("campus-admin-theme", next ? "dark" : "light")
      return next
    })
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-background ${isDarkMode ? "admin-dark" : ""}`}>
      {!isConsultationRoute ? (
        <div className="hidden w-64 flex-shrink-0 md:block">
          <CampusAdminSidebar />
        </div>
      ) : null}

      {!isConsultationRoute ? (
        <CampusAdminTopHeader
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      ) : null}

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className={isConsultationRoute ? "h-full" : "pt-16 pb-20 md:pb-0"}>
          {children}
        </div>
      </main>

      {!isConsultationRoute ? (
        <div className="md:hidden">
          <CampusAdminMobileBottomNav />
        </div>
      ) : null}
    </div>
  )
}
