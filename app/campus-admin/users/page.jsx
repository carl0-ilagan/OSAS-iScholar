"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Users } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"

export default function CampusAdminUsersPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState("")
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!activeCampus) {
        setStudents([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const snapshot = await getDocs(query(collection(db, "users"), where("campus", "==", activeCampus)))
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((row) => {
            const role = String(row.role || "").trim().toLowerCase()
            return role !== "admin" && role !== "campus_admin"
          })
        setStudents(rows)
      } catch (error) {
        console.error("Error fetching campus users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [activeCampus])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((row) =>
      [row.fullName, row.displayName, row.email, row.studentNumber].some((value) => String(value || "").toLowerCase().includes(q)),
    )
  }, [students, search])

  return (
    <CampusAdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="w-full space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Campus User Management</h1>
            </div>
            <p className="text-sm text-muted-foreground">Showing student users from {activeCampus || "your campus"} only.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or student number..."
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Student #</div>
              <div className="col-span-2">Course</div>
              <div className="col-span-1">Year</div>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading users...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No students found for this campus.</p>
            ) : (
              filteredStudents.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
                  <div className="col-span-4 font-medium text-foreground">{row.fullName || row.displayName || "N/A"}</div>
                  <div className="col-span-3 truncate text-muted-foreground">{row.email || "N/A"}</div>
                  <div className="col-span-2 text-muted-foreground">{row.studentNumber || "N/A"}</div>
                  <div className="col-span-2 truncate text-muted-foreground">{row.course || "N/A"}</div>
                  <div className="col-span-1 text-muted-foreground">{row.yearLevel || "N/A"}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
