"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  MessageSquare,
  Users,
  Award,
  Palette,
  BookOpen,
  FolderCheck,
  FileBarChart,
  ScrollText,
} from "lucide-react"
import { useBranding } from "@/contexts/BrandingContext"

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
      { icon: FileText, label: "Applications", href: "/admin/applications" },
      { icon: Users, label: "User Management", href: "/admin/users" },
      { icon: FileBarChart, label: "Reports", href: "/admin/reports" },
      { icon: ScrollText, label: "Audit trails", href: "/admin/audit-trails" },
    ],
  },
  {
    label: "Content",
    items: [
      { icon: FolderCheck, label: "Requirements", href: "/admin/requirements" },
      { icon: BookOpen, label: "Scholarships", href: "/admin/scholarships" },
      { icon: Award, label: "Scholars", href: "/admin/scholars" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { icon: Megaphone, label: "Announcements", href: "/admin/announcements" },
      { icon: MessageSquare, label: "Testimonials", href: "/admin/testimonials" },
      { icon: Palette, label: "Branding", href: "/admin/branding" },
    ],
  },
]

export default function AdminSidebar({ isOpen = true }) {
  const pathname = usePathname()
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden h-screen border-r border-white/15 text-emerald-50 shadow-xl shadow-emerald-950/25 transition-[width] duration-[220ms] ease-in-out will-change-[width] md:flex md:flex-col"
      style={{
        width: "var(--admin-sidebar-width)",
        minWidth: "var(--admin-sidebar-width)",
        maxWidth: "var(--admin-sidebar-width)",
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
          href="/admin"
          className={`flex items-center rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 backdrop-blur-sm ${
            isOpen ? "gap-2.5" : "justify-center"
          }`}
        >
          {brandLogo ? (
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white">
              <img src={brandLogo} alt={brandName} className="h-full w-full scale-[1.7] object-contain" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-sm font-bold text-emerald-950">M</div>
          )}
          <div
            className={`min-w-0 overflow-hidden transition-all duration-150 ease-out ${
              isOpen ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            <p className="truncate text-sm font-semibold text-emerald-50">{brandName} Admin</p>
            <p className="truncate text-xs text-emerald-100/70">Management Console</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div
            key={group.label}
            className={`space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-2 shadow-sm backdrop-blur-sm ${
              isOpen ? "" : "px-1.5"
            }`}
          >
            <p
              className={`overflow-hidden text-[11px] font-semibold uppercase tracking-wide text-emerald-100/70 transition-all duration-150 ease-out ${
                isOpen ? "max-h-6 px-2 opacity-100" : "max-h-0 px-0 opacity-0"
              }`}
            >
              {group.label}
            </p>
            {!isOpen ? <div className="mx-auto h-px w-8 bg-white/20" /> : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`group flex items-center rounded-xl text-sm transition-[padding,gap,background-color,color] duration-150 ease-out ${
                      isOpen ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"
                    } ${
                      isActive
                        ? "bg-emerald-300 text-emerald-950 shadow-md shadow-emerald-950/20"
                        : "text-emerald-50/90 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "" : "opacity-80 group-hover:opacity-100 transition-opacity"}`} />
                    <span
                      className={`truncate font-medium transition-all duration-150 ease-out ${
                        isOpen ? "max-w-[140px] translate-x-0 opacity-100" : "max-w-0 -translate-x-1 opacity-0"
                      }`}
                    >
                      {item.label}
                    </span>
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
