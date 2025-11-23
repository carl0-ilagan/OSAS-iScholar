"use client"

import { useState, useEffect } from "react"
import ScholarshipApplicationCards from "@/components/student/scholarship-cards"
import ScholarshipCardsSkeleton from "@/components/student/scholarship-cards-skeleton"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { GraduationCap, Clock } from "lucide-react"

// Static scholarship data fallback
const STATIC_SCHOLARSHIP_DATA = {
  "Merit Scholarship": {
    benefit: "Full Tuition + Stipend + Allowance",
    benefitAmount: "Up to ₱80,000/year (SUC)",
  },
  "Needs-Based Grant": {
    benefit: "Tuition support based on family income",
    benefitAmount: "Up to 50% Tuition Coverage",
  },
  "Tertiary Education Subsidy (TES)": {
    benefit: "Annual educational subsidy",
    benefitAmount: "₱20,000/year (SUC)",
  },
  "Teacher Development Program (TDP)": {
    benefit: "Financial support every semester",
    benefitAmount: "₱7,500 per semester (₱15,000/year)",
  },
}

export default function ApplyPage() {
  const [scholarships, setScholarships] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isClient, setIsClient] = useState(false)

  // Set client-side flag to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Detect sidebar width for desktop banner positioning
  useEffect(() => {
    if (!isClient) return

    const detectSidebarWidth = () => {
      if (typeof window === 'undefined' || window.innerWidth < 768) return
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth)
      }
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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch scholarships from Firestore
  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        // Try to fetch from Firestore first
        const scholarshipsQuery = query(
          collection(db, "scholarships"),
          orderBy("createdAt", "desc")
        )
        const snapshot = await getDocs(scholarshipsQuery)
        
        if (!snapshot.empty) {
          const scholarshipsData = snapshot.docs.map(doc => {
            const data = doc.data()
            const scholarshipName = data.name || ""
            const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
            
            // Merge Firestore data with static fallback data
            return {
              id: doc.id,
              ...data,
              // Use Firestore data if available, otherwise use static fallback
              benefit: data.benefit || staticData.benefit || "N/A",
              benefitAmount: data.benefitAmount || data.amount || staticData.benefitAmount || "N/A",
            }
          })
          setScholarships(scholarshipsData)
        } else {
          // Fallback to static data with correct requirements
          setScholarships([
            {
              id: 1,
              name: "Merit Scholarship",
              description: "For academically excellent students",
              benefit: "Full Tuition + Stipend + Allowance",
              benefitAmount: "Up to ₱80,000/year (SUC)",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "number", label: "Household Annual Income", required: true },
                { type: "select", label: "PWD / Special Group (optional)", options: ["Yes", "No"], required: false },
                { type: "file", label: "Certificate of Grades (COG) – for GWA verification", required: true },
                { type: "file", label: "Senior High School Form 138 / Transcript", required: true },
                { type: "file", label: "Proof of Income (ITR, COE w/ Salary, Indigency, etc.)", required: true },
                { type: "file", label: "Certificate of Registration (COR)", required: true },
                { type: "file", label: "Validated School ID (Front)", required: true },
                { type: "file", label: "Validated School ID (Back)", required: true },
                { type: "file", label: "Birth Certificate", required: true },
              ],
            },
            {
              id: 2,
              name: "Needs-Based Grant",
              description: "For financially challenged students",
              benefit: "Tuition support based on family income",
              benefitAmount: "Up to 50% Tuition Coverage",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "number", label: "Household Annual Income", required: true },
                { type: "file", label: "Proof of Income / Indigency", required: true },
                { type: "file", label: "ID Front", required: true },
                { type: "file", label: "ID Back", required: true },
                { type: "file", label: "Certificate of Registration (COR)", required: true },
              ],
            },
            {
              id: 3,
              name: "Tertiary Education Subsidy (TES)",
              description: "For SUC / LUC students needing financial aid",
              benefit: "Annual educational subsidy",
              benefitAmount: "₱20,000/year (SUC)",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "file", label: "Proof of Enrollment / Registration", required: true },
                { type: "select", label: "No previous undergraduate degree", options: ["Yes", "No"], required: true },
                { type: "file", label: "ID + Proof of Enrollment", required: true },
                { type: "file", label: "Income proof (optional, for priority)", required: false },
              ],
            },
            {
              id: 4,
              name: "Teacher Development Program (TDP)",
              description: "For future education professionals",
              benefit: "Financial support every semester",
              benefitAmount: "₱7,500 per semester (₱15,000/year)",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "number", label: "Household Annual Income (must be ≤ ₱400,000)", required: true },
                { type: "select", label: "Enrolled in an education-related program", options: ["Yes", "No"], required: true },
                { type: "file", label: "ID + COR", required: true },
                { type: "file", label: "Indigency Certificate", required: true },
              ],
            },
          ])
        }
      } catch (error) {
        console.error("Error fetching scholarships:", error)
        // Fallback to static data on error
        setScholarships([
  {
    id: 1,
    name: "Merit Scholarship",
    description: "For academically excellent students",
            benefit: "Full Tuition + Stipend + Allowance",
            benefitAmount: "Up to ₱80,000/year (SUC)",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "number", label: "Household Annual Income", required: true },
              { type: "select", label: "PWD / Special Group (optional)", options: ["Yes", "No"], required: false },
              { type: "file", label: "Certificate of Grades (COG) – for GWA verification", required: true },
              { type: "file", label: "Senior High School Form 138 / Transcript", required: true },
              { type: "file", label: "Certificate of Registration (COR)", required: true },
              { type: "file", label: "Validated School ID (Front)", required: true, autoFill: "idFront" },
              { type: "file", label: "Validated School ID (Back)", required: true, autoFill: "idBack" },
              { type: "file", label: "Birth Certificate", required: true },
            ],
  },
  {
    id: 2,
    name: "Needs-Based Grant",
    description: "For financially challenged students",
            benefit: "Tuition support based on family income",
            benefitAmount: "Up to 50% Tuition Coverage",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "number", label: "Household Annual Income", required: true },
              { type: "file", label: "Proof of Income / Indigency", required: true },
              { type: "file", label: "ID Front", required: true },
              { type: "file", label: "ID Back", required: true },
              { type: "file", label: "Certificate of Registration (COR)", required: true },
            ],
  },
  {
    id: 3,
            name: "Tertiary Education Subsidy (TES)",
            description: "For SUC / LUC students needing financial aid",
            benefit: "Annual educational subsidy",
            benefitAmount: "₱20,000/year (SUC)",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "file", label: "Proof of Enrollment / Registration", required: true },
              { type: "select", label: "No previous undergraduate degree", options: ["Yes", "No"], required: true },
              { type: "file", label: "ID + Proof of Enrollment", required: true },
              { type: "file", label: "Income proof (optional, for priority)", required: false },
            ],
  },
  {
    id: 4,
            name: "Teacher Development Program (TDP)",
    description: "For future education professionals",
            benefit: "Financial support every semester",
            benefitAmount: "₱7,500 per semester (₱15,000/year)",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "number", label: "Household Annual Income (must be ≤ ₱400,000)", required: true },
              { type: "select", label: "Enrolled in an education-related program", options: ["Yes", "No"], required: true },
              { type: "file", label: "ID + COR", required: true },
              { type: "file", label: "Indigency Certificate", required: true },
            ],
  },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchScholarships()
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="relative">
        {/* Floating Banner - Skeleton */}
        <div 
          className="fixed top-20 md:top-4 z-40 transition-all duration-300"
          style={isClient ? { 
            left: window.innerWidth >= 768 
              ? `${sidebarWidth + 16}px` 
              : '1rem',
            right: window.innerWidth >= 768 ? '1.5rem' : '1rem'
          } : {
            left: '1rem',
            right: '1rem'
          }}
        >
          <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 md:p-5 rounded-2xl shadow-lg animate-pulse">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded animate-pulse" />
                <div className="space-y-1">
                  <div className="h-4 bg-white/20 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-white/20 rounded w-48 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                <div className="w-4 h-4 bg-white/20 rounded animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 bg-white/20 rounded w-16 animate-pulse" />
                  <div className="h-2 bg-white/20 rounded w-24 hidden sm:block animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Skeleton */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Header Skeleton */}
          <div className="text-center mb-6 md:mb-8">
            <div className="h-8 bg-muted rounded w-64 mx-auto mb-2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse" />
          </div>

          {/* Scholarship Cards Skeleton */}
          <ScholarshipCardsSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Floating Banner - Both Mobile and Desktop */}
      <div 
        className="fixed top-20 md:top-4 z-40 transition-all duration-300"
        style={isClient ? { 
          left: window.innerWidth >= 768 
            ? `${sidebarWidth + 16}px` 
            : '1rem',
          right: window.innerWidth >= 768 ? '1.5rem' : '1rem'
        } : {
          left: '1rem',
          right: '1rem'
        }}
      >
        <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 md:p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
              <div>
                <h2 className="text-base md:text-lg font-semibold">Apply for Scholarship</h2>
                <p className="text-xs text-white/80">Select a scholarship program to apply</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4" />
              <div className="text-right">
                <div className="font-semibold text-sm">{formatTime(currentTime)}</div>
                <div className="text-xs text-white/70 hidden sm:block">{formatDate(currentTime)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Centered with margin-top from banner */}
      <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
        {/* Header - Centered */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Available Scholarships
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a scholarship program that fits your profile
          </p>
        </div>

        {/* Scholarship Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {scholarships.map((scholarship) => (
              <ScholarshipApplicationCards key={scholarship.id} {...scholarship} />
            ))}
          </div>
        </div>
    </div>
  )
}
