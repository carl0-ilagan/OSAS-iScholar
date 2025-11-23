"use client"

import { useState, useRef, useEffect } from "react"
import { CheckCircle, GraduationCap, DollarSign, ArrowRight, FileText, Eye, X } from "lucide-react"
import ScholarshipApplyModal from "./scholarship-apply-modal"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"

export default function ScholarshipApplicationCards({ id, name, description, benefit, benefitAmount, requirements = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [userData, setUserData] = useState(null)
  const [hasApplied, setHasApplied] = useState(false)
  const [isCheckingApplication, setIsCheckingApplication] = useState(true)
  const modalRef = useRef(null)
  const { user } = useAuth()

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleCloseModal()
      }
    }

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

  const handleCloseModal = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsModalOpen(false)
      setIsClosing(false)
    }, 200) // Match animation duration
  }

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal()
      }
    }
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isModalOpen])

  // Fetch user data and check if already applied
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          // Fetch user data
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setUserData(userDoc.data())
          }

          // Check if user has already applied for this scholarship
          try {
            // Try both number and string comparison since scholarshipId can be either
            const applicationsQuery = query(
              collection(db, "applications"),
              where("userId", "==", user.uid)
            )
            const applicationsSnapshot = await getDocs(applicationsQuery)
            
            if (!applicationsSnapshot.empty) {
              // Check if any application matches this scholarship ID (as number or string)
              const hasMatchingApplication = applicationsSnapshot.docs.some(doc => {
                const data = doc.data()
                const appScholarshipId = data.scholarshipId
                // Compare both as number and string
                return appScholarshipId === id || 
                       appScholarshipId === Number(id) || 
                       String(appScholarshipId) === String(id)
              })
              
              if (hasMatchingApplication) {
                setHasApplied(true)
              }
            }
          } catch (applicationError) {
            console.log("Error checking application status:", applicationError)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        } finally {
          setIsCheckingApplication(false)
        }
      } else {
        setIsCheckingApplication(false)
      }
    }
    fetchUserData()
  }, [user, id])

  // Get basic requirements (first 4-5 items)
  const basicRequirements = requirements.slice(0, 5)
  const hasMoreRequirements = requirements.length > 5
  
  // Convert requirements to display format if needed
  const displayRequirements = requirements.map(req => {
    if (typeof req === 'object' && req.label) {
      return req.label
    }
    return req
  })

  return (
    <>
      <div 
        className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        {/* Header with Icon */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 md:p-5 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {name}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-5">
          {/* Benefit Section - Enhanced */}
          <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Benefit</p>
            </div>
            <p className="text-base md:text-lg font-bold text-foreground mb-1">{benefit}</p>
            <p className="text-sm font-semibold text-primary">{benefitAmount}</p>
          </div>

          {/* Basic Requirements Preview */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Basic Requirements</p>
            </div>
            <div className="space-y-2">
              {basicRequirements.map((req, index) => {
                const label = typeof req === 'object' ? req.label : req
                return (
                  <div 
                    key={index} 
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{label}</span>
                  </div>
                )
              })}
              {hasMoreRequirements && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  + {requirements.length - 5} more requirements
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            {hasApplied ? (
              <button 
                className="w-full bg-muted text-muted-foreground font-semibold py-3 rounded-lg cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                disabled
              >
                <CheckCircle className="w-4 h-4" />
                <span>Already Applied</span>
              </button>
            ) : (
              <button 
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-md hover:shadow-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsApplyModalOpen(true)
                }}
                disabled={isCheckingApplication}
              >
                <span>Apply Now</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            )}
            
            <button
              onClick={() => {
                setIsClosing(false)
                setIsModalOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20 hover:border-primary/40"
            >
              <Eye className="w-4 h-4" />
              <span>View Full Requirements</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Requirements Modal - Enhanced with Close Animation */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] transition-opacity duration-200 ${
              isClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={handleCloseModal}
          />

          {/* Modal - Horizontal on Desktop, Vertical on Mobile */}
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 md:p-4 lg:p-6">
            <div
              ref={modalRef}
              className={`bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col md:flex-row transition-all duration-200 ${
                isClosing 
                  ? 'opacity-0 scale-95 translate-y-4' 
                  : 'opacity-100 scale-100 translate-y-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Side - Scholarship Info (Desktop) / Top (Mobile) */}
              <div className="w-full md:w-2/5 lg:w-1/3 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 p-6 md:p-7 border-b md:border-b-0 md:border-r border-border/30 flex flex-col flex-shrink-0">
                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">{name}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-card/80 backdrop-blur-sm rounded-xl border border-primary/20 shadow-sm">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Benefit</p>
                    <p className="text-base md:text-lg font-bold text-foreground mb-1.5">{benefit}</p>
                    <p className="text-sm font-semibold text-primary">{benefitAmount}</p>
                  </div>
                </div>
              </div>

              {/* Right Side - Full Requirements List (Desktop) / Bottom (Mobile) */}
              <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col min-h-0 bg-card">
                {/* Header - Enhanced */}
                <div className="p-5 md:p-6 border-b border-border/30 bg-gradient-to-r from-primary/5 to-secondary/5 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-foreground">Full Requirements</h3>
                    </div>
                    <button
                      onClick={handleCloseModal}
                      className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors group"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Content - Scrollable, Enhanced */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 scrollbar-hide">
                  <div className="space-y-3">
                    {requirements.map((req, index) => {
                      const label = typeof req === 'object' && req.label ? req.label : req
                      return (
                        <div 
                          key={index} 
                          className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/30 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                          style={{ 
                            animationDelay: `${index * 50}ms`,
                            animation: isClosing ? 'none' : 'fadeInUp 0.4s ease-out forwards'
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                            <CheckCircle className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm md:text-base text-foreground leading-relaxed flex-1">{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer - Enhanced */}
                <div className="p-5 md:p-6 border-t border-border/30 flex-shrink-0 bg-muted/5">
                  <button
                    onClick={handleCloseModal}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg text-sm md:text-base"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Apply Modal */}
      <ScholarshipApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        scholarship={{ id, name, description, benefit, benefitAmount, requirements }}
        userData={userData}
        onApplicationSubmitted={() => setHasApplied(true)}
      />
    </>
  )
}
