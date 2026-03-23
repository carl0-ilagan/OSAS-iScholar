"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, MapPin, Menu, Moon, Sun, User, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { normalizeCampus } from "@/lib/campus-admin-config"
import { Switch } from "@/components/ui/switch"
import { campusAdminNavItems } from "./nav-items"

export default function CampusAdminTopHeader({
  isDarkMode = false,
  onToggleTheme = () => {},
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [profileImageError, setProfileImageError] = useState(false)
  const campus = normalizeCampus(user?.campus || "Campus")
  const CORE_MOBILE_ROUTES = new Set([
    "/campus-admin",
    "/campus-admin/users",
    "/campus-admin/applications",
    "/campus-admin/scholars",
  ])
  const mobileMenuItems = campusAdminNavItems.filter((item) => !CORE_MOBILE_ROUTES.has(item.href))
  const validProfilePhoto = Boolean(
    user?.photoURL && (/^https?:\/\//i.test(user.photoURL) || /^data:image\//i.test(user.photoURL)) && !profileImageError,
  )

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

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      router.push("/campus-admin/login")
    }
  }

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 border-b border-emerald-800/50 bg-emerald-950 text-white shadow-[0_4px_24px_-4px_rgba(6,78,59,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-emerald-950/95 md:border-border/70 md:bg-background/95 md:text-foreground md:shadow-sm"
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:pl-[var(--campus-admin-sidebar-width)]">
          <Link href="/campus-admin" className="flex items-center gap-2.5 md:hidden">
            {brandLogo ? (
              <div className="h-11 w-11 overflow-hidden rounded-full border border-white/25 bg-white shadow-md">
                <img src={brandLogo} alt={brandName || "Logo"} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white text-base font-bold text-emerald-900">C</div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight text-white">{brandName}</p>
              <p className="truncate text-xs text-emerald-200/90">Campus Admin</p>
            </div>
          </Link>
          <div className="hidden rounded-xl border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 md:block">
            <p className="text-xs font-semibold text-emerald-800">Campus Admin Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsProfileOpen(false)
              setIsMobileMenuOpen((prev) => !prev)
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/15 md:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/15 md:border-border md:bg-card md:text-foreground md:hover:bg-muted"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full border border-white/25 bg-emerald-800 text-white md:border-emerald-200 md:bg-emerald-50 md:text-emerald-700">
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
            className={`absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-card p-2 shadow-xl transition-all ${
              isProfileOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
            }`}
          >
            <div className="border-b border-border px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-foreground">{user?.displayName || user?.email || "Campus Admin"}</p>
              <p className="text-xs text-muted-foreground">Campus Administrator</p>
            </div>
            <div className="mx-1 my-1 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{campus || "Campus not set"}</span>
              </div>
            </div>
            <div className="border-t border-border/70 px-2.5 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quick Menu</p>
            </div>
            <Link
              href="/campus-admin/profile"
              onClick={() => setIsProfileOpen(false)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
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
                  aria-label="Toggle campus admin dark mode"
                />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      <div
        className={`overflow-hidden border-t border-white/15 px-2 md:hidden transition-all duration-300 ease-out ${
          isMobileMenuOpen ? "max-h-[520px] pb-4 pt-3 opacity-100" : "max-h-0 pb-0 pt-0 opacity-0"
        }`}
      >
        {isMobileMenuOpen ? (
          <>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/90">Menu</p>
          <div
            className={`flex max-h-[min(65vh,380px)] flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/10 bg-black/15 px-1 py-1 transition-all duration-300 ease-out ${
              isMobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
            {mobileMenuItems.map(({ icon: Icon, label, href }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    active ? "bg-white/15 text-white" : "text-emerald-50 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 opacity-95" />
                  {label}
                </Link>
              )
            })}
          </div>
          </>
        ) : null}
      </div>
    </header>
  )
}
