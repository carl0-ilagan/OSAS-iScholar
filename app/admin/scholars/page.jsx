"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { Award, Search, Filter, ChevronDown } from "lucide-react"
import ScholarsTable from "@/components/admin/scholars-table"
import ScholarsTableSkeleton from "@/components/admin/scholars-table-skeleton"

export default function ScholarsPage() {
  const [scholars, setScholars] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterScholarship, setFilterScholarship] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterCampus, setFilterCampus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)

  const ITEMS_PER_PAGE = 10

  // Fetch approved applications (scholars) from Firestore
  useEffect(() => {
    const fetchScholars = async () => {
      try {
        // Fetch only approved applications
        const applicationsQuery = query(
          collection(db, "applications"),
          where("status", "==", "approved"),
          orderBy("reviewedAt", "desc")
        )
        
        let snapshot
        try {
          snapshot = await getDocs(applicationsQuery)
        } catch (error) {
          // If orderBy fails (no index), fetch without orderBy
          const simpleQuery = query(
            collection(db, "applications"),
            where("status", "==", "approved")
          )
          snapshot = await getDocs(simpleQuery)
        }
        
        const scholarsData = []
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

          scholarsData.push({
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
            status: data.status || "approved",
            submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
            reviewedDate: data.reviewedAt ? new Date(data.reviewedAt).toLocaleDateString() : "N/A",
            submittedAt: data.submittedAt,
            reviewedAt: data.reviewedAt,
            benefitAmount: data.benefitAmount || null,
            benefit: data.benefit || null,
            adminRemarks: data.adminRemarks || null,
            formData: data.formData || {},
            files: data.files || {},
          })
        }
        
        // Sort by reviewedAt if available, otherwise by submittedAt
        scholarsData.sort((a, b) => {
          const dateA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0)
          const dateB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0)
          return dateB - dateA
        })
        
        setScholars(scholarsData)
      } catch (error) {
        console.error("Error fetching scholars:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchScholars()
  }, [])

  // Get unique values for filters
  const uniqueScholarships = useMemo(() => {
    const scholarships = [...new Set(scholars.map(scholar => scholar.scholarshipName).filter(s => s && s !== "Unknown Scholarship"))]
    return scholarships.sort()
  }, [scholars])

  const uniqueCourses = useMemo(() => {
    const courses = [...new Set(scholars.map(scholar => scholar.course).filter(c => c && c !== "N/A"))]
    return courses.sort()
  }, [scholars])

  const uniqueCampuses = useMemo(() => {
    const campuses = [...new Set(scholars.map(scholar => scholar.campus).filter(c => c && c !== "N/A"))]
    return campuses.sort()
  }, [scholars])

  // Filter scholars
  const filteredScholars = useMemo(() => {
    let filtered = [...scholars]

    // Filter by name, student number, or scholarship (search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(scholar => 
        scholar.name?.toLowerCase().includes(query) ||
        scholar.studentName?.toLowerCase().includes(query) ||
        scholar.studentNumber?.toLowerCase().includes(query) ||
        scholar.scholarshipName?.toLowerCase().includes(query)
      )
    }

    // Filter by scholarship
    if (filterScholarship !== "all") {
      filtered = filtered.filter(scholar => scholar.scholarshipName === filterScholarship)
    }

    // Filter by course
    if (filterCourse !== "all") {
      filtered = filtered.filter(scholar => scholar.course === filterCourse)
    }

    // Filter by campus
    if (filterCampus !== "all") {
      filtered = filtered.filter(scholar => scholar.campus === filterCampus)
    }

    return filtered
  }, [scholars, filterScholarship, filterCourse, filterCampus, searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterScholarship, filterCourse, filterCampus, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredScholars.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedScholars = filteredScholars.slice(startIndex, endIndex)

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

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        {/* Banner */}
        <AdminPageBanner
          icon={Award}
          title="Scholars"
          description="View and manage approved scholarship recipients"
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
                placeholder="Search by name, student number, or scholarship..."
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
                  <div className="p-3 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {/* Scholarship Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Scholarship
                      </label>
                      <select
                        value={filterScholarship}
                        onChange={(e) => setFilterScholarship(e.target.value)}
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

                    {/* Course Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Course
                      </label>
                      <select
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Courses</option>
                        {uniqueCourses.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campus Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Campus
                      </label>
                      <select
                        value={filterCampus}
                        onChange={(e) => setFilterCampus(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Campuses</option>
                        {uniqueCampuses.map((campus) => (
                          <option key={campus} value={campus}>
                            {campus}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scholars Table */}
          {loading ? (
            <ScholarsTableSkeleton />
          ) : (
            <>
              <div className="animate-in fade-in duration-300">
                <ScholarsTable scholars={paginatedScholars} />
              </div>

              {/* Pagination and Records Info */}
              <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                {/* Records Info */}
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  Showing {filteredScholars.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredScholars.length)} of {filteredScholars.length} record{filteredScholars.length !== 1 ? 's' : ''}
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

