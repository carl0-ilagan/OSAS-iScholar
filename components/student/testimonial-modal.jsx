"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import { Star, Send, Loader2, User, GraduationCap } from "lucide-react"
import { toast } from "sonner"

const SCHOLARSHIPS = [
  "Merit Scholarship",
  "Needs-Based Grant",
  "Tertiary Education Subsidy (TES)",
  "Teacher Development Program (TDP)",
]

export default function TestimonialModal({ isOpen, onClose, userId, userName, onTestimonialSubmitted }) {
  const [testimonial, setTestimonial] = useState("")
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [userPhotoURL, setUserPhotoURL] = useState(null)
  const [selectedScholarship, setSelectedScholarship] = useState("")
  const [userCourse, setUserCourse] = useState("")
  const [userCampus, setUserCampus] = useState("")

  // Fetch user profile picture, course, and campus
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setUserPhotoURL(null)
        setUserCourse("")
        setUserCampus("")
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserPhotoURL(data.photoURL || null)
          setUserCourse(data.course || "")
          setUserCampus(data.campus || "")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setUserPhotoURL(null)
        setUserCourse("")
        setUserCampus("")
      }
    }

    if (isOpen && userId) {
      fetchUserData()
    }
  }, [isOpen, userId])

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setTestimonial("")
      setRating(0)
      setHoverRating(0)
      setSelectedScholarship("")
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!userId) {
      toast.error("Please log in to submit a testimonial", {
        duration: 3000,
      })
      return
    }

    if (rating === 0) {
      toast.error("Please provide a rating", {
        duration: 3000,
      })
      return
    }

    if (!selectedScholarship) {
      toast.error("Please select a scholarship", {
        duration: 3000,
      })
      return
    }

    if (!testimonial.trim()) {
      toast.error("Please write your testimonial", {
        duration: 3000,
      })
      return
    }

    try {
      setSubmitting(true)
      
      await addDoc(collection(db, "testimonials"), {
        userId: userId,
        testimonial: testimonial.trim(),
        rating: rating,
        scholarship: selectedScholarship,
        course: userCourse,
        campus: userCampus,
        createdAt: serverTimestamp(),
      })

      toast.success("Testimonial submitted successfully!", {
        duration: 3000,
      })

      // Trigger refresh if callback provided
      if (onTestimonialSubmitted) {
        onTestimonialSubmitted()
      }

      onClose()
    } catch (error) {
      console.error("Error submitting testimonial:", error)
      toast.error("Failed to submit testimonial", {
        description: error.message || "Please try again later.",
        duration: 4000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[calc(100%-2rem)] max-w-2xl md:max-w-4xl lg:max-w-5xl h-[600px] md:h-[650px] overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Share Your Testimonial</DialogTitle>
        <div className={`
          bg-card border border-border rounded-xl shadow-2xl
          transition-all duration-300 ease-out
          ${isOpen ? 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4' : 'animate-out fade-out zoom-out-95 slide-out-to-bottom-4'}
          flex flex-col md:flex-row
          h-full overflow-hidden
        `}>
          {/* Left Side - Form (Desktop) / Top (Mobile) */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-light text-foreground tracking-tight mb-2">
                Share Your Testimonial
              </h2>
              <p className="text-sm text-muted-foreground font-light">
                Help other students by sharing your experience
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col min-h-0">
              {/* Scholarship Selection */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Scholarship <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedScholarship}
                    onChange={(e) => setSelectedScholarship(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300 ease-in-out appearance-none cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:shadow-md font-light"
                    required
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem center',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="">Select a scholarship</option>
                    {SCHOLARSHIPS.map((scholarship) => (
                      <option key={scholarship} value={scholarship}>
                        {scholarship}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-300 ease-in-out">
                    <svg 
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${selectedScholarship ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {selectedScholarship && (
                  <div className="mt-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-xs text-primary font-medium">
                      Selected: <span className="font-semibold">{selectedScholarship}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Rating <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 transition-all duration-200 ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400 scale-110"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-4 text-sm text-muted-foreground font-light">
                      {rating} out of 5
                    </span>
                  )}
                </div>
              </div>

              {/* Testimonial Text */}
              <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                <label htmlFor="testimonial" className="block text-sm font-medium text-foreground">
                  Your Testimonial <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="testimonial"
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                  placeholder="Share your experience with the scholarship system, how it helped you, or any advice for other students..."
                  rows={8}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none transition-all duration-200 font-light placeholder:text-muted-foreground/50 flex-1"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || rating === 0 || !selectedScholarship || !testimonial.trim()}
                className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2 flex-shrink-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Testimonial
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side - Info/Preview (Desktop only) - Horizontal Layout */}
          <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-8 md:p-12 border-l border-border/50">
            <div className="text-center space-y-6 max-w-sm">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto shadow-lg overflow-hidden ring-2 ring-primary/20">
                {userPhotoURL && userPhotoURL.trim() !== '' ? (
                  <img 
                    src={userPhotoURL} 
                    alt={userName || "Student"} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const fallback = e.target.nextElementSibling
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full flex items-center justify-center font-bold text-white text-lg bg-gradient-to-br from-primary to-secondary ${userPhotoURL && userPhotoURL.trim() !== '' ? 'hidden' : 'flex'}`}
                >
                  {(userName || "Student")[0]?.toUpperCase() || "S"}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-light text-foreground mb-2">
                  {userName || "Student"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">
                  Your testimonial will help other students make informed decisions about scholarships.
                </p>
              </div>
              <div className="pt-6 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-light">Share your honest experience</span>
                </div>
                <p className="text-xs text-muted-foreground font-light">
                  All testimonials are reviewed before being published.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

