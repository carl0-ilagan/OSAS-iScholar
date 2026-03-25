"use client"

import { useState, useEffect, useMemo } from "react"
import { db } from "@/lib/firebase"
import { submitAdminAuditLog } from "@/lib/client/admin-audit-log"
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import { MessageSquare, RotateCcw, Search, Star, CheckCircle2, Loader2, Award, GraduationCap, Calendar, Building2, User } from "lucide-react"
import { toast } from "sonner"
import TestimonialsSkeleton from "@/components/admin/testimonials-skeleton"

const ITEMS_PER_PAGE = 6

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterScholarship, setFilterScholarship] = useState("All")
  const [filterFeatured, setFilterFeatured] = useState("All")
  const [filterRating, setFilterRating] = useState("All")
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async () => {
    try {
      setLoading(true)
      const testimonialsQuery = query(
        collection(db, "testimonials"),
        orderBy("createdAt", "desc")
      )
      const snapshot = await getDocs(testimonialsQuery)
      
      const testimonialsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          userId: data.userId,
          name: data.name || "Anonymous",
          photoURL: data.photoURL || null,
          testimonial: data.testimonial || "",
          rating: data.rating || 0,
          scholarship: data.scholarship || "N/A",
          course: data.course || "N/A",
          campus: data.campus || "N/A",
          featuredOnLanding: data.featuredOnLanding || false,
          createdAt: data.createdAt?.toDate() || new Date()
        }
      })
      
      setTestimonials(testimonialsData)
    } catch (error) {
      console.error("Error fetching testimonials:", error)
      toast.error("Failed to load testimonials")
    } finally {
      setLoading(false)
    }
  }

  const toggleFeatured = async (testimonialId, currentStatus) => {
    try {
      setUpdating(testimonialId)
      const testimonialRef = doc(db, "testimonials", testimonialId)
      
      // Check how many are currently featured
      const featuredCount = testimonials.filter(t => t.featuredOnLanding && t.id !== testimonialId).length
      
      // If trying to feature and already have 6, prevent it
      if (!currentStatus && featuredCount >= 6) {
        toast.error("Maximum 6 testimonials can be featured on the landing page")
        setUpdating(null)
        return
      }

      await updateDoc(testimonialRef, {
        featuredOnLanding: !currentStatus
      })

      void submitAdminAuditLog({
        action: "update",
        resourceType: "testimonials",
        resourceId: testimonialId,
        detail: !currentStatus ? "Featured on landing" : "Removed from landing",
      })

      // Update local state
      setTestimonials(prev => prev.map(t => 
        t.id === testimonialId 
          ? { ...t, featuredOnLanding: !currentStatus }
          : t
      ))

      toast.success(
        !currentStatus 
          ? "Testimonial featured on landing page" 
          : "Testimonial removed from landing page"
      )
    } catch (error) {
      console.error("Error updating testimonial:", error)
      toast.error("Failed to update testimonial")
    } finally {
      setUpdating(null)
    }
  }

  const uniqueScholarships = useMemo(() => {
    const scholarships = new Set(testimonials.map(t => t.scholarship).filter(Boolean))
    return ["All", ...Array.from(scholarships).sort()]
  }, [testimonials])

  const filteredAndSortedTestimonials = useMemo(() => {
    let filtered = [...testimonials]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((t) =>
        [t.name, t.scholarship, t.course, t.campus, t.testimonial]
          .some((field) => String(field || "").toLowerCase().includes(q))
      )
    }

    if (filterScholarship !== "All") {
      filtered = filtered.filter(t => t.scholarship === filterScholarship)
    }

    if (filterFeatured === "Featured") {
      filtered = filtered.filter(t => t.featuredOnLanding)
    } else if (filterFeatured === "Not Featured") {
      filtered = filtered.filter(t => !t.featuredOnLanding)
    }

    if (filterRating !== "All") {
      const rating = parseInt(filterRating)
      filtered = filtered.filter(t => t.rating === rating)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt
        case "oldest":
          return a.createdAt - b.createdAt
        case "rating-high":
          return b.rating - a.rating
        case "rating-low":
          return a.rating - b.rating
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })

    return filtered
  }, [testimonials, searchQuery, filterScholarship, filterFeatured, filterRating, sortBy])

  const featuredCount = testimonials.filter(t => t.featuredOnLanding).length
  const averageRating = useMemo(() => {
    if (!testimonials.length) return 0
    const total = testimonials.reduce((sum, item) => sum + Number(item.rating || 0), 0)
    return total / testimonials.length
  }, [testimonials])
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTestimonials.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTestimonials = filteredAndSortedTestimonials.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterScholarship, filterFeatured, filterRating, sortBy])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const resetFilters = () => {
    setSearchQuery("")
    setFilterScholarship("All")
    setFilterFeatured("All")
    setFilterRating("All")
    setSortBy("newest")
  }

  return (
    <AdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, scholarship, course..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                />
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Featured:</span>
                <span className="font-semibold text-foreground">{featuredCount}/6</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <select
                value={filterScholarship}
                onChange={(e) => setFilterScholarship(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              >
                {uniqueScholarships.map((scholarship) => (
                  <option key={scholarship} value={scholarship}>
                    {scholarship === "All" ? "All Scholarships" : scholarship}
                  </option>
                ))}
              </select>
              <select
                value={filterFeatured}
                onChange={(e) => setFilterFeatured(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              >
                <option value="All">All Status</option>
                <option value="Featured">Featured</option>
                <option value="Not Featured">Not Featured</option>
              </select>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              >
                <option value="All">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="rating-high">Highest Rating</option>
                <option value="rating-low">Lowest Rating</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
              <button
                onClick={resetFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
                Total Testimonials: <span className="font-semibold text-foreground">{testimonials.length}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
                Avg Rating: <span className="font-semibold text-foreground">{averageRating.toFixed(1)}</span>
              </span>
              {featuredCount >= 6 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-green-700">
                  Featured slots full (6/6)
                </span>
              ) : null}
            </div>
          </div>

          {loading ? (
            <TestimonialsSkeleton />
          ) : filteredAndSortedTestimonials.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">No testimonials found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try changing the current filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedTestimonials.map((testimonial) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  isFeatured={testimonial.featuredOnLanding}
                  onToggle={toggleFeatured}
                  updating={updating === testimonial.id}
                />
              ))}
            </div>
          )}

          {!loading ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-center text-sm text-muted-foreground md:text-left">
                Showing {filteredAndSortedTestimonials.length > 0 ? startIndex + 1 : 0} to{" "}
                {Math.min(endIndex, filteredAndSortedTestimonials.length)} of {filteredAndSortedTestimonials.length} record
                {filteredAndSortedTestimonials.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center justify-center gap-2 md:justify-end">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}

function TestimonialCard({ testimonial, isFeatured, onToggle, updating }) {
  return (
    <div className={`rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 ${isFeatured ? "border-green-500/40" : "border-border"}`}>
      <div className="mb-3 flex items-start gap-3">
        {testimonial.photoURL ? (
          <img
            src={testimonial.photoURL}
            alt={testimonial.name}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              const fallback = e.target.nextElementSibling
              if (fallback) fallback.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100 ${testimonial.photoURL ? 'hidden' : 'flex'}`}
        >
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-foreground">
              {testimonial.name}
            </p>
            {isFeatured && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            <span className="truncate">{testimonial.course}</span>
          </div>
        </div>
      </div>

      <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
        <Award className="h-3.5 w-3.5" />
        <span className="max-w-[180px] truncate">{testimonial.scholarship}</span>
      </div>
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span className="truncate">{testimonial.campus || "N/A"}</span>
      </div>

      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= testimonial.rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>

      <p className="mb-4 line-clamp-4 text-sm italic leading-relaxed text-foreground">
        "{testimonial.testimonial}"
      </p>

      <div className="flex items-center justify-between border-t border-border/50 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{testimonial.createdAt?.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }) || "Recently"}</span>
        </div>
        <button
          onClick={() => onToggle(testimonial.id, isFeatured)}
          disabled={updating}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isFeatured
              ? "border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20"
              : "border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20"
          }`}
        >
          {updating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isFeatured ? (
            "Remove"
          ) : (
            "Feature"
          )}
        </button>
      </div>
    </div>
  )
}
