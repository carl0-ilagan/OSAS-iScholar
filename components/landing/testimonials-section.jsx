"use client"

import { useState, useEffect } from "react"
import { Star, ChevronLeft, ChevronRight, Award, GraduationCap } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from "firebase/firestore"

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedTestimonials()
  }, [])

  useEffect(() => {
    if (testimonials.length <= 3) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 3) % testimonials.length)
    }, 5000) // Auto-scroll every 5 seconds

    return () => clearInterval(interval)
  }, [testimonials.length])

  const fetchFeaturedTestimonials = async () => {
    try {
      setLoading(true)
      const testimonialsQuery = query(
        collection(db, "testimonials"),
        where("featuredOnLanding", "==", true),
        orderBy("createdAt", "desc"),
        limit(6)
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
          createdAt: data.createdAt?.toDate() || new Date()
        }
      })
      
      setTestimonials(testimonialsData)
    } catch (error) {
      console.error("Error fetching featured testimonials:", error)
      // Fallback to empty array
      setTestimonials([])
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = () => {
    if (testimonials.length <= 3) return
    setCurrentIndex((prev) => (prev + 3) % testimonials.length)
  }

  const prevSlide = () => {
    if (testimonials.length <= 3) return
    setCurrentIndex((prev) => (prev - 3 + testimonials.length) % testimonials.length)
  }

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + 3)

  if (loading) {
    return (
      <section id="testimonials" className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Student Stories</h2>
            <p className="text-muted-foreground text-lg">Hear from our scholarship recipients</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border/50 rounded-xl p-8 animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded w-20 mb-4"></div>
                <div className="h-16 bg-muted rounded mb-6"></div>
                <div className="h-3 bg-muted rounded w-36"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (testimonials.length === 0) {
    return null // Don't show section if no featured testimonials
  }

  return (
    <section id="testimonials" className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Student Stories
          </h2>
          <p className="text-muted-foreground text-lg">Hear from our scholarship recipients</p>
        </div>

        <div className="relative">
          {/* Testimonials Carousel */}
          <div className="grid md:grid-cols-3 gap-8 overflow-hidden">
            {visibleTestimonials.map((testimonial, index) => (
            <div
                key={testimonial.id}
                className="bg-card border border-border/50 rounded-xl p-8 hover:border-border transition-all duration-300 animate-in fade-in slide-in-from-right"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Profile Section - Top */}
                <div className="flex items-center gap-4 mb-6">
                  {testimonial.photoURL ? (
                    <img
                      src={testimonial.photoURL}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        const fallback = e.target.nextElementSibling
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0 ${testimonial.photoURL ? 'hidden' : 'flex'}`}
                  >
                    {testimonial.name?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-base mb-0.5 truncate">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{testimonial.course}</p>
                  </div>
                </div>

                {/* Rating - Minimalist */}
                <div className="flex gap-0.5 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= testimonial.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-200"
                      }`}
                    />
                ))}
              </div>

                {/* Testimonial Text */}
                <p className="text-foreground mb-6 leading-relaxed text-sm min-h-[80px]">
                  "{testimonial.testimonial}"
                </p>

                {/* Scholarship Badge - Minimalist */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-4 border-t border-border/30">
                  <Award className="w-3.5 h-3.5" />
                  <span className="truncate">{testimonial.scholarship}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Buttons - Minimalist */}
          {testimonials.length > 3 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 bg-background border border-border/50 text-foreground p-3 rounded-full shadow-sm hover:shadow-md hover:bg-muted transition-all duration-200 z-10"
                aria-label="Previous testimonials"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 bg-background border border-border/50 text-foreground p-3 rounded-full shadow-sm hover:shadow-md hover:bg-muted transition-all duration-200 z-10"
                aria-label="Next testimonials"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dots Indicator - Minimalist */}
          {testimonials.length > 3 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: Math.ceil(testimonials.length / 3) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index * 3)}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    Math.floor(currentIndex / 3) === index
                      ? "bg-foreground w-8"
                      : "bg-border w-1.5 hover:bg-muted-foreground/40"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
