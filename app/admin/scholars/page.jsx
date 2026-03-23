"use client"

import { useState, useEffect, useMemo } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import { Award, Building2, Search, Users, User } from "lucide-react"

export default function ScholarsPage() {
  const [scholars, setScholars] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterCampus, setFilterCampus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const ITEMS_PER_PAGE = 10

  // Fetch approved applications (scholars) from Firestore
  useEffect(() => {
    const fetchScholars = async () => {
      try {
        // Fetch only approved applications
        const applicationsQuery = query(
          collection(db, "applications"),
          where("status", "==", "approved"),
          orderBy("reviewedAt", "desc")
        )
        
        let snapshot
        try {
          snapshot = await getDocs(applicationsQuery)
        } catch (error) {
          // If orderBy fails (no index), fetch without orderBy
          const simpleQuery = query(
            collection(db, "applications"),
            where("status", "==", "approved")
          )
          snapshot = await getDocs(simpleQuery)
        }
        
        const scholarsData = []
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Fetch user data to get name and photo
          let userName = "Unknown"
          let userPhotoURL = null
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                userName = userData.fullName || userData.displayName || "Unknown"
                userPhotoURL = userData.photoURL || null
              }
            } catch (error) {
              console.error("Error fetching user data:", error)
            }
          }

          scholarsData.push({
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
        
        // Sort by reviewedAt if available, otherwise by submittedAt
        scholarsData.sort((a, b) => {
          const dateA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0)
          const dateB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0)
          return dateB - dateA
        })
        
        setScholars(scholarsData)
      } catch (error) {
        console.error("Error fetching scholars:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchScholars()
  }, [])

  // Get unique values for filters
  const uniqueCampuses = useMemo(() => {
    const campuses = [...new Set(scholars.map(scholar => scholar.campus).filter(c => c && c !== "N/A"))]
    return campuses.sort()
  }, [scholars])

  // Filter scholars
  const filteredScholars = useMemo(() => {
    let filtered = [...scholars]

    // Filter by name, student number, or scholarship (search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(scholar => 
        scholar.name?.toLowerCase().includes(query) ||
        scholar.studentName?.toLowerCase().includes(query) ||
        scholar.studentNumber?.toLowerCase().includes(query) ||
        scholar.scholarshipName?.toLowerCase().includes(query)
      )
    }

    // Filter by campus
    if (filterCampus !== "all") {
      filtered = filtered.filter(scholar => scholar.campus === filterCampus)
    }

    return filtered
  }, [scholars, filterCampus, searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterCampus, searchQuery])

  // Pagination
  const tableRows = filteredScholars
  const totalPages = Math.max(1, Math.ceil(tableRows.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedScholars = tableRows.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  return (
    <AdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="mb-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, student number, or scholarship..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={filterCampus}
                onChange={(e) => setFilterCampus(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              >
                <option value="all">All Campuses</option>
                {uniqueCampuses.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading scholars...</p>
            ) : (
              <>
                <div className="hidden md:block">
                  <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
                    <div className="col-span-3">Scholar</div>
                    <div className="col-span-2">Scholarship</div>
                    <div className="col-span-2">Student No.</div>
                    <div className="col-span-2">Course / Year</div>
                    <div className="col-span-2">Campus</div>
                    <div className="col-span-1">Approved</div>
                  </div>

                  {paginatedScholars.map((scholar) => (
                    <div key={scholar.id} className="grid grid-cols-12 gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
                      <div className="col-span-3 min-w-0">
                        <div className="flex items-center gap-2">
                          {scholar.photoURL ? (
                            <img
                              src={scholar.photoURL}
                              alt={scholar.name || "Scholar"}
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                          <p className="truncate font-medium text-foreground">{scholar.name || "N/A"}</p>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                        <Award className="h-4 w-4" />
                        <span className="truncate">{scholar.scholarshipName || "N/A"}</span>
                      </div>
                      <div className="col-span-2 truncate text-muted-foreground">{scholar.studentNumber || "N/A"}</div>
                      <div className="col-span-2 min-w-0">
                        <p className="truncate text-foreground">{scholar.course || "N/A"}</p>
                        <p className="truncate text-xs text-muted-foreground">{scholar.yearLevel || "N/A"}</p>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{scholar.campus || "N/A"}</span>
                      </div>
                      <div className="col-span-1 text-xs text-muted-foreground">{scholar.reviewedDate || "N/A"}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 p-3 md:hidden">
                  {paginatedScholars.map((scholar) => (
                    <div key={scholar.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="mb-2 flex items-center gap-2">
                        {scholar.photoURL ? (
                          <img
                            src={scholar.photoURL}
                            alt={scholar.name || "Scholar"}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{scholar.name || "N/A"}</p>
                          <p className="truncate text-xs text-muted-foreground">{scholar.scholarshipName || "N/A"}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <p>Student No.: {scholar.studentNumber || "N/A"}</p>
                        <p>Course: {scholar.course || "N/A"}</p>
                        <p>Year: {scholar.yearLevel || "N/A"}</p>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>{scholar.campus || "N/A"}</span>
                        </div>
                        <p className="text-xs">Approved: {scholar.reviewedDate || "N/A"}</p>
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

