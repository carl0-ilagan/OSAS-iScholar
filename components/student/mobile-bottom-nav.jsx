"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileCheck, FileText, History, MessageSquare, ClipboardCheck } from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/student" },
  { icon: FileText, label: "Apply", href: "/student/apply" },
  { icon: History, label: "History", href: "/student/applications" },
  { icon: ClipboardCheck, label: "Requirements", href: "/student/requirements" },
  { icon: MessageSquare, label: "Testimonials", href: "/student/feedback" },
]

export default function MobileBottomNav() {
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
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl
                transition-all duration-200
                ${isActive
                  ? "text-primary scale-110"
                  : "text-muted-foreground hover:text-primary"
                }
              `}
            >
              <div className={`
                p-2 rounded-lg transition-all duration-200
                ${isActive 
                  ? "bg-primary/10" 
                  : "hover:bg-muted"
                }
              `}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium transition-all ${isActive ? "opacity-100" : "opacity-70"}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

