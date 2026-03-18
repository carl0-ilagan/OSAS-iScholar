"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"

export default function CampusAdminTestimonialsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  const fetchTestimonials = async () => {
    if (!activeCampus) {
      setRows([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("campus", "==", activeCampus), where("role", "==", "student")),
      )
      const campusUsers = new Set(
        usersSnapshot.docs
          .map((docSnap) => docSnap.data())
          .filter((row) => normalizeCampus(row.campus) === activeCampus)
          .map((row) => row.uid),
      )

      const testimonialsSnapshot = await getDocs(query(collection(db, "testimonials"), where("campus", "==", activeCampus)))
      const testimonials = testimonialsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((row) => {
          if (normalizeCampus(row.campus) === activeCampus) return true
          return row.userId && campusUsers.has(row.userId)
        })

      setRows(testimonials)
    } catch (error) {
      console.error("Error fetching testimonials:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTestimonials()
  }, [activeCampus])

  const toggleFeatured = async (row) => {
    try {
      await updateDoc(doc(db, "testimonials", row.id), {
        featuredOnLanding: !row.featuredOnLanding,
        updatedAt: new Date().toISOString(),
      })
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, featuredOnLanding: !row.featuredOnLanding } : item)))
      toast.success("Testimonial updated.")
    } catch (error) {
      console.error("Error updating testimonial:", error)
      toast.error("Failed to update testimonial.")
    }
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="w-full space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Campus Testimonials</h1>
            </div>
            <p className="text-sm text-muted-foreground">Manage testimonials submitted by students in {activeCampus || "your campus"}.</p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              <div className="col-span-2">Student</div>
              <div className="col-span-6">Testimonial</div>
              <div className="col-span-2">Rating</div>
              <div className="col-span-2">Actions</div>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading testimonials...</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No testimonials found for this campus.</p>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
                  <div className="col-span-2 text-foreground font-medium">{row.name || row.fullName || "Student"}</div>
                  <div className="col-span-6 text-muted-foreground line-clamp-2">{row.testimonial || row.message || "-"}</div>
                  <div className="col-span-2 text-muted-foreground">{row.rating || 0} / 5</div>
                  <div className="col-span-2">
                    <button
                      onClick={() => toggleFeatured(row)}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      {row.featuredOnLanding ? "Unfeature" : "Feature"}
                    </button>
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
