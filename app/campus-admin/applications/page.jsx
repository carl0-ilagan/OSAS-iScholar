"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore"
import { ChevronDown, Filter, Search, Sparkles, FileText } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { normalizeCampus } from "@/lib/campus-admin-config"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import ApplicationsTable from "@/components/admin/applications-table"
import ApplicationsTableSkeleton from "@/components/admin/applications-table-skeleton"

const ITEMS_PER_PAGE = 10

function profileYesNo(value) {
  return value === "Yes" || value === "No" ? value : ""
}

export default function CampusAdminApplicationsPage() {
  const { user } = useAuth()
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortStatus, setSortStatus] = useState("all")
  const [sortScholarship, setSortScholarship] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterIP, setFilterIP] = useState("all")
  const [filterPWD, setFilterPWD] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)

  const mapApplicationRecord = async (docSnap) => {
    const data = docSnap.data() || {}
    let userName = "Unknown"
    let userPhotoURL = null
    let indigenousGroup = ""
    let pwd = ""

    if (data.userId) {
      try {
        const userDoc = await getDoc(doc(db, "users", data.userId))
        if (userDoc.exists()) {
          const userData = userDoc.data() || {}
          userName = userData.fullName || userData.displayName || "Unknown"
          userPhotoURL = userData.photoURL || null
          indigenousGroup = profileYesNo(userData.indigenousGroup)
          pwd = profileYesNo(userData.pwd)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    return {
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
      campus: data.campus || "N/A",
      status: data.status || "pending",
      submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
      submittedAt: data.submittedAt,
      formData: data.formData || {},
      files: data.files || {},
      indigenousGroup,
      pwd,
    }
  }

  const fetchCampusApplications = async () => {
    if (!activeCampus) {
      setApplications([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let snapshot
      try {
        const applicationsQuery = query(
          collection(db, "applications"),
          where("campus", "==", activeCampus),
          orderBy("submittedAt", "desc"),
        )
        snapshot = await getDocs(applicationsQuery)
      } catch (queryError) {
        // Fallback when orderBy index is unavailable; keep campus restriction to satisfy rules.
        console.warn("Campus applications ordered query failed, using fallback:", queryError)
        const fallbackQuery = query(collection(db, "applications"), where("campus", "==", activeCampus))
        snapshot = await getDocs(fallbackQuery)
      }
      const records = []

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() || {}
        records.push(await mapApplicationRecord(docSnap))
      }

      setApplications(records)
    } catch (error) {
      console.error("Error fetching campus applications:", error)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampusApplications()
  }, [activeCampus])

  const uniqueScholarships = useMemo(() => {
    const values = [...new Set(applications.map((app) => app.scholarshipName))]
    return values.sort()
  }, [applications])

  const uniqueStatuses = useMemo(() => ["pending", "approved", "rejected", "under-review"], [])

  const uniqueCourses = useMemo(() => {
    const courses = [...new Set(applications.map((app) => app.course).filter((c) => c && c !== "N/A"))]
    return courses.sort((a, b) => a.localeCompare(b))
  }, [applications])

  const filteredApplications = useMemo(() => {
    let filtered = [...applications]

    if (searchQuery.trim()) {
      const queryText = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(queryText) ||
          app.studentName?.toLowerCase().includes(queryText) ||
          app.studentNumber?.toLowerCase().includes(queryText),
      )
    }

    if (sortScholarship !== "all") {
      filtered = filtered.filter((app) => app.scholarshipName === sortScholarship)
    }

    if (sortStatus !== "all") {
      filtered = filtered.filter((app) => app.status === sortStatus)
    }

    if (filterCourse !== "all") {
      filtered = filtered.filter((app) => app.course === filterCourse)
    }

    if (filterIP === "yes") {
      filtered = filtered.filter((app) => app.indigenousGroup === "Yes")
    } else if (filterIP === "no") {
      filtered = filtered.filter((app) => app.indigenousGroup === "No")
    }

    if (filterPWD === "yes") {
      filtered = filtered.filter((app) => app.pwd === "Yes")
    } else if (filterPWD === "no") {
      filtered = filtered.filter((app) => app.pwd === "No")
    }

    return filtered
  }, [applications, sortScholarship, sortStatus, searchQuery, filterCourse, filterIP, filterPWD])

  useEffect(() => {
    setCurrentPage(1)
  }, [sortScholarship, sortStatus, searchQuery, filterCourse, filterIP, filterPWD])

  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex)

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

  const handleApplicationUpdate = async () => {
    await fetchCampusApplications()
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="w-full space-y-4 px-3 pb-4 pt-2 md:space-y-5 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10 md:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </span>
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Applications Overview
              </span>
              <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 md:text-2xl">
                Campus Applications
              </h1>
              <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-200/85">
                Review applications for your campus. Use Filters for course, IP, or PWD (from student profiles).
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
              placeholder="Search by name or student number..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted hover:shadow-md md:w-56"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span>Filters</span>
              </div>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
            </button>

            {isFilterOpen ? (
              <div className="animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-2 max-h-[min(70vh,28rem)] w-72 overflow-y-auto rounded-lg border border-border bg-card shadow-2xl duration-200">
                <div className="space-y-3 p-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scholarship</label>
                    <select
                      value={sortScholarship}
                      onChange={(e) => setSortScholarship(e.target.value)}
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
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
                    <select
                      value={sortStatus}
                      onChange={(e) => setSortStatus(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">All Status</option>
                      {uniqueStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course (application)</label>
                    <select
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">All courses</option>
                      {uniqueCourses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">IP (profile)</label>
                    <select
                      value={filterIP}
                      onChange={(e) => setFilterIP(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">All</option>
                      <option value="yes">Indigenous Peoples — Yes</option>
                      <option value="no">Indigenous Peoples — No</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">PWD (profile)</label>
                    <select
                      value={filterPWD}
                      onChange={(e) => setFilterPWD(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">All</option>
                      <option value="yes">PWD — Yes</option>
                      <option value="no">PWD — No</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <ApplicationsTableSkeleton />
        ) : (
          <>
            <div className="animate-in fade-in duration-300">
              <ApplicationsTable
                applications={paginatedApplications}
                onUpdate={handleApplicationUpdate}
                reviewedBy="campus_admin"
              />
            </div>

            <div className="animate-in fade-in mt-6 space-y-4 duration-300">
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4 text-center md:justify-between md:text-left">
                <p className="w-full text-sm text-muted-foreground md:w-auto">
                  Showing {filteredApplications.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredApplications.length)} of{" "}
                  {filteredApplications.length} record{filteredApplications.length !== 1 ? "s" : ""}
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
