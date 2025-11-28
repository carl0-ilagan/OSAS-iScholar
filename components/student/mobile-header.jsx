"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { ChevronDown, User, LogOut, FileText, History, ClipboardCheck, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import LogoutModal from "./logout-modal"

export default function MobileHeader() {
  const { user } = useAuth()
  const { branding } = useBranding()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [userPhotoURL, setUserPhotoURL] = useState(null)
  const [userDisplayName, setUserDisplayName] = useState(null)
  const dropdownRef = useRef(null)
  const router = useRouter()

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
          <div className="flex items-center gap-2">
            {branding?.logo ? (
              <img 
                key={branding.logo} 
                src={branding.logo} 
                alt={branding.name || "Logo"} 
                className="w-8 h-8 object-contain rounded-lg bg-white/10 p-1"
                onError={(e) => {
                  console.error("Error loading logo:", branding.logo)
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/90 rounded-lg flex items-center justify-center font-bold text-primary text-sm">
                iS
              </div>
            )}
            <span className="font-bold text-lg">
              {branding?.name || "iScholar"}
            </span>
          </div>

          {/* Profile Dropdown */}
          <div className="relative z-[60]" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent/90 overflow-hidden ring-2 ring-white/30">
                {userPhotoURL && userPhotoURL.trim() !== '' ? (
                  <img 
                    src={userPhotoURL} 
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
                  className={`w-full h-full flex items-center justify-center font-bold text-primary text-sm bg-gradient-to-br from-accent to-accent/90 ${userPhotoURL && userPhotoURL.trim() !== '' ? 'hidden' : ''}`}
                >
                  {userDisplayName?.[0] || user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              <ChevronDown 
                className={`w-4 h-4 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            <div
              className={`absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-border overflow-hidden transition-all duration-300 ${
                isProfileOpen 
                  ? "opacity-100 translate-y-0 pointer-events-auto" 
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="p-2">
                {/* Profile Info */}
                <div className="px-3 py-2 mb-2 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {userDisplayName || user?.displayName || user?.email || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">Student</p>
                </div>

                {/* Profile Link */}
                <Link
                  href="/student/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>

                {/* Mobile Navigation Items - Items NOT in bottom nav (currently all are in bottom nav, but keeping structure for future items) */}
                {/* Note: All navigation items are currently in bottom nav, so this section is empty but ready for future additions */}

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

