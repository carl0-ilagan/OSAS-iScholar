"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import ApplicationsTable from "@/components/student/applications-table"
import StudentPageBanner from "@/components/student/page-banner"
import ApplicationsTableSkeleton from "@/components/student/applications-table-skeleton"
import { History, Search } from "lucide-react"

// Static scholarship data fallback (from apply page)
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

export default function ApplicationsPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [scholarshipsMap, setScholarshipsMap] = useState({})
  const [currentPage, setCurrentPage] = useState(1)

  const ITEMS_PER_PAGE = 10

  // Fetch applications from Firestore
  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        // Fetch user data for name
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserName(userData.fullName || userData.displayName || "Student")
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }

        // Fetch all scholarships to get benefit amounts
        let scholarships = {}
        try {
          const scholarshipsQuery = query(collection(db, "scholarships"))
          const scholarshipsSnapshot = await getDocs(scholarshipsQuery)
          
          scholarshipsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            const scholarshipName = data.name || ""
            const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
            
            // Use Firestore data if available, otherwise use static fallback
            const benefitAmount = data.benefitAmount || 
                                 data.amount || 
                                 staticData.benefitAmount || 
                                 "N/A"
            const benefit = data.benefit || 
                           staticData.benefit || 
                           "N/A"
            
            // Map by document ID (both string and number)
            scholarships[doc.id] = { benefitAmount, benefit }
            scholarships[String(doc.id)] = { benefitAmount, benefit }
            
            // Also map by name for fallback
            if (data.name) {
              scholarships[data.name] = { benefitAmount, benefit }
            }
          })
          setScholarshipsMap(scholarships)
        } catch (error) {
          console.error("Error fetching scholarships:", error)
        }

        // Fetch applications for this user
        const applicationsQuery = query(
          collection(db, "applications"),
          where("userId", "==", user.uid),
          orderBy("submittedAt", "desc")
        )
        const snapshot = await getDocs(applicationsQuery)
        
        const applicationsData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          const scholarshipName = data.scholarshipName || ""
          const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
          
          // Get scholarship benefit amount - prefer stored data, then fetch from scholarships, then static fallback
          const benefitAmount = data.benefitAmount || 
                               scholarships[String(data.scholarshipId)]?.benefitAmount ||
                               scholarships[data.scholarshipId]?.benefitAmount ||
                               scholarships[data.scholarshipName]?.benefitAmount ||
                               staticData.benefitAmount ||
                               "N/A"
          const benefit = data.benefit ||
                         scholarships[String(data.scholarshipId)]?.benefit ||
                         scholarships[data.scholarshipId]?.benefit ||
                         scholarships[data.scholarshipName]?.benefit ||
                         staticData.benefit ||
                         "N/A"
          
          return {
            id: docSnap.id,
            program: data.scholarshipName || "Unknown Scholarship",
            scholarshipName: data.scholarshipName || "Unknown Scholarship",
            trackerCode: data.trackerCode || "N/A",
            dateSubmitted: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
            submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
            status: data.status || "pending",
            amount: benefitAmount,
            benefit: benefit,
            course: data.course || "N/A",
            yearLevel: data.yearLevel || "N/A",
            campus: data.campus || "N/A",
            submittedAt: data.submittedAt,
            scholarshipId: data.scholarshipId,
            formData: data.formData || {},
            files: data.files || {},
            adminRemarks: data.adminRemarks || null,
            reviewedAt: data.reviewedAt || null,
          }
        })
        
        setApplications(applicationsData)
        setFilteredApplications(applicationsData)
      } catch (error) {
        console.error("Error fetching applications:", error)
        // If orderBy fails, try without it
        try {
          const simpleQuery = query(
            collection(db, "applications"),
            where("userId", "==", user.uid)
          )
          const snapshot = await getDocs(simpleQuery)
          
          // Fetch scholarships if not already fetched
          let scholarships = scholarshipsMap
          if (Object.keys(scholarships).length === 0) {
            try {
              const scholarshipsQuery = query(collection(db, "scholarships"))
              const scholarshipsSnapshot = await getDocs(scholarshipsQuery)
              scholarships = {}
              scholarshipsSnapshot.docs.forEach(doc => {
                const data = doc.data()
                const scholarshipName = data.name || ""
                const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
                
                // Use Firestore data if available, otherwise use static fallback
                const benefitAmount = data.benefitAmount || 
                                     data.amount || 
                                     staticData.benefitAmount || 
                                     "N/A"
                const benefit = data.benefit || 
                               staticData.benefit || 
                               "N/A"
                
                scholarships[doc.id] = { benefitAmount, benefit }
                scholarships[String(doc.id)] = { benefitAmount, benefit }
                
                if (data.name) {
                  scholarships[data.name] = { benefitAmount, benefit }
                }
              })
              setScholarshipsMap(scholarships)
            } catch (error) {
              console.error("Error fetching scholarships:", error)
            }
          }
          
          const applicationsData = snapshot.docs.map((docSnap) => {
            const data = docSnap.data()
            const scholarshipName = data.scholarshipName || ""
            const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
            
            // Get scholarship benefit amount - prefer stored data, then fetch from scholarships, then static fallback
            const benefitAmount = data.benefitAmount || 
                                 scholarships[String(data.scholarshipId)]?.benefitAmount ||
                                 scholarships[data.scholarshipId]?.benefitAmount ||
                                 scholarships[data.scholarshipName]?.benefitAmount ||
                                 staticData.benefitAmount ||
                                 "N/A"
            const benefit = data.benefit ||
                           scholarships[String(data.scholarshipId)]?.benefit ||
                           scholarships[data.scholarshipId]?.benefit ||
                           scholarships[data.scholarshipName]?.benefit ||
                           staticData.benefit ||
                           "N/A"
            
            return {
              id: docSnap.id,
              program: data.scholarshipName || "Unknown Scholarship",
              scholarshipName: data.scholarshipName || "Unknown Scholarship",
              trackerCode: data.trackerCode || "N/A",
              dateSubmitted: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
              submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
              status: data.status || "pending",
              amount: benefitAmount,
              benefit: benefit,
              course: data.course || "N/A",
              yearLevel: data.yearLevel || "N/A",
              campus: data.campus || "N/A",
              submittedAt: data.submittedAt,
              scholarshipId: data.scholarshipId,
              formData: data.formData || {},
              files: data.files || {},
              adminRemarks: data.adminRemarks || null,
              reviewedAt: data.reviewedAt || null,
            }
          })
          // Sort by submittedAt manually
          applicationsData.sort((a, b) => {
            if (!a.submittedAt) return 1
            if (!b.submittedAt) return -1
            return new Date(b.submittedAt) - new Date(a.submittedAt)
          })
          setApplications(applicationsData)
          setFilteredApplications(applicationsData)
        } catch (simpleError) {
          console.error("Error fetching applications (simple):", simpleError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [user])

  // Filter applications based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredApplications(applications)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = applications.filter(app => 
      app.trackerCode?.toLowerCase().includes(query) ||
      app.program?.toLowerCase().includes(query) ||
      app.status?.toLowerCase().includes(query) ||
      app.dateSubmitted?.toLowerCase().includes(query)
    )
    setFilteredApplications(filtered)
  }, [searchQuery, applications])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex)

  return (
    <div className="relative">
      {/* Floating Banner */}
      <StudentPageBanner
        icon={History}
        title="Application History"
        description="Track all your scholarship applications"
        userName={userName}
      />

      {/* Content */}
      <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
        {/* Search Bar - Right Side */}
        {!loading && applications.length > 0 && (
          <div className="mb-6 flex justify-end">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by tracker code..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
              />
            </div>
          </div>
        )}

        {loading ? (
          <ApplicationsTableSkeleton />
        ) : (
          <>
            <div className="animate-in fade-in duration-300">
              <ApplicationsTable 
                applications={paginatedApplications} 
                onUpdate={async () => {
                // Refresh applications after update
                if (user?.uid) {
                  try {
                    const applicationsQuery = query(
                      collection(db, "applications"),
                      where("userId", "==", user.uid),
                      orderBy("submittedAt", "desc")
                    )
                    const snapshot = await getDocs(applicationsQuery)
                    
                    // Fetch scholarships for benefit amounts
                    let scholarships = {}
                    try {
                      const scholarshipsQuery = query(collection(db, "scholarships"))
                      const scholarshipsSnapshot = await getDocs(scholarshipsQuery)
                      scholarshipsSnapshot.docs.forEach(doc => {
                        const data = doc.data()
                        const scholarshipName = data.name || ""
                        const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
                        
                        // Use Firestore data if available, otherwise use static fallback
                        const benefitAmount = data.benefitAmount || 
                                             data.amount || 
                                             staticData.benefitAmount || 
                                             "N/A"
                        const benefit = data.benefit || 
                                       staticData.benefit || 
                                       "N/A"
                        
                        scholarships[doc.id] = { benefitAmount, benefit }
                        if (data.name) {
                          scholarships[data.name] = { benefitAmount, benefit }
                        }
                      })
                    } catch (error) {
                      console.error("Error fetching scholarships:", error)
                    }
                    
                    const applicationsData = snapshot.docs.map((docSnap) => {
                      const data = docSnap.data()
                      const scholarshipName = data.scholarshipName || ""
                      const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
                      
                      // Get scholarship benefit amount - prefer stored data, then fetch from scholarships, then static fallback
                      const benefitAmount = data.benefitAmount || 
                                           scholarships[String(data.scholarshipId)]?.benefitAmount ||
                                           scholarships[data.scholarshipId]?.benefitAmount ||
                                           scholarships[data.scholarshipName]?.benefitAmount ||
                                           staticData.benefitAmount ||
                                           "N/A"
                      const benefit = data.benefit ||
                                     scholarships[String(data.scholarshipId)]?.benefit ||
                                     scholarships[data.scholarshipId]?.benefit ||
                                     scholarships[data.scholarshipName]?.benefit ||
                                     staticData.benefit ||
                                     "N/A"
                      
                      return {
                        id: docSnap.id,
                        program: data.scholarshipName || "Unknown Scholarship",
                        scholarshipName: data.scholarshipName || "Unknown Scholarship",
                        trackerCode: data.trackerCode || "N/A",
                        dateSubmitted: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
                        submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
                        status: data.status || "pending",
                        amount: benefitAmount,
                        benefit: benefit,
                        course: data.course || "N/A",
                        yearLevel: data.yearLevel || "N/A",
                        campus: data.campus || "N/A",
                        submittedAt: data.submittedAt,
                        scholarshipId: data.scholarshipId,
                        formData: data.formData || {},
                        files: data.files || {},
                        adminRemarks: data.adminRemarks || null,
                        reviewedAt: data.reviewedAt || null,
                      }
                    })
                    
                    setApplications(applicationsData)
                    setFilteredApplications(applicationsData)
                  } catch (error) {
                    console.error("Error refreshing applications:", error)
                  }
                }
              }}
            />
            </div>

            {/* Pagination and Records Info */}
            {filteredApplications.length > 0 && (
              <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                {/* Records Info */}
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredApplications.length)} of {filteredApplications.length} record{filteredApplications.length !== 1 ? 's' : ''}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Mobile Pagination */}
                    <div className="md:hidden flex items-center gap-2 w-full justify-center">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-foreground font-medium px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Next
                      </button>
                    </div>

                    {/* Desktop Pagination */}
                    <div className="hidden md:flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 border border-border rounded-lg text-sm transition-all duration-200 active:scale-95 ${
                                  currentPage === page
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-background text-foreground hover:bg-muted"
                                }`}
                              >
                                {page}
                              </button>
                            )
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="px-2 text-muted-foreground">...</span>
                          }
                          return null
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
