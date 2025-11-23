"use client"

import { useState, useEffect, useMemo } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { Megaphone, Plus, Search, Filter, ChevronDown, Archive, Clock, CheckCircle } from "lucide-react"
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
            endDate: data.endDate ? (data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate)) : null,
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
          endDate: announcementData.endDate,
          updatedAt: serverTimestamp(),
          status: initialStatus,
        })
      } else {
        // Create new announcement
        await addDoc(collection(db, "announcements"), {
          title: announcementData.title,
          description: announcementData.description,
          targetScholarships: announcementData.targetScholarships,
          endDate: announcementData.endDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: initialStatus,
        })
      }
      
      // Refresh announcements
      window.location.reload() // Simple refresh for now
    } catch (error) {
      console.error("Error saving announcement:", error)
      throw error
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return
    }
    
    try {
      await deleteDoc(doc(db, "announcements", id))
      setAnnouncements(announcements.filter(a => a.id !== id))
    } catch (error) {
      console.error("Error deleting announcement:", error)
      alert("Failed to delete announcement. Please try again.")
    }
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        {/* Banner */}
        <AdminPageBanner
          icon={Megaphone}
          title="Announcements"
          description="Manage and post announcements for all students"
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
                      onDelete={handleDelete}
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
                    onDelete={handleDelete}
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
    </AdminLayoutWrapper>
  )
}
