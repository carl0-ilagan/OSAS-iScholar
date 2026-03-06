"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

export default function AdminPageBanner({ icon: Icon, title, description, sidebarWidth: propSidebarWidth, className = "" }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sidebarWidth, setSidebarWidth] = useState(propSidebarWidth || 256)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Use prop sidebarWidth if provided, otherwise detect it
  useEffect(() => {
    if (propSidebarWidth !== undefined) {
      setSidebarWidth(propSidebarWidth)
      return
    }
    
    // Fallback: detect sidebar width if not provided as prop
    const detectSidebarWidth = () => {
      if (typeof window === 'undefined' || window.innerWidth < 768) return
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth)
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
  }, [propSidebarWidth])

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
      className={`fixed top-20 md:top-4 z-40 transition-all duration-300 ${className}`}
      style={{ 
        boxSizing: 'border-box',
        left: typeof window !== 'undefined' && window.innerWidth >= 768 
          ? `${sidebarWidth + 12}px` 
          : '16px',
        right: typeof window !== 'undefined' && window.innerWidth >= 768 ? '12px' : '16px'
      }}
    >
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 md:p-5 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 md:w-6 md:h-6" />}
            <div>
              <h2 className="text-base md:text-lg font-semibold">{title}</h2>
              <p className="text-xs text-white/80">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4" />
            <div className="text-right">
              <div className="font-semibold text-sm">{formatTime(currentTime)}</div>
              <div className="text-xs text-white/70 hidden sm:block">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

