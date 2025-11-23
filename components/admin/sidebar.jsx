"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileCheck, FileText, Megaphone, MessageSquare, Users, Award, LogOut, Palette } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import AdminLogoutModal from "./logout-modal"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: FileCheck, label: "Verifications", href: "/admin/verifications" },
  { icon: FileText, label: "Applications", href: "/admin/applications" },
  { icon: Megaphone, label: "Announcements", href: "/admin/announcements" },
  { icon: MessageSquare, label: "Testimonials", href: "/admin/testimonials" },
  { icon: Award, label: "Scholars", href: "/admin/scholars" },
  { icon: Users, label: "User Management", href: "/admin/users" },
  { icon: Palette, label: "Branding Settings", href: "/admin/branding" },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { branding } = useBranding()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  return (
    <aside className="w-64 min-w-64 max-w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col hidden md:flex flex-shrink-0 fixed md:relative">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-2">
          {branding?.logo ? (
            <img 
              src={branding.logo} 
              alt={branding.name || "Logo"} 
              className="w-10 h-10 object-contain"
            />
          ) : (
          <div className="w-10 h-10 bg-sidebar-accent rounded-lg flex items-center justify-center font-bold">iA</div>
          )}
          <span className="font-bold text-lg">{branding?.name || "iScholar"} Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-6 border-t border-sidebar-border">
        <button 
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
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
