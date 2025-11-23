"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { Users, Search, Filter, ChevronDown } from "lucide-react"
import UsersTable from "@/components/admin/users-table"
import UsersTableSkeleton from "@/components/admin/users-table-skeleton"
import ActiveUsersChart from "@/components/admin/active-users-chart"

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterCampus, setFilterCampus] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterVerification, setFilterVerification] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)

  const ITEMS_PER_PAGE = 10
  const ADMIN_EMAIL = "contact.ischolar@gmail.com"

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"))
        
        const usersData = []
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Filter out admin accounts - only show student users
          if (data.email === ADMIN_EMAIL) {
            continue
          }
          
          // Filter out users without valid student data
          // Must have @minsu.edu.ph email and at least studentNumber or course
          if (!data.email || !data.email.endsWith("@minsu.edu.ph")) {
            continue
          }
          
          // Skip users with no student data (all N/A or missing)
          const hasStudentData = data.studentNumber && 
                                 data.studentNumber !== "N/A" && 
                                 data.course && 
                                 data.course !== "N/A"
          
          // Skip users with "Unknown" name or no proper name
          const hasValidName = (data.fullName && data.fullName !== "Unknown") || 
                               (data.displayName && data.displayName !== "Unknown")
          
          if (!hasStudentData || !hasValidName) {
            continue
          }
          
          // Check verification status
          let isVerified = false
          if (data.verificationStatus === "verified" || data.verified === true) {
            isVerified = true
          } else {
            // Check verifications collection
            try {
              const verificationsQuery = query(
                collection(db, "verifications"),
                orderBy("submittedAt", "desc")
              )
              const verificationsSnapshot = await getDocs(verificationsQuery)
              const userVerification = verificationsSnapshot.docs.find(
                doc => doc.data().userId === docSnap.id && doc.data().status === "verified"
              )
              if (userVerification) {
                isVerified = true
              }
            } catch (error) {
              console.error("Error checking verification:", error)
            }
          }

          usersData.push({
            id: docSnap.id,
            uid: data.uid || docSnap.id,
            email: data.email || "N/A",
            fullName: data.fullName || data.displayName || "Unknown",
            displayName: data.displayName || data.fullName || "Unknown",
            studentNumber: data.studentNumber || "N/A",
            course: data.course || "N/A",
            yearLevel: data.yearLevel || "N/A",
            campus: data.campus || "N/A",
            photoURL: data.photoURL || null,
            status: data.status || "offline",
            isVerified: isVerified,
            createdAt: data.createdAt || data.updatedAt || null,
            lastSeen: data.lastSeen || null,
          })
        }
        // Sort by createdAt if available, otherwise by updatedAt
        usersData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Get unique values for filters
  const uniqueCourses = useMemo(() => {
    const courses = [...new Set(users.map(user => user.course).filter(c => c && c !== "N/A"))]
    return courses.sort()
  }, [users])

  const uniqueCampuses = useMemo(() => {
    const campuses = [...new Set(users.map(user => user.campus).filter(c => c && c !== "N/A"))]
    return campuses.sort()
  }, [users])

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = [...users]

    // Filter by name, email, or student number (search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(user => 
        user.fullName?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.studentNumber?.toLowerCase().includes(query)
      )
    }

    // Filter by course
    if (filterCourse !== "all") {
      filtered = filtered.filter(user => user.course === filterCourse)
    }

    // Filter by campus
    if (filterCampus !== "all") {
      filtered = filtered.filter(user => user.campus === filterCampus)
    }

    // Filter by status (online/offline)
    if (filterStatus !== "all") {
      filtered = filtered.filter(user => user.status === filterStatus)
    }

    // Filter by verification status
    if (filterVerification !== "all") {
      if (filterVerification === "verified") {
        filtered = filtered.filter(user => user.isVerified === true)
      } else if (filterVerification === "not-verified") {
        filtered = filtered.filter(user => user.isVerified === false)
      }
    }

    return filtered
  }, [users, filterCourse, filterCampus, filterStatus, filterVerification, searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterCourse, filterCampus, filterStatus, filterVerification, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

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
          icon={Users}
          title="User Management"
          description="Manage and view all registered students"
        />

        {/* Content */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Active Users Chart */}
          {!loading && (
            <div className="mb-6 md:mb-8 animate-in fade-in duration-300">
              <ActiveUsersChart 
                users={users} 
                uniqueCampuses={uniqueCampuses}
                uniqueCourses={uniqueCourses}
              />
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-end">
            {/* Search Bar */}
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or student number..."
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

                    {/* Status Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Status
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>

                    {/* Verification Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Verification
                      </label>
                      <select
                        value={filterVerification}
                        onChange={(e) => setFilterVerification(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Users</option>
                        <option value="verified">Verified</option>
                        <option value="not-verified">Not Verified</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <UsersTableSkeleton />
          ) : (
            <>
              <div className="animate-in fade-in duration-300">
                <UsersTable users={paginatedUsers} />
              </div>

              {/* Pagination and Records Info */}
              <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                {/* Records Info */}
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  Showing {filteredUsers.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} record{filteredUsers.length !== 1 ? 's' : ''}
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

