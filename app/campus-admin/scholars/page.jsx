"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore"
import { ChevronDown, Filter, Search, Sparkles, Award } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { normalizeCampus } from "@/lib/campus-admin-config"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import ScholarsTable from "@/components/admin/scholars-table"
import ScholarsTableSkeleton from "@/components/admin/scholars-table-skeleton"

const ITEMS_PER_PAGE = 10

export default function CampusAdminScholarsPage() {
  const { user } = useAuth()
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  const [scholars, setScholars] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterScholarship, setFilterScholarship] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)

  useEffect(() => {
    const fetchScholars = async () => {
      if (!activeCampus) {
        setScholars([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        let snapshot
        try {
          const scholarsQuery = query(
            collection(db, "applications"),
            where("status", "==", "approved"),
            where("campus", "==", activeCampus),
            orderBy("reviewedAt", "desc"),
          )
          snapshot = await getDocs(scholarsQuery)
        } catch (orderedQueryError) {
          // Keep campus restriction if index for orderBy does not exist.
          const fallbackQuery = query(
            collection(db, "applications"),
            where("status", "==", "approved"),
            where("campus", "==", activeCampus),
          )
          snapshot = await getDocs(fallbackQuery)
        }

        const rows = []
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() || {}
          let userName = "Unknown"
          let userPhotoURL = null

          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.userId))
              if (userDoc.exists()) {
                const userData = userDoc.data() || {}
                userName = userData.fullName || userData.displayName || "Unknown"
                userPhotoURL = userData.photoURL || null
              }
            } catch (error) {
              console.error("Error fetching scholar user data:", error)
            }
          }

          rows.push({
            id: docSnap.id,
            userId: data.userId,
            name: userName,
            photoURL: userPhotoURL,
            scholarshipId: data.scholarshipId,
            scholarshipName: data.scholarshipName || "Unknown Scholarship",
            studentName: data.studentName || userName,
            studentNumber: data.studentNumber || "N/A",
            course: data.course || "N/A",
            yearLevel: data.yearLevel || "N/A",
            campus: data.campus || activeCampus || "N/A",
            status: data.status || "approved",
            submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
            reviewedDate: data.reviewedAt ? new Date(data.reviewedAt).toLocaleDateString() : "N/A",
            submittedAt: data.submittedAt,
            reviewedAt: data.reviewedAt,
            benefitAmount: data.benefitAmount || null,
            benefit: data.benefit || null,
            adminRemarks: data.adminRemarks || null,
            formData: data.formData || {},
            files: data.files || {},
          })
        }

        rows.sort((a, b) => {
          const dateA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0)
          const dateB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0)
          return dateB - dateA
        })

        setScholars(rows)
      } catch (error) {
        console.error("Error fetching campus scholars:", error)
        setScholars([])
      } finally {
        setLoading(false)
      }
    }

    fetchScholars()
  }, [activeCampus])

  const uniqueScholarships = useMemo(() => {
    const items = [...new Set(scholars.map((row) => row.scholarshipName).filter(Boolean))]
    return items.sort((a, b) => a.localeCompare(b))
  }, [scholars])

  const uniqueCourses = useMemo(() => {
    const items = [...new Set(scholars.map((row) => row.course).filter((value) => value && value !== "N/A"))]
    return items.sort((a, b) => a.localeCompare(b))
  }, [scholars])

  const filteredScholars = useMemo(() => {
    let filtered = [...scholars]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (row) =>
          row.name?.toLowerCase().includes(q) ||
          row.studentName?.toLowerCase().includes(q) ||
          row.studentNumber?.toLowerCase().includes(q) ||
          row.scholarshipName?.toLowerCase().includes(q),
      )
    }

    if (filterScholarship !== "all") {
      filtered = filtered.filter((row) => row.scholarshipName === filterScholarship)
    }

    if (filterCourse !== "all") {
      filtered = filtered.filter((row) => row.course === filterCourse)
    }

    return filtered
  }, [scholars, searchQuery, filterScholarship, filterCourse])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterScholarship, filterCourse])

  const totalPages = Math.max(1, Math.ceil(filteredScholars.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedScholars = filteredScholars.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isFilterOpen])

  return (
    <CampusAdminLayoutWrapper>
      <div className="w-full space-y-4 px-3 pb-4 pt-2 md:space-y-5 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <Award className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </span>
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Scholars Directory
              </span>
              <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 md:text-2xl">Campus Scholars</h1>
              <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-200/85">
                Approved scholarship recipients for <span className="font-semibold">{activeCampus || "your campus"}</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <div className="relative flex-1 md:w-64 md:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, number, scholarship..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted hover:shadow-md md:w-48"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span>Filters</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
            </button>

            {isFilterOpen ? (
              <div className="animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-2xl duration-200">
                <div className="space-y-3 p-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scholarship</label>
                    <select
                      value={filterScholarship}
                      onChange={(e) => setFilterScholarship(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">All Scholarships</option>
                      {uniqueScholarships.map((scholarship) => (
                        <option key={scholarship} value={scholarship}>
                          {scholarship}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course</label>
                    <select
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">All Courses</option>
                      {uniqueCourses.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <ScholarsTableSkeleton />
        ) : (
          <>
            <div className="animate-in fade-in duration-300">
              <ScholarsTable scholars={paginatedScholars} />
            </div>

            <div className="animate-in fade-in mt-6 duration-300">
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4 text-center md:justify-between md:text-left">
                <p className="w-full text-sm text-muted-foreground md:w-auto">
                  Showing {filteredScholars.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredScholars.length)} of{" "}
                  {filteredScholars.length} record{filteredScholars.length !== 1 ? "s" : ""}
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
            </div>
          </>
        )}
      </div>
    </CampusAdminLayoutWrapper>
  )
}
