"use client"

import { useState, useEffect, useMemo } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { MessageSquare, Star, CheckCircle2, Loader2, Award, GraduationCap, Filter, ArrowUpDown, Calendar } from "lucide-react"
import { toast } from "sonner"
import TestimonialsSkeleton from "@/components/admin/testimonials-skeleton"

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [filterScholarship, setFilterScholarship] = useState("All")
  const [filterFeatured, setFilterFeatured] = useState("All")
  const [filterRating, setFilterRating] = useState("All")
  const [sortBy, setSortBy] = useState("newest")

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
      
      // Use data directly from testimonial document (name and photoURL are stored there)
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

  // Get unique scholarships for filter
  const uniqueScholarships = useMemo(() => {
    const scholarships = new Set(testimonials.map(t => t.scholarship).filter(Boolean))
    return ["All", ...Array.from(scholarships).sort()]
  }, [testimonials])

  // Filter and sort testimonials
  const filteredAndSortedTestimonials = useMemo(() => {
    let filtered = [...testimonials]

    // Scholarship filter
    if (filterScholarship !== "All") {
      filtered = filtered.filter(t => t.scholarship === filterScholarship)
    }

    // Featured filter
    if (filterFeatured === "Featured") {
      filtered = filtered.filter(t => t.featuredOnLanding)
    } else if (filterFeatured === "Not Featured") {
      filtered = filtered.filter(t => !t.featuredOnLanding)
    }

    // Rating filter
    if (filterRating !== "All") {
      const rating = parseInt(filterRating)
      filtered = filtered.filter(t => t.rating === rating)
    }

    // Sort
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
  }, [testimonials, filterScholarship, filterFeatured, filterRating, sortBy])

  const featuredCount = testimonials.filter(t => t.featuredOnLanding).length

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        <AdminPageBanner
          icon={MessageSquare}
          title="Testimonials Management"
          description="Select which testimonials to display on the landing page"
        />

        <div className="mt-36 md:mt-28 p-6 space-y-6">
          {/* Featured Count Card - Enhanced */}
          <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-green-600/5 border-2 border-green-500/30 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">Featured on Landing Page</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {featuredCount} of 6 testimonials selected for display
                    </p>
                  </div>
                </div>
              </div>
              <div className={`px-8 py-4 rounded-2xl font-bold text-3xl shadow-lg transition-all duration-300 ${
                featuredCount >= 6 
                  ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-105' 
                  : 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 text-yellow-700 border-2 border-yellow-500/40 hover:scale-105'
              }`}>
                {featuredCount} / 6
              </div>
            </div>
          </div>

        {/* Filters and Sort - Enhanced */}
        <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-border rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Filters & Sort</h3>
              <p className="text-xs text-muted-foreground">Refine your search results</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Scholarship Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" />
                Scholarship
              </label>
              <select
                value={filterScholarship}
                onChange={(e) => setFilterScholarship(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ease-in-out appearance-none cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:shadow-md"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem',
                }}
              >
                {uniqueScholarships.map((scholarship) => (
                  <option key={scholarship} value={scholarship}>
                    {scholarship}
                  </option>
                ))}
              </select>
            </div>

            {/* Featured Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Status
              </label>
              <select
                value={filterFeatured}
                onChange={(e) => setFilterFeatured(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ease-in-out appearance-none cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:shadow-md"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="All">All</option>
                <option value="Featured">Featured</option>
                <option value="Not Featured">Not Featured</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-primary" />
                Rating
              </label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ease-in-out appearance-none cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:shadow-md"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="All">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-primary" />
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ease-in-out appearance-none cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:shadow-md"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="rating-high">Highest Rating</option>
                <option value="rating-low">Lowest Rating</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>

            {/* Results Count - Enhanced */}
            <div className="flex items-end">
              <div className="w-full px-5 py-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 shadow-sm">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Total Results</p>
                <p className="text-2xl font-bold text-primary">{filteredAndSortedTestimonials.length}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <TestimonialsSkeleton />
        ) : filteredAndSortedTestimonials.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-card to-muted/30 border-2 border-border rounded-2xl shadow-lg">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Testimonials Found</h3>
            <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTestimonials.map((testimonial) => (
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
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}

function TestimonialCard({ testimonial, isFeatured, onToggle, updating }) {
  return (
    <div className={`bg-card border rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group ${
      isFeatured ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 to-green-500/5 ring-2 ring-green-500/20' : 'border-border hover:border-primary/50'
    }`}>
      {/* Header with Profile Pic, Name, Course */}
      <div className="flex items-start gap-4 mb-4">
        {testimonial.photoURL ? (
          <img
            src={testimonial.photoURL}
            alt={testimonial.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20 shadow-md flex-shrink-0 group-hover:ring-primary/50 transition-all duration-300"
            onError={(e) => {
              e.target.style.display = 'none'
              const fallback = e.target.nextElementSibling
              if (fallback) fallback.style.display = 'flex'
            }}
          />
        ) : null}
        <div 
          className={`w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg ring-2 ring-primary/20 shadow-md flex-shrink-0 group-hover:ring-primary/50 transition-all duration-300 ${testimonial.photoURL ? 'hidden' : 'flex'}`}
        >
          {testimonial.name?.[0]?.toUpperCase() || "A"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors duration-300">
              {testimonial.name}
            </p>
            {isFeatured && (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="truncate">{testimonial.course}</span>
          </div>
        </div>
      </div>

      {/* Scholarship Badge */}
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 transition-all duration-200">
          <Award className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold truncate max-w-[200px]">{testimonial.scholarship}</span>
        </div>
      </div>

      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 transition-all duration-200 ${
              star <= testimonial.rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Testimonial Text */}
      <p className="text-sm text-foreground mb-5 line-clamp-4 italic leading-relaxed">
        "{testimonial.testimonial}"
      </p>

      {/* Footer with Date and Action */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{testimonial.createdAt?.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }) || "Recently"}</span>
        </div>
        <button
          onClick={() => onToggle(testimonial.id, isFeatured)}
          disabled={updating}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
            isFeatured
              ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20"
              : "bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20"
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
