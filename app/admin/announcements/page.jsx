"use client"

import { useState, useEffect, useMemo } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { Megaphone, Plus, Search, Filter, ChevronDown, Archive, Clock, CheckCircle, Trash2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import AnnouncementsList from "@/components/admin/announcements-list"
import AnnouncementsListSkeleton from "@/components/admin/announcements-list-skeleton"
import AnnouncementModal from "@/components/admin/announcement-modal"

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [scholarships, setScholarships] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // all, incoming, active, archived
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState(null)

  // Calculate announcement status
  const getAnnouncementStatus = (announcement) => {
    const now = new Date()
    const endDate = announcement.endDate ? (announcement.endDate.toDate ? announcement.endDate.toDate() : new Date(announcement.endDate)) : null
    const createdAt = announcement.createdAt ? (announcement.createdAt.toDate ? announcement.createdAt.toDate() : new Date(announcement.createdAt)) : new Date()
    
    // If manually archived
    if (announcement.status === "archived") {
      return "archived"
    }
    
    if (!endDate) {
      return "active"
    }
    
    // Archive date is 2 days after endDate
    const archiveDate = new Date(endDate)
    archiveDate.setDate(archiveDate.getDate() + 2)
    
    // If past archive date, it's archived
    if (now > archiveDate) {
      return "archived"
    }
    
    // If before endDate, it's incoming
    if (now < endDate) {
      return "incoming"
    }
    
    // If between endDate and archiveDate, it's active
    return "active"
  }

  // Fetch scholarships and announcements from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scholarships
        const scholarshipsSnapshot = await getDocs(collection(db, "scholarships"))
        const scholarshipsData = scholarshipsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }))
        setScholarships(scholarshipsData)

        // Fetch announcements
        let snapshot
        try {
          snapshot = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")))
        } catch (error) {
          snapshot = await getDocs(collection(db, "announcements"))
        }
        
        const announcementsData = []
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          const announcement = {
            id: docSnap.id,
            title: data.title || "Untitled",
            description: data.description || "",
            targetScholarships: data.targetScholarships || ["all"],
            targetYearLevel: data.targetYearLevel || "all",
            endDate: data.endDate ? (data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate)) : null,
            venue: data.venue || "",
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
            updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
            status: data.status || null, // Manual status override
          }
          
          // Calculate and update status if needed
          const calculatedStatus = getAnnouncementStatus(announcement)
          if (calculatedStatus === "archived" && announcement.status !== "archived") {
            // Auto-archive: update in Firestore
            updateDoc(doc(db, "announcements", docSnap.id), {
              status: "archived",
            }).catch(err => console.error("Error auto-archiving:", err))
            announcement.status = "archived"
          }
          
          announcement.calculatedStatus = calculatedStatus
          announcementsData.push(announcement)
        })
        
        // Sort manually if needed
        announcementsData.sort((a, b) => {
          const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return dateB - dateA
        })
        
        setAnnouncements(announcementsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    
    // Check for auto-archive every minute
    const interval = setInterval(() => {
      setAnnouncements(prev => prev.map(announcement => {
        const status = getAnnouncementStatus(announcement)
        if (status === "archived" && announcement.status !== "archived") {
          updateDoc(doc(db, "announcements", announcement.id), {
            status: "archived",
          }).catch(err => console.error("Error auto-archiving:", err))
          return { ...announcement, status: "archived", calculatedStatus: status }
        }
        return { ...announcement, calculatedStatus: status }
      }))
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  // Filter announcements by search query and status
  const filteredAnnouncements = useMemo(() => {
    let filtered = [...announcements]

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(announcement => {
        const status = announcement.calculatedStatus || getAnnouncementStatus(announcement)
        return status === statusFilter
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(announcement => 
        announcement.title?.toLowerCase().includes(query) ||
        announcement.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [announcements, statusFilter, searchQuery])

  // Separate announcements by status
  const activeAnnouncements = useMemo(() => {
    return filteredAnnouncements.filter(a => {
      const status = a.calculatedStatus || getAnnouncementStatus(a)
      return status !== "archived"
    })
  }, [filteredAnnouncements])

  const archivedAnnouncements = useMemo(() => {
    return filteredAnnouncements.filter(a => {
      const status = a.calculatedStatus || getAnnouncementStatus(a)
      return status === "archived"
    })
  }, [filteredAnnouncements])

  const handleAdd = () => {
    setEditingAnnouncement(null)
    setIsModalOpen(true)
  }

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement)
    setIsModalOpen(true)
  }

  const handleSave = async (announcementData) => {
    try {
      const now = new Date()
      const endDate = new Date(announcementData.endDate)
      let initialStatus = "active"
      
      // Determine initial status
      if (now < endDate) {
        initialStatus = "incoming"
      }

      if (editingAnnouncement) {
        // Update existing announcement
        const announcementRef = doc(db, "announcements", editingAnnouncement.id)
        await updateDoc(announcementRef, {
          title: announcementData.title,
          description: announcementData.description,
          targetScholarships: announcementData.targetScholarships,
          targetYearLevel: announcementData.targetYearLevel || "all",
          endDate: announcementData.endDate,
          venue: announcementData.venue || "",
          updatedAt: serverTimestamp(),
          status: initialStatus,
        })
      } else {
        // Create new announcement
        await addDoc(collection(db, "announcements"), {
          title: announcementData.title,
          description: announcementData.description,
          targetScholarships: announcementData.targetScholarships,
          targetYearLevel: announcementData.targetYearLevel || "all",
          endDate: announcementData.endDate,
          venue: announcementData.venue || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: initialStatus,
        })
        
        // Send email notifications to selected students
        try {
          const targetScholarships = announcementData.targetScholarships || ["all"]
          const targetYearLevel = announcementData.targetYearLevel || "all"
          const isForAllStudents = targetScholarships.includes("all") // All students including those without scholarships
          const isForAllScholarships = targetScholarships.includes("allScholarships") // Only students with scholarships
          
          // Fetch all users
          const usersSnapshot = await getDocs(collection(db, "users"))
          
          // Fetch all applications to determine which students have which scholarships
          const applicationsSnapshot = await getDocs(collection(db, "applications"))
          const userScholarshipsMap = new Map() // userId -> [scholarshipNames]
          
          applicationsSnapshot.forEach((appDoc) => {
            const appData = appDoc.data()
            if (appData.status === "approved" && appData.scholarshipName) {
              const userId = appData.userId
              if (!userScholarshipsMap.has(userId)) {
                userScholarshipsMap.set(userId, [])
              }
              const scholarships = userScholarshipsMap.get(userId)
              if (!scholarships.includes(appData.scholarshipName)) {
                scholarships.push(appData.scholarshipName)
              }
            }
          })
          
          const emailPromises = []
          
          usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data()
            const userId = userDoc.id
            const secondaryEmail = userData.secondaryEmail || userData.email
            const studentName = userData.fullName || userData.displayName || "Student"
            const userYearLevel = userData.yearLevel || null
            
            // Check if user should receive this announcement
            let shouldReceive = false
            
            // Check scholarship match
            if (isForAllStudents) {
              // All students (including those without scholarships)
              shouldReceive = true
            } else if (isForAllScholarships) {
              // Only students with scholarships
              const userScholarships = userScholarshipsMap.get(userId) || []
              shouldReceive = userScholarships.length > 0
            } else {
              // Specific scholarships
              const userScholarships = userScholarshipsMap.get(userId) || []
              shouldReceive = targetScholarships.some(targetSch => 
                userScholarships.includes(targetSch)
              )
            }
            
            // Check year level match
            if (shouldReceive) {
              if (targetYearLevel === "all") {
                shouldReceive = true
              } else {
                shouldReceive = targetYearLevel === userYearLevel
              }
            }
            
            if (shouldReceive && secondaryEmail) {
              emailPromises.push(
                fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: secondaryEmail,
                    subject: '📢 New Announcement - iScholar',
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="utf-8">
                        <style>
                          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                          .announcement-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h1>📢 New Announcement</h1>
                          </div>
                          <div class="content">
                            <p>Dear ${studentName},</p>
                            <p>We have an important announcement for you:</p>
                            <div class="announcement-box">
                              <h2 style="margin-top: 0; color: #667eea;">${announcementData.title}</h2>
                              <p>${announcementData.description}</p>
                              ${announcementData.venue ? `<p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;"><strong>📍 Venue:</strong> ${announcementData.venue}</p>` : ''}
                            </div>
                            <p>Please log in to your iScholar account to view the full announcement and take any necessary action.</p>
                            <p>Best regards,<br>iScholar Team</p>
                          </div>
                        </div>
                      </body>
                      </html>
                    `
                  })
                }).catch(err => console.error(`Error sending email to ${secondaryEmail}:`, err))
              )
            }
          })
          
          // Send emails in parallel (don't wait for all to complete)
          Promise.allSettled(emailPromises).then(() => {
            console.log(`Announcement emails sent to ${emailPromises.length} recipients`)
          })
        } catch (emailError) {
          console.error("Error sending announcement emails:", emailError)
          // Don't block announcement creation if email fails
        }
      }
      
      // Close modal
      setIsModalOpen(false)
      setEditingAnnouncement(null)
      
      // Refresh announcements list
      let snapshot
      try {
        snapshot = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")))
      } catch (error) {
        snapshot = await getDocs(collection(db, "announcements"))
      }
      
      const announcementsData = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        const announcement = {
          id: docSnap.id,
          title: data.title || "Untitled",
          description: data.description || "",
          targetScholarships: data.targetScholarships || ["all"],
          targetYearLevel: data.targetYearLevel || "all",
          endDate: data.endDate ? (data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate)) : null,
          venue: data.venue || "",
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
          updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null,
          status: data.status || null,
        }
        
        // Calculate and update status if needed
        const calculatedStatus = getAnnouncementStatus(announcement)
        if (calculatedStatus === "archived" && announcement.status !== "archived") {
          updateDoc(doc(db, "announcements", docSnap.id), {
            status: "archived",
          }).catch(err => console.error("Error auto-archiving:", err))
          announcement.status = "archived"
        }
        
        announcement.calculatedStatus = calculatedStatus
        announcementsData.push(announcement)
      })
      
      // Sort manually if needed
      announcementsData.sort((a, b) => {
        const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
        const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      setAnnouncements(announcementsData)
    } catch (error) {
      console.error("Error saving announcement:", error)
      throw error
    }
  }

  const handleDeleteClick = (announcement) => {
    setAnnouncementToDelete(announcement)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return

    try {
      await deleteDoc(doc(db, "announcements", announcementToDelete.id))
      toast.success("Announcement deleted successfully", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
      })
      setAnnouncements(announcements.filter(a => a.id !== announcementToDelete.id))
      setDeleteModalOpen(false)
      setAnnouncementToDelete(null)
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast.error("Failed to delete announcement. Please try again.", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 4000,
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setAnnouncementToDelete(null)
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        {/* Banner */}
        <AdminPageBanner
          icon={Megaphone}
          title="Announcements"
          description="Manage and post announcements for all students"
          className={isModalOpen || deleteModalOpen ? "blur-sm" : ""}
        />

        {/* Content */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Header with Add Button, Search, and Filter */}
          <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            {/* Add Button - Left Side */}
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm hover:shadow-md md:order-first"
            >
              <Plus className="w-4 h-4" />
              Add Announcement
            </button>

            {/* Search Bar and Status Filter - Right Side */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:ml-auto">
              {/* Search Bar */}
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search announcements..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200 appearance-none pr-8 w-full md:w-auto"
                >
                  <option value="all">All Status</option>
                  <option value="incoming">Incoming</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Announcements List */}
          {loading ? (
            <AnnouncementsListSkeleton />
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Active/Incoming Announcements */}
              {statusFilter === "all" || statusFilter === "incoming" || statusFilter === "active" ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {statusFilter === "incoming" ? (
                      <Clock className="w-5 h-5 text-blue-600" />
                    ) : statusFilter === "active" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Megaphone className="w-5 h-5 text-primary" />
                    )}
                    <h2 className="text-lg font-bold text-foreground">
                      {statusFilter === "incoming" ? "Incoming" : statusFilter === "active" ? "Active" : "Active Announcements"}
                    </h2>
                  </div>
                  {activeAnnouncements.length > 0 ? (
                    <AnnouncementsList
                      announcements={activeAnnouncements}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      getStatus={getAnnouncementStatus}
                    />
                  ) : (
                    <div className="text-center py-8 bg-card border border-border rounded-xl">
                      <p className="text-muted-foreground">No active announcements found</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Archived Announcements */}
              {(statusFilter === "all" || statusFilter === "archived") && archivedAnnouncements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Archive className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-bold text-foreground">Archived Announcements</h2>
                  </div>
                  <AnnouncementsList
                    announcements={archivedAnnouncements}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    getStatus={getAnnouncementStatus}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingAnnouncement(null)
        }}
        onSave={handleSave}
        announcement={editingAnnouncement}
        scholarships={scholarships}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && announcementToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
            onClick={handleDeleteCancel}
          />
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <div
              className="bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Delete Announcement</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">This action cannot be undone</p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-sm sm:text-base text-foreground mb-3">
                    Are you sure you want to delete <span className="font-semibold text-destructive">{announcementToDelete.title}</span>?
                  </p>
                  <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-xs sm:text-sm text-destructive font-medium">
                      ⚠️ This announcement will be permanently removed and students will no longer see it.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 px-4 py-2.5 sm:py-3 border-2 border-border rounded-lg hover:bg-muted transition-colors font-medium text-sm sm:text-base order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm sm:text-base order-1 sm:order-2 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayoutWrapper>
  )
}
