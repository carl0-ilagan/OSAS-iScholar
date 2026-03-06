"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Search, CheckCircle, Clock, AlertCircle, FileText, GraduationCap, Calendar, Loader2, Copy } from "lucide-react"
import { toast } from "sonner"

const statusConfig = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: Clock,
    description: "Your application is being reviewed"
  },
  "under-review": {
    label: "Under Review",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: FileText,
    description: "Your application is currently under review"
  },
  approved: {
    label: "Approved",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    icon: CheckCircle,
    description: "Congratulations! Your application has been approved"
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: AlertCircle,
    description: "Your application has been rejected"
  }
}

export default function ApplicationTrackerSection() {
  const [trackingCode, setTrackingCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [application, setApplication] = useState(null)
  const [error, setError] = useState("")

  const handleTrack = async (e) => {
    e.preventDefault()
    
    if (!trackingCode.trim()) {
      setError("Please enter a tracking code")
      return
    }

    // Validate format: MINSU-YYYY-MMDD-000000
    const codePattern = /^MINSU-\d{4}-\d{4}-\d{6}$/
    if (!codePattern.test(trackingCode.trim())) {
      setError("Invalid tracking code format. Format: MINSU-YYYY-MMDD-000000")
      return
    }

    setLoading(true)
    setError("")
    setApplication(null)

    try {
      const q = query(
        collection(db, "applications"),
        where("trackerCode", "==", trackingCode.trim().toUpperCase())
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setError("No application found with this tracking code. Please check and try again.")
        setLoading(false)
        return
      }

      const doc = snapshot.docs[0]
      const data = doc.data()

      // Format dates
      const submittedDate = data.submittedAt 
        ? new Date(data.submittedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : "N/A"

      const reviewedDate = data.reviewedAt 
        ? new Date(data.reviewedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : null

      setApplication({
        id: doc.id,
        trackerCode: data.trackerCode,
        scholarshipName: data.scholarshipName || "Unknown Scholarship",
        studentName: data.studentName || "N/A",
        course: data.course || "N/A",
        yearLevel: data.yearLevel || "N/A",
        status: data.status || "pending",
        submittedDate,
        reviewedDate,
        adminRemarks: data.adminRemarks || null,
        benefit: data.benefit || "N/A",
        benefitAmount: data.benefitAmount || "N/A"
      })
    } catch (error) {
      console.error("Error tracking application:", error)
      setError("Failed to track application. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyTrackingCode = () => {
    if (application?.trackerCode) {
      navigator.clipboard.writeText(application.trackerCode)
      toast.success("Tracking code copied to clipboard!", {
        icon: <CheckCircle className="w-4 h-4" />,
      })
    }
  }

  const status = application ? statusConfig[application.status] || statusConfig.pending : null
  const StatusIcon = status?.icon || Clock

  return (
    <section id="track-application" className="py-16 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Search className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Track Your Application</span>
          </div>
          <h2 className="text-4xl font-bold text-foreground mb-4">Application Tracker</h2>
          <p className="text-muted-foreground text-lg">
            Enter your tracking code to view your application status and progress
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-4 sm:p-6 md:p-8 shadow-lg mb-8">
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label htmlFor="trackingCode" className="block text-sm font-semibold text-foreground mb-2">
                Tracking Code
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="trackingCode"
                  type="text"
                  value={trackingCode}
                  onChange={(e) => {
                    setTrackingCode(e.target.value.toUpperCase())
                    setError("")
                    setApplication(null)
                  }}
                  placeholder="MINSU-2025-0101-000123"
                  className="flex-1 min-w-0 px-3 sm:px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !trackingCode.trim()}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap flex-shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span className="text-sm sm:text-base">Tracking...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">Track</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Format: MINSU-YYYY-MMDD-000000 (e.g., MINSU-2025-0101-000123)
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Application Status Card */}
        {application && (
          <div className="bg-card border-2 border-primary/20 rounded-xl p-6 md:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4">
            {/* Status Header */}
            <div className={`${status.bgColor} ${status.borderColor} border-2 rounded-xl p-6 mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${status.bgColor} rounded-full flex items-center justify-center`}>
                    <StatusIcon className={`w-6 h-6 ${status.color}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Application Status</h3>
                    <p className={`text-sm ${status.color} font-medium`}>{status.label}</p>
                  </div>
                </div>
                <button
                  onClick={copyTrackingCode}
                  className="flex items-center gap-2 px-3 py-2 bg-background/50 hover:bg-background border border-border rounded-lg transition-colors text-sm"
                  title="Copy tracking code"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Copy</span>
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{status.description}</p>
            </div>

            {/* Tracking Code */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tracking Code
              </label>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="font-mono text-lg font-bold text-foreground text-center">
                  {application.trackerCode}
                </p>
              </div>
            </div>

            {/* Application Details */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Scholarship Program
                </label>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <p className="text-foreground font-medium">{application.scholarshipName}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Student Name
                </label>
                <p className="text-foreground font-medium">{application.studentName}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Course
                </label>
                <p className="text-foreground font-medium">{application.course}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Year Level
                </label>
                <p className="text-foreground font-medium">{application.yearLevel}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Submitted Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-foreground font-medium">{application.submittedDate}</p>
                </div>
              </div>

              {application.reviewedDate && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Reviewed Date
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="text-foreground font-medium">{application.reviewedDate}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Benefit Information */}
            {(application.benefit !== "N/A" || application.benefitAmount !== "N/A") && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-2">Benefit Information</h4>
                {application.benefit !== "N/A" && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium">Benefit:</span> {application.benefit}
                  </p>
                )}
                {application.benefitAmount !== "N/A" && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Amount:</span> {application.benefitAmount}
                  </p>
                )}
              </div>
            )}

            {/* Admin Remarks */}
            {application.adminRemarks && (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">Admin Remarks</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application.adminRemarks}
                </p>
              </div>
            )}

            {/* Action Message */}
            {application.status === "pending" && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-600">
                  Your application is pending review. Please check back later for updates.
                </p>
              </div>
            )}

            {application.status === "approved" && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-emerald-600 font-medium">
                  🎉 Congratulations! Your application has been approved. You will receive further instructions via email.
                </p>
              </div>
            )}

            {application.status === "rejected" && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-600">
                  Your application has been rejected. Please review the admin remarks above for more information.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

