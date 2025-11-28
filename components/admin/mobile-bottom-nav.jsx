"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Megaphone, Award } from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: FileText, label: "Applications", href: "/admin/applications" },
  { icon: Megaphone, label: "Announce", href: "/admin/announcements" },
]

export default function AdminMobileBottomNav() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const scrollFrame = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const lastScrollY = lastScrollYRef.current

      if (currentScrollY < 40) {
        setIsVisible(true)
        lastScrollYRef.current = currentScrollY
        return
      }

      const delta = Math.abs(currentScrollY - lastScrollY)
      if (delta < 8) return

      setIsVisible(currentScrollY < lastScrollY)
      lastScrollYRef.current = currentScrollY
    }

    const onScroll = () => {
      if (scrollFrame.current) {
        cancelAnimationFrame(scrollFrame.current)
      }
      scrollFrame.current = window.requestAnimationFrame(handleScroll)
    }

    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (scrollFrame.current) {
        cancelAnimationFrame(scrollFrame.current)
      }
    }
  }, [])

  return (
    <nav 
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-2xl transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-0.5 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg
                transition-all duration-200 min-w-0 flex-1 max-w-[20%]
                ${isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
                }
              `}
            >
              <div className={`
                p-1 rounded-lg transition-all duration-200 flex-shrink-0
                ${isActive 
                  ? "bg-primary/10" 
                  : "hover:bg-muted"
                }
              `}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-medium transition-all truncate w-full text-center leading-tight px-0.5 ${isActive ? "opacity-100" : "opacity-70"}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

