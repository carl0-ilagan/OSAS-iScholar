"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { campusAdminNavItems } from "./nav-items"
import { useBranding } from "@/contexts/BrandingContext"

const navGroups = [
  { label: "Overview", items: campusAdminNavItems.filter((item) => item.href === "/campus-admin") },
  { label: "Management", items: campusAdminNavItems.filter((item) => item.href !== "/campus-admin") },
]

export default function CampusAdminSidebar() {
  const pathname = usePathname()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden h-screen border-r border-white/15 text-emerald-50 shadow-xl shadow-emerald-950/25 transition-[width] duration-[300ms] ease-in-out will-change-[width] md:flex md:flex-col overflow-hidden"
      style={{
        width: "var(--campus-admin-sidebar-width)",
        minWidth: "var(--campus-admin-sidebar-width)",
        maxWidth: "var(--campus-admin-sidebar-width)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/BG.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-emerald-950/72 backdrop-blur-[2px]" />

      <div className="relative z-10 border-b border-white/10 px-3 py-3">
        <Link
          href="/campus-admin"
          className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 backdrop-blur-sm"
        >
          {brandLogo ? (
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white">
              <img src={brandLogo} alt={brandName} className="h-full w-full scale-[1.7] object-contain" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-sm font-bold text-emerald-950">
              M
            </div>
          )}
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-semibold text-emerald-50">{brandName} Campus</p>
            <p className="truncate text-xs text-emerald-100/70">Management Console</p>
          </div>
        </Link>
      </div>

      <nav className="relative z-10 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div
            key={group.label}
            className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-2 shadow-sm backdrop-blur-sm"
          >
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100/70">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(({ icon: Icon, label, href }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-[background-color,color] duration-150 ease-out ${
                      isActive
                        ? "bg-emerald-300 text-emerald-950 shadow-md shadow-emerald-950/20"
                        : "text-emerald-50/90 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "" : "opacity-80 group-hover:opacity-100 transition-opacity"}`} />
                    <span className="truncate font-medium">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
