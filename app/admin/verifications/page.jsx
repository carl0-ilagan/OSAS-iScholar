"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import VerificationTable from "@/components/admin/verification-table"
import VerificationTableSkeleton from "@/components/admin/verification-table-skeleton"
import VerificationFilter from "@/components/admin/verification-filter"
import YearFilterDropdown from "@/components/admin/year-filter-dropdown"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore"
import { ShieldCheck } from "lucide-react"

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10
  const [filterCampus, setFilterCampus] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterMajor, setFilterMajor] = useState("all")
  const [sortYear, setSortYear] = useState("all")


  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        const verificationsQuery = query(
          collection(db, "verifications"),
          orderBy("submittedAt", "desc")
        )
        const snapshot = await getDocs(verificationsQuery)
        
        const verificationsData = []
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

          // Get major from user data if not in verification
          let major = data.major || null
          if (!major && data.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                major = userData.major || null
              }
            } catch (error) {
              console.error("Error fetching user major:", error)
            }
          }

          verificationsData.push({
            id: docSnap.id,
            userId: data.userId,
            name: userName,
            photoURL: userPhotoURL,
            studentNumber: data.studentNumber || "N/A",
            course: data.course || "N/A",
            yearLevel: data.yearLevel || "N/A",
            campus: data.campus || "N/A",
            major: major,
            status: data.status || "pending",
            submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
            submittedAt: data.submittedAt,
            idFront: data.idFront,
            idBack: data.idBack,
            cor: data.cor,
          })
        }
        setVerifications(verificationsData)
      } catch (error) {
        console.error("Error fetching verifications:", error)
        // If orderBy fails, try without it
        try {
          const simpleQuery = query(collection(db, "verifications"))
          const snapshot = await getDocs(simpleQuery)
          const verificationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            submittedDate: doc.data().submittedAt ? new Date(doc.data().submittedAt).toLocaleDateString() : "N/A",
          }))
          setVerifications(verificationsData)
        } catch (simpleError) {
          console.error("Error fetching verifications (simple):", simpleError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchVerifications()
  }, [])

  // Get unique years for filtering
  const uniqueYears = useMemo(() => {
    const years = [...new Set(verifications.map(v => v.yearLevel).filter(Boolean))]
    return years.sort()
  }, [verifications])

  // Filter and sort verifications
  const filteredVerifications = useMemo(() => {
    let filtered = [...verifications]

    // Filter by campus
    if (filterCampus !== "all") {
      filtered = filtered.filter(v => v.campus === filterCampus)
    }

    // Filter by course
    if (filterCourse !== "all") {
      filtered = filtered.filter(v => v.course === filterCourse)
    }

    // Filter by major
    if (filterMajor !== "all") {
      if (filterMajor === "none") {
        filtered = filtered.filter(v => !v.major || v.major === null)
      } else {
        filtered = filtered.filter(v => v.major === filterMajor)
      }
    }

    // Filter by year
    if (sortYear !== "all") {
      filtered = filtered.filter(v => v.yearLevel === sortYear)
    }

    return filtered
  }, [verifications, filterCampus, filterCourse, filterMajor, sortYear])

  // Pagination
  const totalPages = Math.ceil(filteredVerifications.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedVerifications = filteredVerifications.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterCampus, filterCourse, filterMajor, sortYear])

  // Refresh verifications after update
  const handleVerificationUpdate = async () => {
    try {
      const verificationsQuery = query(
        collection(db, "verifications"),
        orderBy("submittedAt", "desc")
      )
      const snapshot = await getDocs(verificationsQuery)
      
      const verificationsData = []
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        let userName = "Unknown"
        let userPhotoURL = null
        let major = data.major || null
        if (data.userId) {
          try {
            const userDoc = await getDoc(doc(db, "users", data.userId))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              userName = userData.fullName || userData.displayName || "Unknown"
              userPhotoURL = userData.photoURL || null
              if (!major) {
                major = userData.major || null
              }
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
          }
        }

        verificationsData.push({
          id: docSnap.id,
          userId: data.userId,
          name: userName,
          photoURL: userPhotoURL,
          studentNumber: data.studentNumber || "N/A",
          course: data.course || "N/A",
          yearLevel: data.yearLevel || "N/A",
          campus: data.campus || "N/A",
          major: major,
          status: data.status || "pending",
          submittedDate: data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "N/A",
          submittedAt: data.submittedAt,
          idFront: data.idFront,
          idBack: data.idBack,
          cor: data.cor,
        })
      }
      setVerifications(verificationsData)
    } catch (error) {
      console.error("Error refreshing verifications:", error)
    }
  }


  return (
    <AdminLayoutWrapper>
      <div className="relative">
        {/* Floating Banner */}
        <AdminPageBanner
          icon={ShieldCheck}
          title="Student Verifications"
          description="Review and approve student account verifications"
        />

        {/* Content - Full width on desktop */}
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          <div className="w-full">
            {/* Filters */}
            <div className="mb-6 md:mb-8">
              <div className="flex flex-wrap gap-3 justify-end">
                {/* Unified Filter Dropdown */}
                <VerificationFilter
                  filterCampus={filterCampus}
                  filterCourse={filterCourse}
                  filterMajor={filterMajor}
                  onCampusChange={setFilterCampus}
                  onCourseChange={setFilterCourse}
                  onMajorChange={setFilterMajor}
                />

                {/* Year Filter */}
                <YearFilterDropdown
                  sortYear={sortYear}
                  setSortYear={setSortYear}
                  uniqueYears={uniqueYears}
                />
              </div>
            </div>

            {/* Verification Table or Skeleton */}
            {loading ? (
              <VerificationTableSkeleton />
            ) : (
              <VerificationTable 
                verifications={paginatedVerifications}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onUpdate={handleVerificationUpdate}
              />
            )}
          </div>
        </div>
    </div>
    </AdminLayoutWrapper>
  )
}
