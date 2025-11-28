"use client"

import { useState, useRef, useEffect } from "react"
import { CheckCircle, GraduationCap, ArrowRight, FileText, Eye, Sparkles, Award, Clock, AlertCircle } from "lucide-react"
import ScholarshipApplyModal from "./scholarship-apply-modal"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"

export default function ScholarshipApplicationCards({ id, name, description, benefit, benefitAmount, requirements = [], documentRequirementIds = [], slots, batchName, logo, temporarilyClosed, active }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [userData, setUserData] = useState(null)
  const [hasApplied, setHasApplied] = useState(false)
  const [isCheckingApplication, setIsCheckingApplication] = useState(true)
  const modalRef = useRef(null)
  const { user } = useAuth()

  // Format benefit amount - if it's just a number, add peso sign
  const formatBenefitAmount = (amount) => {
    if (!amount || amount === 'N/A') return amount
    // If it's already formatted (contains peso sign or text), return as is
    if (typeof amount === 'string' && (amount.includes('₱') || amount.includes('peso') || isNaN(amount.replace(/[,\s]/g, '')))) {
      return amount
    }
    // If it's a number or numeric string, format it
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount.toString().replace(/[,\s]/g, ''))
    if (!isNaN(numAmount)) {
      return `₱${numAmount.toLocaleString('en-US')}`
    }
    return amount
  }

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

  // Build requirements list: 2 default forms + document requirements
  const defaultForms = ["APPLICATION FORM", "STUDENT'S PROFILE FORM"]
  
  // Note: Document requirements will be shown in the apply modal
  // We don't need to show them in the card preview

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
              {logo ? (
                <div className="w-12 h-12 rounded-xl bg-card border border-border/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md overflow-hidden">
                  <img src={logo} alt={name} className="w-full h-full object-contain p-1" />
                </div>
              ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {name}
                </h3>
                  {temporarilyClosed && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-600 rounded-md border border-orange-500/30">
                      Closed
                    </span>
                  )}
                </div>
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
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Benefit</p>
            </div>
            <p className="text-base md:text-lg font-bold text-foreground mb-1">{benefit}</p>
            <p className="text-sm font-semibold text-primary mb-2">{formatBenefitAmount(benefitAmount)}</p>
            {(batchName || slots) && (
              <div className="flex items-center gap-4 pt-2 border-t border-primary/20 text-xs">
                {batchName && (
                  <span className="text-muted-foreground">
                    Batch: <span className="font-semibold text-foreground">{batchName}</span>
                  </span>
                )}
                {slots && (
                  <span className="text-muted-foreground">
                    Slots: <span className="font-semibold text-foreground">{slots}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Basic Requirements Preview */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Requirements</p>
            </div>
            <div className="space-y-2">
              {defaultForms.map((form, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-2.5 text-sm"
                >
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{form}</span>
                </div>
              ))}
              {documentRequirementIds && documentRequirementIds.length > 0 && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  + {documentRequirementIds.length} document requirement{documentRequirementIds.length !== 1 ? 's' : ''}
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
            ) : temporarilyClosed ? (
              <button 
                className="w-full bg-muted text-muted-foreground font-semibold py-3 rounded-lg cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                disabled
              >
                <AlertCircle className="w-4 h-4" />
                <span>Temporarily Closed</span>
              </button>
            ) : !active ? (
              <button 
                className="w-full bg-muted text-muted-foreground font-semibold py-3 rounded-lg cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                disabled
              >
                <AlertCircle className="w-4 h-4" />
                <span>Not Available</span>
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

      {/* Full Requirements Modal - Enhanced with Pop-up Animation */}
      {isModalOpen && (
        <>
          {/* Backdrop with fade-in */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[80] transition-all duration-300 ${
              isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'
            }`}
            onClick={handleCloseModal}
          />

          {/* Modal with pop-up animation */}
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
            <div
              ref={modalRef}
              className={`bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[96vh] sm:max-h-[94vh] overflow-hidden flex flex-col md:flex-row transition-all duration-300 ${
                isClosing 
                  ? 'opacity-0 scale-95 translate-y-4' 
                  : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-95 slide-in-from-bottom-4'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Side - Scholarship Info (Desktop) / Top (Mobile) */}
              <div className="w-full md:w-2/5 lg:w-1/3 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 p-4 sm:p-5 md:p-6 border-b md:border-b-0 md:border-r border-border/30 flex flex-col flex-shrink-0 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="hidden md:block absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="hidden md:block absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative mb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                    {logo ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-card border-2 border-border/30 flex items-center justify-center shadow-md ring-2 ring-primary/20 overflow-hidden flex-shrink-0">
                        <img 
                          src={logo} 
                          alt={name} 
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md ring-2 ring-primary/20 flex-shrink-0">
                        <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground truncate flex-1">{name}</h2>
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-card/80 backdrop-blur-sm rounded-lg sm:rounded-xl border border-primary/20 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Benefit</p>
                    </div>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-foreground mb-1">{benefit}</p>
                    <p className="text-xs sm:text-sm font-semibold text-primary">{formatBenefitAmount(benefitAmount)}</p>
                    {(batchName || slots) && (
                      <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-primary/20 text-xs">
                        {batchName && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Batch: <span className="font-semibold text-foreground">{batchName}</span></span>
                          </div>
                        )}
                        {slots && (
                          <span className="text-muted-foreground">Slots: <span className="font-semibold text-foreground">{slots}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side - Full Requirements List (Desktop) / Bottom (Mobile) */}
              <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col min-h-0 bg-card">
                {/* Header - Enhanced */}
                <div className="relative p-4 sm:p-5 md:p-6 border-b border-border/30 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 flex-shrink-0 overflow-hidden">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="relative flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground">Full Requirements</h3>
                      <p className="text-xs text-muted-foreground hidden sm:block">Complete list of required forms and documents</p>
                    </div>
                  </div>
                </div>

                {/* Content - Scrollable, Enhanced */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 custom-scrollbar bg-gradient-to-b from-background to-muted/20">
                  {/* Default Forms */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
                      <p className="text-xs sm:text-sm font-bold text-foreground">Required Forms (2)</p>
                    </div>
                    <div className="space-y-2">
                      {defaultForms.map((form, index) => (
                        <div 
                          key={index} 
                          className="flex items-start gap-2.5 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-500/10 to-primary/10 border-2 border-green-500/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: isClosing ? 'none' : 'fadeInUp 0.5s ease-out forwards',
                            opacity: isClosing ? 0 : 1
                          }}
                        >
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm sm:text-base font-semibold text-foreground leading-relaxed block">{form}</span>
                            <span className="text-xs text-muted-foreground mt-0.5 block">Must be completed to apply</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Document Requirements */}
                  {documentRequirementIds && documentRequirementIds.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-1 h-5 bg-gradient-to-b from-primary to-secondary rounded-full"></div>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          Document Requirements ({documentRequirementIds.length})
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/20 rounded-lg sm:rounded-xl">
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-foreground mb-1">
                              View Full Details
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click "Apply Now" to see the complete list of document requirements and their status
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-2 border-blue-500/20 rounded-lg sm:rounded-xl">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-foreground mb-1">Ready to Apply?</p>
                        <p className="text-xs text-muted-foreground">
                          Make sure you have completed all required forms and uploaded all necessary documents before submitting your application.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer - Enhanced */}
                <div className="p-4 sm:p-5 md:p-6 border-t-2 border-border/30 flex-shrink-0 bg-gradient-to-r from-muted/50 to-background">
                  <button
                    onClick={handleCloseModal}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 sm:py-3 rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
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
        scholarship={{ id, name, description, benefit, benefitAmount, documentRequirementIds }}
        userData={userData}
        onApplicationSubmitted={() => setHasApplied(true)}
      />
    </>
  )
}

