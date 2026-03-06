// Service Worker for iScholar PWA
const CACHE_NAME = 'ischolar-v2'
const RUNTIME_CACHE = 'ischolar-runtime-v2'
const STATIC_CACHE = 'ischolar-static-v2'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/icon-light-32x32.png',
  '/icon-dark-32x32.png',
  '/apple-icon.png',
  '/icon.svg',
  '/download.ico',
  '/manifest.json'
]

// Routes to cache (student and admin pages)
const ROUTES_TO_CACHE = [
  '/student',
  '/student/apply',
  '/student/applications',
  '/student/requirements',
  '/student/profile-form',
  '/student/application-form',
  '/admin',
  '/admin/applications',
  '/admin/scholarships',
  '/admin/users',
  '/admin/requirements',
  '/admin/announcements'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('[SW] Error caching static assets:', err)
        // Continue even if some assets fail to cache
        return Promise.resolve()
      })
    }).then(() => {
      console.log('[SW] Static assets cached successfully')
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== RUNTIME_CACHE && 
                   cacheName !== STATIC_CACHE
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    }).then(() => {
      console.log('[SW] Service worker activated')
      return self.clients.claim()
    })
  )
})

// Helper function to check if URL should be cached
function shouldCache(url) {
  // Don't cache Firebase/Firestore requests
  if (url.includes('firebase') || url.includes('firestore') || url.includes('googleapis.com')) {
    return false
  }
  
  // Don't cache API routes that modify data
  if (url.includes('/api/') && !url.includes('/api/send-email')) {
    return false
  }
  
  // Cache static assets, pages, and images
  return true
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests (except same origin)
  if (url.origin !== self.location.origin) {
    return
  }

  // Skip requests that shouldn't be cached
  if (!shouldCache(request.url)) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Strategy: Cache First, Network Fallback
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', request.url)
        return cachedResponse
      }

      // Network request
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses or opaque responses
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response
          }

          // Clone the response for caching
          const responseToCache = response.clone()

          // Determine which cache to use
          const isStaticAsset = STATIC_ASSETS.some(asset => request.url.includes(asset))
          const isRoute = ROUTES_TO_CACHE.some(route => request.url.includes(route))
          
          const cacheToUse = isStaticAsset ? STATIC_CACHE : (isRoute ? CACHE_NAME : RUNTIME_CACHE)

          // Cache the response
          caches.open(cacheToUse).then((cache) => {
            cache.put(request, responseToCache)
            console.log('[SW] Cached:', request.url)
          }).catch((err) => {
            console.error('[SW] Error caching response:', err)
          })

          return response
        })
        .catch((error) => {
          console.error('[SW] Network request failed:', error)
          
          // If network fails and it's a navigation request, return offline page
          if (request.mode === 'navigate') {
            return caches.match('/offline.html').then((offlinePage) => {
              if (offlinePage) {
                return offlinePage
              }
              // Fallback to home page if offline page not cached
              return caches.match('/').then((cachedHome) => {
                if (cachedHome) {
                  return cachedHome
                }
                // Last resort: return a basic offline response
                return new Response('Offline - Please check your internet connection', {
                  headers: { 'Content-Type': 'text/html' }
                })
              })
            })
          }
          
          // For other requests, return error
          return new Response('Network error', { status: 408 })
        })
    })
  )
})

