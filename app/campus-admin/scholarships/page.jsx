"use client"

import { useEffect, useMemo, useState } from "react"
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore"
import { Award } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"

const INITIAL_FORM = {
  name: "",
  description: "",
  slots: "",
}

export default function CampusAdminScholarshipsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [scholarships, setScholarships] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  const fetchScholarships = async () => {
    if (!activeCampus) {
      setScholarships([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const snapshot = await getDocs(query(collection(db, "scholarships"), where("campus", "==", activeCampus)))
      const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      setScholarships(rows)
    } catch (error) {
      console.error("Error fetching scholarships:", error)
      setScholarships([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScholarships()
  }, [activeCampus])

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error("Scholarship name is required.")
      return
    }

    try {
      setSaving(true)
      await addDoc(collection(db, "scholarships"), {
        name: form.name.trim(),
        description: form.description.trim(),
        slots: form.slots ? Number(form.slots) : 0,
        active: true,
        campus: activeCampus,
        createdBy: user?.uid || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      setForm(INITIAL_FORM)
      toast.success("Scholarship created.")
      fetchScholarships()
    } catch (error) {
      console.error("Error creating scholarship:", error)
      toast.error("Failed to create scholarship.")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row) => {
    try {
      await updateDoc(doc(db, "scholarships", row.id), {
        active: row.active === false ? true : false,
        updatedAt: new Date().toISOString(),
      })
      setScholarships((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: !(row.active === false) } : item)))
      toast.success("Scholarship status updated.")
    } catch (error) {
      console.error("Error updating scholarship:", error)
      toast.error("Failed to update scholarship.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "scholarships", id))
      setScholarships((prev) => prev.filter((row) => row.id !== id))
      toast.success("Scholarship deleted.")
    } catch (error) {
      console.error("Error deleting scholarship:", error)
      toast.error("Failed to delete scholarship.")
    }
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="w-full space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Campus Scholarships</h1>
            </div>
            <p className="text-sm text-muted-foreground">Manage scholarships scoped to {activeCampus || "your campus"}.</p>
          </div>

          <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-4 grid gap-3 md:grid-cols-4">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Scholarship name"
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Short description"
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="number"
              min="0"
              value={form.slots}
              onChange={(e) => setForm((prev) => ({ ...prev, slots: e.target.value }))}
              placeholder="Slots"
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Scholarship"}
            </button>
          </form>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              <div className="col-span-3">Name</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Slots</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Actions</div>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading scholarships...</p>
            ) : scholarships.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No scholarships yet for this campus.</p>
            ) : (
              scholarships.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
                  <div className="col-span-3 font-medium text-foreground">{row.name || "N/A"}</div>
                  <div className="col-span-4 text-muted-foreground">{row.description || "-"}</div>
                  <div className="col-span-1 text-muted-foreground">{row.slots ?? 0}</div>
                  <div className="col-span-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.active === false ? "bg-muted text-muted-foreground" : "bg-green-500/20 text-green-700"}`}>
                      {row.active === false ? "Inactive" : "Active"}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button onClick={() => toggleActive(row)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                      {row.active === false ? "Activate" : "Deactivate"}
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                      Delete
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
