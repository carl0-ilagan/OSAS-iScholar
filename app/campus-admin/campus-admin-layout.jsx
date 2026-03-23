"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import CampusAdminSidebar from "@/components/campus-admin/sidebar"
import CampusAdminMobileBottomNav from "@/components/campus-admin/mobile-bottom-nav"
import CampusAdminTopHeader from "@/components/campus-admin/top-header"

export default function CampusAdminLayoutWrapper({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const pathname = usePathname()
  const mainScrollRef = useRef(null)
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
    <div
      className={`relative min-h-screen overflow-hidden bg-background ${isDarkMode ? "admin-dark" : ""}`}
      style={{ "--campus-admin-sidebar-width": "240px" }}
    >
      {!isConsultationRoute ? (
        <CampusAdminSidebar />
      ) : null}

      {!isConsultationRoute ? (
        <CampusAdminTopHeader
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      ) : null}

      <main
        ref={mainScrollRef}
        className={`min-h-screen overflow-y-auto scrollbar-hide transition-[margin-left] duration-[300ms] ease-in-out will-change-[margin-left] ${
          isConsultationRoute ? "" : "md:ml-[var(--campus-admin-sidebar-width)]"
        }`}
      >
        <div className={isConsultationRoute ? "h-full" : "pt-16 pb-20 md:pb-0"}>
          {children}
        </div>
      </main>

      {!isConsultationRoute ? (
        <div className="md:hidden">
          <CampusAdminMobileBottomNav scrollContainerRef={mainScrollRef} />
        </div>
      ) : null}
    </div>
  )
}
