"use client"

import { useState, useEffect } from "react"
import AdminLayoutWrapper from "./admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import AdminDashboardCard from "@/components/admin/dashboard-card"
import { LayoutDashboard, Users, FileCheck, FileText, Award, MessageSquare, Calendar, Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState([
    { icon: Users, label: "Verified Students", value: "0", color: "text-green-600" },
    { icon: FileCheck, label: "Pending Verifications", value: "0", color: "text-yellow-600" },
    { icon: FileText, label: "Pending Applications", value: "0", color: "text-blue-600" },
    { icon: Award, label: "Scholarships Approved", value: "0", color: "text-purple-600" },
    { icon: MessageSquare, label: "Feedback Received", value: "0", color: "text-orange-600" },
    { icon: Calendar, label: "Upcoming Events", value: "0", color: "text-pink-600" },
  ])
  const [loading, setLoading] = useState(true)

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

        // Fetch feedback count
        let feedbackCount = 0
        try {
          const feedbackSnapshot = await getDocs(collection(db, "feedback"))
          feedbackCount = feedbackSnapshot.size
        } catch (error) {
          console.log("Feedback collection not found or error:", error)
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
          { icon: MessageSquare, label: "Feedback Received", value: feedbackCount.toString(), color: "text-orange-600" },
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {metrics.map((metric, index) => (
              <AdminDashboardCard key={index} {...metric} />
            ))}
          </div>
            )}

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Quick Announcement</h2>
            <div className="space-y-4">
              <textarea
                placeholder="Post an announcement to all students..."
                className="w-full px-4 py-3 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows="4"
              ></textarea>
              <button className="bg-accent text-accent-foreground font-semibold px-6 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                Post Announcement
              </button>
            </div>
          </div>
        </div>
        </div>
    </div>
    </AdminLayoutWrapper>
  )
}
