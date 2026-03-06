"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import AdminLayoutWrapper from "./admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import AdminDashboardCard from "@/components/admin/dashboard-card"
import EnhancedDashboardCard from "@/components/admin/enhanced-dashboard-card"
import DashboardSkeleton from "@/components/admin/dashboard-skeleton"
import NotificationsTable from "@/components/admin/notifications-table"
import NotificationsTableSkeleton from "@/components/admin/notifications-table-skeleton"
import { LayoutDashboard, Users, FileText, Award, MessageSquare, Calendar, Bell, Filter, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import ApplicationsChart from "@/components/admin/applications-chart"
import AnnouncementsCalendar from "@/components/admin/announcements-calendar"

export default function AdminDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState([
    { 
      icon: Users, 
      label: "Total Students", 
      value: "0", 
      color: "text-green-600",
      bgColor: "from-green-500/20 to-green-500/5",
      change: null,
      trend: null
    },
    { 
      icon: FileText, 
      label: "Pending Applications", 
      value: "0", 
      color: "text-blue-600",
      bgColor: "from-blue-500/20 to-blue-500/5",
      change: null,
      trend: null
    },
    { 
      icon: Award, 
      label: "Scholarships Approved", 
      value: "0", 
      color: "text-purple-600",
      bgColor: "from-purple-500/20 to-purple-500/5",
      change: null,
      trend: null
    },
    { 
      icon: MessageSquare, 
      label: "Testimonials Received", 
      value: "0", 
      color: "text-orange-600",
      bgColor: "from-orange-500/20 to-orange-500/5",
      change: null,
      trend: null
    },
    { 
      icon: Calendar, 
      label: "Upcoming Events", 
      value: "0", 
      color: "text-pink-600",
      bgColor: "from-pink-500/20 to-pink-500/5",
      change: null,
      trend: null
    },
  ])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [sidebarWidth, setSidebarWidth] = useState(256)
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
        // Fetch total students count
        let totalStudentsCount = 0
        try {
          const usersSnapshot = await getDocs(collection(db, "users"))
          totalStudentsCount = usersSnapshot.docs.filter(doc => {
            const data = doc.data()
            // Filter out admin accounts
            return data.email !== "contact.ischolar@gmail.com" && data.email?.endsWith("@minsu.edu.ph")
          }).length
        } catch (error) {
          console.error("Error fetching students:", error)
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

        // Calculate percentage changes (mock for now, can be enhanced with historical data)
        const calculateChange = (current, previous = 0) => {
          if (previous === 0) return current > 0 ? "100%" : null
          const change = ((current - previous) / previous) * 100
          return change > 0 ? `↑ ${change.toFixed(1)}%` : change < 0 ? `↓ ${Math.abs(change).toFixed(1)}%` : null
        }

        // Update metrics with real data
        setMetrics([
          { 
            icon: Users, 
            label: "Total Students", 
            value: totalStudentsCount.toLocaleString(), 
            color: "text-green-600",
            bgColor: "from-green-500/20 to-green-500/5",
            change: calculateChange(totalStudentsCount),
            trend: totalStudentsCount > 0 ? "up" : null
          },
          { 
            icon: FileText, 
            label: "Pending Applications", 
            value: pendingApplicationsCount.toLocaleString(), 
            color: "text-blue-600",
            bgColor: "from-blue-500/20 to-blue-500/5",
            change: calculateChange(pendingApplicationsCount),
            trend: pendingApplicationsCount > 0 ? "up" : null
          },
          { 
            icon: Award, 
            label: "Scholarships Approved", 
            value: approvedScholarshipsCount.toLocaleString(), 
            color: "text-purple-600",
            bgColor: "from-purple-500/20 to-purple-500/5",
            change: calculateChange(approvedScholarshipsCount),
            trend: approvedScholarshipsCount > 0 ? "up" : null
          },
          { 
            icon: MessageSquare, 
            label: "Testimonials Received", 
            value: testimonialsCount.toLocaleString(), 
            color: "text-orange-600",
            bgColor: "from-orange-500/20 to-orange-500/5",
            change: calculateChange(testimonialsCount),
            trend: testimonialsCount > 0 ? "up" : null
          },
          { 
            icon: Calendar, 
            label: "Upcoming Events", 
            value: upcomingEventsCount.toLocaleString(), 
            color: "text-pink-600",
            bgColor: "from-pink-500/20 to-pink-500/5",
            change: calculateChange(upcomingEventsCount),
            trend: upcomingEventsCount > 0 ? "up" : null
          },
        ])
      } catch (error) {
        console.error("Error fetching dashboard metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  // Detect sidebar width for content positioning
  useEffect(() => {
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
  }, [])

  // Fetch applications for chart
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const applicationsQuery = query(
          collection(db, "applications"),
          orderBy("submittedAt", "desc")
        )
        const applicationsSnapshot = await getDocs(applicationsQuery)
        const applicationsData = applicationsSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
          id: doc.id,
            ...data,
            // Ensure scholarshipName is available
            scholarshipName: data.scholarshipName || data.scholarship || data.program || "Unknown",
            status: data.status || "pending",
          }
        })
        setApplications(applicationsData)
      } catch (error) {
        console.error("Error fetching applications:", error)
        // Fallback: try without orderBy
        try {
          const applicationsSnapshot = await getDocs(collection(db, "applications"))
          const applicationsData = applicationsSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              scholarshipName: data.scholarshipName || data.scholarship || data.program || "Unknown",
              status: data.status || "pending",
            }
          })
          setApplications(applicationsData)
        } catch (fallbackError) {
          console.error("Error fetching applications (fallback):", fallbackError)
        }
      }
    }

    fetchApplications()
  }, [])

  // Fetch announcements for calendar
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const announcementsSnapshot = await getDocs(
          query(collection(db, "announcements"), orderBy("createdAt", "desc"))
        )
        const announcementsData = announcementsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAnnouncements(announcementsData)
      } catch (error) {
        console.error("Error fetching announcements:", error)
      }
    }

    fetchAnnouncements()
  }, [])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true)
        const allNotifications = []

        // Fetch recent applications
        try {
          const applicationsSnapshot = await getDocs(
            query(collection(db, "applications"), orderBy("submittedAt", "desc"), limit(50))
          )
          
          for (const docSnap of applicationsSnapshot.docs) {
            const data = docSnap.data()
            
            // Fetch user data to get name
            let userName = "Unknown"
            if (data.userId) {
              try {
                const userDoc = await getDoc(doc(db, "users", data.userId))
                if (userDoc.exists()) {
                  const userData = userDoc.data()
                  userName = userData.fullName || userData.displayName || userData.name || data.fullName || data.studentName || data.email || "Unknown"
                } else {
                  // Fallback to data in application document
                  userName = data.fullName || data.studentName || data.email || "Unknown"
                }
              } catch (error) {
                console.error("Error fetching user data for application:", error)
                userName = data.fullName || data.studentName || data.email || "Unknown"
              }
            } else {
              userName = data.fullName || data.studentName || data.email || "Unknown"
            }
            
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
              id: `application-${docSnap.id}`,
              type: "application",
              message: `New ${data.scholarship || data.scholarshipName || "scholarship"} application from ${userName}`,
              userName: userName,
              status: data.status || "pending",
              timestamp: timestamp,
              read: false,
              referenceId: docSnap.id,
              referenceType: "application",
            })
          }
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
    if (notification.referenceType === "application") {
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

        {/* Content - matches other admin pages */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          <div className="w-full p-4 md:p-5">
          {loading ? (
            <DashboardSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              {metrics.map((metric, index) => (
                <EnhancedDashboardCard key={index} {...metric} />
              ))}
            </div>
          )}

          {/* Charts and Calendar Row - Same Size */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-6 lg:mb-8 -mx-4 md:-mx-5">
            {/* Applications Pie Chart */}
            <div className="px-4 md:px-5">
              <ApplicationsChart applications={applications} />
            </div>

            {/* Announcements Calendar */}
            <div className="px-4 md:px-5">
              <AnnouncementsCalendar announcements={announcements} />
            </div>
          </div>

          {/* Notifications Section - Full Width Below */}
          <div className="bg-gradient-to-br from-card via-card/80 to-card/50 border-2 border-border/50 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 xl:p-8 shadow-xl md:shadow-2xl backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-300 -mx-4 md:-mx-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-3 md:mb-4 lg:mb-6">
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
