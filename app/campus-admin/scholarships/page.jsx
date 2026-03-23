"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle,
  Edit,
  FileText,
  FolderCheck,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  Sparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"

const DEFAULT_FORM_REQUIREMENTS = ["APPLICATION FORM", "STUDENT'S PROFILE FORM"]

const INITIAL_FORM = {
  name: "",
  description: "",
  benefit: "",
  benefitAmount: "",
  batchName: "",
  slots: "",
  active: true,
  temporarilyClosed: false,
  documentRequirementIds: [],
  logo: null,
}

export default function CampusAdminScholarshipsPage() {
  const { user } = useAuth()
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  const [scholarships, setScholarships] = useState([])
  const [documentRequirements, setDocumentRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScholarship, setEditingScholarship] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [logoPreview, setLogoPreview] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [scholarshipToDelete, setScholarshipToDelete] = useState(null)
  const modalRef = useRef(null)

  const fetchData = async () => {
    if (!activeCampus) {
      setScholarships([])
      setDocumentRequirements([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const scholarshipsSnapshot = await getDocs(
        query(collection(db, "scholarships"), where("campus", "==", activeCampus)),
      )
      const scholarshipsData = scholarshipsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      setScholarships(scholarshipsData)

      const requirementsSnapshot = await getDocs(
        query(collection(db, "documentRequirements"), where("campus", "==", activeCampus)),
      ).catch(async () => getDocs(collection(db, "documentRequirements")))
      const requirementsData = requirementsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      setDocumentRequirements(requirementsData)
    } catch (error) {
      console.error("Error fetching campus scholarship data:", error)
      toast.error("Failed to load scholarship data.")
      setScholarships([])
      setDocumentRequirements([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeCampus])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleCloseModal()
      }
    }

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [isModalOpen])

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB.")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.")
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setFormData((prev) => ({ ...prev, logo: base64 }))
      setLogoPreview(base64)
    } catch (error) {
      console.error("Error processing logo file:", error)
      toast.error("Error processing logo file.")
    }
  }

  const handleOpenModal = (scholarship = null) => {
    if (scholarship) {
      setEditingScholarship(scholarship)
      setFormData({
        name: scholarship.name || "",
        description: scholarship.description || "",
        benefit: scholarship.benefit || "",
        benefitAmount: scholarship.benefitAmount || "",
        batchName: scholarship.batchName || "",
        slots: scholarship.slots || "",
        active: scholarship.active !== false,
        temporarilyClosed: scholarship.temporarilyClosed || false,
        documentRequirementIds: scholarship.documentRequirementIds || [],
        logo: scholarship.logo || null,
      })
      setLogoPreview(scholarship.logo || null)
    } else {
      setEditingScholarship(null)
      setFormData(INITIAL_FORM)
      setLogoPreview(null)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingScholarship(null)
    setFormData(INITIAL_FORM)
    setLogoPreview(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Please enter a scholarship name.")
      return
    }
    if (!formData.description.trim()) {
      toast.error("Please enter a description.")
      return
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        benefit: formData.benefit.trim(),
        benefitAmount: formData.benefitAmount.trim(),
        batchName: formData.batchName.trim(),
        slots: formData.slots ? Number(formData.slots) : 0,
        active: formData.active,
        temporarilyClosed: formData.temporarilyClosed,
        documentRequirementIds: formData.documentRequirementIds || [],
        logo: formData.logo || null,
        campus: activeCampus,
        createdBy: user?.uid || null,
        updatedAt: new Date().toISOString(),
      }

      if (editingScholarship) {
        await updateDoc(doc(db, "scholarships", editingScholarship.id), payload)
        toast.success("Scholarship updated successfully.")
        setScholarships((prev) => prev.map((item) => (item.id === editingScholarship.id ? { ...item, ...payload } : item)))
      } else {
        payload.createdAt = new Date().toISOString()
        const docRef = await addDoc(collection(db, "scholarships"), payload)
        toast.success("Scholarship added successfully.")
        setScholarships((prev) => [{ id: docRef.id, ...payload }, ...prev])

        // Notify only students from the same campus (non-blocking).
        try {
          const usersSnapshot = await getDocs(query(collection(db, "users"), where("campus", "==", activeCampus)))
          const emailPromises = []

          usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data() || {}
            const role = String(userData.appRole || userData.role || "").toLowerCase()
            const accountEmail = String(userData.email || "").trim()
            if (role !== "student" || !accountEmail) return

            const studentName = userData.fullName || userData.displayName || "Student"
            emailPromises.push(
              fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: accountEmail,
                  subject: `🎓 New Scholarship Available (${activeCampus}) - MOCAS`,
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8" />
                      <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #16a34a 0%, #2563eb 100%); color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
                        .card { background: white; border: 1px solid #e5e7eb; padding: 16px; margin: 16px 0; border-radius: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h2>New Scholarship Available</h2>
                          <p>Campus: ${activeCampus || "N/A"}</p>
                        </div>
                        <div class="content">
                          <p>Hi ${studentName},</p>
                          <p>A new scholarship has been posted for your campus.</p>
                          <div class="card">
                            <h3 style="margin: 0 0 8px 0;">${payload.name}</h3>
                            <p style="margin: 0 0 8px 0;">${payload.description}</p>
                            ${payload.benefit ? `<p style="margin: 0;"><strong>Benefit:</strong> ${payload.benefit}</p>` : ""}
                            ${payload.benefitAmount ? `<p style="margin: 4px 0 0 0;"><strong>Amount:</strong> ${payload.benefitAmount}</p>` : ""}
                            ${payload.batchName ? `<p style="margin: 4px 0 0 0;"><strong>Batch:</strong> ${payload.batchName}</p>` : ""}
                          </div>
                          <p>Log in to MOCAS to view details and apply.</p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `,
                }),
              }).catch((error) => {
                console.error(`Error sending scholarship email to ${accountEmail}:`, error)
              }),
            )
          })

          Promise.allSettled(emailPromises).catch(() => {})
        } catch (emailError) {
          console.error("Error dispatching campus scholarship emails:", emailError)
        }
      }

      handleCloseModal()
    } catch (error) {
      console.error("Error saving scholarship:", error)
      toast.error("Failed to save scholarship.")
    }
  }

  const handleDeleteClick = (scholarshipId) => {
    const scholarship = scholarships.find((item) => item.id === scholarshipId)
    setScholarshipToDelete(scholarship || null)
    setDeleteModalOpen(true)
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setScholarshipToDelete(null)
  }

  const handleDeleteConfirm = async () => {
    if (!scholarshipToDelete) return
    try {
      await deleteDoc(doc(db, "scholarships", scholarshipToDelete.id))
      setScholarships((prev) => prev.filter((item) => item.id !== scholarshipToDelete.id))
      toast.success("Scholarship deleted successfully.")
      handleDeleteCancel()
    } catch (error) {
      console.error("Error deleting scholarship:", error)
      toast.error("Failed to delete scholarship.")
    }
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="w-full space-y-4 px-3 pb-4 pt-2 md:space-y-5 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 md:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
                <Award className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              </span>
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Scholarships Overview
                </span>
                <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 md:text-2xl">
                  Scholarships
                </h1>
                <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-200/85">
                  Manage scholarship programs for{" "}
                  <span className="font-medium text-emerald-950 dark:text-emerald-50">{activeCampus || "your campus"}</span>.
                </p>
              </div>
            </div>

            {/* Banner CTA (desktop top-right, mobile below) */}
            <div className="flex md:justify-end">
              <button
                onClick={() => handleOpenModal()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 hover:shadow-md md:w-auto md:min-w-[170px] md:px-5"
              >
                <Plus className="h-4 w-4" />
                Add Scholarship
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-xl border border-border bg-card p-6 animate-pulse">
                <div className="mb-4 h-6 rounded bg-muted" />
                <div className="mb-2 h-4 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : scholarships.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200/40 bg-emerald-50/30 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-emerald-950/80">
              <Award className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-medium text-foreground">No scholarships yet for this campus.</p>
            <p className="mt-1 text-sm text-muted-foreground">Add one to show it here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scholarships.map((scholarship) => (
              <div
                key={scholarship.id}
                className={`rounded-xl border-2 bg-card p-5 transition-all ${
                  scholarship.active === false
                    ? "border-muted opacity-70"
                    : "border-border hover:border-primary/50 hover:shadow-lg"
                }`}
              >
                <div className="mb-4 flex items-start gap-3">
                  {scholarship.logo ? (
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
                      <img src={scholarship.logo} alt={scholarship.name} className="h-full w-full object-contain p-1" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-sm">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="truncate text-lg font-bold text-foreground">{scholarship.name}</h3>
                      {scholarship.active === false ? (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Inactive</span>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{scholarship.description}</p>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    {scholarship.campus || "N/A"}
                  </div>
                  {scholarship.benefit ? <p className="text-sm font-medium text-foreground">{scholarship.benefit}</p> : null}
                  {scholarship.benefitAmount ? <p className="text-sm font-semibold text-primary">{scholarship.benefitAmount}</p> : null}
                  {scholarship.batchName ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-foreground">Batch: {scholarship.batchName}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Slots: {scholarship.slots ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-foreground">
                      {scholarship.documentRequirementIds?.length || 0} additional requirement
                      {(scholarship.documentRequirementIds?.length || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-4">
                  <button
                    onClick={() => handleOpenModal(scholarship)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(scholarship.id)}
                    className="flex items-center justify-center rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
            </div>
            ))}
          </div>
        )}

      </div>

      {isModalOpen ? (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3">
            <div
              ref={modalRef}
              className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border-2 border-border/50 bg-card shadow-2xl md:overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex max-h-[92vh] flex-col md:flex-row">
                <div className="flex min-h-0 w-full flex-col border-b border-border/40 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 p-5 md:w-2/5 md:border-b-0 md:border-r">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{editingScholarship ? "Edit Scholarship" : "Add Scholarship"}</h2>
                      <p className="text-xs text-muted-foreground">
                        {editingScholarship ? "Update scholarship details" : "Create a new scholarship program"}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Campus: {activeCampus || "N/A"}
                      </p>
                    </div>
          </div>

                  <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <input
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Scholarship name"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Description"
                      className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                    <input
                      value={formData.benefit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, benefit: e.target.value }))}
                      placeholder="Benefit"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={formData.benefitAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, benefitAmount: e.target.value }))}
                      placeholder="Benefit amount"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
                      value={formData.batchName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, batchName: e.target.value }))}
                      placeholder="Batch name"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="number"
              min="0"
                      value={formData.slots}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slots: e.target.value }))}
              placeholder="Slots"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">Logo (optional)</label>
                      {logoPreview ? (
                        <div className="space-y-2">
                          <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted/20">
                            <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, logo: null }))
                              setLogoPreview(null)
                            }}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remove logo
                          </button>
                        </div>
                      ) : (
                        <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary/40">
                          <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload logo (PNG/JPG, max 2MB)</span>
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/80 p-2">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                        />
                        <span className="text-sm text-foreground">Active</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/80 p-2">
                        <input
                          type="checkbox"
                          checked={formData.temporarilyClosed}
                          onChange={(e) => setFormData((prev) => ({ ...prev, temporarilyClosed: e.target.checked }))}
                        />
                        <span className="text-sm text-foreground">Temporarily closed</span>
                      </label>
                    </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                      >
                        Cancel
                      </button>
            <button
              type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white hover:from-primary/90 hover:to-secondary/90"
            >
                        <Save className="h-4 w-4" />
                        {editingScholarship ? "Update Scholarship" : "Add Scholarship"}
            </button>
                    </div>
          </form>
                </div>

                <div className="flex min-h-0 w-full flex-col md:w-3/5">
                  <div className="border-b border-border/30 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Requirements</h3>
                        <p className="text-xs text-muted-foreground">
                          {DEFAULT_FORM_REQUIREMENTS.length + (formData.documentRequirementIds?.length || 0)} requirement
                          {DEFAULT_FORM_REQUIREMENTS.length + (formData.documentRequirementIds?.length || 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
            </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    <div className="space-y-2 rounded-xl border-2 border-green-500/30 bg-gradient-to-r from-green-500/10 via-primary/10 to-green-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h4 className="text-sm font-semibold text-foreground">Default Requirements</h4>
                      </div>
                      {DEFAULT_FORM_REQUIREMENTS.map((item) => (
                        <div key={item} className="flex items-center justify-between rounded-lg border border-green-500/20 bg-card p-3">
                          <span className="text-sm font-medium text-foreground">{item}</span>
                          <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-700">Required</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 p-4">
                      <div className="flex items-center gap-2">
                        <FolderCheck className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">Additional Document Requirements</h4>
                      </div>
                      {documentRequirements.length === 0 ? (
                        <div className="rounded-lg border border-border/30 bg-card p-4 text-center">
                          <p className="text-sm text-muted-foreground">No document requirements available.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documentRequirements.map((req) => {
                            const isSelected = formData.documentRequirementIds?.includes(req.id)
                            return (
                              <button
                                key={req.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      documentRequirementIds: prev.documentRequirementIds.filter((id) => id !== req.id),
                                    }))
                                  } else {
                                    setFormData((prev) => ({
                                      ...prev,
                                      documentRequirementIds: [...(prev.documentRequirementIds || []), req.id],
                                    }))
                                  }
                                }}
                                className={`w-full rounded-lg border p-3 text-left transition-all ${
                                  isSelected
                                    ? "border-primary/50 bg-primary/10"
                                    : "border-border/40 bg-card hover:border-primary/30"
                                }`}
                              >
                                <p className="text-sm font-medium text-foreground">{req.name || "Untitled Requirement"}</p>
                                {req.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{req.description}</p> : null}
                    </button>
                            )
                          })}
                        </div>
                      )}

                      {formData.documentRequirementIds?.length > 0 ? (
                        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                          {formData.documentRequirementIds.map((reqId) => {
                            const req = documentRequirements.find((item) => item.id === reqId)
                            if (!req) return null
                            return (
                              <span key={reqId} className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs text-primary">
                                {req.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      documentRequirementIds: prev.documentRequirementIds.filter((id) => id !== reqId),
                                    }))
                                  }
                                >
                                  <X className="h-3 w-3" />
                    </button>
                              </span>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {deleteModalOpen && scholarshipToDelete ? (
        <>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={handleDeleteCancel} />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Delete Scholarship</h3>
                    <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                  </div>
                </div>

                <p className="mb-4 text-sm text-foreground">
                  Are you sure you want to delete <span className="font-semibold text-destructive">{scholarshipToDelete.name}</span>?
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
          </div>
        </div>
      </div>
        </>
      ) : null}
    </CampusAdminLayoutWrapper>
  )
}
