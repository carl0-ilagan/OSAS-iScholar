"use client"

import { useState, useEffect, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { Award, Plus, Edit, Trash2, X, Save, FileText, Users, Calendar, Upload, FolderCheck, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

// Default form requirements - always required for all scholarships
const DEFAULT_FORM_REQUIREMENTS = [
  "APPLICATION FORM",
  "STUDENT'S PROFILE FORM"
]

export default function ScholarshipsManagementPage() {
  const [scholarships, setScholarships] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScholarship, setEditingScholarship] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    benefit: "",
    benefitAmount: "",
    batchName: "",
    slots: "",
    active: true,
    temporarilyClosed: false,
    documentRequirementIds: [], // IDs from documentRequirements collection
    logo: null
  })
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [scholarshipToDelete, setScholarshipToDelete] = useState(null)
  const [documentRequirements, setDocumentRequirements] = useState([])
  const [logoPreview, setLogoPreview] = useState(null)
  const modalRef = useRef(null)

  // Fetch scholarships and document requirements from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scholarships
        const scholarshipsQuery = query(
          collection(db, "scholarships"),
          orderBy("createdAt", "desc")
        )
        const scholarshipsSnapshot = await getDocs(scholarshipsQuery)
        const scholarshipsData = scholarshipsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setScholarships(scholarshipsData)

        // Fetch document requirements
        const requirementsQuery = query(
          collection(db, "documentRequirements"),
          orderBy("createdAt", "desc")
        )
        const requirementsSnapshot = await getDocs(requirementsQuery)
        const requirementsData = requirementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setDocumentRequirements(requirementsData)
      } catch (error) {
        console.error("Error fetching data:", error)
        // Fallback: try without orderBy
        try {
          const scholarshipsSnapshot = await getDocs(collection(db, "scholarships"))
          const scholarshipsData = scholarshipsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          setScholarships(scholarshipsData)

          const requirementsSnapshot = await getDocs(collection(db, "documentRequirements"))
          const requirementsData = requirementsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          setDocumentRequirements(requirementsData)
        } catch (fallbackError) {
          console.error("Error fetching data (fallback):", fallbackError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Close modal when clicking outside
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


  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleLogoChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size must be less than 2MB")
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file")
        return
      }
      try {
        const base64 = await fileToBase64(file)
        setFormData({ ...formData, logo: base64 })
        setLogoPreview(base64)
      } catch (error) {
        toast.error("Error processing logo file")
      }
    }
  }

  const handleOpenModal = (scholarship = null) => {
    if (scholarship) {
      setEditingScholarship(scholarship)
      setFormData({
        name: scholarship.name || "",
        description: scholarship.description || "",
        benefit: scholarship.benefit || "",
        benefitAmount: scholarship.benefitAmount || scholarship.amount || "",
        batchName: scholarship.batchName || "",
        slots: scholarship.slots || "",
        active: scholarship.active !== undefined ? scholarship.active : true,
        temporarilyClosed: scholarship.temporarilyClosed || false,
        documentRequirementIds: scholarship.documentRequirementIds || [],
        logo: scholarship.logo || null
      })
      setLogoPreview(scholarship.logo || null)
    } else {
      setEditingScholarship(null)
      setFormData({
        name: "",
        description: "",
        benefit: "",
        benefitAmount: "",
        batchName: "",
        slots: "",
        active: true,
        temporarilyClosed: false,
        documentRequirementIds: [],
        logo: null
      })
      setLogoPreview(null)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingScholarship(null)
    setFormData({
      name: "",
      description: "",
      benefit: "",
      benefitAmount: "",
      batchName: "",
      slots: "",
      active: true,
      temporarilyClosed: false,
      documentRequirementIds: [],
      logo: null
    })
    setLogoPreview(null)
  }


  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Please enter a scholarship name")
      return
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a description")
      return
    }

    try {
      const scholarshipData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        benefit: formData.benefit.trim() || "",
        benefitAmount: formData.benefitAmount.trim() || "",
        batchName: formData.batchName.trim() || "",
        slots: formData.slots ? parseInt(formData.slots) : null,
        active: formData.active,
        temporarilyClosed: formData.temporarilyClosed || false,
        documentRequirementIds: formData.documentRequirementIds || [],
        logo: formData.logo || null,
        updatedAt: serverTimestamp()
      }

      if (editingScholarship) {
        // Update existing scholarship
        await updateDoc(doc(db, "scholarships", editingScholarship.id), scholarshipData)
        toast.success("Scholarship updated successfully")
        
        // Update local state
        setScholarships(scholarships.map(s => 
          s.id === editingScholarship.id 
            ? { ...s, ...scholarshipData }
            : s
        ))
      } else {
        // Add new scholarship
        scholarshipData.createdAt = serverTimestamp()
        const docRef = await addDoc(collection(db, "scholarships"), scholarshipData)
        toast.success("Scholarship added successfully")
        
        // Add to local state
        setScholarships([{ id: docRef.id, ...scholarshipData }, ...scholarships])
        
        // Send email notifications to all students with secondary email
        try {
          const usersSnapshot = await getDocs(collection(db, "users"))
          const emailPromises = []
          
          usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data()
            const secondaryEmail = userData.secondaryEmail
            const studentName = userData.fullName || userData.displayName || "Student"
            
            if (secondaryEmail) {
              emailPromises.push(
                fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: secondaryEmail,
                    subject: '🎓 New Scholarship Available - iScholar',
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="utf-8">
                        <style>
                          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                          .scholarship-box { background: white; border: 2px solid #f5576c; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h1>🎓 New Scholarship Available!</h1>
                          </div>
                          <div class="content">
                            <p>Dear ${studentName},</p>
                            <p>Great news! A new scholarship opportunity is now available:</p>
                            <div class="scholarship-box">
                              <h2 style="margin-top: 0; color: #f5576c;">${scholarshipData.name}</h2>
                              <p>${scholarshipData.description || 'Check your iScholar account for more details.'}</p>
                            </div>
                            <p>Don't miss this opportunity! Log in to your iScholar account to view details and apply now.</p>
                            <p>Best regards,<br>iScholar Team</p>
                          </div>
                        </div>
                      </body>
                      </html>
                    `
                  })
                }).catch(err => console.error(`Error sending email to ${secondaryEmail}:`, err))
              )
            }
          })
          
          // Send emails in parallel (don't wait for all to complete)
          Promise.allSettled(emailPromises).then(() => {
            console.log('Scholarship emails sent')
          })
        } catch (emailError) {
          console.error("Error sending scholarship emails:", emailError)
          // Don't block scholarship creation if email fails
        }
      }

      handleCloseModal()
    } catch (error) {
      console.error("Error saving scholarship:", error)
      toast.error("Failed to save scholarship. Please try again.")
    }
  }

  const handleDeleteClick = (scholarshipId) => {
    const scholarship = scholarships.find(s => s.id === scholarshipId)
    setScholarshipToDelete(scholarship)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!scholarshipToDelete) return

    try {
      await deleteDoc(doc(db, "scholarships", scholarshipToDelete.id))
      toast.success("Scholarship deleted successfully", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
      })
      setScholarships(scholarships.filter(s => s.id !== scholarshipToDelete.id))
      setDeleteModalOpen(false)
      setScholarshipToDelete(null)
    } catch (error) {
      console.error("Error deleting scholarship:", error)
      toast.error("Failed to delete scholarship. Please try again.", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 4000,
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setScholarshipToDelete(null)
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        <AdminPageBanner
          icon={Award}
          title="Scholarships Management"
          description="Manage available scholarship programs"
        />

        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Header with Add Button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Scholarships
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage scholarship programs that students can apply for
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Add Scholarship</span>
            </button>
          </div>

          {/* Scholarships Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : scholarships.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No scholarships found. Add your first scholarship to get started.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {scholarships.map((scholarship) => (
                <div
                  key={scholarship.id}
                  className={`bg-card border-2 rounded-xl p-5 md:p-6 transition-all duration-300 ${
                    scholarship.active 
                      ? "border-border hover:border-primary/50 hover:shadow-lg" 
                      : "border-muted opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      {scholarship.logo ? (
                        <div className="w-12 h-12 rounded-xl bg-card border border-border/30 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                          <img src={scholarship.logo} alt={scholarship.name} className="w-full h-full object-contain p-1" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-foreground">
                            {scholarship.name}
                          </h3>
                          {!scholarship.active && (
                            <span className="px-2 py-1 text-xs font-semibold bg-muted text-muted-foreground rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {scholarship.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scholarship Details */}
                  <div className="space-y-2 mb-4">
                    {scholarship.benefit && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-foreground font-medium">{scholarship.benefit}</span>
                      </div>
                    )}
                    {scholarship.benefitAmount && (
                      <div className="text-sm text-primary font-semibold ml-6">
                        {scholarship.benefitAmount}
                      </div>
                    )}
                    {scholarship.batchName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-foreground">Batch: {scholarship.batchName}</span>
                      </div>
                    )}
                    {scholarship.slots && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-foreground">Slots: {scholarship.slots}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-foreground">
                        {scholarship.requirements?.length || 0} requirement{scholarship.requirements?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <button
                      onClick={() => handleOpenModal(scholarship)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(scholarship.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors font-medium text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
              onClick={handleCloseModal}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6 overflow-y-auto">
              <div
                ref={modalRef}
                className="bg-card border-2 border-border/50 rounded-xl md:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] md:max-h-[85vh] overflow-hidden flex flex-col md:flex-row backdrop-blur-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 my-2 sm:my-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left Side - Basic Information (Desktop) / Top (Mobile) */}
                <div className="w-full md:w-2/5 lg:w-2/5 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 p-4 md:p-6 lg:p-7 border-b md:border-b-0 md:border-r border-border/30 flex flex-col flex-shrink-0 min-h-0">
                  {/* Header */}
                  <div className="mb-4 md:mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                          {editingScholarship ? "Edit Scholarship" : "Add New Scholarship"}
                        </h2>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                          {editingScholarship ? "Update scholarship details" : "Create a new scholarship program"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information Form */}
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 md:pr-2 custom-scrollbar">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-full"></div>
                        <h3 className="text-base md:text-lg font-semibold text-foreground">
                          Basic Information
                        </h3>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Scholarship Name <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 md:px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Description <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-3 md:px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] md:min-h-[100px] text-sm transition-all resize-y"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Benefit
                        </label>
                        <input
                          type="text"
                          value={formData.benefit}
                          onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                          placeholder="e.g., Full Tuition + Stipend"
                          className="w-full px-3 md:px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Benefit Amount
                        </label>
                        <input
                          type="text"
                          value={formData.benefitAmount}
                          onChange={(e) => setFormData({ ...formData, benefitAmount: e.target.value })}
                          placeholder="e.g., ₱80,000/year"
                          className="w-full px-3 md:px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Batch Name
                        </label>
                        <input
                          type="text"
                          value={formData.batchName}
                          onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                          placeholder="e.g., AY 2024-2025"
                          className="w-full px-3 md:px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Available Slots
                        </label>
                        <input
                          type="number"
                          value={formData.slots}
                          onChange={(e) => setFormData({ ...formData, slots: e.target.value })}
                          placeholder="e.g., 50"
                          min="1"
                          className="w-full px-3 md:px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Logo <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        </label>
                        {logoPreview ? (
                          <div className="space-y-2">
                            <div className="relative w-24 h-24 border-2 border-border rounded-lg overflow-hidden bg-muted/20">
                              <img 
                                src={logoPreview} 
                                alt="Logo preview" 
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, logo: null })
                                setLogoPreview(null)
                              }}
                              className="text-xs text-destructive hover:underline"
                            >
                              Remove logo
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground text-center px-2">
                                Click to upload logo
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG (max 2MB)
                              </p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border/30">
                          <input
                            type="checkbox"
                            id="active"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <label htmlFor="active" className="text-sm font-medium text-foreground">
                            Active (visible to students)
                          </label>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border/30">
                          <input
                            type="checkbox"
                            id="temporarilyClosed"
                            checked={formData.temporarilyClosed}
                            onChange={(e) => setFormData({ ...formData, temporarilyClosed: e.target.checked })}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <label htmlFor="temporarilyClosed" className="text-sm font-medium text-foreground">
                            Temporarily Closed (students cannot apply)
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 mt-4 border-t border-border/50">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors font-medium text-sm order-2 sm:order-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm order-1 sm:order-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{editingScholarship ? "Update" : "Create"} Scholarship</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Side - Requirements Management (Desktop) / Bottom (Mobile) */}
                <div className="w-full md:w-3/5 lg:w-3/5 flex flex-col min-h-0 bg-card overflow-hidden">
                  {/* Header */}
                  <div className="p-4 md:p-5 lg:p-6 border-b border-border/30 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                        <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg lg:text-xl font-bold text-foreground">Requirements</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {2 + (formData.documentRequirementIds?.length || 0)} requirement{(2 + (formData.documentRequirementIds?.length || 0)) !== 1 ? 's' : ''} 
                          <span className="ml-1">(2 forms + {formData.documentRequirementIds?.length || 0} documents)</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Content - Scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 lg:p-6 space-y-4 custom-scrollbar">

                    {/* Default Requirements - Always Required */}
                    <div className="p-4 bg-gradient-to-r from-green-500/10 via-primary/10 to-green-500/10 rounded-xl border-2 border-green-500/30 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="text-sm font-semibold text-foreground">Default Requirements (Always Required)</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-green-500/20">
                          <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">APPLICATION FORM</span>
                          <span className="ml-auto text-xs text-green-600 bg-green-500/20 px-2 py-0.5 rounded">Required</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-green-500/20">
                          <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">STUDENT'S PROFILE FORM</span>
                          <span className="ml-auto text-xs text-green-600 bg-green-500/20 px-2 py-0.5 rounded">Required</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        These forms will be created later. Students must fill them out to apply.
                      </p>
                    </div>

                    {/* Additional Document Requirements */}
                    <div className="p-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-xl border border-primary/20 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderCheck className="w-5 h-5 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">Additional Document Requirements</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select documents from your Document Requirements list that students need to submit for this scholarship.
                      </p>

                      {/* Document Requirements Selection */}
                      {documentRequirements.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {documentRequirements.map((req) => {
                            const isSelected = formData.documentRequirementIds?.includes(req.id)
                            return (
                              <div
                                key={req.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary/10 border-primary/50'
                                    : 'bg-card border-border/30 hover:border-primary/30'
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    setFormData({
                                      ...formData,
                                      documentRequirementIds: formData.documentRequirementIds.filter(id => id !== req.id)
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      documentRequirementIds: [...(formData.documentRequirementIds || []), req.id]
                                    })
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-foreground">{req.name}</span>
                                    {req.required && (
                                      <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded">Required</span>
                                    )}
                                    {!req.required && (
                                      <span className="text-xs text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">Optional</span>
                                    )}
                                  </div>
                                  {req.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-card border border-border/30 rounded-lg">
                          <FolderCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No document requirements available</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Go to Document Requirements page to add requirements first
                          </p>
                        </div>
                      )}

                      {/* Selected Requirements Summary */}
                      {formData.documentRequirementIds?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <p className="text-xs font-semibold text-foreground mb-2">
                            Selected Documents ({formData.documentRequirementIds.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {formData.documentRequirementIds.map((reqId) => {
                              const req = documentRequirements.find(r => r.id === reqId)
                              if (!req) return null
                              return (
                                <span
                                  key={reqId}
                                  className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1"
                                >
                                  {req.name}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setFormData({
                                        ...formData,
                                        documentRequirementIds: formData.documentRequirementIds.filter(id => id !== reqId)
                                      })
                                    }}
                                    className="hover:bg-primary/30 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && scholarshipToDelete && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
              onClick={handleDeleteCancel}
            />
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
              <div
                className="bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-5 md:p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground">Delete Scholarship</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">This action cannot be undone</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-6">
                    <p className="text-sm sm:text-base text-foreground mb-3">
                      Are you sure you want to delete <span className="font-semibold text-destructive">{scholarshipToDelete.name}</span>?
                    </p>
                    <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-xs sm:text-sm text-destructive font-medium">
                        ⚠️ All associated applications and data will be permanently removed.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={handleDeleteCancel}
                      className="flex-1 px-4 py-2.5 sm:py-3 border-2 border-border rounded-lg hover:bg-muted transition-colors font-medium text-sm sm:text-base order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      className="flex-1 px-4 py-2.5 sm:py-3 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm sm:text-base order-1 sm:order-2 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayoutWrapper>
  )
}

