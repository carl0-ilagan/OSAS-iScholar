"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileCheck, FileText, History, MessageSquare, LogOut, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import LogoutModal from "./logout-modal"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/student" },
  { icon: FileText, label: "Apply Scholarship", href: "/student/apply" },
  { icon: History, label: "Application History", href: "/student/applications" },
  { icon: ClipboardCheck, label: "Requirements", href: "/student/requirements" },
  { icon: MessageSquare, label: "Testimonials", href: "/student/feedback" },
]

export default function StudentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { branding } = useBranding()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [userPhotoURL, setUserPhotoURL] = useState(null)
  const [userDisplayName, setUserDisplayName] = useState(null)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Fetch user data from Firestore to get updated photoURL
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
          // Use Firestore photoURL if available, otherwise use Firebase Auth photoURL
          setUserPhotoURL(data.photoURL || user.photoURL || null)
          setUserDisplayName(data.fullName || data.displayName || null)
        } else {
          // Fallback to Firebase Auth data
          setUserPhotoURL(user.photoURL || null)
          setUserDisplayName(user.displayName || null)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        // Fallback to Firebase Auth data
        setUserPhotoURL(user.photoURL || null)
        setUserDisplayName(user.displayName || null)
      }
    }

    fetchUserData()
  }, [user])

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      {/* Sidebar - Desktop Only */}
      <aside
        className={`
          hidden md:flex md:relative h-screen bg-gradient-to-b from-primary via-primary to-secondary text-white border-r border-primary/20 flex flex-col z-40 shadow-2xl
          transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
      {/* Logo */}
        <div className="relative p-4 md:p-5 border-b border-white/10 bg-gradient-to-r from-primary/90 to-primary">
          <Link 
            href="/student" 
            className={`flex items-center gap-3 group transition-all duration-300 ${isCollapsed && !isMobile ? "justify-center w-full" : ""}`}
            onClick={() => setIsMobileOpen(false)}
          >
            {branding?.logo ? (
              <img 
                key={branding.logo} 
                src={branding.logo} 
                alt={branding.name || "Logo"} 
                className="w-11 h-11 object-contain rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg shadow-md bg-white/10 p-1"
                onError={(e) => {
                  console.error("Error loading logo:", branding.logo)
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-11 h-11 bg-gradient-to-br from-accent to-accent/90 rounded-xl flex items-center justify-center font-bold text-primary text-lg flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg shadow-md">
                iS
              </div>
            )}
            <span className={`font-bold text-xl whitespace-nowrap tracking-tight transition-all duration-300 ${isCollapsed && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
              {branding?.name || "iScholar"}
            </span>
        </Link>
          
          {/* Desktop Toggle Button - Half Outside/Half Inside with Green Outside */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-white transition-all duration-200 hover:scale-110 absolute -right-4 top-1/2 -translate-y-1/2 z-50 shadow-lg overflow-hidden group"
            aria-label="Toggle sidebar"
          >
            {/* Green outside half (left), white/transparent inside half (right) */}
            <div className="absolute inset-0">
              <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-primary"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-white/10"></div>
            </div>
            <div className="relative z-10">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </div>
          </button>
      </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex flex-col flex-1 p-3 md:p-4 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = mounted && pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl
                  transition-all duration-200 ease-in-out
                  group relative overflow-hidden
                  ${isCollapsed ? "justify-center" : ""}
                  ${isActive
                    ? "bg-accent text-primary shadow-lg shadow-accent/30 scale-[1.02]"
                    : "text-white/90 hover:text-white hover:bg-white/10 hover:shadow-md hover:scale-[1.01]"
                  }
                `}
                title={isCollapsed ? item.label : ""}
            >
                {/* Active indicator bar - Yellow/Gold only for active */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full" />
                )}
                
                {/* Hover effect background - No yellow/gold on hover */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                
                <Icon 
                  className={`
                    w-5 h-5 flex-shrink-0 transition-all duration-200
                    ${isActive ? "scale-110" : "group-hover:scale-110"}
                  `} 
                />
                <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                  {item.label}
                </span>
            </Link>
          )
        })}
      </nav>

        {/* Mobile navigation removed - now in profile dropdown */}

        {/* User Profile Section */}
        <div className="p-4 md:p-5 border-t border-white/10 bg-primary/50 backdrop-blur-sm">
          {/* Desktop: Profile Link */}
          <div className="hidden md:block">
            <Link
              href="/student/profile"
              className={`flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/10 transition-all duration-300 hover:bg-white/20 cursor-pointer ${isCollapsed ? "justify-center" : ""}`}
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent/90 overflow-hidden ring-2 ring-accent/30 shadow-md relative">
                {userPhotoURL && userPhotoURL.trim() !== '' ? (
                  <img 
                    src={userPhotoURL} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide image and show fallback if it fails to load
                      e.target.style.display = 'none'
                      const fallback = e.target.nextElementSibling
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full flex items-center justify-center font-bold text-primary text-base bg-gradient-to-br from-accent to-accent/90 ${userPhotoURL && userPhotoURL.trim() !== '' ? 'hidden' : ''}`}
                >
                  {userDisplayName?.[0] || user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              <div className={`flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                <p className="text-sm font-semibold text-white truncate">
                  {user?.email || "user@example.com"}
                </p>
                <p className="text-xs text-white/70 font-medium">Student</p>
              </div>
            </Link>
          </div>


      {/* Logout */}
          <button 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 ease-in-out group relative overflow-hidden hover:shadow-md hover:scale-[1.01] ${isCollapsed ? "justify-center" : ""}`}
            onClick={() => {
              setIsLogoutModalOpen(true)
            }}
            title={isCollapsed ? "Logout" : ""}
          >
            {/* Hover effect background */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
              Logout
            </span>
        </button>
      </div>
    </aside>

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
