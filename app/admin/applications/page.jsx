"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import { FileText, Search, Filter, ChevronDown } from "lucide-react"
import ApplicationsTable from "@/components/admin/applications-table"
import ApplicationsTableSkeleton from "@/components/admin/applications-table-skeleton"

const DUMMY_APPLICATIONS = [
  {
    id: "preview-app-1",
    userId: "preview-user-1",
    name: "Juan Dela Cruz",
    studentName: "Juan Dela Cruz",
    studentNumber: "MBC2022-0001",
    scholarshipId: "preview-scholarship-1",
    scholarshipName: "Academic Excellence Grant",
    course: "BS Information Technology",
    yearLevel: "3rd",
    campus: "Calapan City Campus",
    status: "pending",
    submittedDate: "03/12/2026",
    submittedAt: "2026-03-12T10:15:00.000Z",
    photoURL: null,
    formData: {},
    files: {},
  },
  {
    id: "preview-app-2",
    userId: "preview-user-2",
    name: "Maria Santos",
    studentName: "Maria Santos",
    studentNumber: "MBC2021-0142",
    scholarshipId: "preview-scholarship-2",
    scholarshipName: "Campus Merit Scholarship",
    course: "BS Accountancy",
    yearLevel: "4th",
    campus: "Bongabong Campus",
    status: "under-review",
    submittedDate: "03/10/2026",
    submittedAt: "2026-03-10T08:40:00.000Z",
    photoURL: null,
    formData: {},
    files: {},
  },
  {
    id: "preview-app-3",
    userId: "preview-user-3",
    name: "Carlo Reyes",
    studentName: "Carlo Reyes",
    studentNumber: "MBC2023-0310",
    scholarshipId: "preview-scholarship-1",
    scholarshipName: "Academic Excellence Grant",
    course: "BS Criminology",
    yearLevel: "2nd",
    campus: "Main Campus",
    status: "approved",
    submittedDate: "03/08/2026",
    submittedAt: "2026-03-08T15:20:00.000Z",
    photoURL: null,
    formData: {},
    files: {},
  },
  {
    id: "preview-app-4",
    userId: "preview-user-4",
    name: "Angela Cruz",
    studentName: "Angela Cruz",
    studentNumber: "MBC2020-0988",
    scholarshipId: "preview-scholarship-3",
    scholarshipName: "Needs-Based Support Program",
    course: "BS Education",
    yearLevel: "4th",
    campus: "Calapan City Campus",
    status: "rejected",
    submittedDate: "03/06/2026",
    submittedAt: "2026-03-06T11:05:00.000Z",
    photoURL: null,
    formData: {},
    files: {},
  },
  {
    id: "preview-app-5",
    userId: "preview-user-5",
    name: "Louie Marquez",
    studentName: "Louie Marquez",
    studentNumber: "MBC2022-0544",
    scholarshipId: "preview-scholarship-4",
    scholarshipName: "Science and Technology Aid",
    course: "BS Computer Science",
    yearLevel: "3rd",
    campus: "Bongabong Campus",
    status: "pending",
    submittedDate: "03/05/2026",
    submittedAt: "2026-03-05T09:00:00.000Z",
    photoURL: null,
    formData: {},
    files: {},
  },
  {
    id: "preview-app-6",
    userId: "preview-user-6",
    name: "Stephanie Rivera",
    studentName: "Stephanie Rivera",
    studentNumber: "MBC2021-0723",
    scholarshipId: "preview-scholarship-2",
    scholarshipName: "Campus Merit Scholarship",
    course: "BS Hospitality Management",
    yearLevel: "2nd",
    campus: "Main Campus",
    status: "approved",
    submittedDate: "03/03/2026",
    submittedAt: "2026-03-03T13:12:00.000Z",
    photoURL: null,
    formData: {},
    files: {},
  },
]

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
  const sourceApplications = applications.length > 0 ? applications : DUMMY_APPLICATIONS
  const isPreviewMode = applications.length === 0

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
    const scholarships = [...new Set(sourceApplications.map(app => app.scholarshipName))]
    return scholarships.sort()
  }, [sourceApplications])

  const uniqueStatuses = useMemo(() => {
    return ["pending", "approved", "rejected", "under-review"]
  }, [])

  // Filter applications
  const filteredApplications = useMemo(() => {
    let filtered = [...sourceApplications]

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
  }, [sourceApplications, sortScholarship, sortStatus, searchQuery])

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
        <div className="p-4 md:p-6 lg:p-8">
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
              {isPreviewMode && (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  Preview mode: showing static sample applications because no live records were found yet.
                </div>
              )}
              <div className="animate-in fade-in duration-300">
                <ApplicationsTable 
                  applications={paginatedApplications}
                  onUpdate={handleApplicationUpdate}
                  readOnly={isPreviewMode}
                />
              </div>

              {/* Pagination and Records Info */}
              <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col items-center justify-center gap-3 md:flex-row md:items-center md:justify-between">
                  {/* Records Info */}
                  <div className="text-sm text-muted-foreground text-center md:text-left">
                    Showing {filteredApplications.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredApplications.length)} of {filteredApplications.length} record{filteredApplications.length !== 1 ? 's' : ''}
                  </div>

                  {/* Pagination Controls (same style mobile + desktop) */}
                  <div className="flex items-center justify-center md:justify-end gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-foreground font-medium px-3">
                      Page {Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1))} of {Math.max(totalPages, 1)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.max(totalPages, 1), prev + 1))}
                      disabled={currentPage >= Math.max(totalPages, 1)}
                      className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}

