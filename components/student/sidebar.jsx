"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  History,
  MessageSquare,
  LogOut,
  ClipboardCheck,
  FilePenLine,
  Video,
  UserRound,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import LogoutModal from "./logout-modal"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/student" },
  { icon: FileText, label: "Apply Scholarship", href: "/student/apply" },
  { icon: FilePenLine, label: "PDF Forms", href: "/student/pdf-forms" },
  { icon: History, label: "Application History", href: "/student/applications" },
  { icon: Video, label: "Consultation", href: "/student/consultations" },
  { icon: ClipboardCheck, label: "Requirements", href: "/student/requirements" },
  { icon: MessageSquare, label: "Testimonials", href: "/student/feedback" },
]

const navGroups = [
  { label: "Overview", items: navItems.filter((item) => item.href === "/student") },
  { label: "Student Services", items: navItems.filter((item) => item.href !== "/student") },
]

export default function StudentSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [userPhotoURL, setUserPhotoURL] = useState(null)
  const [userDisplayName, setUserDisplayName] = useState(null)

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
      } catch (error) {
        console.error("Error fetching user data:", error)
        setUserPhotoURL(user.photoURL || null)
        setUserDisplayName(user.displayName || null)
      }
    }

    fetchUserData()
  }, [user])

  const nameInitial = userDisplayName?.[0] || user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"
  const profileLabel = userDisplayName || user?.displayName || user?.email || "Student"
  const roleLabel = "Student"
  const profileHref = "/student/profile"

  return (
    <>
      <aside
        className="hidden h-screen w-72 min-w-72 max-w-72 border-r border-sidebar-border/70 bg-sidebar/95 text-sidebar-foreground shadow-xl backdrop-blur md:flex md:flex-col"
      >
        <div className="border-b border-sidebar-border/70 px-4 py-4">
          <Link href="/student" className="group flex items-center gap-3">
            {brandLogo ? (
              <img
                key={brandLogo}
                src={brandLogo}
                alt={brandName || "Logo"}
                className="h-12 w-12 rounded-xl bg-sidebar-accent/30 p-1 object-contain shadow-sm transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  console.error("Error loading logo:", brandLogo)
                  e.target.style.display = "none"
                }}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-sm">
                iS
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">{brandName}</p>
              <p className="text-xs text-sidebar-foreground/65">Student Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1.5 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/25 p-2 shadow-sm">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">{group.label}</p>
              <div className="space-y-1">
                {group.items.map(({ icon: Icon, label, href }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "" : "opacity-80 group-hover:opacity-100"}`} />
                      <span className="truncate font-medium">{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border/70 p-3">
          <Link
            href={profileHref}
            className="mb-2 flex items-center gap-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 px-3 py-2.5 transition-colors hover:bg-sidebar-accent"
          >
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-primary/20 ring-1 ring-sidebar-primary/30">
              {userPhotoURL && userPhotoURL.trim() !== "" ? (
                <img
                  src={userPhotoURL}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none"
                    const fallback = e.target.nextElementSibling
                    if (fallback) fallback.style.display = "flex"
                  }}
                />
              ) : null}
              <div
                className={`h-full w-full items-center justify-center text-sm font-bold text-sidebar-primary ${
                  userPhotoURL && userPhotoURL.trim() !== "" ? "hidden" : "flex"
                }`}
              >
                {nameInitial}
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{profileLabel}</p>
              <p className="flex items-center gap-1 text-xs text-sidebar-foreground/65">
                <UserRound className="h-3 w-3" />
                {roleLabel}
              </p>
            </div>
          </Link>

          <button
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-all hover:bg-red-500/10 hover:text-red-600"
            onClick={() => {
              setIsLogoutModalOpen(true)
            }}
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:scale-105" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          // handled inside modal
        }}
      />
    </>
  )
}
