"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Megaphone, MessageSquare, Users, Award, LogOut, Palette, BookOpen, FolderCheck, FilePenLine } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import AdminLogoutModal from "./logout-modal"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: FileText, label: "Applications", href: "/admin/applications" },
  { icon: FilePenLine, label: "PDF Form Builder", href: "/admin/pdf-forms" },
  { icon: FolderCheck, label: "Document Requirements", href: "/admin/requirements" },
  { icon: Megaphone, label: "Announcements", href: "/admin/announcements" },
  { icon: MessageSquare, label: "Testimonials", href: "/admin/testimonials" },
  { icon: BookOpen, label: "Scholarships", href: "/admin/scholarships" },
  { icon: Award, label: "Scholars", href: "/admin/scholars" },
  { icon: Users, label: "User Management", href: "/admin/users" },
  { icon: Palette, label: "Branding Settings", href: "/admin/branding" },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { branding } = useBranding()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 min-w-56 max-w-56 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      {/* Logo */}
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          {branding?.logo ? (
            <img 
              key={branding.logo} 
              src={branding.logo} 
              alt={branding.name || "Logo"} 
              className="h-8 w-8 object-contain"
              onError={(e) => {
                console.error("Error loading logo:", branding.logo)
                e.target.style.display = 'none'
              }}
            />
          ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-bold">iA</div>
          )}
          <span className="truncate text-sm font-semibold">{branding?.name || "iScholar"} Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <button 
          onClick={() => setIsLogoutModalOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* Logout Modal */}
      <AdminLogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          // Handled inside AdminLogoutModal
        }}
      />
    </aside>
  )
}
