"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  History,
  MessageSquare,
  LogOut,
  ClipboardCheck,
  Video,
  UserRound,
  Menu,
  X,
  User,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import LogoutModal from "./logout-modal"
import { cn } from "@/lib/utils"

/** Main bar — high-traffic destinations */
const primaryNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/student" },
  { icon: FileText, label: "Apply Scholarship", href: "/student/apply" },
  { icon: Video, label: "Consultation", href: "/student/consultations" },
  { icon: ClipboardCheck, label: "Requirements", href: "/student/requirements" },
]

/** User menu — records, forms, feedback */
const userMenuLinks = [
  { icon: History, label: "Application History", href: "/student/applications" },
  { icon: MessageSquare, label: "Testimonials", href: "/student/feedback" },
]

function isActivePath(pathname, href) {
  if (href === "/student") return pathname === "/student" || pathname === "/student/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function StudentHeader() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [userPhotoURL, setUserPhotoURL] = useState(null)
  const [userDisplayName, setUserDisplayName] = useState(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) {
        setUserPhotoURL(null)
        setUserDisplayName(null)
        return
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserPhotoURL(data.photoURL || user.photoURL || null)
          setUserDisplayName(data.fullName || data.displayName || null)
        } else {
          setUserPhotoURL(user.photoURL || null)
          setUserDisplayName(user.displayName || null)
        }
      } catch {
        setUserPhotoURL(user.photoURL || null)
        setUserDisplayName(user.displayName || null)
      }
    }
    fetchUserData()
  }, [user])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("touchstart", onDown)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("touchstart", onDown)
    }
  }, [])

  const nameInitial =
    userDisplayName?.[0] || user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"
  const profileLabel = userDisplayName || user?.displayName || user?.email || "Student"

  const anyUserLinkActive = userMenuLinks.some((item) => isActivePath(pathname, item.href))

  const navLinkClass = (active) =>
    cn(
      "group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-1 py-1.5 text-sm font-medium transition-colors md:gap-2",
      active ? "text-white" : "text-emerald-100/90 hover:text-white"
    )

  return (
    <>
      {/*
        Fixed bar — walang scroll listener: hindi nagbabago ang height/padding pag nag-scroll.
        Emerald bar (hindi plain white) — aligned sa landing glass / portal look.
      */}
      <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-emerald-800/50 bg-emerald-950 shadow-[0_4px_24px_-4px_rgba(6,78,59,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-emerald-950/95">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link
              href="/student"
              className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3"
              onClick={() => setMobileOpen(false)}
            >
              {brandLogo ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white shadow-md sm:h-12 sm:w-12">
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white text-base font-bold text-emerald-800 shadow-md sm:h-12 sm:w-12">
                  M
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight text-white sm:text-lg">{brandName}</p>
                <p className="truncate text-[11px] text-emerald-200/90 sm:text-xs">Student Portal</p>
              </div>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex">
              <div className="flex max-w-full items-center gap-5 lg:gap-8">
                {primaryNavItems.map(({ icon: Icon, label, href }) => {
                  const active = isActivePath(pathname, href)
                  return (
                    <Link key={href} href={href} className={navLinkClass(active)} title={label}>
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-white" : "text-emerald-200/90 group-hover:text-white"
                        )}
                      />
                      <span className="max-w-[4.5rem] truncate sm:max-w-[9rem] lg:max-w-none">{label}</span>
                      <span
                        className={cn(
                          "absolute bottom-0 left-0 h-0.5 rounded-full bg-emerald-300 transition-all duration-300",
                          active ? "w-full" : "w-0 group-hover:w-full"
                        )}
                      />
                    </Link>
                  )
                })}
              </div>
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/15 md:hidden"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((p) => !p)}
                  className={cn(
                    "flex items-center transition",
                    "h-10 w-10 justify-center rounded-full border border-white/25 bg-transparent p-0 hover:bg-white/10 md:h-auto md:w-auto md:justify-start md:gap-1.5 md:rounded-xl md:border md:py-1 md:pl-1 md:pr-2 md:sm:gap-2 md:sm:pl-1.5 md:sm:pr-3",
                    profileOpen || anyUserLinkActive
                      ? "md:border-white/40 md:bg-white/20"
                      : "md:border-white/20 md:bg-white/10 md:hover:bg-white/15"
                  )}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <div className="relative h-9 w-9 overflow-hidden rounded-full bg-emerald-800 ring-2 ring-white/25">
                    {userPhotoURL ? (
                      <img
                        src={userPhotoURL}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none"
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex h-full w-full items-center justify-center text-xs font-bold text-white ${
                        userPhotoURL ? "hidden" : "flex"
                      }`}
                    >
                      {nameInitial}
                    </div>
                  </div>
                  <span className="hidden max-w-[100px] truncate text-sm font-medium text-white sm:max-w-[140px] md:inline">
                    {profileLabel}
                  </span>
                </button>

                {profileOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(calc(100vw-2rem),18rem)] overflow-hidden rounded-2xl border border-emerald-200/80 bg-white py-1 text-foreground shadow-2xl dark:border-emerald-800 dark:bg-zinc-950"
                    role="menu"
                  >
                    <div className="border-b border-emerald-100 px-3 py-2.5 dark:border-emerald-900">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{profileLabel}</p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-400/90">Student</p>
                    </div>

                    <div className="my-1 border-t border-emerald-100 dark:border-emerald-900" />

                    <Link
                      href="/student/profile"
                      role="menuitem"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-800 hover:bg-emerald-50/80 dark:text-zinc-200 dark:hover:bg-emerald-950/50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      Profile
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => {
                        setProfileOpen(false)
                        setLogoutOpen(true)
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={`overflow-hidden border-t border-white/15 px-2 md:hidden transition-all duration-300 ease-out ${
              mobileOpen ? "max-h-[520px] pb-4 pt-3 opacity-100" : "max-h-0 pb-0 pt-0 opacity-0"
            }`}
          >
            <div
              className={`transition-all duration-300 ease-out ${
                mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
              }`}
            >
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/90">Menu</p>
              <div className="flex max-h-[min(65vh,380px)] flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/10 bg-black/15 px-1 py-1">
                {primaryNavItems.map(({ icon: Icon, label, href }) => {
                  const active = isActivePath(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                        active ? "bg-white/15 text-white" : "text-emerald-50 hover:bg-white/10"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="h-5 w-5 shrink-0 opacity-95" />
                      {label}
                    </Link>
                  )
                })}
                <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/90">
                  Forms & records
                </p>
                {userMenuLinks.map(({ icon: Icon, label, href }) => {
                  const active = isActivePath(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                        active ? "bg-white/15 text-white" : "text-emerald-50 hover:bg-white/10"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="h-5 w-5 shrink-0 opacity-95" />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <LogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => {}} />
    </>
  )
}
