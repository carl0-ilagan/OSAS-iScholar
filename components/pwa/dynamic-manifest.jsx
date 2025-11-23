"use client"

import { useEffect } from "react"
import { useBranding } from "@/contexts/BrandingContext"

export default function DynamicManifest() {
  const { branding, loading } = useBranding()

  useEffect(() => {
    if (loading) return

    const appName = branding?.name || "iScholar"
    const favicon = branding?.favicon || null
    const logo = branding?.logo || null

    // Update meta tags
    const updateMetaTag = (name, content) => {
      let meta = document.querySelector(`meta[name="${name}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = name
        document.head.appendChild(meta)
      }
      meta.content = content
    }

    // Update apple meta tags
    updateMetaTag('apple-mobile-web-app-title', appName)
    
    // Update apple touch icon (use logo or favicon if available)
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]')
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    
    // Use logo or favicon if available, otherwise keep default
    if (logo && !logo.startsWith("data:")) {
      appleIcon.href = logo
    } else if (favicon && !favicon.startsWith("data:")) {
      appleIcon.href = favicon
    } else {
      appleIcon.href = "/apple-icon.png"
    }

    // Update theme color
    updateMetaTag('theme-color', '#005c2b')

    // Force manifest reload by updating the link with a cache-busting parameter
    let manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      const url = new URL(manifestLink.href, window.location.origin)
      url.searchParams.set('v', Date.now().toString())
      manifestLink.href = url.pathname + url.search
    }
  }, [branding, loading])

  return null
}

