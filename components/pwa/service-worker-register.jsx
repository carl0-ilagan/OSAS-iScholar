"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker immediately, not waiting for load event
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully:', registration.scope)
          
          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60000) // Check every minute
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              console.log('[PWA] New service worker found, installing...')
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New service worker installed, reload to activate')
                  // Optionally show a notification to the user
                } else if (newWorker.state === 'activated') {
                  console.log('[PWA] New service worker activated')
                }
              })
            }
          })
          
          // Check if service worker is controlling the page
          if (registration.active) {
            console.log('[PWA] Service Worker is active and controlling the page')
          }
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
      
      // Listen for service worker controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service Worker controller changed, reloading page...')
        window.location.reload()
      })
    } else {
      console.warn('[PWA] Service Workers are not supported in this browser')
    }
  }, [])

  return null
}

