"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { Building2, Search, Users } from "lucide-react"
import AdminLayoutWrapper from "../admin-layout"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { normalizeCampus } from "@/lib/campus-admin-config"

const ITEMS_PER_PAGE = 8

export default function ScholarshipsMonitoringPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [scholarships, setScholarships] = useState([])
  const [search, setSearch] = useState("")
  const [campusFilter, setCampusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        setLoading(true)
        const snapshot = await getDocs(query(collection(db, "scholarships"), orderBy("createdAt", "desc")))
        const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        setScholarships(rows)
      } catch (error) {
        console.error("Error fetching scholarships:", error)
        try {
          const snapshot = await getDocs(collection(db, "scholarships"))
          const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          setScholarships(rows)
        } catch (fallbackError) {
          console.error("Error fetching scholarships (fallback):", fallbackError)
          setScholarships([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchScholarships()
  }, [])

  const campuses = useMemo(() => {
    return Array.from(
      new Set(
        scholarships
          .map((item) => String(item.campus || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [scholarships])

  useEffect(() => {
    if (!campuses.length) return
    if (campusFilter !== "all") return
    if (activeCampus && campuses.includes(activeCampus)) {
      setCampusFilter(activeCampus)
      return
    }
    setCampusFilter(campuses[0])
  }, [campuses, activeCampus, campusFilter])

  const filteredScholarships = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scholarships.filter((item) => {
      const matchesSearch =
        !q ||
        [item.name, item.description, item.batchName, item.benefit, item.benefitAmount].some((field) =>
          String(field || "").toLowerCase().includes(q),
        )
      const matchesCampus = campusFilter === "all" || String(item.campus || "") === campusFilter
      return matchesSearch && matchesCampus
    })
  }, [scholarships, search, campusFilter])

  const tableRows = filteredScholarships
  const totalPages = Math.max(1, Math.ceil(tableRows.length / ITEMS_PER_PAGE))

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return tableRows.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [tableRows, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, campusFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  return (
    <AdminLayoutWrapper>
        <div className="p-4 md:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="mb-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search scholarships..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={campusFilter}
                onChange={(event) => setCampusFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              >
                <option value="all">All Campuses</option>
                {campuses.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
                    </div>
                  </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading scholarships...</p>
            ) : (
              <>
                <div className="hidden md:block">
                  <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
                    <div className="col-span-3">Scholarship</div>
                    <div className="col-span-3">Campus</div>
                    <div className="col-span-2">Slots</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Batch</div>
                  </div>

                  {paginatedRows.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0"
                    >
                      <div className="col-span-3 min-w-0">
                        <p className="truncate font-medium text-foreground">{item.name || "N/A"}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.description || "-"}</p>
                      </div>
                      <div className="col-span-3 flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{item.campus || "N/A"}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{item.slots ?? 0}</span>
                      </div>
                      <div className="col-span-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.active === false ? "bg-muted text-muted-foreground" : "bg-green-500/20 text-green-700"
                          }`}
                        >
                          {item.active === false ? "Inactive" : item.temporarilyClosed ? "Closed" : "Active"}
                        </span>
                      </div>
                      <div className="col-span-2 text-muted-foreground">{item.batchName || "-"}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 p-3 md:hidden">
                  {paginatedRows.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="mb-2">
                        <p className="font-semibold text-foreground">{item.name || "N/A"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description || "-"}</p>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{item.campus || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Slots: {item.slots ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">Batch: {item.batchName || "-"}</span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              item.active === false ? "bg-muted text-muted-foreground" : "bg-green-500/20 text-green-700"
                            }`}
                          >
                            {item.active === false ? "Inactive" : item.temporarilyClosed ? "Closed" : "Active"}
                                </span>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {!loading ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-center text-sm text-muted-foreground md:text-left">
                Showing {tableRows.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, tableRows.length)} of {tableRows.length} record
                {tableRows.length !== 1 ? "s" : ""}
                    </div>
              <div className="flex items-center justify-center gap-2 md:justify-end">
                    <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                  Previous
                    </button>
                <span className="text-sm text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                    <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                  Next
                    </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}

