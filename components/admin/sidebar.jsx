"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Megaphone, MessageSquare, Users, Award, Palette, BookOpen, FolderCheck, FilePenLine } from "lucide-react"

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
      { icon: FileText, label: "Applications", href: "/admin/applications" },
      { icon: Users, label: "User Management", href: "/admin/users" },
    ],
  },
  {
    label: "Content",
    items: [
      { icon: FilePenLine, label: "PDF Form Builder", href: "/admin/pdf-forms" },
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

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 min-w-64 max-w-64 border-r border-sidebar-border/70 bg-sidebar/95 text-sidebar-foreground backdrop-blur md:flex md:flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="flex-1 space-y-3 overflow-hidden px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/25 p-2 shadow-sm">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "" : "opacity-80 group-hover:opacity-100"}`} />
                    <span className="truncate font-medium">{item.label}</span>
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
