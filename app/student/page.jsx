"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc, where, updateDoc, arrayUnion } from "firebase/firestore"
import DashboardCard from "@/components/student/dashboard-card"
import { StudentSection } from "@/components/student/student-section"
import { Clock, Bell, FileText, Megaphone, CheckCircle, AlertCircle, Calendar, TrendingUp, Award, Sparkles, ClipboardCheck, X, ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPortal } from "react-dom"

export default function StudentDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applicationStatus, setApplicationStatus] = useState("under-review")
  const [announcements, setAnnouncements] = useState([])
  const [userScholarships, setUserScholarships] = useState([])
  const [applications, setApplications] = useState([])
  const [pendingRequirements, setPendingRequirements] = useState(0)
  const [userName, setUserName] = useState("")
  const [notifications, setNotifications] = useState([])
  const [deletedNotificationIds, setDeletedNotificationIds] = useState([])
  const [notificationsPage, setNotificationsPage] = useState(1)
  const NOTIFICATIONS_PER_PAGE = 5
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false)

  // Fetch user's approved scholarships and announcements
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, "users", user.uid))
        let userYearLevel = null
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserName(data.fullName || data.displayName || "Student")
          // Get deleted notification IDs
          setDeletedNotificationIds(data.deletedNotificationIds || [])
          // Get user's year level
          userYearLevel = data.yearLevel || null
        }

        // Get user's applications
        let applicationsSnapshot
        try {
          applicationsSnapshot = await getDocs(
            query(
          collection(db, "applications"),
          where("userId", "==", user.uid),
              orderBy("submittedAt", "desc")
            )
          )
        } catch (error) {
          applicationsSnapshot = await getDocs(
            query(
              collection(db, "applications"),
              where("userId", "==", user.uid)
            )
          )
        }

        const applicationsData = []
        const scholarships = []
        
        applicationsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          applicationsData.push({
            id: doc.id,
            ...data,
          })
          
          if (data.status === "approved" && data.scholarshipName) {
            scholarships.push(data.scholarshipName)
          }
        })
        
        setApplications(applicationsData)
        setUserScholarships(scholarships)

        // Get latest application status
        if (applicationsData.length > 0) {
          const latestApp = applicationsData[0]
          setApplicationStatus(latestApp.status || "pending")
        }

        // Fetch requirements to check pending and add to notifications
        try {
          const requirementsSnapshot = await getDocs(
            query(collection(db, "documentRequirements"), orderBy("createdAt", "desc"))
          )
          const studentDocsSnapshot = await getDocs(
            query(
              collection(db, "studentDocuments"),
              where("userId", "==", user.uid)
            )
          )
          
          const uploadedRequirementIds = new Set()
          studentDocsSnapshot.docs.forEach(doc => {
            uploadedRequirementIds.add(doc.data().requirementId)
          })
          
          let pendingCount = 0
          const requirementNotifications = []
          
          requirementsSnapshot.docs.forEach(doc => {
            const req = doc.data()
            const isUploaded = uploadedRequirementIds.has(doc.id)
            
            if (req.required && !isUploaded) {
              pendingCount++
            }
            
            // Add to notifications (show recent requirements, especially if not uploaded)
            const createdAt = req.createdAt ? (req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt)) : new Date()
            const daysSinceCreated = (new Date() - createdAt) / (1000 * 60 * 60 * 24)
            
            // Show requirements created in the last 7 days or if not uploaded
            if (daysSinceCreated <= 7 || !isUploaded) {
              requirementNotifications.push({
                id: `requirement-${doc.id}`,
                type: "requirement",
                title: req.name,
                description: req.description || "",
                createdAt: createdAt,
                isRequired: req.required,
                isUploaded: isUploaded,
                requirementId: doc.id,
              })
            }
          })
          
          setPendingRequirements(pendingCount)
          
          // Combine announcements and requirements for notifications
          const allNotifications = [
            ...announcements.map(ann => ({
              ...ann,
              type: "announcement",
            })),
            ...requirementNotifications,
          ].sort((a, b) => {
            const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
            const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
            return dateB - dateA
          })
          
          // Filter out deleted notifications
          const userDoc = await getDoc(doc(db, "users", user.uid))
          const deletedIds = userDoc.exists() ? (userDoc.data().deletedNotificationIds || []) : []
          const filteredNotifications = allNotifications.filter(notif => !deletedIds.includes(notif.id))
          
          setNotifications(filteredNotifications)
          setDeletedNotificationIds(deletedIds)
        } catch (error) {
          console.error("Error fetching requirements:", error)
          // Fallback: just use announcements as notifications
          const userDoc = await getDoc(doc(db, "users", user.uid))
          const deletedIds = userDoc.exists() ? (userDoc.data().deletedNotificationIds || []) : []
          const filteredAnnouncements = announcements
            .map(ann => ({
              ...ann,
              type: "announcement",
            }))
            .filter(notif => !deletedIds.includes(notif.id))
          setNotifications(filteredAnnouncements)
          setDeletedNotificationIds(deletedIds)
        }

        // Fetch announcements
        let announcementsSnapshot
        try {
          announcementsSnapshot = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")))
        } catch (error) {
          announcementsSnapshot = await getDocs(collection(db, "announcements"))
        }

        const now = new Date()
        const filteredAnnouncements = []

        announcementsSnapshot.forEach((docSnap) => {
          const data = docSnap.data()
          const endDate = data.endDate ? (data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate)) : null
          const targetScholarships = data.targetScholarships || ["all"]
          
          // Check if announcement is for this user
          const targetYearLevel = data.targetYearLevel || "all"
          const isForAllStudents = targetScholarships.includes("all") // All students including those without scholarships
          const isForAllScholarships = targetScholarships.includes("allScholarships") // Only students with scholarships
          
          let isForScholarship = false
          if (isForAllStudents) {
            // All students (including those without scholarships)
            isForScholarship = true
          } else if (isForAllScholarships) {
            // Only students with scholarships
            isForScholarship = scholarships.length > 0
          } else {
            // Specific scholarships
            isForScholarship = scholarships.some(sch => targetScholarships.includes(sch))
          }
          
          // Check if announcement is for this user's year level
          // If targetYearLevel is "all", show to everyone (including those without year level set)
          // If targetYearLevel is specific, only show if userYearLevel matches
          // If userYearLevel is null/undefined, only show if targetYearLevel is "all"
          const isForYearLevel = targetYearLevel === "all" || (userYearLevel && targetYearLevel === userYearLevel)

          if (!isForScholarship || !isForYearLevel) {
            return
          }

          // Check if announcement is archived (2 days after endDate)
          if (endDate) {
            const archiveDate = new Date(endDate)
            archiveDate.setDate(archiveDate.getDate() + 2)
            if (now > archiveDate) {
              return // Skip archived announcements
            }
          }

          // Check if manually archived
          if (data.status === "archived") {
            return
          }

          filteredAnnouncements.push({
            id: docSnap.id,
            title: data.title || "Untitled",
            description: data.description || "",
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
            endDate: endDate,
            venue: data.venue || "",
            targetYearLevel: data.targetYearLevel || "all",
            priority: data.priority || "normal",
          })
        })

        // Sort by date
        filteredAnnouncements.sort((a, b) => {
          const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return dateB - dateA
        })

        setAnnouncements(filteredAnnouncements)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const formatDate = (date) => {
    if (!date) return ""
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Handle delete notification
  const handleDeleteNotification = async (notificationId) => {
    if (!user?.uid) return

    try {
      // Add to deleted notifications in user document
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        deletedNotificationIds: arrayUnion(notificationId)
      })

      // Update local state
      setDeletedNotificationIds(prev => [...prev, notificationId])
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      
      // Reset to first page if current page becomes empty
      const remainingNotifications = notifications.filter(notif => notif.id !== notificationId)
      const maxPage = Math.ceil(remainingNotifications.length / NOTIFICATIONS_PER_PAGE)
      if (notificationsPage > maxPage && maxPage > 0) {
        setNotificationsPage(maxPage)
      } else if (maxPage === 0) {
        setNotificationsPage(1)
      }

      toast.success("Notification deleted", {
        icon: <CheckCircle className="w-4 h-4" />,
        duration: 2000,
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification", {
        icon: <AlertCircle className="w-4 h-4" />,
        duration: 3000,
      })
    }
  }

  const formatTimeAgo = (date) => {
    if (!date) return ""
    const d = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const diffInSeconds = Math.floor((now - d) / 1000)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return formatDate(d)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-emerald-700 bg-emerald-500/15 border-emerald-500/35 dark:text-emerald-300"
      case "rejected":
      case "declined":
        return "text-red-600 bg-red-500/15 border-red-500/30"
      case "pending":
      case "under-review":
        return "text-amber-800 bg-amber-500/12 border-amber-500/35 dark:text-amber-300"
      default:
        return "text-teal-800 bg-teal-500/12 border-teal-500/30 dark:text-teal-300"
    }
  }

  const dashboardCards = [
    {
      title: "Application Status",
      icon: FileText,
      status: applicationStatus,
      description: applications.length > 0 
        ? `${applications.length} application${applications.length !== 1 ? 's' : ''} submitted`
        : "No applications yet",
      accent: "emerald",
      onClick: () => router.push("/student/applications"),
    },
    {
      title: "Notifications",
      icon: Bell,
      count: notifications.length,
      description: `${notifications.length} new notification${notifications.length !== 1 ? 's' : ''}`,
      accent: "teal",
    },
    {
      title: "Pending Requirements",
      icon: AlertCircle,
      count: pendingRequirements,
      description: pendingRequirements > 0 
        ? `${pendingRequirements} document${pendingRequirements !== 1 ? 's' : ''} needed`
        : "All requirements submitted",
      accent: "amber",
      onClick: () => router.push("/student/requirements"),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-8 py-2">
        <div className="animate-pulse space-y-4 rounded-2xl border border-emerald-200/30 bg-white/60 p-8 dark:border-emerald-900/40 dark:bg-card/40">
          <div className="h-4 w-24 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50" />
          <div className="h-10 max-w-md rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50" />
          <div className="h-4 max-w-sm rounded bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-card/50"
            />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-2xl border border-emerald-200/30 bg-muted/40 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl border border-emerald-200/30 bg-muted/40" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 py-2 md:py-3">
        {/* Welcome — hero card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10 sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
          <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-teal-400/10 blur-2xl" />
          <div className="relative">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Your scholarship hub
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl lg:text-4xl">
              Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}!{" "}
              <span className="inline-block" aria-hidden>
                👋
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-900/75 dark:text-emerald-200/85 sm:text-base">
              Track applications, requirements, and updates — all in one place.
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardCards.map((card, index) => (
            <DashboardCard key={index} {...card} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Notifications & Announcements */}
          <div className="space-y-6 lg:col-span-2">
            <StudentSection
              title="Notifications"
              subtitle="Latest updates, requirements, and reminders"
              icon={Bell}
              accent="teal"
              badge={
                notifications.length > 0 ? (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                    {notifications.length} new
                  </span>
                ) : null
              }
            >
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice((notificationsPage - 1) * NOTIFICATIONS_PER_PAGE, notificationsPage * NOTIFICATIONS_PER_PAGE).map((notification, index) => {
                    if (notification.type === "requirement") {
                      return (
                        <div
                          key={notification.id}
                          className={`group relative rounded-lg border p-3 transition-all ${
                            notification.isRequired && !notification.isUploaded
                              ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                              : 'border-emerald-500/25 bg-emerald-500/[0.04] hover:border-emerald-500/35'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => router.push("/student/requirements")}
                            >
                              <div className={`mb-2 inline-flex rounded-md p-1.5 ${
                                notification.isRequired && !notification.isUploaded
                                  ? 'bg-red-500/20' 
                                  : 'bg-emerald-500/15'
                              }`}>
                                <ClipboardCheck className={`w-4 h-4 ${
                                  notification.isRequired && !notification.isUploaded
                                    ? 'text-red-600' 
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`} />
                              </div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                                  {notification.title}
                                </h3>
                                {notification.isRequired && !notification.isUploaded && (
                                  <span className="px-2 py-0.5 bg-red-500/20 text-red-600 rounded-full text-xs font-semibold flex-shrink-0">
                                    Required
                                  </span>
                                )}
                                {notification.isUploaded && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-600 rounded-full text-xs font-semibold flex-shrink-0">
                                    Uploaded
                                  </span>
                                )}
                              </div>
                              <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                                {notification.description || "New document requirement"}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatTimeAgo(notification.createdAt)}</span>
                                </div>
                                {notification.isRequired && !notification.isUploaded && (
                                  <span className="text-red-600 font-medium">Action Required</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteNotification(notification.id)
                              }}
                              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                              title="Delete notification"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )
                    }
                    
                    // Announcement notification
                    const announcement = notification
                    const now = new Date()
                    const endDate = announcement.endDate
                    const isIncoming = endDate && now < endDate
                    const isUrgent = announcement.priority === "high" || announcement.priority === "urgent"
                    
                    return (
                      <div
                        key={announcement.id}
                        className={`group relative rounded-lg border p-3 transition-all ${
                          isUrgent
                            ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                            : isIncoming
                            ? 'border-emerald-500/30 bg-emerald-500/[0.04] hover:border-emerald-500/45'
                            : 'border-border bg-muted/30 hover:border-emerald-500/35'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              setSelectedAnnouncement(announcement)
                              setIsAnnouncementModalOpen(true)
                            }}
                          >
                            <div className={`mb-2 inline-flex rounded-md p-1.5 ${
                              isUrgent 
                                ? 'bg-red-500/20' 
                                : isIncoming 
                                ? 'bg-emerald-500/15' 
                                : 'bg-emerald-500/12'
                            }`}>
                              {isUrgent ? (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <Megaphone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                                {announcement.title}
                              </h3>
                              {isUrgent && (
                                <span className="px-2 py-0.5 bg-red-500/20 text-red-600 rounded-full text-xs font-semibold flex-shrink-0">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                              {announcement.description}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatTimeAgo(announcement.createdAt)}</span>
                              </div>
                              {endDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{isIncoming ? 'Starts' : 'Ends'}: {formatDate(endDate)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNotification(announcement.id)
                            }}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                            title="Delete notification"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Pagination */}
                  {notifications.length > NOTIFICATIONS_PER_PAGE && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200/40 pt-4 dark:border-emerald-900/40">
                      <button
                        onClick={() => setNotificationsPage(prev => Math.max(1, prev - 1))}
                        disabled={notificationsPage === 1}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      <span className="text-sm text-muted-foreground">
                        Page {notificationsPage} of {Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE)}
                      </span>

                      <button
                        onClick={() => setNotificationsPage(prev => Math.min(Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE), prev + 1))}
                        disabled={notificationsPage >= Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE)}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-emerald-200/60 bg-emerald-50/30 py-12 text-center dark:border-emerald-800/50 dark:bg-emerald-950/20">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 shadow-inner dark:from-emerald-900/50 dark:to-emerald-950/80">
                    <Bell className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="font-medium text-foreground">You&apos;re all caught up</p>
                  <p className="mt-1 text-sm text-muted-foreground">No new notifications right now</p>
                </div>
              )}
            </StudentSection>

            <StudentSection
              title="Announcements"
              subtitle="Important updates from OSAS"
              icon={Megaphone}
              accent="emerald"
            >
            {announcements.length > 0 ? (
              <div className="space-y-4">
                  {announcements.slice(0, 3).map((announcement) => {
                  const now = new Date()
                  const endDate = announcement.endDate
                  const isIncoming = endDate && now < endDate
                  
                  return (
                    <div 
                      key={announcement.id}
                        className={`cursor-pointer rounded-lg border-l-4 p-3 transition-all hover:shadow-sm ${
                          isIncoming 
                            ? 'border-emerald-500 bg-emerald-500/[0.04] hover:bg-emerald-500/10' 
                            : 'bg-muted/30 border-emerald-600/40 hover:bg-muted/50'
                        }`}
                      onClick={() => {
                        setSelectedAnnouncement(announcement)
                        setIsAnnouncementModalOpen(true)
                      }}
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="flex-1 text-sm font-semibold text-foreground">
                            {announcement.title}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(announcement.createdAt)}
                          </span>
                        </div>
                        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                        {announcement.description}
                      </p>
                      {endDate && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                          {isIncoming ? 'Starts' : 'Ends'}: {formatDate(endDate)}
                            </span>
                          </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-emerald-200/60 bg-emerald-50/30 py-12 text-center dark:border-emerald-800/50 dark:bg-emerald-950/20">
                <Megaphone className="mx-auto mb-4 h-12 w-12 text-emerald-400/80 dark:text-emerald-600/60" />
                <p className="font-medium text-foreground">No announcements yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back for campus-wide updates</p>
              </div>
              )}
            </StudentSection>
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            {/* Application Status Card */}
            {applications.length > 0 && (
              <StudentSection title="Your applications" subtitle="Latest submission status" icon={TrendingUp} accent="emerald">
                <div className="space-y-3">
                  {applications.slice(0, 3).map((app) => (
                    <div
                      key={app.id}
                      className="cursor-pointer rounded-xl border border-emerald-200/50 bg-gradient-to-br from-white to-emerald-50/40 p-3.5 shadow-sm transition hover:border-emerald-400/50 hover:shadow-md dark:from-emerald-950/30 dark:to-card dark:border-emerald-800/40"
                      onClick={() => router.push("/student/applications")}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm text-foreground line-clamp-1">
                          {app.scholarshipName || "Scholarship Application"}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(app.status)}`}>
                          {app.status || "pending"}
                        </span>
                      </div>
                      {app.trackerCode && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Code: {app.trackerCode}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                
                {applications.length > 3 && (
                  <button
                    onClick={() => router.push("/student/applications")}
                    className="mt-4 w-full rounded-xl border border-emerald-200/80 bg-emerald-50/50 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                  >
                    View all applications →
                  </button>
                )}
              </StudentSection>
            )}

            <StudentSection title="Quick actions" subtitle="Shortcuts to common tasks" icon={Sparkles} accent="emerald">
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/student/apply")}
                  className="group flex w-full items-center gap-4 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-white to-emerald-50/50 p-4 text-left shadow-sm transition hover:border-emerald-400/60 hover:shadow-md dark:from-card dark:to-emerald-950/30 dark:border-emerald-800/50"
                >
                  <div className="rounded-xl bg-emerald-500/15 p-2.5 ring-1 ring-emerald-500/20">
                    <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">Apply for scholarship</p>
                    <p className="text-xs text-muted-foreground">Start or continue an application</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-emerald-600/50 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-emerald-500/50" />
                </button>

                <button
                  onClick={() => router.push("/student/requirements")}
                  className="group flex w-full items-center gap-4 rounded-xl border border-amber-200/50 bg-gradient-to-r from-white to-amber-50/40 p-4 text-left shadow-sm transition hover:border-amber-300/70 hover:shadow-md dark:from-card dark:to-amber-950/20 dark:border-amber-900/40"
                >
                  <div className="rounded-xl bg-amber-500/12 p-2.5 ring-1 ring-amber-500/20">
                    <AlertCircle className="h-5 w-5 text-amber-800 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">Upload documents</p>
                    <p className="text-xs text-muted-foreground">
                      {pendingRequirements > 0 ? `${pendingRequirements} pending` : "All submitted"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-amber-700/50 transition group-hover:translate-x-0.5 dark:text-amber-500/50" />
                </button>
                
                {userScholarships.length > 0 && (
                  <div className="mt-2 rounded-xl border border-emerald-200/50 bg-emerald-50/40 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/25">
                    <div className="mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      <p className="text-sm font-semibold text-foreground">Your scholarships</p>
                    </div>
                    <div className="space-y-2">
                      {userScholarships.map((scholarship, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5 text-xs text-muted-foreground dark:bg-emerald-950/40"
                        >
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="line-clamp-1">{scholarship}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </StudentSection>
          </div>
          </div>
        </div>

      {/* Announcement Detail Modal */}
      {isAnnouncementModalOpen && selectedAnnouncement && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
            onClick={() => {
              setIsAnnouncementModalOpen(false)
              setSelectedAnnouncement(null)
            }}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAnnouncementModalOpen(false)
              setSelectedAnnouncement(null)
            }
          }}>
            <div
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-200/60 bg-card shadow-2xl shadow-emerald-950/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 dark:border-emerald-800/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/90">Announcement</p>
                <h3 className="mt-1 text-lg font-bold leading-snug sm:text-xl">{selectedAnnouncement.title}</h3>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {selectedAnnouncement.description}
                </p>

                <div className="mt-6 space-y-2 border-t border-emerald-200/40 pt-4 dark:border-emerald-800/40">
                  {selectedAnnouncement.endDate && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>Starts: {formatDate(selectedAnnouncement.endDate)}</span>
                    </div>
                  )}
                  {selectedAnnouncement.venue && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{selectedAnnouncement.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Posted {formatTimeAgo(selectedAnnouncement.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
