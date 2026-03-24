"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { ChevronLeft, ChevronRight, Search, Users, Sparkles, GraduationCap } from "lucide-react"
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

        const { resolvePhotoUrlFromAuth } = await import("@/lib/resolve-user-photo-url")
        const enrichedRows = await Promise.all(
          rows.map(async (row) => {
            const uid = row.uid || row.id
            const photoURL = await resolvePhotoUrlFromAuth(uid, row.photoURL || null)
            return { ...row, photoURL: photoURL || row.photoURL || null }
          }),
        )
        setStudents(enrichedRows)
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

  return (
    <CampusAdminLayoutWrapper>
      <div className="w-full px-3 pb-4 pt-2 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
        <div className="w-full space-y-4 md:space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10 md:p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
            <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
                <GraduationCap className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              </span>
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Student Directory
                </span>
                <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 md:text-2xl">
                  Campus Students
                </h1>
                <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-200/85">
                  Manage and review student records for <span className="font-semibold">{activeCampus || "your campus"}</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground md:text-xl">Student Management</h2>
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
                  ? "Loading students..."
                  : `Showing ${paginatedStudents.length} of ${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"}`}
              </p>
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

            {!loading ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border/70 pt-3 text-center md:justify-between md:text-left">
                <p className="w-full text-sm text-muted-foreground md:w-auto">
                  Showing {filteredStudents.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length} record
                  {filteredStudents.length === 1 ? "" : "s"}
                </p>
                <div className="flex w-full items-center justify-center gap-2 md:w-auto md:justify-end">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm font-medium text-foreground">
                    Page {Math.max(1, currentPage)} of {Math.max(1, totalPages)}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(Math.max(1, totalPages), prev + 1))}
                    disabled={currentPage >= Math.max(1, totalPages)}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
