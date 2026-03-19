"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { ChevronDown, User, LogOut, MessageSquare, Users, Palette, Award, FolderCheck, BookOpen, FilePenLine, FileText, LayoutDashboard, Moon, Sun } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import LogoutModal from "./logout-modal"
import { Switch } from "@/components/ui/switch"

const quickLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/pdf-forms", label: "PDF Builder", icon: FilePenLine },
  { href: "/admin/requirements", label: "Requirements", icon: FolderCheck },
  { href: "/admin/scholarships", label: "Scholarships", icon: BookOpen },
  { href: "/admin/scholars", label: "Scholars", icon: Award },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/branding", label: "Branding", icon: Palette },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquare },
]

export default function AdminMobileHeader({ isDarkMode = false, onToggleTheme = () => {} }) {
  const { user } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const dropdownRef = useRef(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isProfileOpen])

  const handleLogoutClick = () => {
    setIsProfileOpen(false)
    setIsLogoutModalOpen(true)
  }

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary via-primary to-secondary text-white shadow-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo and Name */}
          <div className="flex items-center gap-2.5">
            {brandLogo ? (
              <img 
                key={brandLogo} 
                src={brandLogo} 
                alt={brandName || "Logo"} 
                className="w-8 h-8 object-contain rounded-lg bg-white/10 p-1"
                onError={(e) => {
                  console.error("Error loading logo:", brandLogo)
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/90 rounded-lg flex items-center justify-center font-bold text-primary text-sm">
                iA
              </div>
            )}
            <span className="font-bold text-base">
              {brandName} Admin
            </span>
          </div>

          {/* Profile Dropdown */}
          <div className="relative z-[60]" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent/90 overflow-hidden ring-2 ring-white/30">
                {user?.photoURL && user.photoURL.trim() !== '' ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const fallback = e.target.nextElementSibling
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full flex items-center justify-center font-bold text-primary text-sm bg-gradient-to-br from-accent to-accent/90 ${user?.photoURL && user.photoURL.trim() !== '' ? 'hidden' : ''}`}
                >
                  {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
                </div>
              </div>
              <ChevronDown 
                className={`w-4 h-4 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            <div
              className={`absolute right-0 top-full mt-2 w-[19rem] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300 ${
                isProfileOpen 
                  ? "opacity-100 translate-y-0 pointer-events-auto" 
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="p-2.5">
                {/* Profile Info */}
                <div className="px-3 py-2 mb-2 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.displayName || user?.email || "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>

                {/* Profile Button */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    // Navigate to profile if needed
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                <div className="mx-1 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                    </div>
                    <Switch
                      checked={isDarkMode}
                      onCheckedChange={(checked) => {
                        if (checked !== isDarkMode) onToggleTheme()
                      }}
                      aria-label="Toggle admin dark mode"
                    />
                  </div>
                </div>

                {/* Quick Navigation */}
                <div className="border-t border-border pt-2 mt-2">
                  <p className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Quick Navigation
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 px-1">
                    {quickLinks.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate">{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Modal */}
      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          // Handled inside LogoutModal
        }}
      />
    </>
  )
}

