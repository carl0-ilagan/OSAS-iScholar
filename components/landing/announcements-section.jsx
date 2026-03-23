"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Calendar, MapPin, Clock, Bell, X, ChevronLeft, ChevronRight } from "lucide-react"

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [galleryImages, setGalleryImages] = useState([])
  const [galleryIndex, setGalleryIndex] = useState(0)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true)
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
              images: Array.isArray(data.images) ? data.images : [],
              createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
            })
          }
        })

        // Sort by creation date (newest first)
        activeAnnouncements.sort((a, b) => {
          const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return dateB - dateA
        })

        // Landing page shows up to 9 latest active announcements.
        setAnnouncements(activeAnnouncements.slice(0, 9))
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

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(announcements.length / 3))
    if (currentPage > totalPages - 1) {
      setCurrentPage(0)
    }
  }, [announcements.length, currentPage])

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

  const openGallery = (images, index = 0) => {
    setGalleryImages(images || [])
    setGalleryIndex(index)
  }

  const closeGallery = () => {
    setGalleryImages([])
    setGalleryIndex(0)
  }

  const prevImage = () => {
    setGalleryIndex((prev) => (prev <= 0 ? galleryImages.length - 1 : prev - 1))
  }

  const nextImage = () => {
    setGalleryIndex((prev) => (prev >= galleryImages.length - 1 ? 0 : prev + 1))
  }

  const totalPages = Math.max(1, Math.ceil(announcements.length / 3))
  const currentStart = currentPage * 3
  const visibleAnnouncements = announcements.length > 3 ? announcements.slice(currentStart, currentStart + 3) : announcements

  const nextPage = () => {
    if (announcements.length <= 3) return
    setCurrentPage((prev) => (prev >= totalPages - 1 ? 0 : prev + 1))
  }

  const prevPage = () => {
    if (announcements.length <= 3) return
    setCurrentPage((prev) => (prev <= 0 ? totalPages - 1 : prev - 1))
  }

  if (loading) {
    return (
      <section id="announcements" className="relative bg-transparent py-20">
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
      <section id="announcements" className="relative bg-transparent py-20">
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
            {announcements.length > 3 ? (
              <>
                <button
                  onClick={prevPage}
                  className="absolute -left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-white/90 p-2 text-emerald-800 shadow-lg transition hover:scale-105 hover:bg-white md:-left-5"
                  aria-label="Previous announcements"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextPage}
                  className="absolute -right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-white/90 p-2 text-emerald-800 shadow-lg transition hover:scale-105 hover:bg-white md:-right-5"
                  aria-label="Next announcements"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}

            <div className={`overflow-hidden gap-6 ${visibleAnnouncements.length >= 3 ? "grid md:grid-cols-3" : "flex flex-wrap justify-center"}`}>
              {visibleAnnouncements.map((announcement, index) => (
              <div
                key={announcement.id}
                className={`group animate-in slide-in-from-right fade-in rounded-2xl border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white/35 hover:bg-white/15 ${
                  visibleAnnouncements.length >= 3 ? "w-full" : "w-full max-w-4xl"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {Array.isArray(announcement.images) && announcement.images.length > 0 ? (
                  <div className="mb-5 overflow-hidden rounded-xl border border-white/20 bg-black/20">
                    {announcement.images.length === 1 ? (
                      <button type="button" className="block w-full" onClick={() => openGallery(announcement.images, 0)}>
                        <img src={announcement.images[0]} alt={announcement.title} className="h-64 w-full object-cover" />
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-1">
                        {announcement.images.slice(0, 4).map((img, imageIndex) => {
                          const hiddenCount = announcement.images.length - 4
                          const isLastVisible = imageIndex === 3 && hiddenCount > 0
                          return (
                            <button
                              key={`${announcement.id}-img-${imageIndex}`}
                              type="button"
                              className="relative block"
                              onClick={() => openGallery(announcement.images, imageIndex)}
                            >
                              <img src={img} alt={`${announcement.title} ${imageIndex + 1}`} className="h-44 w-full object-cover" />
                              {isLastVisible ? (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-semibold text-white">
                                  +{hiddenCount}
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
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
                      <span>Visible until: {formatDate(announcement.endDate)}</span>
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

            {announcements.length > 3 ? (
              <div className="mt-5 flex justify-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, pageIndex) => (
                  <button
                    key={`page-dot-${pageIndex}`}
                    onClick={() => setCurrentPage(pageIndex)}
                    className={`h-2 rounded-full transition-all ${
                      pageIndex === currentPage ? "w-6 bg-emerald-300" : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                    aria-label={`Go to page ${pageIndex + 1}`}
                  />
                ))}
              </div>
            ) : null}
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

      {galleryImages.length > 0 ? (
        <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-sm p-4">
          <button
            type="button"
            onClick={closeGallery}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-black/45 text-white hover:bg-black/70"
            aria-label="Close gallery"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-5xl">
              <div className="mx-auto overflow-hidden rounded-2xl border border-white/15 bg-black/20 shadow-2xl">
                <img src={galleryImages[galleryIndex]} alt={`Announcement image ${galleryIndex + 1}`} className="max-h-[78vh] w-full object-contain" />
              </div>
            </div>
          </div>
          {galleryImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white hover:bg-black/70"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white hover:bg-black/70"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
            {galleryIndex + 1} / {galleryImages.length}
          </div>
          {galleryImages.length > 1 ? (
            <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              {galleryImages.map((_, idx) => (
                <button
                  key={`landing-dot-${idx}`}
                  type="button"
                  onClick={() => setGalleryIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === galleryIndex ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/70"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]" />
        </div>
      ) : null}
    </section>
  )
}

