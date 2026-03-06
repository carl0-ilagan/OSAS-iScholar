"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc, where, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import DashboardCard from "@/components/student/dashboard-card"
import { Clock, Bell, FileText, Megaphone, CheckCircle, AlertCircle, Calendar, TrendingUp, Award, Sparkles, ClipboardCheck, X, ChevronLeft, ChevronRight, Trash2, MapPin } from "lucide-react"
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
          
          // Debug logging
          console.log(`Checking announcement "${data.title}":`, {
            targetScholarships,
            targetYearLevel,
            userYearLevel,
            userScholarships: scholarships,
            isForScholarship,
            isForYearLevel,
            willShow: isForScholarship && isForYearLevel
          })
          
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
        return "text-green-600 bg-green-500/20 border-green-500/30"
      case "rejected":
      case "declined":
        return "text-red-600 bg-red-500/20 border-red-500/30"
      case "pending":
      case "under-review":
        return "text-yellow-600 bg-yellow-500/20 border-yellow-500/30"
      default:
        return "text-blue-600 bg-blue-500/20 border-blue-500/30"
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
      color: "text-blue-600",
      onClick: () => router.push("/student/applications"),
    },
    {
      title: "Notifications",
      icon: Bell,
      count: notifications.length,
      description: `${notifications.length} new notification${notifications.length !== 1 ? 's' : ''}`,
      color: "text-yellow-600",
    },
    {
      title: "Pending Requirements",
      icon: AlertCircle,
      count: pendingRequirements,
      description: pendingRequirements > 0 
        ? `${pendingRequirements} document${pendingRequirements !== 1 ? 's' : ''} needed`
        : "All requirements submitted",
      color: "text-orange-600",
      onClick: () => router.push("/student/requirements"),
    },
  ]

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Here&apos;s your scholarship journey overview
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {dashboardCards.map((card, index) => (
              <DashboardCard key={index} {...card} />
            ))}
          </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Notifications & Announcements */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notifications Section */}
            <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-border rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">Notifications</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Latest updates and announcements</p>
                  </div>
                </div>
                {notifications.length > 0 && (
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold">
                    {notifications.length} New
                  </span>
                )}
              </div>

              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice((notificationsPage - 1) * NOTIFICATIONS_PER_PAGE, notificationsPage * NOTIFICATIONS_PER_PAGE).map((notification, index) => {
                    if (notification.type === "requirement") {
                      return (
                        <div
                          key={notification.id}
                          className={`group relative p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                            notification.isRequired && !notification.isUploaded
                              ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 hover:border-red-500/50'
                              : 'bg-gradient-to-r from-blue-500/10 to-primary/10 border-blue-500/30 hover:border-blue-500/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => router.push("/student/requirements")}
                            >
                              <div className={`p-2 rounded-lg flex-shrink-0 mb-2 ${
                                notification.isRequired && !notification.isUploaded
                                  ? 'bg-red-500/20' 
                                  : 'bg-blue-500/20'
                              }`}>
                                <ClipboardCheck className={`w-4 h-4 ${
                                  notification.isRequired && !notification.isUploaded
                                    ? 'text-red-600' 
                                    : 'text-blue-600'
                                }`} />
                              </div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
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
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
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
                        className={`group relative p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                          isUrgent
                            ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 hover:border-red-500/50'
                            : isIncoming
                            ? 'bg-gradient-to-r from-blue-500/10 to-primary/10 border-blue-500/30 hover:border-blue-500/50'
                            : 'bg-muted/50 border-border hover:border-primary/50'
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
                            <div className={`p-2 rounded-lg flex-shrink-0 mb-2 ${
                              isUrgent 
                                ? 'bg-red-500/20' 
                                : isIncoming 
                                ? 'bg-blue-500/20' 
                                : 'bg-primary/20'
                            }`}>
                              {isUrgent ? (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <Megaphone className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
                                {announcement.title}
                              </h3>
                              {isUrgent && (
                                <span className="px-2 py-0.5 bg-red-500/20 text-red-600 rounded-full text-xs font-semibold flex-shrink-0">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
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
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <button
                        onClick={() => setNotificationsPage(prev => Math.max(1, prev - 1))}
                        disabled={notificationsPage === 1}
                        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Page {notificationsPage} of {Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE)}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setNotificationsPage(prev => Math.min(Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE), prev + 1))}
                        disabled={notificationsPage >= Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE)}
                        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No notifications at this time</p>
                  <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up!</p>
                </div>
              )}
            </div>

            {/* Recent Announcements Section */}
            <div className="bg-card border-2 border-border rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">Announcements</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Important updates from administration</p>
                </div>
              </div>
              
            {announcements.length > 0 ? (
              <div className="space-y-4">
                  {announcements.slice(0, 3).map((announcement) => {
                  const now = new Date()
                  const endDate = announcement.endDate
                  const isIncoming = endDate && now < endDate
                  
                  return (
                    <div 
                      key={announcement.id}
                        className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md cursor-pointer ${
                          isIncoming 
                            ? 'bg-blue-500/5 border-blue-500 hover:bg-blue-500/10' 
                            : 'bg-muted/30 border-primary hover:bg-muted/50'
                        }`}
                      onClick={() => {
                        setSelectedAnnouncement(announcement)
                        setIsAnnouncementModalOpen(true)
                      }}
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-foreground text-sm sm:text-base flex-1">
                            {announcement.title}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(announcement.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
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
              <div className="text-center py-8">
                  <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No announcements at this time</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            {/* Application Status Card */}
            {applications.length > 0 && (
              <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-border rounded-2xl p-5 sm:p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-primary rounded-xl">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Application Status</h2>
                </div>
                
                <div className="space-y-3">
                  {applications.slice(0, 3).map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer"
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
                    className="w-full mt-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View all applications →
                  </button>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-card border-2 border-border rounded-2xl p-5 sm:p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/student/apply")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">Apply for Scholarship</p>
                    <p className="text-xs text-muted-foreground">Submit new application</p>
                  </div>
                </button>
                
                <button
                  onClick={() => router.push("/student/requirements")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">Upload Documents</p>
                    <p className="text-xs text-muted-foreground">
                      {pendingRequirements > 0 
                        ? `${pendingRequirements} pending` 
                        : "All submitted"}
                    </p>
                  </div>
                </button>
                
                {userScholarships.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Your Scholarships</p>
                    </div>
                    <div className="space-y-1">
                      {userScholarships.map((scholarship, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="line-clamp-1">{scholarship}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
              className="bg-card border border-border rounded-xl w-full max-w-lg shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6">
                {/* Title */}
                <div className="mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                    {selectedAnnouncement.title}
                  </h3>
                </div>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.description}
                </p>
                
                {/* Details */}
                <div className="space-y-1 pt-4 border-t border-border/50">
                  {selectedAnnouncement.endDate && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Starts: {formatDate(selectedAnnouncement.endDate)}</span>
                    </div>
                  )}
                  {selectedAnnouncement.venue && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedAnnouncement.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Created: {formatTimeAgo(selectedAnnouncement.createdAt)}</span>
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
