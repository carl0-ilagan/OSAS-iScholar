"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Award, BookOpen, FolderCheck, LogOut, Menu, MessageSquare, Moon, Palette, Settings, Sun, User, Users, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import AdminLogoutModal from "./logout-modal"
import { Switch } from "@/components/ui/switch"

const profileQuickLinks = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/requirements", label: "Requirements", icon: FolderCheck },
  { href: "/admin/scholarships", label: "Scholarships", icon: BookOpen },
  { href: "/admin/scholars", label: "Scholars", icon: Award },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquare },
  { href: "/admin/branding", label: "Branding", icon: Palette },
]

export default function AdminTopHeader({
  isDarkMode = false,
  onToggleTheme = () => {},
  isSidebarOpen = true,
  onToggleSidebar = () => {},
}) {
  const { user } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [profileImageError, setProfileImageError] = useState(false)
  const dropdownRef = useRef(null)
  const validProfilePhoto = Boolean(user?.photoURL && /^https?:\/\//i.test(user.photoURL) && !profileImageError)

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

  useEffect(() => {
    setProfileImageError(false)
  }, [user?.photoURL])

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50 border-b border-border/70 bg-background/95 text-foreground shadow-sm backdrop-blur-xl transition-[left] duration-[220ms] ease-in-out will-change-[left] md:left-[var(--admin-sidebar-width)]"
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="flex items-center gap-2.5 md:hidden">
              {brandLogo ? (
                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-sm">
                  <img src={brandLogo} alt={brandName} className="h-full w-full scale-[1.9] object-contain" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300 text-base font-bold text-emerald-950">M</div>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-foreground">{brandName}</p>
                <p className="truncate text-xs text-muted-foreground">Admin</p>
              </div>
            </Link>
            <button
              onClick={onToggleSidebar}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted md:inline-flex"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="hidden rounded-xl border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 md:block">
              <p className="text-xs font-semibold text-emerald-800">Admin Panel</p>
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 hover:bg-muted"
            >
              <div className="h-8 w-8 overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                {validProfilePhoto ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            </button>

            <div
              className={`absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl transition-all ${
                isProfileOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
              }`}
            >
              <div className="border-b border-border px-2.5 py-2">
                <p className="truncate text-sm font-semibold text-foreground">{user?.displayName || user?.email || "Admin"}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
              <div className="my-1 border-t border-border pt-1.5 md:hidden">
                <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">More Navigation</p>
                <div className="grid grid-cols-2 gap-1">
                  {profileQuickLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-foreground hover:bg-muted"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mx-1 my-1 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
              <button
                onClick={() => {
                  setIsProfileOpen(false)
                  setIsLogoutModalOpen(true)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <AdminLogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={() => {}} />
    </>
  )
}
