"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { MessageSquare, Star, ChevronLeft, ChevronRight, Calendar, Quote, Award, Filter, ChevronDown, ArrowUpDown } from "lucide-react"
import TestimonialModal from "@/components/student/testimonial-modal"
import TestimonialsSkeleton from "@/components/student/testimonials-skeleton"

function isPermissionDenied(error) {
  const code = String(error?.code || "").toLowerCase()
  const message = String(error?.message || "").toLowerCase()
  return code.includes("permission-denied") || message.includes("insufficient permissions")
}

export default function TestimonialsPage() {
  const { user } = useAuth()
  const [userName, setUserName] = useState("")
  const [userCampus, setUserCampus] = useState("")
  const [loading, setLoading] = useState(true)
  
  // Testimonials state
  const [testimonials, setTestimonials] = useState([])
  const [filteredTestimonials, setFilteredTestimonials] = useState([])
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Filter and sort state
  const [selectedScholarship, setSelectedScholarship] = useState("All")
  const [sortBy, setSortBy] = useState("newest")
  const [expandedCards, setExpandedCards] = useState(new Set())
  
  const ITEMS_PER_PAGE = 9

  // Format date like Facebook (e.g., "2 hours ago", "3 days ago")
  const formatTimeAgo = (date) => {
    if (!date) return "Recently"
    
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) {
      return "Just now"
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} ${days === 1 ? 'day' : 'days'} ago`
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800)
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000)
      return `${months} ${months === 1 ? 'month' : 'months'} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserName(userData.fullName || userData.displayName || "Student")
          setUserCampus(userData.campus || "")
        }
      } catch (error) {
        if (!isPermissionDenied(error)) {
          console.error("Error fetching user data:", error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  // Fetch testimonials function
  const fetchTestimonials = async () => {
      try {
        let snapshot
        try {
          snapshot = await getDocs(query(collection(db, "testimonials"), orderBy("createdAt", "desc")))
        } catch (primaryError) {
          if (isPermissionDenied(primaryError) && userCampus) {
            // Campus-scoped fallback for accounts constrained by campus rules.
            try {
              snapshot = await getDocs(
                query(collection(db, "testimonials"), where("campus", "==", userCampus), orderBy("createdAt", "desc")),
              )
            } catch {
              snapshot = await getDocs(query(collection(db, "testimonials"), where("campus", "==", userCampus)))
            }
          } else {
            snapshot = await getDocs(collection(db, "testimonials"))
          }
        }

        const testimonialsData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            userId: data.userId,
            name: data.name || "Anonymous",
            photoURL: data.photoURL || null,
            testimonial: data.testimonial || "",
            rating: Number(data.rating || 0),
            scholarship: data.scholarship || "N/A",
            course: data.course || "N/A",
            campus: data.campus || "N/A",
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
          }
        })

        testimonialsData.sort((a, b) => {
          const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return bTime - aTime
        })

        setTestimonials(testimonialsData)
        setFilteredTestimonials(testimonialsData)
      } catch (error) {
        setTestimonials([])
        setFilteredTestimonials([])
        if (!isPermissionDenied(error)) console.error("Error fetching testimonials:", error)
      }
    }

  // Fetch testimonials on mount
  useEffect(() => {
    if (!user?.uid) return
    fetchTestimonials()
  }, [user?.uid, userCampus])

  // Filter and sort testimonials
  useEffect(() => {
    let filtered = [...testimonials]

    // Filter by scholarship
    if (selectedScholarship !== "All") {
      filtered = filtered.filter(t => t.scholarship === selectedScholarship)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return b.createdAt - a.createdAt
      } else if (sortBy === "oldest") {
        return a.createdAt - b.createdAt
      } else if (sortBy === "rating-high") {
        return b.rating - a.rating
      } else if (sortBy === "rating-low") {
        return a.rating - b.rating
      }
      return 0
    })

    setFilteredTestimonials(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [testimonials, selectedScholarship, sortBy])

  // Get unique scholarships for filters
  const uniqueScholarships = ["All", ...new Set(testimonials.map(t => t.scholarship).filter(Boolean))]

  const toggleExpand = (id) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }


  // Refresh testimonials after submission
  const handleTestimonialSubmitted = () => {
    fetchTestimonials()
  }

  // Auto-open testimonial modal on first visit (check localStorage)
  useEffect(() => {
    if (!user?.uid || loading) return
    
    const hasSeenModal = localStorage.getItem(`testimonial-modal-seen-${user.uid}`)
    if (!hasSeenModal) {
      // Delay to let page load first
      setTimeout(() => {
        setIsTestimonialModalOpen(true)
      }, 1000)
    }
  }, [user, loading])

  // Pagination for testimonials
  const totalPages = Math.ceil(filteredTestimonials.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTestimonials = filteredTestimonials.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="relative">
        <div className="px-3 pb-20 pt-3 md:px-6 md:pb-8 md:pt-4 lg:px-8 lg:pb-10">
          <div 
            className="space-y-8 transition-all duration-300"
          >
            <div className="rounded-xl border border-border bg-gradient-to-br from-card via-card to-secondary/5 p-4 shadow-lg md:p-8">
              <TestimonialsSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="px-3 pb-20 pt-3 md:px-6 md:pb-8 md:pt-4 lg:px-8 lg:pb-10">
        {/* Testimonials Section - Exact same width as banner */}
        <div 
          className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/5 p-4 shadow-xl transition-all duration-300 sm:p-5 md:p-8 lg:p-10 xl:p-12"
        >
            <div className="mb-6 flex flex-col gap-3 sm:mb-7 md:mb-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">Student Testimonials</h2>
                <p className="text-sm text-muted-foreground sm:text-base">Read what other students are saying about their scholarship experience</p>
              </div>
              <button
                onClick={() => setIsTestimonialModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-primary/90 hover:to-secondary/90 hover:shadow-xl sm:px-6 sm:py-3 md:w-auto md:transform md:hover:scale-105"
              >
                <MessageSquare className="w-5 h-5" />
                Share Your Testimonial
              </button>
            </div>

            {/* Filters and Sort */}
            {testimonials.length > 0 && (
              <div className="mb-6 rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/30 p-3.5 shadow-sm sm:p-5">
                <div className="mb-3.5 flex items-center gap-2 sm:mb-4">
                  <Filter className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Filters & Sort</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  {/* Scholarship Filter */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-primary" />
                      Scholarship
                    </label>
                    <div className="relative">
                      <select
                        value={selectedScholarship}
                        onChange={(e) => setSelectedScholarship(e.target.value)}
                        className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 sm:px-4"
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
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                      Sort By
                    </label>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 sm:px-4"
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
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {filteredTestimonials.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {testimonials.length === 0 
                    ? "No testimonials yet. Be the first to share!"
                    : "No testimonials match your filters. Try adjusting your selection."}
                </p>
              </div>
            ) : (
              <>
                {/* Testimonials Grid - Enhanced Cards */}
                <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6 lg:grid-cols-3 lg:gap-8">
                  {paginatedTestimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="group flex flex-col rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-5 md:p-6 lg:p-7 lg:hover:scale-[1.02]"
                    >
                      {/* Card Header */}
                      <div className="mb-4 flex items-start gap-3 sm:mb-5 sm:gap-4">
                        {testimonial.photoURL ? (
                          <img
                            src={testimonial.photoURL}
                            alt={testimonial.name}
                            className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-2 ring-primary/30 shadow-md transition-all duration-300 group-hover:ring-primary/50 sm:h-14 sm:w-14"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const fallback = e.target.nextElementSibling
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-base font-bold text-white ring-2 ring-primary/30 shadow-md transition-all duration-300 group-hover:ring-primary/50 sm:h-14 sm:w-14 sm:text-lg ${testimonial.photoURL ? 'hidden' : 'flex'}`}
                        >
                          {testimonial.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="mb-2 truncate text-base font-bold text-foreground transition-colors duration-300 group-hover:text-primary sm:text-lg">
                            {testimonial.name}
                          </p>
                          <div className="flex items-center gap-1 mb-3">
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
                          {/* Scholarship */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-primary transition-all duration-200 hover:bg-primary/20 sm:px-3">
                              <Award className="w-3.5 h-3.5" />
                              <span className="max-w-[145px] truncate text-xs font-semibold sm:max-w-[160px]">{testimonial.scholarship}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Testimonial Content */}
                      <div className="relative mb-4 flex-1 sm:mb-5">
                        <Quote className="w-7 h-7 text-primary/20 absolute -top-1 -left-1 group-hover:text-primary/30 transition-colors duration-300" />
                        <div className="pl-6">
                          <p className={`text-sm leading-relaxed text-foreground transition-all duration-300 ${
                            expandedCards.has(testimonial.id) ? '' : 'line-clamp-5'
                          }`}>
                            {testimonial.testimonial}
                          </p>
                          {testimonial.testimonial.length > 200 && (
                            <button
                              onClick={() => toggleExpand(testimonial.id)}
                              className="mt-3 text-xs text-primary hover:text-primary/80 font-semibold transition-all duration-200 flex items-center gap-1.5 hover:gap-2"
                            >
                              {expandedCards.has(testimonial.id) ? (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform duration-200" />
                                  Read Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
                                  Read More
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Card Footer - Date & Time like Facebook */}
                      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-4 text-xs text-muted-foreground sm:gap-2 sm:pt-5">
                        <div className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors duration-200 hover:bg-muted/50">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-semibold">
                            {formatTimeAgo(testimonial.createdAt)}
                          </span>
                        </div>
                        {testimonial.createdAt && (
                          <span className="text-muted-foreground/60 font-medium">
                            • {testimonial.createdAt.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: testimonial.createdAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination footer (uniform: Previous | Page X of Y | Next) */}
                {totalPages > 1 && (
                  <div className="flex flex-col gap-3 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
                    <div className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
                      Showing{" "}
                      <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
                      <span className="font-semibold text-foreground">{Math.min(endIndex, filteredTestimonials.length)}</span>{" "}
                      of <span className="font-semibold text-foreground">{filteredTestimonials.length}</span> testimonial
                      {filteredTestimonials.length !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center justify-center gap-2 sm:justify-end">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
                      >
                        Previous
                      </button>
                      <span className="px-1.5 text-xs font-medium text-foreground sm:px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      {/* Testimonial Modal */}
      <TestimonialModal
        isOpen={isTestimonialModalOpen}
        onClose={() => {
          setIsTestimonialModalOpen(false)
          if (user?.uid) {
            localStorage.setItem(`testimonial-modal-seen-${user.uid}`, "true")
          }
        }}
        userId={user?.uid}
        userName={userName}
        onTestimonialSubmitted={handleTestimonialSubmitted}
      />
    </div>
  )
}

