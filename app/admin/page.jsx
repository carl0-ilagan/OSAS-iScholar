"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import AdminLayoutWrapper from "./admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import AdminDashboardCard from "@/components/admin/dashboard-card"
import DashboardSkeleton from "@/components/admin/dashboard-skeleton"
import NotificationsTable from "@/components/admin/notifications-table"
import NotificationsTableSkeleton from "@/components/admin/notifications-table-skeleton"
import { LayoutDashboard, Users, FileCheck, FileText, Award, MessageSquare, Calendar, Bell, Filter, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState([
    { icon: Users, label: "Verified Students", value: "0", color: "text-green-600" },
    { icon: FileCheck, label: "Pending Verifications", value: "0", color: "text-yellow-600" },
    { icon: FileText, label: "Pending Applications", value: "0", color: "text-blue-600" },
    { icon: Award, label: "Scholarships Approved", value: "0", color: "text-purple-600" },
    { icon: MessageSquare, label: "Testimonials Received", value: "0", color: "text-orange-600" },
    { icon: Calendar, label: "Upcoming Events", value: "0", color: "text-pink-600" },
  ])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch verified students count
        let verifiedStudentsCount = 0
        try {
          const usersSnapshot = await getDocs(collection(db, "users"))
          verifiedStudentsCount = usersSnapshot.docs.filter(doc => {
            const data = doc.data()
            return data.verificationStatus === "verified" || data.verified === true
          }).length
        } catch (error) {
          console.error("Error fetching verified students:", error)
        }

        // Fetch pending verifications count
        let pendingVerificationsCount = 0
        try {
          const verificationsQuery = query(
            collection(db, "verifications"),
            where("status", "==", "pending")
          )
          const verificationsSnapshot = await getDocs(verificationsQuery)
          pendingVerificationsCount = verificationsSnapshot.size
        } catch (error) {
          // If query fails, try without where clause
          try {
            const verificationsSnapshot = await getDocs(collection(db, "verifications"))
            pendingVerificationsCount = verificationsSnapshot.docs.filter(doc => {
              const data = doc.data()
              return data.status === "pending"
            }).length
          } catch (simpleError) {
            console.error("Error fetching pending verifications:", simpleError)
          }
        }

        // Fetch pending applications count (if applications collection exists)
        let pendingApplicationsCount = 0
        try {
          const applicationsQuery = query(
            collection(db, "applications"),
            where("status", "==", "pending")
          )
          const applicationsSnapshot = await getDocs(applicationsQuery)
          pendingApplicationsCount = applicationsSnapshot.size
        } catch (error) {
          // If query fails, try without where clause
          try {
            const applicationsSnapshot = await getDocs(collection(db, "applications"))
            pendingApplicationsCount = applicationsSnapshot.docs.filter(doc => {
              const data = doc.data()
              return data.status === "pending" || data.status === "under-review"
            }).length
          } catch (simpleError) {
            // Collection might not exist yet
            console.log("Applications collection not found or error:", simpleError)
          }
        }

        // Fetch approved scholarships count
        let approvedScholarshipsCount = 0
        try {
          const scholarshipsQuery = query(
            collection(db, "applications"),
            where("status", "==", "approved")
          )
          const scholarshipsSnapshot = await getDocs(scholarshipsQuery)
          approvedScholarshipsCount = scholarshipsSnapshot.size
        } catch (error) {
          try {
            const scholarshipsSnapshot = await getDocs(collection(db, "applications"))
            approvedScholarshipsCount = scholarshipsSnapshot.docs.filter(doc => {
              const data = doc.data()
              return data.status === "approved"
            }).length
          } catch (simpleError) {
            console.log("Error fetching approved scholarships:", simpleError)
          }
        }

        // Fetch testimonials count
        let testimonialsCount = 0
        try {
          const testimonialsSnapshot = await getDocs(collection(db, "testimonials"))
          testimonialsCount = testimonialsSnapshot.size
        } catch (error) {
          console.log("Testimonials collection not found or error:", error)
        }

        // Fetch upcoming events count
        let upcomingEventsCount = 0
        try {
          const eventsSnapshot = await getDocs(collection(db, "events"))
          const now = new Date()
          upcomingEventsCount = eventsSnapshot.docs.filter(doc => {
            const data = doc.data()
            const eventDate = data.date ? new Date(data.date) : null
            return eventDate && eventDate > now
          }).length
        } catch (error) {
          console.log("Events collection not found or error:", error)
        }

        // Update metrics with real data
        setMetrics([
          { icon: Users, label: "Verified Students", value: verifiedStudentsCount.toString(), color: "text-green-600" },
          { icon: FileCheck, label: "Pending Verifications", value: pendingVerificationsCount.toString(), color: "text-yellow-600" },
          { icon: FileText, label: "Pending Applications", value: pendingApplicationsCount.toString(), color: "text-blue-600" },
          { icon: Award, label: "Scholarships Approved", value: approvedScholarshipsCount.toString(), color: "text-purple-600" },
          { icon: MessageSquare, label: "Testimonials Received", value: testimonialsCount.toString(), color: "text-orange-600" },
          { icon: Calendar, label: "Upcoming Events", value: upcomingEventsCount.toString(), color: "text-pink-600" },
        ])
      } catch (error) {
        console.error("Error fetching dashboard metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true)
        const allNotifications = []

        // Fetch recent verifications
        try {
          const verificationsSnapshot = await getDocs(
            query(collection(db, "verifications"), orderBy("submittedAt", "desc"), limit(50))
          )
          verificationsSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            // Handle timestamp conversion
            let timestamp = new Date()
            if (data.submittedAt) {
              if (data.submittedAt.toDate && typeof data.submittedAt.toDate === 'function') {
                timestamp = data.submittedAt.toDate()
              } else if (data.submittedAt instanceof Date) {
                timestamp = data.submittedAt
              } else if (typeof data.submittedAt === 'string') {
                timestamp = new Date(data.submittedAt)
              } else if (data.submittedAt.seconds) {
                timestamp = new Date(data.submittedAt.seconds * 1000)
              }
            }
            
            allNotifications.push({
              id: `verification-${doc.id}`,
              type: "verification",
              message: `New verification request from ${data.fullName || "Student"}`,
              userName: data.fullName || data.email || "Unknown",
              status: data.status || "pending",
              timestamp: timestamp,
              read: false,
              referenceId: doc.id,
              referenceType: "verification",
            })
          })
        } catch (error) {
          console.error("Error fetching verifications:", error)
        }

        // Fetch recent applications
        try {
          const applicationsSnapshot = await getDocs(
            query(collection(db, "applications"), orderBy("submittedAt", "desc"), limit(50))
          )
          applicationsSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            // Handle timestamp conversion
            let timestamp = new Date()
            if (data.submittedAt) {
              if (data.submittedAt.toDate && typeof data.submittedAt.toDate === 'function') {
                timestamp = data.submittedAt.toDate()
              } else if (data.submittedAt instanceof Date) {
                timestamp = data.submittedAt
              } else if (typeof data.submittedAt === 'string') {
                timestamp = new Date(data.submittedAt)
              } else if (data.submittedAt.seconds) {
                timestamp = new Date(data.submittedAt.seconds * 1000)
              }
            }
            
            allNotifications.push({
              id: `application-${doc.id}`,
              type: "application",
              message: `New ${data.scholarship || "scholarship"} application from ${data.fullName || "Student"}`,
              userName: data.fullName || data.email || "Unknown",
              status: data.status || "pending",
              timestamp: timestamp,
              read: false,
              referenceId: doc.id,
              referenceType: "application",
            })
          })
        } catch (error) {
          console.error("Error fetching applications:", error)
        }

        // Sort by timestamp (newest first)
        allNotifications.sort((a, b) => b.timestamp - a.timestamp)

        setNotifications(allNotifications)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setNotificationsLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  // Filter and sort notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (notif) =>
          notif.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notif.userName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((notif) => notif.type === typeFilter)
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((notif) => notif.status?.toLowerCase() === statusFilter.toLowerCase())
    }

    // Sort
    if (sortBy === "newest") {
      filtered.sort((a, b) => b.timestamp - a.timestamp)
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => a.timestamp - b.timestamp)
    } else if (sortBy === "type") {
      filtered.sort((a, b) => a.type.localeCompare(b.type))
    }

    return filtered
  }, [notifications, searchQuery, typeFilter, statusFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter, statusFilter, sortBy])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isFilterOpen])

  const handleViewNotification = (notification) => {
    if (notification.referenceType === "verification") {
      router.push(`/admin/verifications?view=${notification.referenceId}`)
    } else if (notification.referenceType === "application") {
      router.push(`/admin/applications?view=${notification.referenceId}`)
    }
  }

  const handleMarkAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
    )
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        {/* Floating Banner */}
        <AdminPageBanner
          icon={LayoutDashboard}
          title="Admin Dashboard"
          description="System overview and management"
        />

        {/* Content */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">System overview and management</p>
            </div>

            {loading ? (
              <DashboardSkeleton />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {metrics.map((metric, index) => (
                  <AdminDashboardCard key={index} {...metric} />
                ))}
              </div>
            )}

            {/* Notifications Section */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Recent Actions & Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length} notifications
                  </p>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <div className="relative" ref={filterRef}>
                    <button
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-input hover:bg-input/80 transition-colors text-sm font-medium"
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isFilterOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* Type Filter */}
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                            Type
                          </label>
                          <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="all">All Types</option>
                            <option value="verification">Verifications</option>
                            <option value="application">Applications</option>
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                            Status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="verified">Verified</option>
                          </select>
                        </div>

                        {/* Sort */}
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                            Sort By
                          </label>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="type">Type (A-Z)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notifications Table */}
              {notificationsLoading ? (
                <NotificationsTableSkeleton />
              ) : (
                <>
                  <NotificationsTable
                    notifications={paginatedNotifications}
                    onView={handleViewNotification}
                    onMarkRead={handleMarkAsRead}
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-border rounded-lg bg-input hover:bg-input/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {[...Array(totalPages)].map((_, index) => {
                            const page = index + 1
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`w-10 h-10 rounded-lg border transition-colors text-sm font-medium ${
                                    currentPage === page
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-input border-border hover:bg-input/80"
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
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-border rounded-lg bg-input hover:bg-input/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

        </div>
        </div>
    </div>
    </AdminLayoutWrapper>
  )
}
