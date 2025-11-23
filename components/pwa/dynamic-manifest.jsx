"use client"

import { useEffect } from "react"
import { useBranding } from "@/contexts/BrandingContext"

export default function DynamicManifest() {
  const { branding, loading } = useBranding()

  useEffect(() => {
    if (loading) return

    // Update manifest dynamically
    const updateManifest = () => {
      const appName = branding?.name || "iScholar"
      const tabTitle = branding?.tabTitle || "iScholar Portal"
      const favicon = branding?.favicon || "/download.ico"
      const logo = branding?.logo || "/icon-light-32x32.png"

      // Create manifest object
      const manifest = {
        name: `${tabTitle}`,
        short_name: appName,
        description: "Scholarship Management System for MinSU Students",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#005c2b",
        orientation: "portrait-primary",
        icons: [
          {
            src: favicon.startsWith("data:") ? favicon : logo.startsWith("data:") ? logo : "/icon-light-32x32.png",
            sizes: "192x192",
            type: favicon.startsWith("data:") ? "image/png" : "image/png",
            purpose: "any maskable"
          },
          {
            src: favicon.startsWith("data:") ? favicon : logo.startsWith("data:") ? logo : "/icon-light-32x32.png",
            sizes: "512x512",
            type: favicon.startsWith("data:") ? "image/png" : "image/png",
            purpose: "any maskable"
          },
          {
            src: "/apple-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          }
        ],
        categories: ["education", "productivity"],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View your dashboard",
            url: "/student",
            icons: [{ src: favicon.startsWith("data:") ? favicon : logo.startsWith("data:") ? logo : "/icon-light-32x32.png", sizes: "96x96" }]
          },
          {
            name: "Apply Scholarship",
            short_name: "Apply",
            description: "Apply for scholarships",
            url: "/student/apply",
            icons: [{ src: favicon.startsWith("data:") ? favicon : logo.startsWith("data:") ? logo : "/icon-light-32x32.png", sizes: "96x96" }]
          }
        ]
      }

      // Create or update manifest link
      let manifestLink = document.querySelector('link[rel="manifest"]')
      if (!manifestLink) {
        manifestLink = document.createElement('link')
        manifestLink.rel = 'manifest'
        document.head.appendChild(manifestLink)
      }

      // Create blob URL for dynamic manifest
      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
      const manifestUrl = URL.createObjectURL(manifestBlob)
      manifestLink.href = manifestUrl

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
      
      // Update apple touch icon
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]')
      if (!appleIcon) {
        appleIcon = document.createElement('link')
        appleIcon.rel = 'apple-touch-icon'
        document.head.appendChild(appleIcon)
      }
      appleIcon.href = favicon.startsWith("data:") ? favicon : logo.startsWith("data:") ? logo : "/apple-icon.png"

      // Update theme color
      updateMetaTag('theme-color', '#005c2b')
    }

    updateManifest()
  }, [branding, loading])

  return null
}

