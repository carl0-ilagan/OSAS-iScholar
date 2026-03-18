"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, MapPin, Moon, Sun, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { normalizeCampus } from "@/lib/campus-admin-config"
import { Switch } from "@/components/ui/switch"

export default function CampusAdminTopHeader({
  isDarkMode = false,
  onToggleTheme = () => {},
}) {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { branding } = useBranding()
  const [isVisible, setIsVisible] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const lastScrollYRef = useRef(0)
  const dropdownRef = useRef(null)
  const frameRef = useRef(null)
  const campus = normalizeCampus(user?.campus || "Campus")

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const lastScrollY = lastScrollYRef.current

      if (currentScrollY < 24) {
        setIsVisible(true)
        lastScrollYRef.current = currentScrollY
        return
      }

      const delta = Math.abs(currentScrollY - lastScrollY)
      if (delta < 8) return
      setIsVisible(currentScrollY < lastScrollY)
      lastScrollYRef.current = currentScrollY
    }

    const onScroll = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = window.requestAnimationFrame(handleScroll)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

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

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      router.push("/campus-admin/login")
    }
  }

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/campus-admin" className="flex items-center gap-2.5">
          {branding?.logo ? (
            <img
              src={branding.logo}
              alt={branding?.name || "Logo"}
              className="h-8 w-8 rounded-lg bg-muted/40 p-1 object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              CA
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Campus Admin Control Panel</p>
            <p className="truncate text-xs text-muted-foreground">
              {(branding?.name || "iScholar")} - {campus || "assigned campus"}
            </p>
          </div>
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 hover:bg-muted"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-primary/10">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                  {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "C"}
                </div>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
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
            <button
              onClick={() => setIsProfileOpen(false)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>
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
    </header>
  )
}
