"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Save, Loader2, Megaphone } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

export default function AnnouncementModal({ isOpen, onClose, onSave, announcement, scholarships = [] }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetType, setTargetType] = useState("all") // "all" or "specific"
  const [targetScholarships, setTargetScholarships] = useState([])
  const [targetYearLevel, setTargetYearLevel] = useState("all") // "all", "1st", "2nd", "3rd", "4th"
  const [endDate, setEndDate] = useState("")
  const [venue, setVenue] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (announcement) {
        setTitle(announcement.title || "")
        setDescription(announcement.description || "")
        setVenue(announcement.venue || "")
        setTargetYearLevel(announcement.targetYearLevel || "all")
        const targetSchols = announcement.targetScholarships || ["all"]
        if (targetSchols.includes("allScholarships")) {
          setTargetType("allScholarships")
          setTargetScholarships([])
        } else if (targetSchols.includes("all")) {
          setTargetType("all")
          setTargetScholarships([])
        } else {
          setTargetType("specific")
          setTargetScholarships(targetSchols)
        }
        if (announcement.endDate) {
          const endDateObj = announcement.endDate instanceof Date ? announcement.endDate : new Date(announcement.endDate)
          setEndDate(endDateObj.toISOString().split('T')[0])
        } else {
          // Default: 2 days from now
          const defaultEndDate = new Date()
          defaultEndDate.setDate(defaultEndDate.getDate() + 2)
          setEndDate(defaultEndDate.toISOString().split('T')[0])
        }
      } else {
        setTitle("")
        setDescription("")
        setVenue("")
        setTargetYearLevel("all")
        setTargetType("all")
        setTargetScholarships([])
        // Default: 2 days from now
        const defaultEndDate = new Date()
        defaultEndDate.setDate(defaultEndDate.getDate() + 2)
        setEndDate(defaultEndDate.toISOString().split('T')[0])
      }
    }
  }, [isOpen, announcement])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error("Title is required", {
        duration: 3000,
      })
      return
    }

    if (!description.trim()) {
      toast.error("Description is required", {
        duration: 3000,
      })
      return
    }

    if (!endDate) {
      toast.error("End date is required", {
        duration: 3000,
      })
      return
    }

    const endDateObj = new Date(endDate)
    if (endDateObj < new Date()) {
      toast.error("End date must be in the future", {
        duration: 3000,
      })
      return
    }

    if (targetType === "specific" && targetScholarships.length === 0) {
      toast.error("Please select at least one scholarship", {
        duration: 3000,
      })
      return
    }

    try {
      setSaving(true)
      await onSave({
        title: title.trim(),
        description: description.trim(),
        targetScholarships: targetType === "all" ? ["all"] : targetType === "allScholarships" ? ["allScholarships"] : targetScholarships,
        targetYearLevel: targetYearLevel,
        endDate: endDateObj.toISOString(),
        venue: venue.trim(),
      })
      
      toast.success(announcement ? "Announcement updated successfully!" : "Announcement created successfully!", {
        duration: 3000,
      })
      
      // Close modal after successful save
      onClose()
    } catch (error) {
      console.error("Error saving announcement:", error)
      toast.error("Failed to save announcement", {
        description: error.message || "Please try again later.",
        duration: 4000,
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6">
        <div
          className="bg-card border-2 border-border/50 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {announcement ? "Edit Announcement" : "Add New Announcement"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {announcement ? "Update the announcement details below." : "Create a new announcement for students."}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <form onSubmit={handleSubmit} id="announcement-form" className="space-y-6">
              {/* Horizontal Layout for Desktop */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column */}
                <div className="flex-1 space-y-4">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-foreground mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter announcement title..."
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter announcement description..."
                      rows={8}
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex-1 space-y-4">
                  {/* Target Scholarships */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Target Scholarships <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      {/* Radio: All Students (including those without scholarships) */}
                      <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <input
                          type="radio"
                          name="targetType"
                          value="all"
                          checked={targetType === "all"}
                          onChange={(e) => {
                            setTargetType("all")
                            setTargetScholarships([])
                          }}
                          className="w-4 h-4 text-primary border-border focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">All Students</span>
                      </label>

                      {/* Radio: All Scholarships Only */}
                      <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <input
                          type="radio"
                          name="targetType"
                          value="allScholarships"
                          checked={targetType === "allScholarships"}
                          onChange={(e) => {
                            setTargetType("allScholarships")
                            setTargetScholarships([])
                          }}
                          className="w-4 h-4 text-primary border-border focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">All Scholarships Only</span>
                      </label>

                      {/* Radio: Specific Scholarships */}
                      <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <input
                          type="radio"
                          name="targetType"
                          value="specific"
                          checked={targetType === "specific"}
                          onChange={(e) => setTargetType("specific")}
                          className="w-4 h-4 text-primary border-border focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">Specific Scholarships</span>
                      </label>

                      {/* Checkboxes for Specific Scholarships */}
                      {targetType === "specific" && (
                        <div className="border-2 border-border rounded-lg p-4 max-h-64 overflow-y-auto custom-scrollbar bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {scholarships.map((scholarship) => (
                              <label 
                                key={scholarship.id || scholarship} 
                                className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-background transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={targetScholarships.includes(scholarship.name || scholarship)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTargetScholarships([...targetScholarships, scholarship.name || scholarship])
                                    } else {
                                      setTargetScholarships(targetScholarships.filter(s => s !== (scholarship.name || scholarship)))
                                    }
                                  }}
                                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                />
                                <span className="text-sm text-foreground">{scholarship.name || scholarship}</span>
                              </label>
                            ))}
                          </div>
                          {targetScholarships.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs text-muted-foreground">
                                Selected: {targetScholarships.length} scholarship{targetScholarships.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Target Year Level */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Target Year Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={targetYearLevel}
                      onChange={(e) => setTargetYearLevel(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      required
                    >
                      <option value="all">All Year Levels</option>
                      <option value="1st">1st Year</option>
                      <option value="2nd">2nd Year</option>
                      <option value="3rd">3rd Year</option>
                      <option value="4th">4th Year</option>
                    </select>
                  </div>

                  {/* When (formerly End Date) */}
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-semibold text-foreground mb-2">
                      When <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Announcement will be archived 2 days after this date
                    </p>
                  </div>

                  {/* Venue (Optional) */}
                  <div>
                    <label htmlFor="venue" className="block text-sm font-semibold text-foreground mb-2">
                      Venue <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <input
                      id="venue"
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="Enter venue location..."
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                    />
                  </div>

                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-5 sm:p-6 border-t border-border/50 bg-muted/30">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 border-2 border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="announcement-form"
                disabled={saving || !title.trim() || !description.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {announcement ? "Update" : "Create"} Announcement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

