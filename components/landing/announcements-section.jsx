"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Calendar, MapPin, Clock, Bell, ChevronLeft, ChevronRight } from "lucide-react"

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true)
        // Add cache-busting timestamp to ensure fresh data
        const timestamp = Date.now()
        let snapshot
        try {
          snapshot = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")))
        } catch (error) {
          snapshot = await getDocs(collection(db, "announcements"))
        }

        const now = new Date()
        const activeAnnouncements = []

        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          const endDate = data.endDate ? (data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate)) : null
          
          // Check if announcement is still active (not archived)
          // Archive announcements 2 days after end date
          let isActive = true
          if (endDate) {
            const archiveDate = new Date(endDate)
            archiveDate.setDate(archiveDate.getDate() + 2)
            if (now > archiveDate) {
              isActive = false
            }
          }

          // Only show active announcements
          if (isActive && data.status !== "archived") {
            activeAnnouncements.push({
              id: docSnap.id,
              title: data.title || "Untitled",
              description: data.description || "",
              endDate: endDate,
              venue: data.venue || "",
              createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
            })
          }
        })

        // Sort by creation date (newest first) and limit to 6 most recent
        activeAnnouncements.sort((a, b) => {
          const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return dateB - dateA
        })

        const limitedAnnouncements = activeAnnouncements.slice(0, 6) // Limit to 6
        setAnnouncements(limitedAnnouncements)
        
        // Start from center (if 6 items, start at index 1 to show items 1, 2, 3)
        if (limitedAnnouncements.length > 3) {
          const centerStart = Math.floor((limitedAnnouncements.length - 3) / 2)
          setCurrentIndex(centerStart)
        }
      } catch (error) {
        if (error?.code !== "permission-denied") {
          console.error("Error fetching announcements:", error)
        }
        setAnnouncements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()

    // Refetch when page becomes visible (handles mobile/PWA tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAnnouncements()
      }
    }

    // Refetch when window regains focus
    const handleFocus = () => {
      fetchAnnouncements()
    }

    // Add event listeners for visibility and focus
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Auto-slide functionality
  useEffect(() => {
    if (announcements.length <= 3) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        // Calculate next index, wrapping around
        const nextIndex = prev + 3
        if (nextIndex >= announcements.length) {
          // If we've reached the end, go back to center
          const centerStart = Math.floor((announcements.length - 3) / 2)
          return centerStart
        }
        return nextIndex
      })
    }, 5000) // Auto-scroll every 5 seconds

    return () => clearInterval(interval)
  }, [announcements.length])

  const nextSlide = () => {
    if (announcements.length <= 3) return
    setCurrentIndex((prev) => {
      const nextIndex = prev + 3
      if (nextIndex >= announcements.length) {
        const centerStart = Math.floor((announcements.length - 3) / 2)
        return centerStart
      }
      return nextIndex
    })
  }

  const prevSlide = () => {
    if (announcements.length <= 3) return
    setCurrentIndex((prev) => {
      const prevIndex = prev - 3
      if (prevIndex < 0) {
        // If we've reached the beginning, go to the last possible position
        const lastStart = announcements.length - 3
        return lastStart
      }
      return prevIndex
    })
  }

  const visibleAnnouncements = announcements.slice(currentIndex, currentIndex + 3)

  const formatDate = (date) => {
    if (!date) return ""
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch (e) {
      return ""
    }
  }

  if (loading) {
    return (
      <section
        id="announcements"
        className="relative overflow-hidden py-20"
        style={{
          backgroundImage: "url('/BG.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-emerald-900/65" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full mb-4 backdrop-blur-sm animate-pulse">
              <div className="w-5 h-5 bg-white/25 rounded"></div>
              <div className="w-24 h-4 bg-white/25 rounded"></div>
            </div>
            <div className="h-10 bg-white/20 rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-white/20 rounded-lg w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-sm animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg"></div>
                  <div className="w-12 h-6 bg-white/20 rounded-full"></div>
                </div>
                <div className="h-6 bg-white/20 rounded mb-3"></div>
                <div className="h-4 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded mb-4 w-3/4"></div>
                <div className="space-y-2 pt-4 border-t border-white/20">
                  <div className="h-3 bg-white/20 rounded w-2/3"></div>
                  <div className="h-3 bg-white/20 rounded w-1/2"></div>
                  <div className="h-3 bg-white/20 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
      <section
        id="announcements"
        className="relative overflow-hidden py-20"
        style={{
          backgroundImage: "url('/BG.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
      <div className="absolute inset-0 bg-emerald-900/65" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <Bell className="w-5 h-5 text-emerald-100" />
            <span className="text-sm font-semibold text-emerald-100">Latest Updates</span>
          </div>
          <h2 className="mb-3 text-4xl font-semibold tracking-tight text-white">Announcements</h2>
          <p className="text-emerald-50/90 text-lg">Stay updated with the latest news and updates from MOCAS</p>
        </div>

        {announcements.length > 0 ? (
          <div className="relative">
            {/* Announcements Carousel */}
            <div className={`flex flex-wrap justify-center md:grid md:grid-cols-3 gap-6 overflow-hidden`}>
              {visibleAnnouncements.map((announcement, index) => (
              <div
                key={announcement.id}
                className="group w-full max-w-sm animate-in slide-in-from-right fade-in rounded-2xl border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white/35 hover:bg-white/15 md:max-w-none"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
                    <Bell className="w-5 h-5 text-emerald-100" />
                  </div>
                  <div className="rounded-full bg-white/20 px-2.5 py-1">
                    <span className="text-xs font-semibold text-emerald-100">New</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                  {announcement.title}
                </h3>

                <p className="text-emerald-50/90 text-sm mb-4 line-clamp-3 leading-relaxed">
                  {announcement.description}
                </p>

                <div className="space-y-2 pt-4 border-t border-white/20">
                  {announcement.endDate && (
                    <div className="flex items-center gap-2 text-xs text-emerald-50/80">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>Starts: {formatDate(announcement.endDate)}</span>
                    </div>
                  )}
                  {announcement.venue && (
                    <div className="flex items-center gap-2 text-xs text-emerald-50/80">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{announcement.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-emerald-50/80">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>Posted {formatDate(announcement.createdAt)}</span>
                  </div>
                </div>
              </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            {announcements.length > 3 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 z-10 -translate-x-4 -translate-y-1/2 rounded-full border border-border bg-background p-3 text-foreground shadow-sm transition-all duration-200 hover:scale-105 hover:bg-muted hover:shadow-md md:-translate-x-6"
                  aria-label="Previous announcements"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 z-10 translate-x-4 -translate-y-1/2 rounded-full border border-border bg-background p-3 text-foreground shadow-sm transition-all duration-200 hover:scale-105 hover:bg-muted hover:shadow-md md:translate-x-6"
                  aria-label="Next announcements"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {announcements.length > 3 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: Math.ceil(announcements.length / 3) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index * 3)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      Math.floor(currentIndex / 3) === index
                        ? "bg-primary w-8"
                        : "bg-border w-1.5 hover:bg-primary/40"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-white/20 bg-white/10 p-12 text-center shadow-lg backdrop-blur-sm">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-emerald-100" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Announcements</h3>
            <p className="text-emerald-50/80 text-sm">
              There are no announcements at the moment. Check back later for updates.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

