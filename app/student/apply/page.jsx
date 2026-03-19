"use client"

import { useState, useEffect } from "react"
import ScholarshipApplicationCards from "@/components/student/scholarship-cards"
import ScholarshipCardsSkeleton from "@/components/student/scholarship-cards-skeleton"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

// Static scholarship data fallback
const STATIC_SCHOLARSHIP_DATA = {
  "Merit Scholarship": {
    benefit: "Full Tuition + Stipend + Allowance",
    benefitAmount: "Up to ₱80,000/year (SUC)",
  },
  "Needs-Based Grant": {
    benefit: "Tuition support based on family income",
    benefitAmount: "Up to 50% Tuition Coverage",
  },
  "Tertiary Education Subsidy (TES)": {
    benefit: "Annual educational subsidy",
    benefitAmount: "₱20,000/year (SUC)",
  },
  "Teacher Development Program (TDP)": {
    benefit: "Financial support every semester",
    benefitAmount: "₱7,500 per semester (₱15,000/year)",
  },
}

export default function ApplyPage() {
  const [scholarships, setScholarships] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch scholarships from Firestore
  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        // Try to fetch from Firestore first
        const scholarshipsQuery = query(
          collection(db, "scholarships"),
          orderBy("createdAt", "desc")
        )
        const snapshot = await getDocs(scholarshipsQuery)
        
        if (!snapshot.empty) {
          const scholarshipsData = snapshot.docs
            .map(doc => {
            const data = doc.data()
            const scholarshipName = data.name || ""
            const staticData = STATIC_SCHOLARSHIP_DATA[scholarshipName] || {}
            
            // Merge Firestore data with static fallback data
            return {
              id: doc.id,
              ...data,
              // Use Firestore data if available, otherwise use static fallback
              benefit: data.benefit || staticData.benefit || "N/A",
              benefitAmount: data.benefitAmount || data.amount || staticData.benefitAmount || "N/A",
              // Include document requirement IDs
              documentRequirementIds: data.documentRequirementIds || [],
              // Include slots and batchName
              slots: data.slots || null,
              batchName: data.batchName || null,
              // Include logo
              logo: data.logo || null,
              // Include status fields
              temporarilyClosed: data.temporarilyClosed || false,
              active: data.active !== undefined ? data.active : true,
            }
          })
            .filter(scholarship => scholarship.active !== false) // Only show active scholarships
          setScholarships(scholarshipsData)
        } else {
          // Fallback to static data with correct requirements
          setScholarships([
            {
              id: 1,
              name: "Merit Scholarship",
              description: "For academically excellent students",
              benefit: "Full Tuition + Stipend + Allowance",
              benefitAmount: "Up to ₱80,000/year (SUC)",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "number", label: "Household Annual Income", required: true },
                { type: "select", label: "PWD / Special Group (optional)", options: ["Yes", "No"], required: false },
                { type: "file", label: "Certificate of Grades (COG) – for GWA verification", required: true },
                { type: "file", label: "Senior High School Form 138 / Transcript", required: true },
                { type: "file", label: "Proof of Income (ITR, COE w/ Salary, Indigency, etc.)", required: true },
                { type: "file", label: "Certificate of Registration (COR)", required: true },
                { type: "file", label: "Validated School ID (Front)", required: true },
                { type: "file", label: "Validated School ID (Back)", required: true },
                { type: "file", label: "Birth Certificate", required: true },
              ],
            },
            {
              id: 2,
              name: "Needs-Based Grant",
              description: "For financially challenged students",
              benefit: "Tuition support based on family income",
              benefitAmount: "Up to 50% Tuition Coverage",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "number", label: "Household Annual Income", required: true },
                { type: "file", label: "Proof of Income / Indigency", required: true },
                { type: "file", label: "ID Front", required: true },
                { type: "file", label: "ID Back", required: true },
                { type: "file", label: "Certificate of Registration (COR)", required: true },
              ],
            },
            {
              id: 3,
              name: "Tertiary Education Subsidy (TES)",
              description: "For SUC / LUC students needing financial aid",
              benefit: "Annual educational subsidy",
              benefitAmount: "₱20,000/year (SUC)",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "file", label: "Proof of Enrollment / Registration", required: true },
                { type: "select", label: "No previous undergraduate degree", options: ["Yes", "No"], required: true },
                { type: "file", label: "ID + Proof of Enrollment", required: true },
                { type: "file", label: "Income proof (optional, for priority)", required: false },
              ],
            },
            {
              id: 4,
              name: "Teacher Development Program (TDP)",
              description: "For future education professionals",
              benefit: "Financial support every semester",
              benefitAmount: "₱7,500 per semester (₱15,000/year)",
              requirements: [
                { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
                { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
                { type: "number", label: "Household Annual Income (must be ≤ ₱400,000)", required: true },
                { type: "select", label: "Enrolled in an education-related program", options: ["Yes", "No"], required: true },
                { type: "file", label: "ID + COR", required: true },
                { type: "file", label: "Indigency Certificate", required: true },
              ],
            },
          ])
        }
      } catch (error) {
        console.error("Error fetching scholarships:", error)
        // Fallback to static data on error
        setScholarships([
  {
    id: 1,
    name: "Merit Scholarship",
    description: "For academically excellent students",
            benefit: "Full Tuition + Stipend + Allowance",
            benefitAmount: "Up to ₱80,000/year (SUC)",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "number", label: "Household Annual Income", required: true },
              { type: "select", label: "PWD / Special Group (optional)", options: ["Yes", "No"], required: false },
              { type: "file", label: "Certificate of Grades (COG) – for GWA verification", required: true },
              { type: "file", label: "Senior High School Form 138 / Transcript", required: true },
              { type: "file", label: "Certificate of Registration (COR)", required: true },
              { type: "file", label: "Validated School ID (Front)", required: true, autoFill: "idFront" },
              { type: "file", label: "Validated School ID (Back)", required: true, autoFill: "idBack" },
              { type: "file", label: "Birth Certificate", required: true },
            ],
  },
  {
    id: 2,
    name: "Needs-Based Grant",
    description: "For financially challenged students",
            benefit: "Tuition support based on family income",
            benefitAmount: "Up to 50% Tuition Coverage",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "number", label: "Household Annual Income", required: true },
              { type: "file", label: "Proof of Income / Indigency", required: true },
              { type: "file", label: "ID Front", required: true },
              { type: "file", label: "ID Back", required: true },
              { type: "file", label: "Certificate of Registration (COR)", required: true },
            ],
  },
  {
    id: 3,
            name: "Tertiary Education Subsidy (TES)",
            description: "For SUC / LUC students needing financial aid",
            benefit: "Annual educational subsidy",
            benefitAmount: "₱20,000/year (SUC)",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "file", label: "Proof of Enrollment / Registration", required: true },
              { type: "select", label: "No previous undergraduate degree", options: ["Yes", "No"], required: true },
              { type: "file", label: "ID + Proof of Enrollment", required: true },
              { type: "file", label: "Income proof (optional, for priority)", required: false },
            ],
  },
  {
    id: 4,
            name: "Teacher Development Program (TDP)",
    description: "For future education professionals",
            benefit: "Financial support every semester",
            benefitAmount: "₱7,500 per semester (₱15,000/year)",
            requirements: [
              { type: "text", label: "Full Name", required: true, autoFill: "fullName" },
              { type: "select", label: "Filipino Citizen", options: ["Yes", "No"], required: true },
              { type: "number", label: "Household Annual Income (must be ≤ ₱400,000)", required: true },
              { type: "select", label: "Enrolled in an education-related program", options: ["Yes", "No"], required: true },
              { type: "file", label: "ID + COR", required: true },
              { type: "file", label: "Indigency Certificate", required: true },
            ],
  },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchScholarships()
  }, [])

  if (loading) {
    return (
      <div className="relative">
        <div className="p-3 md:p-4 lg:p-5">
          {/* Header Skeleton */}
          <div className="mb-4 space-y-2">
            <div className="h-7 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-80 animate-pulse rounded bg-muted" />
          </div>

          {/* Scholarship Cards Skeleton */}
          <ScholarshipCardsSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="p-3 md:p-4 lg:p-5">
        {/* Plain Header (No Banner) */}
        <div className="mb-4">
          <h1 className="mb-1 text-xl font-bold text-foreground md:text-2xl">
            Available Scholarships
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a scholarship program that fits your profile
          </p>
          <div className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {scholarships.length} program{scholarships.length !== 1 ? "s" : ""} available
          </div>
        </div>

        {/* Scholarship Cards Grid */}
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {scholarships.map((scholarship) => (
              <ScholarshipApplicationCards key={scholarship.id} {...scholarship} />
            ))}
        </div>
        </div>
    </div>
  )
}
