"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Building2, FileText, LogOut, User, Users } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"

export default function CampusAdminMobileHeader() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isMenuOpen])

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      router.push("/admin/login")
    }
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-gradient-to-r from-primary to-secondary px-4 py-3 text-white md:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName || "Logo"} className="h-6 w-6 object-contain" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <span className="text-sm font-semibold">{brandName} Campus Admin</span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-white/10"
            aria-label="Open user menu"
          >
            <User className="h-4 w-4" />
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-border/60 bg-background text-foreground shadow-xl">
              <div className="border-b border-border/60 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Management</p>
              </div>

              <div className="p-1.5">
                <Link
                  href="/campus-admin/users"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted"
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span>User Management</span>
                </Link>
                <Link
                  href="/campus-admin/applications"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Applications</span>
                </Link>
              </div>

              <div className="border-t border-border/60 p-1.5">
                <button
                  onClick={async () => {
                    setIsMenuOpen(false)
                    await handleLogout()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
