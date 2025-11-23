"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { FileText, Search, Filter, ChevronDown } from "lucide-react"
import ApplicationsTable from "@/components/admin/applications-table"
import ApplicationsTableSkeleton from "@/components/admin/applications-table-skeleton"

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortStatus, setSortStatus] = useState("all")
  const [sortScholarship, setSortScholarship] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)

  const ITEMS_PER_PAGE = 10

  // Fetch applications from Firestore
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const applicationsQuery = query(
          collection(db, "applications"),
          orderBy("submittedAt", "desc")
        )
        const snapshot = await getDocs(applicationsQuery)
        
        const applicationsData = []
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Fetch user data to get name and photo
          let userName = "Unknown"
          let userPhotoURL = null
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                userName = userData.fullName || userData.displayName || "Unknown"
                userPhotoURL = userData.photoURL || null
              }
            } catch (error) {
              console.error("Error fetching user data:", error)
            }
          }

          applicationsData.push({
            id: docSnap.id,
            userId: data.userId,
            name: userName,
            photoURL: userPhotoURL,
            scholarshipId: data.scholarshipId,
            scholarshipName: data.scholarshipName || "Unknown Scholarship",
            studentName: data.studentName || userName,
            studentNumber: data.studentNumber || "N/A",
            course: data.course || "N/A",
            yearLevel: data.yearLevel || "N/A",
            campus: data.campus || "N/A",
            status: data.status || "pending",
            submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
            submittedAt: data.submittedAt,
            formData: data.formData || {},
            files: data.files || {},
          })
        }
        setApplications(applicationsData)
      } catch (error) {
        console.error("Error fetching applications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [])

  // Get unique values for filters
  const uniqueScholarships = useMemo(() => {
    const scholarships = [...new Set(applications.map(app => app.scholarshipName))]
    return scholarships.sort()
  }, [applications])

  const uniqueStatuses = useMemo(() => {
    return ["pending", "approved", "rejected", "under-review"]
  }, [])

  // Filter applications
  const filteredApplications = useMemo(() => {
    let filtered = [...applications]

    // Filter by name (search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(app => 
        app.name?.toLowerCase().includes(query) ||
        app.studentName?.toLowerCase().includes(query) ||
        app.studentNumber?.toLowerCase().includes(query)
      )
    }

    // Filter by scholarship
    if (sortScholarship !== "all") {
      filtered = filtered.filter(app => app.scholarshipName === sortScholarship)
    }

    // Filter by status
    if (sortStatus !== "all") {
      filtered = filtered.filter(app => app.status === sortStatus)
    }

    return filtered
  }, [applications, sortScholarship, sortStatus, searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [sortScholarship, sortStatus, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex)

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isFilterOpen])

  // Refresh applications after update
  const handleApplicationUpdate = async () => {
    try {
      const applicationsQuery = query(
        collection(db, "applications"),
        orderBy("submittedAt", "desc")
      )
      const snapshot = await getDocs(applicationsQuery)
      
      const applicationsData = []
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        
        let userName = "Unknown"
        let userPhotoURL = null
        if (data.userId) {
          try {
            const userDoc = await getDoc(doc(db, "users", data.userId))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              userName = userData.fullName || userData.displayName || "Unknown"
              userPhotoURL = userData.photoURL || null
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
          }
        }

        applicationsData.push({
          id: docSnap.id,
          userId: data.userId,
          name: userName,
          photoURL: userPhotoURL,
          scholarshipId: data.scholarshipId,
          scholarshipName: data.scholarshipName || "Unknown Scholarship",
          studentName: data.studentName || userName,
          studentNumber: data.studentNumber || "N/A",
          course: data.course || "N/A",
          yearLevel: data.yearLevel || "N/A",
          campus: data.campus || "N/A",
          status: data.status || "pending",
          submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
          submittedAt: data.submittedAt,
          formData: data.formData || {},
          files: data.files || {},
        })
      }
      setApplications(applicationsData)
    } catch (error) {
      console.error("Error refreshing applications:", error)
    }
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        {/* Banner */}
        <AdminPageBanner
          icon={FileText}
          title="Scholarship Applications"
          description="Review and manage student scholarship applications"
        />

        {/* Content */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-end">
            {/* Search Bar */}
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or student number..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
              />
            </div>

            {/* Filter Dropdown - Right Side */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-all duration-200 text-sm font-medium w-full md:w-48 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <span>Filters</span>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Filter Dropdown Menu */}
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-3 space-y-3">
                    {/* Scholarship Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Scholarship
                      </label>
                      <select
                        value={sortScholarship}
                        onChange={(e) => setSortScholarship(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Scholarships</option>
                        {uniqueScholarships.map((scholarship) => (
                          <option key={scholarship} value={scholarship}>
                            {scholarship}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Status
                      </label>
                      <select
                        value={sortStatus}
                        onChange={(e) => setSortStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Status</option>
                        {uniqueStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Applications Table */}
          {loading ? (
            <ApplicationsTableSkeleton />
          ) : (
            <>
              <div className="animate-in fade-in duration-300">
                <ApplicationsTable 
                  applications={paginatedApplications}
                  onUpdate={handleApplicationUpdate}
                />
              </div>

              {/* Pagination and Records Info */}
              <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                {/* Records Info */}
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  Showing {filteredApplications.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredApplications.length)} of {filteredApplications.length} record{filteredApplications.length !== 1 ? 's' : ''}
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
            </>
          )}
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}

