"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import StudentPageBanner from "@/components/student/page-banner"
import { MessageSquare, Star, ChevronLeft, ChevronRight, Calendar, Quote, Award, Filter, ChevronDown, ArrowUpDown } from "lucide-react"
import TestimonialModal from "@/components/student/testimonial-modal"
import TestimonialsSkeleton from "@/components/student/testimonials-skeleton"

export default function TestimonialsPage() {
  const { user } = useAuth()
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(true)
  const [contentStyle, setContentStyle] = useState({ marginLeft: '1rem', marginRight: '1rem' })
  const [isClient, setIsClient] = useState(false)
  
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

  // Match content width with banner
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const detectSidebarWidth = () => {
      if (typeof window === 'undefined' || window.innerWidth < 768) {
        setContentStyle({ marginLeft: '1rem', marginRight: '1rem' })
        return
      }
      // On desktop, main content area starts after sidebar
      // Banner uses: left = sidebarWidth + 16px, right = 1.5rem
      // Content should use: marginLeft = 16px (gap from sidebar), marginRight = 1.5rem
      setContentStyle({ 
        marginLeft: '16px', 
        marginRight: '1.5rem' 
      })
    }

    detectSidebarWidth()
    const observer = new ResizeObserver(detectSidebarWidth)
    const sidebar = document.querySelector('aside')
    if (sidebar) observer.observe(sidebar)
    window.addEventListener('resize', detectSidebarWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', detectSidebarWidth)
    }
  }, [isClient])

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
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
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
        } catch (error) {
          snapshot = await getDocs(collection(db, "testimonials"))
        }

        const testimonialsData = []
        
        // Fetch all testimonials first
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Fetch user data for each testimonial
          let name = "Anonymous"
          let photoURL = null
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                name = userData.fullName || userData.displayName || "Anonymous"
                photoURL = userData.photoURL || null
              }
            } catch (err) {
              console.error("Error fetching user:", err)
            }
          }

          testimonialsData.push({
            id: docSnap.id,
            userId: data.userId,
            name: name,
            photoURL: photoURL,
            testimonial: data.testimonial || "",
            rating: data.rating || 0,
            scholarship: data.scholarship || "N/A",
            course: data.course || "N/A",
            campus: data.campus || "N/A",
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
          })
        }

        // Sort manually if needed
        testimonialsData.sort((a, b) => {
          const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return dateB - dateA
        })

        setTestimonials(testimonialsData)
        setFilteredTestimonials(testimonialsData)
      } catch (error) {
        console.error("Error fetching testimonials:", error)
      }
    }

  // Fetch testimonials on mount
  useEffect(() => {
    fetchTestimonials()
  }, [])

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
        <StudentPageBanner
          icon={MessageSquare}
          title="Testimonials"
          description="Read and share experiences from fellow students"
          userName={userName}
        />
        <div className="mt-36 md:mt-28">
          <div 
            className="space-y-8 p-4 md:p-6 lg:p-8 transition-all duration-300"
            style={contentStyle}
          >
            <div className="bg-gradient-to-br from-card via-card to-secondary/5 border border-border rounded-xl p-6 md:p-8 shadow-lg">
              <TestimonialsSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Banner */}
      <StudentPageBanner
        icon={MessageSquare}
        title="Testimonials"
        description="Read and share experiences from fellow students"
        userName={userName}
      />

      {/* Content - Same width as banner with proper spacing */}
      <div className="mt-40 md:mt-36" style={{ width: '100%' }}>
        {/* Testimonials Section - Exact same width as banner */}
        <div 
          className="bg-gradient-to-br from-card via-card to-secondary/5 border border-border rounded-2xl p-6 md:p-8 lg:p-10 xl:p-12 shadow-xl transition-all duration-300"
          style={contentStyle}
        >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Student Testimonials</h2>
                <p className="text-base text-muted-foreground">Read what other students are saying about their scholarship experience</p>
              </div>
              <button
                onClick={() => setIsTestimonialModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white rounded-xl transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl w-full md:w-auto justify-center transform hover:scale-105"
              >
                <MessageSquare className="w-5 h-5" />
                Share Your Testimonial
              </button>
            </div>

            {/* Filters and Sort */}
            {testimonials.length > 0 && (
              <div className="mb-6 p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Filters & Sort</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 appearance-none cursor-pointer hover:border-primary/50 hover:bg-primary/5"
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
                        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 appearance-none cursor-pointer hover:border-primary/50 hover:bg-primary/5"
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 mb-8">
                  {paginatedTestimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="bg-card border border-border rounded-2xl p-6 md:p-7 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 flex flex-col group"
                    >
                      {/* Card Header */}
                      <div className="flex items-start gap-4 mb-5">
                        {testimonial.photoURL ? (
                          <img
                            src={testimonial.photoURL}
                            alt={testimonial.name}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 shadow-md flex-shrink-0 group-hover:ring-primary/50 transition-all duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const fallback = e.target.nextElementSibling
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg ring-2 ring-primary/30 shadow-md flex-shrink-0 group-hover:ring-primary/50 transition-all duration-300 ${testimonial.photoURL ? 'hidden' : 'flex'}`}
                        >
                          {testimonial.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-lg mb-2 truncate group-hover:text-primary transition-colors duration-300">
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
                            <div className="flex items-center gap-1.5 text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-all duration-200">
                              <Award className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold truncate max-w-[160px]">{testimonial.scholarship}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Testimonial Content */}
                      <div className="flex-1 mb-5 relative">
                        <Quote className="w-7 h-7 text-primary/20 absolute -top-1 -left-1 group-hover:text-primary/30 transition-colors duration-300" />
                        <div className="pl-6">
                          <p className={`text-sm text-foreground leading-relaxed transition-all duration-300 ${
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-5 border-t border-border/50 mt-auto">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors duration-200">
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to <span className="font-semibold text-foreground">{Math.min(endIndex, filteredTestimonials.length)}</span> of <span className="font-semibold text-foreground">{filteredTestimonials.length}</span> testimonial{filteredTestimonials.length !== 1 ? 's' : ''}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2.5 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 ${
                                currentPage === pageNum
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-background text-foreground hover:bg-muted border border-border'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2.5 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
                      >
                        <ChevronRight className="w-4 h-4" />
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

