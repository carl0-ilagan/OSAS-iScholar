"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import ApplicationsTable from "@/components/student/applications-table"
import ApplicationsTableSkeleton from "@/components/student/applications-table-skeleton"
import { Search, Activity, FileText, Clock3, CheckCircle2 } from "lucide-react"

export default function ApplicationsPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [loading, setLoading] = useState(true)
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

            const benefitAmount = data.benefitAmount || 
                                 data.amount || 
                                 "N/A"
            const benefit = data.benefit || 
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
          // Get scholarship benefit amount from application/scholarship records.
          const benefitAmount = data.benefitAmount || 
                               scholarships[String(data.scholarshipId)]?.benefitAmount ||
                               scholarships[data.scholarshipId]?.benefitAmount ||
                               scholarships[data.scholarshipName]?.benefitAmount ||
                               "N/A"
          const benefit = data.benefit ||
                         scholarships[String(data.scholarshipId)]?.benefit ||
                         scholarships[data.scholarshipId]?.benefit ||
                         scholarships[data.scholarshipName]?.benefit ||
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
                const benefitAmount = data.benefitAmount || 
                                     data.amount || 
                                     "N/A"
                const benefit = data.benefit || 
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
            // Get scholarship benefit amount from application/scholarship records.
            const benefitAmount = data.benefitAmount || 
                                 scholarships[String(data.scholarshipId)]?.benefitAmount ||
                                 scholarships[data.scholarshipId]?.benefitAmount ||
                                 scholarships[data.scholarshipName]?.benefitAmount ||
                                 "N/A"
            const benefit = data.benefit ||
                           scholarships[String(data.scholarshipId)]?.benefit ||
                           scholarships[data.scholarshipId]?.benefit ||
                           scholarships[data.scholarshipName]?.benefit ||
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
          setApplications([])
          setFilteredApplications([])
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
  const pendingCount = applications.filter((app) => (app.status || "").toLowerCase() === "pending").length
  const approvedCount = applications.filter((app) => (app.status || "").toLowerCase() === "approved").length

  return (
    <div className="relative">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:border-emerald-800/40 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Application records
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl">
              Your scholarship applications
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-900/75 dark:text-emerald-200/85 sm:text-base">
              Review your submissions, track status updates, and open full details from the table below.
            </p>
            {!loading ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                  <FileText className="h-3.5 w-3.5" />
                  Total: {applications.length}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  Pending: {pendingCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approved: {approvedCount}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Search Bar - Right Side */}
        {!loading && applications.length > 0 && (
          <div className="mb-6 flex flex-col md:flex-row md:justify-end gap-3">
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
            {/* Track Button - Mobile Only (Below Search Bar) */}
            <button
              onClick={() => {
                // Refresh applications or scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setSearchQuery("")
              }}
              className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium text-sm shadow-md active:scale-95"
            >
              <Activity className="w-4 h-4" />
              <span>Track Applications</span>
            </button>
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
                        const benefitAmount = data.benefitAmount || 
                                             data.amount || 
                                             "N/A"
                        const benefit = data.benefit || 
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

                      const benefitAmount = data.benefitAmount || 
                                           scholarships[String(data.scholarshipId)]?.benefitAmount ||
                                           scholarships[data.scholarshipId]?.benefitAmount ||
                                           scholarships[data.scholarshipName]?.benefitAmount ||
                                           "N/A"
                      const benefit = data.benefit ||
                                     scholarships[String(data.scholarshipId)]?.benefit ||
                                     scholarships[data.scholarshipId]?.benefit ||
                                     scholarships[data.scholarshipName]?.benefit ||
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
              <div className="mt-4 animate-in fade-in duration-300">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredApplications.length)} of {filteredApplications.length} record{filteredApplications.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-xs font-medium text-foreground">
                    Page {currentPage} of {Math.max(1, totalPages)}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(Math.max(1, totalPages), prev + 1))}
                    disabled={currentPage === Math.max(1, totalPages)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
