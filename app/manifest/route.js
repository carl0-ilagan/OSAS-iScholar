import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET() {
  try {
    // Fetch branding from Firebase
    const brandingDocRef = doc(db, "settings", "branding")
    const brandingSnap = await getDoc(brandingDocRef)
    
    const branding = brandingSnap.exists() ? brandingSnap.data() : null
    
    const appName = branding?.name || "iScholar"
    const tabTitle = branding?.tabTitle || "iScholar Portal"
    const favicon = branding?.favicon || null
    const logo = branding?.logo || null

    // Use logo or favicon for icons, fallback to default
    const iconSrc = favicon || logo || "/icon-light-32x32.png"
    
    const manifest = {
      name: tabTitle,
      short_name: appName,
      description: "Scholarship Management System for MinSU Students",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#005c2b",
      orientation: "portrait-primary",
      icons: [
        {
          src: iconSrc,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: iconSrc,
          sizes: "512x512",
          type: "image/png",
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
          icons: [{ src: iconSrc, sizes: "96x96" }]
        },
        {
          name: "Apply Scholarship",
          short_name: "Apply",
          description: "Apply for scholarships",
          url: "/student/apply",
          icons: [{ src: iconSrc, sizes: "96x96" }]
        }
      ]
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error generating manifest:', error)
    
    // Fallback manifest
    const fallbackManifest = {
      name: "iScholar Portal",
      short_name: "iScholar",
      description: "Scholarship Management System for MinSU Students",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#005c2b",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icon-light-32x32.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/icon-light-32x32.png",
          sizes: "512x512",
          type: "image/png",
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
    }

    return NextResponse.json(fallbackManifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  }
}

