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
        console.error("Error fetching announcements:", error)
        setAnnouncements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
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
      <section id="announcements" className="py-16 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4 animate-pulse">
              <div className="w-5 h-5 bg-primary/20 rounded"></div>
              <div className="w-24 h-4 bg-primary/20 rounded"></div>
            </div>
            <div className="h-10 bg-muted/50 rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-muted/50 rounded-lg w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border-2 border-border/50 rounded-xl p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-muted rounded-lg"></div>
                  <div className="w-12 h-6 bg-muted rounded-full"></div>
                </div>
                <div className="h-6 bg-muted rounded mb-3"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded mb-4 w-3/4"></div>
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="announcements" className="py-16 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Latest Updates</span>
          </div>
          <h2 className="text-4xl font-bold text-foreground mb-4">Announcements</h2>
          <p className="text-muted-foreground text-lg">Stay updated with the latest news and updates from OSAS</p>
        </div>

        {announcements.length > 0 ? (
          <div className="relative">
            {/* Announcements Carousel */}
            <div className={`flex flex-wrap justify-center md:grid md:grid-cols-3 gap-6 overflow-hidden`}>
              {visibleAnnouncements.map((announcement, index) => (
              <div
                key={announcement.id}
                className="w-full max-w-sm md:max-w-none bg-card border-2 border-primary/20 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-primary/40 hover:scale-[1.02] group animate-in fade-in slide-in-from-right"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div className="px-2.5 py-1 bg-primary/10 rounded-full">
                    <span className="text-xs font-semibold text-primary">New</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {announcement.title}
                </h3>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed">
                  {announcement.description}
                </p>

                <div className="space-y-2 pt-4 border-t border-border/50">
                  {announcement.endDate && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>Starts: {formatDate(announcement.endDate)}</span>
                    </div>
                  )}
                  {announcement.venue && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{announcement.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 bg-background border border-border/50 text-foreground p-3 rounded-full shadow-sm hover:shadow-md hover:bg-muted transition-all duration-200 z-10"
                  aria-label="Previous announcements"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 bg-background border border-border/50 text-foreground p-3 rounded-full shadow-sm hover:shadow-md hover:bg-muted transition-all duration-200 z-10"
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
          <div className="bg-card border-2 border-border/50 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Announcements</h3>
            <p className="text-muted-foreground text-sm">
              There are no announcements at the moment. Check back later for updates.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

