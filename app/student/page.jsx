"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "firebase/firestore"
import DashboardCard from "@/components/student/dashboard-card"
import { CheckCircle, Clock, Bell, FileText, Megaphone } from "lucide-react"

export default function StudentDashboard() {
  const { user } = useAuth()
  const [verificationStatus] = useState("verified")
  const [applicationStatus] = useState("under-review")
  const [announcements, setAnnouncements] = useState([])
  const [userScholarships, setUserScholarships] = useState([])

  // Fetch user's approved scholarships and announcements
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return

      try {
        // Get user's approved applications to determine their scholarships
        const applicationsQuery = query(
          collection(db, "applications"),
          where("userId", "==", user.uid),
          where("status", "==", "approved")
        )
        const applicationsSnapshot = await getDocs(applicationsQuery)
        const scholarships = []
        
        applicationsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.scholarshipName) {
            scholarships.push(data.scholarshipName)
          }
        })
        setUserScholarships(scholarships)

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
          
          // Check if announcement is for this user's scholarship
          const isForUser = targetScholarships.includes("all") || 
                           scholarships.some(sch => targetScholarships.includes(sch))
          
          if (!isForUser) return

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
          })
        })

        // Sort by date
        filteredAnnouncements.sort((a, b) => {
          const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return dateB - dateA
        })

        setAnnouncements(filteredAnnouncements.slice(0, 5)) // Show only latest 5
      } catch (error) {
        console.error("Error fetching announcements:", error)
      }
    }

    fetchData()
  }, [user])

  const dashboardCards = [
    {
      title: "Verification Status",
      icon: CheckCircle,
      status: verificationStatus,
      description: "Your account is verified",
      color: "text-green-600",
    },
    {
      title: "Application Status",
      icon: FileText,
      status: applicationStatus,
      description: "Currently under review",
      color: "text-blue-600",
    },
    {
      title: "Notifications",
      icon: Bell,
      count: announcements.length,
      description: `${announcements.length} new announcement${announcements.length !== 1 ? 's' : ''}`,
      color: "text-yellow-600",
    },
    {
      title: "Pending Tasks",
      icon: Clock,
      count: 1,
      description: "Submit missing documents",
      color: "text-orange-600",
    },
  ]

  return (
    <>
        <div className="p-6 lg:p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back!</h1>
          <p className="text-muted-foreground mb-8">Here&apos;s your scholarship journey overview</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {dashboardCards.map((card, index) => (
              <DashboardCard key={index} {...card} />
            ))}
          </div>

          {/* Recent Announcements */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Recent Announcements</h2>
            </div>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => {
                  const formatDate = (date) => {
                    if (!date) return ""
                    const d = date instanceof Date ? date : new Date(date)
                    return d.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  }
                  
                  const now = new Date()
                  const endDate = announcement.endDate
                  const isIncoming = endDate && now < endDate
                  
                  return (
                    <div 
                      key={announcement.id}
                      className={`p-4 bg-muted rounded-lg border-l-4 ${
                        isIncoming ? 'border-blue-500' : 'border-primary'
                      }`}
                    >
                      <p className="font-semibold text-foreground mb-1">{announcement.title}</p>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {announcement.description}
                      </p>
                      {endDate && (
                        <p className="text-xs text-muted-foreground">
                          {isIncoming ? 'Starts' : 'Ends'}: {formatDate(endDate)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No announcements at this time</p>
              </div>
            )}
          </div>
        </div>
    </>
  )
}
