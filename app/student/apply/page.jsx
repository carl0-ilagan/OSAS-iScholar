"use client"

import { useState, useEffect } from "react"
import { GraduationCap, Sparkles } from "lucide-react"
import ScholarshipApplicationCards from "@/components/student/scholarship-cards"
import ScholarshipCardsSkeleton from "@/components/student/scholarship-cards-skeleton"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

export default function ApplyPage() {
  const [scholarships, setScholarships] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch scholarships from Firestore
  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        const scholarshipsQuery = query(
          collection(db, "scholarships"),
          orderBy("createdAt", "desc")
        )
        const snapshot = await getDocs(scholarshipsQuery)

        const scholarshipsData = snapshot.docs
          .map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              benefit: data.benefit || "N/A",
              benefitAmount: data.benefitAmount || data.amount || "N/A",
              documentRequirementIds: data.documentRequirementIds || [],
              slots: data.slots || null,
              batchName: data.batchName || null,
              logo: data.logo || null,
              temporarilyClosed: data.temporarilyClosed || false,
              active: data.active !== undefined ? data.active : true,
            }
          })
          .filter(scholarship => scholarship.active !== false)
        setScholarships(scholarshipsData)
      } catch (error) {
        console.error("Error fetching scholarships:", error)
        setScholarships([])
      } finally {
        setLoading(false)
      }
    }

    fetchScholarships()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 py-2">
        <div className="animate-pulse space-y-4 rounded-2xl border border-emerald-200/30 bg-white/60 p-6 dark:border-emerald-900/40 dark:bg-card/40 sm:p-8">
          <div className="h-4 w-28 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50" />
          <div className="h-9 max-w-lg rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50" />
          <div className="h-4 max-w-md rounded bg-muted" />
        </div>
        <ScholarshipCardsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-8 py-2 md:py-3">
      {/* Hero — same language as dashboard */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -bottom-8 left-1/4 h-28 w-28 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Apply for support
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl lg:text-4xl">
              Available scholarships
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-900/75 dark:text-emerald-200/85 sm:text-base">
              Choose a program that fits your profile. Review benefits and requirements before you apply.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm dark:border-emerald-600 dark:bg-emerald-700">
              <Sparkles className="h-4 w-4 opacity-90" />
              {scholarships.length} program{scholarships.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
        {scholarships.map((scholarship) => (
          <ScholarshipApplicationCards key={scholarship.id} {...scholarship} />
        ))}
      </div>
    </div>
  )
}
