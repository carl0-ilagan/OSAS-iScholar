"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { Building2, GraduationCap, MessageSquare, Search, Sparkles, Star } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"

const ITEMS_PER_PAGE = 10

export default function CampusAdminTestimonialsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCampus, setFilterCampus] = useState("All")
  const [filterScholarship, setFilterScholarship] = useState("All")
  const [filterRating, setFilterRating] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  const fetchTestimonials = async () => {
    try {
      setLoading(true)
      let snapshot
      try {
        snapshot = await getDocs(query(collection(db, "testimonials"), orderBy("createdAt", "desc")))
      } catch (orderedError) {
        snapshot = await getDocs(collection(db, "testimonials"))
      }

      const testimonials = snapshot.docs.map((docSnap) => {
        const row = docSnap.data() || {}
        return {
          id: docSnap.id,
          name: row.name || row.fullName || "Student",
          testimonial: row.testimonial || row.message || "-",
          scholarship: row.scholarship || row.scholarshipName || "N/A",
          campus: row.campus || "N/A",
          rating: Number(row.rating || 0),
          featuredOnLanding: Boolean(row.featuredOnLanding),
          createdAt: row.createdAt || row.updatedAt || null,
        }
      })

      setRows(testimonials)
    } catch (error) {
      console.error("Error fetching testimonials:", error)
      toast.error("Failed to load testimonials.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const campuses = useMemo(() => {
    const values = new Set(rows.map((row) => String(row.campus || "").trim()).filter(Boolean))
    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const scholarships = useMemo(() => {
    const values = new Set(rows.map((row) => String(row.scholarship || "").trim()).filter(Boolean))
    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const filteredRows = useMemo(() => {
    let result = [...rows]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((row) =>
        [row.name, row.testimonial, row.scholarship, row.campus].some((field) =>
          String(field || "").toLowerCase().includes(q),
        ),
      )
    }

    if (filterCampus !== "All") {
      result = result.filter((row) => String(row.campus || "") === filterCampus)
    }
    if (filterScholarship !== "All") {
      result = result.filter((row) => String(row.scholarship || "") === filterScholarship)
    }
    if (filterRating !== "All") {
      const rating = Number(filterRating)
      result = result.filter((row) => Number(row.rating || 0) === rating)
    }

    return result
  }, [rows, searchQuery, filterCampus, filterScholarship, filterRating])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRows.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRows, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterCampus, filterScholarship, filterRating])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  return (
    <CampusAdminLayoutWrapper>
      <div className="w-full space-y-4 px-3 pb-4 pt-2 md:space-y-5 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10 md:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <MessageSquare className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </span>
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Testimonials Overview
              </span>
              <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 md:text-2xl">Student Testimonials</h1>
              <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-200/85">
                View all student testimonials across campuses. Featured control is super-admin only.
              </p>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                Logged in campus: <span className="font-semibold">{activeCampus || "N/A"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, scholar, campus..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <select
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {campuses.map((campus) => (
                <option key={campus} value={campus}>
                  {campus === "All" ? "All Campuses" : campus}
                </option>
              ))}
            </select>
            <select
              value={filterScholarship}
              onChange={(e) => setFilterScholarship(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {scholarships.map((scholarship) => (
                <option key={scholarship} value={scholarship}>
                  {scholarship === "All" ? "All Scholarships" : scholarship}
                </option>
              ))}
            </select>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="hidden grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground md:grid">
            <div className="col-span-2">Student</div>
            <div className="col-span-3">Scholarship</div>
            <div className="col-span-2">Campus</div>
            <div className="col-span-1">Rating</div>
            <div className="col-span-1">Featured</div>
            <div className="col-span-3">Testimonial</div>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading testimonials...</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No testimonials found for the current filters.</p>
          ) : (
            paginatedRows.map((row) => (
              <div key={row.id} className="border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:gap-3">
                  <div className="md:col-span-2">
                    <p className="font-medium text-foreground">{row.name || "Student"}</p>
                  </div>
                  <div className="md:col-span-3">
                    <div className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      <GraduationCap className="h-3 w-3" />
                      <span>{row.scholarship || "N/A"}</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-800 dark:text-emerald-200">
                      <Building2 className="h-3 w-3" />
                      <span>{row.campus || "N/A"}</span>
                    </div>
                  </div>
                  <div className="md:col-span-1 text-muted-foreground">{row.rating || 0} / 5</div>
                  <div className="md:col-span-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.featuredOnLanding
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.featuredOnLanding ? "Featured" : "Not Featured"}
                    </span>
                  </div>
                  <div className="md:col-span-3 text-muted-foreground line-clamp-2">
                    {row.testimonial || "-"}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                  <Star className="h-3 w-3" />
                  Featured setting is managed by super admin.
                </div>
              </div>
            ))
          )}
        </div>

        {!loading ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border/70 pt-3 text-center md:justify-between md:text-left">
            <p className="w-full text-sm text-muted-foreground md:w-auto">
              Showing {filteredRows.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)} of {filteredRows.length} record
              {filteredRows.length === 1 ? "" : "s"}
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
    </CampusAdminLayoutWrapper>
  )
}
