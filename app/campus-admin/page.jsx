"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore"
import {
  Building2,
  FileText,
  Users,
  ClipboardCheck,
  MessageSquare,
  Calendar,
  Bell,
  Filter,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "./campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"
import EnhancedDashboardCard from "@/components/admin/enhanced-dashboard-card"
import DashboardSkeleton from "@/components/admin/dashboard-skeleton"
import ApplicationsChart from "@/components/admin/applications-chart"
import AnnouncementsCalendar from "@/components/admin/announcements-calendar"
import NotificationsTable from "@/components/admin/notifications-table"
import NotificationsTableSkeleton from "@/components/admin/notifications-table-skeleton"

function toDate(value) {
  if (!value) return null
  if (value?.toDate && typeof value.toDate === "function") return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === "string") return new Date(value)
  if (value?.seconds) return new Date(value.seconds * 1000)
  return null
}

export default function CampusAdminDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [applications, setApplications] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const ITEMS_PER_PAGE = 10
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!activeCampus) {
        setStudents([])
        setApplications([])
        setAnnouncements([])
        setNotifications([])
        setLoading(false)
        setNotificationsLoading(false)
        return
      }

      try {
        setLoading(true)
        setNotificationsLoading(true)

        const usersSnapshot = await getDocs(
          query(collection(db, "users"), where("campus", "==", activeCampus), where("role", "==", "student")),
        )
        const campusStudents = usersSnapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((row) => String(row.role || "").trim().toLowerCase() !== "admin")
          .filter((row) => String(row.role || "").trim().toLowerCase() !== "campus_admin")
        setStudents(campusStudents)

        const studentIds = new Set(campusStudents.map((row) => row.uid || row.id))

        const applicationsSnapshot = await getDocs(query(collection(db, "applications"), where("campus", "==", activeCampus)))
        const campusApplications = applicationsSnapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((row) => normalizeCampus(row.campus) === activeCampus || (row.userId && studentIds.has(row.userId)))
        setApplications(campusApplications)

        let announcementRows = []
        try {
          const announcementsSnapshot = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")))
          announcementRows = announcementsSnapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((row) => {
              const rowCampus = normalizeCampus(row.campus || null)
              return !rowCampus || rowCampus === activeCampus
            })
        } catch {
          const announcementsSnapshot = await getDocs(collection(db, "announcements"))
          announcementRows = announcementsSnapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((row) => {
              const rowCampus = normalizeCampus(row.campus || null)
              return !rowCampus || rowCampus === activeCampus
            })
        }
        setAnnouncements(announcementRows)

        const allNotifications = []
        try {
          const recentCampusApps = await getDocs(
            query(collection(db, "applications"), where("campus", "==", activeCampus), orderBy("submittedAt", "desc"), limit(50)),
          )
          for (const docSnap of recentCampusApps.docs) {
            const data = docSnap.data()
            let userName = data.fullName || data.studentName || data.email || "Unknown"
            if (data.userId) {
              try {
                const userDoc = await getDoc(doc(db, "users", data.userId))
                if (userDoc.exists()) {
                  const userData = userDoc.data()
                  userName = userData.fullName || userData.displayName || data.fullName || data.studentName || data.email || "Unknown"
                }
              } catch {
                // Keep fallback name
              }
            }
            allNotifications.push({
              id: `application-${docSnap.id}`,
              type: "application",
              message: `New ${data.scholarship || data.scholarshipName || "scholarship"} application from ${userName}`,
              userName,
              status: data.status || "pending",
              timestamp: toDate(data.submittedAt) || new Date(),
              read: false,
              referenceId: docSnap.id,
              referenceType: "application",
            })
          }
        } catch (error) {
          console.error("Error fetching campus notifications:", error)
        }
        setNotifications(allNotifications.sort((a, b) => b.timestamp - a.timestamp))
      } catch (error) {
        console.error("Error fetching campus admin data:", error)
      } finally {
        setLoading(false)
        setNotificationsLoading(false)
      }
    }

    fetchDashboardData()
  }, [activeCampus])

  const metrics = useMemo(() => {
    const pendingCount = applications.filter((row) => {
      const status = String(row.status || "").toLowerCase()
      return status === "pending" || status === "under-review"
    }).length
    const approvedCount = applications.filter((row) => String(row.status || "").toLowerCase() === "approved").length
    const upcomingSchedules = announcements.filter((row) => {
      const endDate = toDate(row.endDate || row.startDate || row.createdAt)
      return endDate && endDate >= new Date()
    }).length

    return [
      {
        icon: Users,
        label: `Total Students (${activeCampus || "Campus"})`,
        value: students.length.toLocaleString(),
        color: "text-green-600",
        bgColor: "from-green-500/20 to-green-500/5",
      },
      {
        icon: FileText,
        label: "Pending Applications",
        value: pendingCount.toLocaleString(),
        color: "text-blue-600",
        bgColor: "from-blue-500/20 to-blue-500/5",
      },
      {
        icon: ClipboardCheck,
        label: "Approved Applications",
        value: approvedCount.toLocaleString(),
        color: "text-purple-600",
        bgColor: "from-purple-500/20 to-purple-500/5",
      },
      {
        icon: MessageSquare,
        label: "Campus Announcements",
        value: announcements.length.toLocaleString(),
        color: "text-orange-600",
        bgColor: "from-orange-500/20 to-orange-500/5",
      },
      {
        icon: Calendar,
        label: "Upcoming Schedules",
        value: upcomingSchedules.toLocaleString(),
        color: "text-pink-600",
        bgColor: "from-pink-500/20 to-pink-500/5",
      },
      {
        icon: Building2,
        label: "Campus Scope",
        value: activeCampus || "Not set",
        color: "text-emerald-700",
        bgColor: "from-emerald-500/20 to-emerald-500/5",
      },
    ]
  }, [activeCampus, applications, announcements, students.length])

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications]
    if (searchQuery) {
      const queryText = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (notif) =>
          notif.message.toLowerCase().includes(queryText) || notif.userName?.toLowerCase().includes(queryText),
      )
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((notif) => notif.type === typeFilter)
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((notif) => String(notif.status || "").toLowerCase() === statusFilter.toLowerCase())
    }
    if (sortBy === "newest") filtered.sort((a, b) => b.timestamp - a.timestamp)
    if (sortBy === "oldest") filtered.sort((a, b) => a.timestamp - b.timestamp)
    if (sortBy === "type") filtered.sort((a, b) => a.type.localeCompare(b.type))
    return filtered
  }, [notifications, searchQuery, typeFilter, statusFilter, sortBy])

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter, statusFilter, sortBy])

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

  const handleMarkAsRead = (notificationId) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)))
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="relative">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="w-full p-4 md:p-5">
            {loading ? (
              <DashboardSkeleton />
            ) : (
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6 md:mb-8">
                {metrics.map((metric, index) => (
                  <EnhancedDashboardCard key={index} {...metric} />
                ))}
              </div>
            )}

            <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 md:mb-6 lg:mb-8">
              <ApplicationsChart applications={applications} />
              <AnnouncementsCalendar announcements={announcements} />
            </div>

            <div className="bg-gradient-to-br from-card via-card/80 to-card/50 border-2 border-border/50 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 xl:p-8 shadow-xl md:shadow-2xl backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-300">
              <div className="mb-3 flex flex-col gap-3 md:mb-4 lg:mb-6 md:flex-row md:items-center md:justify-between md:gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Campus Actions & Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {filteredNotifications.length > 0 ? startIndex + 1 : 0} to{" "}
                    {Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length} notifications
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
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
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Type</label>
                          <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="all">All Types</option>
                            <option value="application">Applications</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Status</label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="under-review">Under Review</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Sort By</label>
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

              {notificationsLoading ? (
                <NotificationsTableSkeleton />
              ) : (
                <>
                  <NotificationsTable notifications={paginatedNotifications} onMarkRead={handleMarkAsRead} />
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
    </CampusAdminLayoutWrapper>
  )
}
