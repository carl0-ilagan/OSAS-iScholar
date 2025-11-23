"use client"

import { useState, useEffect } from "react"
import { Download, Check, Smartphone } from "lucide-react"

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check device type
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))
    setIsAndroid(/android/.test(userAgent))

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app was just installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt (Android Chrome)
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      // iOS instructions
      alert('To install this app on your iOS device:\n\n1. Tap the Share button\n2. Select "Add to Home Screen"\n3. Tap "Add"')
    } else {
      // Generic instructions
      alert('To install this app:\n\n1. Look for the install icon in your browser\'s address bar\n2. Or use your browser\'s menu to "Install App"')
    }
  }

  // Don't show button if already installed
  if (isInstalled) {
    return (
      <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 text-green-300 rounded-lg text-sm">
        <Check className="w-4 h-4" />
        <span>App Installed</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleInstallClick}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-accent hover:text-primary rounded-lg transition-all duration-200 font-medium text-sm group"
    >
      <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
      <span>Install App</span>
    </button>
  )
}

