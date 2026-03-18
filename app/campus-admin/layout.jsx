"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { canAccessRoute, isCampusAdmin } from "@/lib/role-check"

export default function CampusAdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (pathname === "/campus-admin/login") {
      return
    }

    if (loading) return

    if (!user) {
      router.replace("/campus-admin/login")
      return
    }

    if (!canAccessRoute(user, "/campus-admin")) {
      router.replace("/unauthorized")
    }
  }, [user, loading, router, pathname])

  if (loading && pathname !== "/campus-admin/login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (pathname !== "/campus-admin/login" && (!user || !isCampusAdmin(user))) {
    return null
  }

  return <>{children}</>
}
