"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { campusAdminNavItems } from "./nav-items"

export default function CampusAdminMobileBottomNav() {
  const pathname = usePathname()
  const CORE_MOBILE_ROUTES = new Set([
    "/campus-admin",
    "/campus-admin/users",
    "/campus-admin/applications",
    "/campus-admin/scholars",
  ])
  const mobileNavItems = campusAdminNavItems.filter((item) => CORE_MOBILE_ROUTES.has(item.href))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-800/50 bg-emerald-950/95 shadow-[0_-8px_24px_-8px_rgba(6,78,59,0.45)] backdrop-blur md:hidden">
      <div className="mx-2 my-1.5 flex items-center justify-around rounded-2xl border border-white/10 bg-white/5 px-1.5 py-1.5">
        {mobileNavItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition ${
                isActive
                  ? "bg-white/20 text-white shadow-sm ring-1 ring-white/20"
                  : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] leading-tight truncate w-full text-center">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
