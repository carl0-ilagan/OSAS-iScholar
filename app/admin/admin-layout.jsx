"use client"

import { useState, useEffect, useRef } from "react"
import AdminSidebar from "@/components/admin/sidebar"
import AdminMobileBottomNav from "@/components/admin/mobile-bottom-nav"
import AdminTopHeader from "@/components/admin/top-header"

export default function AdminLayoutWrapper({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const mainScrollRef = useRef(null)
  const sidebarWidth = isSidebarOpen ? 240 : 80

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin-theme")
    if (savedTheme === "dark") {
      setIsDarkMode(true)
    }
    const savedSidebarOpen = localStorage.getItem("admin-sidebar-open")
    if (savedSidebarOpen === "false") {
      setIsSidebarOpen(false)
    }
  }, [])

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev
      localStorage.setItem("admin-theme", next ? "dark" : "light")
      return next
    })
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem("admin-sidebar-open", String(next))
      return next
    })
  }

  return (
    <div
      className={`h-screen overflow-hidden bg-background ${isDarkMode ? "admin-dark" : ""}`}
      style={{ "--admin-sidebar-width": `${sidebarWidth}px` }}
    >
      {/* Desktop Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} />

      <AdminTopHeader
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Main Content */}
      <main
        ref={mainScrollRef}
        className="h-full overflow-y-auto scrollbar-hide transition-[margin-left] duration-[220ms] ease-in-out will-change-[margin-left] md:ml-[var(--admin-sidebar-width)]"
      >
        <div className="pt-16 pb-24 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <AdminMobileBottomNav scrollContainerRef={mainScrollRef} />
      </div>
    </div>
  )
}

