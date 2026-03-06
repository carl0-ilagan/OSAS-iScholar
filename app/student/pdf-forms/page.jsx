"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs, orderBy, query, where } from "firebase/firestore"
import { FileText } from "lucide-react"
import { db } from "@/lib/firebase"

export default function StudentPdfFormsPage() {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchForms() {
      try {
        const formsQuery = query(collection(db, "forms"), where("isActive", "==", true), orderBy("createdAt", "desc"))
        const snapshot = await getDocs(formsQuery)
        setForms(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))
      } catch (error) {
        console.error("Failed to fetch forms:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchForms()
  }, [])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold">Fillable PDF Forms</h1>
        <p className="text-sm text-muted-foreground">Open and complete your assigned PDF forms directly inside this portal.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading forms...</p> : null}
        {!loading && forms.length === 0 ? <p className="text-sm text-muted-foreground">No available forms right now.</p> : null}
        {forms.map((entry) => (
          <Link
            key={entry.id}
            href={`/student/pdf-forms/${entry.id}`}
            className="block rounded-lg border border-border px-4 py-3 text-sm hover:bg-accent"
          >
            <FileText className="mr-2 inline h-4 w-4" />
            {entry.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
