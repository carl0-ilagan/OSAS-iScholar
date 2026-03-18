"use client"

import { useState, useEffect } from "react"
import AdminSidebar from "@/components/admin/sidebar"
import AdminMobileBottomNav from "@/components/admin/mobile-bottom-nav"
import AdminTopHeader from "@/components/admin/top-header"

export default function AdminLayoutWrapper({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin-theme")
    if (savedTheme === "dark") {
      setIsDarkMode(true)
    }
  }, [])

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev
      localStorage.setItem("admin-theme", next ? "dark" : "light")
      return next
    })
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-background ${isDarkMode ? "admin-dark" : ""}`}>
      {/* Desktop Sidebar */}
      <div className="hidden w-64 flex-shrink-0 md:block">
        <AdminSidebar />
      </div>

      <AdminTopHeader isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="pt-16 pb-20 md:pb-0">
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

