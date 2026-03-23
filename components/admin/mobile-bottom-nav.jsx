"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Megaphone } from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: FileText, label: "Applications", href: "/admin/applications" },
  { icon: Megaphone, label: "Announce", href: "/admin/announcements" },
]

export default function AdminMobileBottomNav({ scrollContainerRef = null }) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const scrollFrameRef = useRef(null)

  useEffect(() => {
    const getScrollTop = () => {
      if (scrollContainerRef?.current) return scrollContainerRef.current.scrollTop || 0
      return window.scrollY || 0
    }

    const handleScroll = () => {
      const currentScrollY = getScrollTop()
      const lastScrollY = lastScrollYRef.current

      if (currentScrollY < 40) {
        setIsVisible(true)
        lastScrollYRef.current = currentScrollY
        return
      }

      const delta = Math.abs(currentScrollY - lastScrollY)
      if (delta < 10) return

      setIsVisible(currentScrollY < lastScrollY)
      lastScrollYRef.current = currentScrollY
    }

    const onScroll = () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
      scrollFrameRef.current = window.requestAnimationFrame(handleScroll)
    }

    const scrollElement = scrollContainerRef?.current || window
    scrollElement.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      scrollElement.removeEventListener("scroll", onScroll)
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [scrollContainerRef])

  return (
    <nav 
      className={`md:hidden fixed bottom-3 left-3 right-3 z-50 rounded-2xl border border-white/20 bg-emerald-950/75 shadow-xl shadow-emerald-950/25 backdrop-blur-xl transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-28 opacity-0 pointer-events-none"
      }`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
    >
      <div className="mx-2 my-1.5 flex items-center justify-around rounded-xl bg-white/10 px-1.5 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5
                transition-all duration-200 min-w-0 flex-1 max-w-[24%]
                ${isActive
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-emerald-100/80 hover:text-white"
                }
              `}
            >
              <div className={`
                p-1 rounded-lg transition-all duration-200 flex-shrink-0
                ${isActive 
                  ? "bg-emerald-100" 
                  : "hover:bg-white/15"
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

