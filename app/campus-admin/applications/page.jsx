"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"

const STATUS_OPTIONS = ["pending", "under-review", "approved", "rejected"]

export default function CampusAdminApplicationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  const fetchApplications = async () => {
    if (!activeCampus) {
      setApplications([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const appsSnapshot = await getDocs(query(collection(db, "applications"), where("campus", "==", activeCampus)))
      const rows = appsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((row) => normalizeCampus(row.campus) === activeCampus)
      setApplications(rows)
    } catch (error) {
      console.error("Error fetching campus applications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [activeCampus])

  const handleStatusChange = async (id, status) => {
    try {
      await updateDoc(doc(db, "applications", id), {
        status,
        reviewedBy: user?.uid || null,
        reviewedAt: new Date().toISOString(),
      })
      setApplications((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
      toast.success("Application status updated.")
    } catch (error) {
      console.error("Failed to update application:", error)
      toast.error("Failed to update application status.")
    }
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="w-full space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Campus Applications</h1>
            </div>
            <p className="text-sm text-muted-foreground">Only applications from {activeCampus || "your campus"} are shown here.</p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              <div className="col-span-3">Student</div>
              <div className="col-span-3">Scholarship</div>
              <div className="col-span-2">Course</div>
              <div className="col-span-2">Submitted</div>
              <div className="col-span-2">Status</div>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading applications...</p>
            ) : applications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No applications for this campus yet.</p>
            ) : (
              applications.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
                  <div className="col-span-3 text-foreground font-medium">{row.studentName || row.fullName || row.email || "N/A"}</div>
                  <div className="col-span-3 text-muted-foreground">{row.scholarshipName || row.scholarship || "N/A"}</div>
                  <div className="col-span-2 text-muted-foreground">{row.course || "N/A"}</div>
                  <div className="col-span-2 text-muted-foreground">
                    {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "N/A"}
                  </div>
                  <div className="col-span-2">
                    <select
                      value={row.status || "pending"}
                      onChange={(e) => handleStatusChange(row.id, e.target.value)}
                      className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
