"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { campusAdminNavItems } from "./nav-items"

export default function CampusAdminMobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-2 my-1.5 flex items-center justify-around rounded-2xl bg-muted/60 px-1.5 py-1.5">
        {campusAdminNavItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 max-w-[16.66%] ${
                isActive ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] leading-tight truncate w-full text-center">
                {label.replace("Management", "Mgmt").replace("Consultations", "Consult")}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
