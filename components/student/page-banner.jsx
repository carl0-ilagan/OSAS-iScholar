"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

export default function StudentPageBanner({ icon: Icon, title, description, userName }) {
  const [currentTime, setCurrentTime] = useState(null)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [bannerStyle, setBannerStyle] = useState({ left: '1rem', right: '1rem' })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setCurrentTime(new Date())
  }, [])

  useEffect(() => {
    if (!isClient) return
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [isClient])

  // Detect sidebar width for desktop banner positioning
  useEffect(() => {
    if (!isClient) return

    const detectSidebarWidth = () => {
      if (typeof window === 'undefined' || window.innerWidth < 768) {
        setBannerStyle({ left: '1rem', right: '1rem' })
        return
      }
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        const width = sidebar.offsetWidth
        setSidebarWidth(width)
        setBannerStyle({ 
          left: `${width + 16}px`, 
          right: '1.5rem' 
        })
      } else {
        setBannerStyle({ left: '1rem', right: '1.5rem' })
      }
    }

    detectSidebarWidth()
    const observer = new ResizeObserver(detectSidebarWidth)
    const sidebar = document.querySelector('aside')
    if (sidebar) observer.observe(sidebar)
    window.addEventListener('resize', detectSidebarWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', detectSidebarWidth)
    }
  }, [isClient])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div 
      className="fixed top-20 md:top-4 z-40 transition-all duration-300"
      style={bannerStyle}
    >
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 md:p-5 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {Icon && <Icon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />}
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-semibold truncate">{title}</h2>
              <p className="text-xs text-white/80 truncate">{description}</p>
              {userName && (
                <p className="text-xs text-white/70 mt-0.5 truncate">Welcome, {userName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg flex-shrink-0">
            <Clock className="w-4 h-4" />
            <div className="text-right">
              {isClient && currentTime ? (
                <>
                  <div className="font-semibold text-sm">{formatTime(currentTime)}</div>
                  <div className="text-xs text-white/70 hidden sm:block">{formatDate(currentTime)}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-sm">--:--:--</div>
                  <div className="text-xs text-white/70 hidden sm:block">Loading...</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

