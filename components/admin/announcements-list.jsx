"use client"

import { useState } from "react"
import { Calendar, Edit, Trash2, FileText, Clock, CheckCircle, Archive, Award, X, ChevronLeft, ChevronRight } from "lucide-react"

export default function AnnouncementsList({ announcements, onEdit, onDelete, getStatus }) {
  const [galleryImages, setGalleryImages] = useState([])
  const [galleryIndex, setGalleryIndex] = useState(0)

  const formatDate = (date) => {
    if (!date) return "N/A"
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (announcement) => {
    const status = getStatus ? getStatus(announcement) : (announcement.calculatedStatus || announcement.status || "active")
    
    if (status === "incoming") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 border border-blue-500/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Incoming
        </span>
      )
    } else if (status === "archived") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-600 border border-gray-500/30 flex items-center gap-1.5">
          <Archive className="w-3 h-3" />
          Archived
        </span>
      )
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 border border-green-500/30 flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      )
    }
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-xl">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No announcements found</p>
      </div>
    )
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

  return (
    <div className="space-y-4">
      {/* Desktop Grid View */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            {Array.isArray(announcement.images) && announcement.images.length > 0 ? (
              <div className="mb-4 overflow-hidden rounded-lg border border-border/70">
                {announcement.images.length === 1 ? (
                  <button type="button" className="block w-full" onClick={() => openGallery(announcement.images, 0)}>
                    <img src={announcement.images[0]} alt={announcement.title} className="h-48 w-full object-cover" />
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {announcement.images.slice(0, 4).map((image, idx) => {
                      const hiddenCount = announcement.images.length - 4
                      const isLastVisible = idx === 3 && hiddenCount > 0
                      return (
                        <button
                          key={`${announcement.id}-img-${idx}`}
                          type="button"
                          className="relative block"
                          onClick={() => openGallery(announcement.images, idx)}
                        >
                          <img src={image} alt={`${announcement.title} ${idx + 1}`} className="h-24 w-full object-cover" />
                          {isLastVisible ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
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
              <div className="flex-1 pr-2">
                <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2">
                  {announcement.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(announcement)}
                  {announcement.targetScholarships && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Award className="w-3 h-3" />
                      <span>
                        {announcement.targetScholarships.includes("all") 
                          ? "All Scholarships" 
                          : `${announcement.targetScholarships.length} Scholarship${announcement.targetScholarships.length > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(announcement)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(announcement)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {announcement.description || "No description"}
            </p>
            
            <div className="space-y-1 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Created: {formatDate(announcement.createdAt)}</span>
              </div>
              {announcement.endDate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Ends: {formatDate(announcement.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile List View */}
      <div className="md:hidden space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            {Array.isArray(announcement.images) && announcement.images.length > 0 ? (
              <div className="mb-3 overflow-hidden rounded-lg border border-border/70">
                {announcement.images.length === 1 ? (
                  <button type="button" className="block w-full" onClick={() => openGallery(announcement.images, 0)}>
                    <img src={announcement.images[0]} alt={announcement.title} className="h-40 w-full object-cover" />
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {announcement.images.slice(0, 4).map((image, idx) => {
                      const hiddenCount = announcement.images.length - 4
                      const isLastVisible = idx === 3 && hiddenCount > 0
                      return (
                        <button
                          key={`${announcement.id}-mobile-img-${idx}`}
                          type="button"
                          className="relative block"
                          onClick={() => openGallery(announcement.images, idx)}
                        >
                          <img src={image} alt={`${announcement.title} ${idx + 1}`} className="h-20 w-full object-cover" />
                          {isLastVisible ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
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
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-2">
                <h3 className="text-base font-bold text-foreground mb-2">
                  {announcement.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {getStatusBadge(announcement)}
                  {announcement.targetScholarships && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Award className="w-3 h-3" />
                      <span>
                        {announcement.targetScholarships.includes("all") 
                          ? "All" 
                          : `${announcement.targetScholarships.length}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(announcement)}
                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(announcement)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {announcement.description || "No description"}
            </p>
            
            <div className="space-y-1 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Created: {formatDate(announcement.createdAt)}</span>
              </div>
              {announcement.endDate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Ends: {formatDate(announcement.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
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
                  key={`dot-${idx}`}
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
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]">
          </div>
        </div>
      ) : null}
    </div>
  )
}

