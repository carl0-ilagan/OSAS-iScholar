"use client"

import { useRouter } from "next/navigation"
import { LogOut, Building2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"

export default function CampusAdminMobileHeader() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { branding } = useBranding()

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
            {branding?.logo ? (
              <img src={branding.logo} alt={branding?.name || "Logo"} className="h-6 w-6 object-contain" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <span className="text-sm font-semibold">Campus Admin</span>
        </div>
        <button onClick={handleLogout} className="rounded-lg p-2 hover:bg-white/10" aria-label="Logout">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
