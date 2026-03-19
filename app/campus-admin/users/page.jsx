"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"
import UsersTable from "@/components/admin/users-table"
import UsersTableSkeleton from "@/components/admin/users-table-skeleton"

const ITEMS_PER_PAGE = 10

export default function CampusAdminUsersPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState("")
  const [filterYear, setFilterYear] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
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

  const availableYears = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((row) => String(row.yearLevel || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [students])

  const availableCourses = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((row) => String(row.course || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [students])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((row) => {
      const matchesSearch =
        !q ||
        [row.fullName, row.displayName, row.email, row.studentNumber].some((value) =>
          String(value || "").toLowerCase().includes(q),
        )
      const matchesYear = filterYear === "all" || String(row.yearLevel || "").trim() === filterYear
      const matchesCourse = filterCourse === "all" || String(row.course || "").trim() === filterCourse
      return matchesSearch && matchesYear && matchesCourse
    })
  }, [students, search, filterYear, filterCourse])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE))
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredStudents, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterYear, filterCourse, activeCampus])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const showPagination = !loading && filteredStudents.length > ITEMS_PER_PAGE

  return (
    <CampusAdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="w-full space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground md:text-xl">User Management</h1>
            </div>
            <div className="grid gap-3 md:grid-cols-12">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or student number..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">All Courses</option>
                  {availableCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 md:p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading users..."
                  : `Showing ${paginatedStudents.length} of ${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"}`}
              </p>
              {!loading ? (
                <p className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
              ) : null}
            </div>

            {loading ? (
              <UsersTableSkeleton />
            ) : filteredStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
                <p className="text-sm text-muted-foreground">No students found for this campus.</p>
              </div>
            ) : (
              <UsersTable users={paginatedStudents} />
            )}

            {showPagination ? (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showEllipsis = prev && page - prev > 1
                    return (
                      <div key={`page-${page}`} className="flex items-center gap-2">
                        {showEllipsis ? <span className="text-xs text-muted-foreground">...</span> : null}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold ${
                            currentPage === page
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    )
                  })}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
