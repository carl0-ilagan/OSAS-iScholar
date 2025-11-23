"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const BrandingContext = createContext({})

export const useBranding = () => useContext(BrandingContext)

const DEFAULT_BRANDING = {
  logo: null,
  name: "iScholar",
  tabTitle: "iScholar Portal",
  favicon: null,
  footer: {
    description: "Making scholarship management simple and accessible for all MinSU students.",
    address: "Mariano Jhocson Street, Diliman, Quezon City",
    phone: "(+63) 2 8981-8500",
    email: "osas@minsu.ph",
    socialLinks: {
      facebook: "",
      linkedin: "",
      twitter: "",
    },
  },
}

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBranding()
  }, [])

  const loadBranding = async () => {
    try {
      const brandingDoc = await getDoc(doc(db, "settings", "branding"))
      if (brandingDoc.exists()) {
        const data = brandingDoc.data()
        setBranding({
          logo: data.logo || null,
          name: data.name || DEFAULT_BRANDING.name,
          tabTitle: data.tabTitle || DEFAULT_BRANDING.tabTitle,
          favicon: data.favicon || null,
          footer: data.footer || DEFAULT_BRANDING.footer,
        })
      } else {
        // Initialize with default values (only if user is admin)
        try {
          await setDoc(doc(db, "settings", "branding"), DEFAULT_BRANDING)
          setBranding(DEFAULT_BRANDING)
        } catch (initError) {
          // If can't write, just use defaults
          console.log("Using default branding (no write permission)")
          setBranding(DEFAULT_BRANDING)
        }
      }
    } catch (error) {
      console.error("Error loading branding:", error)
      // Use defaults if there's a permission error
      setBranding(DEFAULT_BRANDING)
    } finally {
      setLoading(false)
    }
  }

  const updateBranding = async (updates) => {
    try {
      const newBranding = { ...branding, ...updates, updatedAt: new Date().toISOString() }
      await setDoc(doc(db, "settings", "branding"), newBranding, { merge: true })
      setBranding(newBranding)
      return true
    } catch (error) {
      console.error("Error updating branding:", error)
      throw error
    }
  }

  // Update document title and favicon
  useEffect(() => {
    if (!loading) {
      if (branding.tabTitle) {
        document.title = branding.tabTitle
      }
      
      // Update favicon
      if (branding.favicon) {
        let link = document.querySelector("link[rel~='icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.getElementsByTagName('head')[0].appendChild(link)
        }
        link.href = branding.favicon
      }
    }
  }, [branding.tabTitle, branding.favicon, loading])

  const value = {
    branding,
    loading,
    updateBranding,
    refreshBranding: loadBranding,
  }

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

