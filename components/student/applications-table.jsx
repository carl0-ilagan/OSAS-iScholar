"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Eye, CheckCircle, XCircle, Clock, FileText, User, GraduationCap, MapPin, Calendar, X, Edit, Save, Loader2, Upload, X as XIcon } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import ImageZoomModal from "@/components/admin/image-zoom-modal"

export default function ApplicationsTable({ applications, onUpdate }) {
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedFormData, setEditedFormData] = useState({})
  const [editedFiles, setEditedFiles] = useState({})
  const [isUpdating, setIsUpdating] = useState(false)

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "pending"
    
    if (statusLower === "approved") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 border border-green-500/30 flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      )
    } else if (statusLower === "rejected") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 border border-red-500/30 flex items-center gap-1.5">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      )
    } else if (statusLower === "under-review") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 border border-blue-500/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Under Review
        </span>
      )
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      )
    }
  }

  const handleView = (application) => {
    setSelectedApplication(application)
    setEditedFormData(application.formData || {})
    setEditedFiles(application.files || {})
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setSelectedApplication(null)
    setIsEditMode(false)
    setEditedFormData({})
    setEditedFiles({})
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleFileChange = async (key, file) => {
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setEditedFiles(prev => ({
          ...prev,
          [key]: base64
        }))
        toast.success("File updated", {
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 2000,
        })
      } catch (error) {
        console.error("Error converting file:", error)
        toast.error("Failed to process file", {
          icon: <XCircle className="w-4 h-4" />,
          duration: 3000,
        })
      }
    }
  }

  const handleRemoveFile = (key) => {
    setEditedFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[key]
      return newFiles
    })
  }

  const handleUpdate = async () => {
    if (!selectedApplication) return

    try {
      setIsUpdating(true)

      const applicationRef = doc(db, "applications", selectedApplication.id)
      await updateDoc(applicationRef, {
        formData: editedFormData,
        files: editedFiles,
        updatedAt: new Date().toISOString(),
      })

      toast.success("Application updated successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })

      // Update local state
      setSelectedApplication(prev => ({
        ...prev,
        formData: editedFormData,
        files: editedFiles,
      }))

      setIsEditMode(false)

      // Refresh applications list
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("Error updating application:", error)
      toast.error("Failed to update application", {
        icon: <XCircle className="w-5 h-5" />,
        description: error.message || "Please try again later.",
        duration: 4000,
        position: "top-right",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const canEdit = selectedApplication?.status === "pending" || selectedApplication?.status === "under-review"

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-lg">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg font-medium">No applications found</p>
        <p className="text-sm text-muted-foreground mt-2">You haven't submitted any scholarship applications yet.</p>
      </div>
    )
  }

  const formData = isEditMode ? editedFormData : (selectedApplication?.formData || {})
  const files = isEditMode ? editedFiles : (selectedApplication?.files || {})

  const modalContent = isModalOpen && selectedApplication ? (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
        <div
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl h-auto max-h-[85vh] sm:max-h-[80vh] md:max-h-[75vh] lg:max-h-[70vh] overflow-hidden flex flex-col md:flex-row my-auto animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Side - Application Info */}
          <div className="w-full md:w-2/5 flex flex-col flex-shrink-0 border-b md:border-b-0 md:border-r border-border/30 min-h-0 bg-gradient-to-b from-card to-muted/5">
            {/* Header */}
            <div className="p-2.5 sm:p-3 md:p-3.5 border-b border-border/30 flex-shrink-0 bg-card/50 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                      <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground break-words line-clamp-2 leading-tight">
                        {selectedApplication.program}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Submitted: {selectedApplication.dateSubmitted}</p>
                      {canEdit && !isEditMode && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800 font-medium">
                            💡 You can update your application while it's not yet approved
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(selectedApplication.status)}
                      {canEdit && (
                        <button
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                            isEditMode 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                          aria-label={isEditMode ? "Cancel edit" : "Edit application"}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                        aria-label="Close modal"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
              </div>
            </div>

            {/* Application Details - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 md:p-3.5 space-y-2.5 sm:space-y-3 custom-scrollbar" style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
            }}>
              {/* Tracker Code - Prominent on Left Side */}
              {selectedApplication.trackerCode && (
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-3 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-lg bg-primary/20">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tracker Code</p>
                  </div>
                  <p className="font-mono text-base font-bold text-primary">
                    {selectedApplication.trackerCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Use this code to track your application</p>
                </div>
              )}

              {/* Form Data */}
              {Object.keys(formData).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 rounded-lg bg-primary/10">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Application Details</p>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(formData).map(([key, value]) => (
                      <div key={key} className="p-2 bg-card rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all shadow-sm">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">{key}</p>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={value || ""}
                            onChange={(e) => setEditedFormData(prev => ({
                              ...prev,
                              [key]: e.target.value
                            }))}
                            className="w-full px-2 py-1.5 text-sm font-semibold text-foreground bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            placeholder="Enter value..."
                          />
                        ) : (
                          <p className="text-sm font-semibold text-foreground break-words">{value || "N/A"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Remarks */}
              {selectedApplication.adminRemarks && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 rounded-lg bg-primary/10">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Admin Remarks</p>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    selectedApplication.status === "rejected" 
                      ? "bg-red-50 border-red-200 text-red-900" 
                      : "bg-muted/30 border-border/50"
                  }`}>
                    <p className="text-sm">{selectedApplication.adminRemarks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Documents */}
          <div className="w-full md:w-3/5 flex flex-col flex-shrink-0 min-h-0 bg-card">
            {/* Update Button - Fixed at top right */}
            {isEditMode && (
              <div className="p-2.5 sm:p-3 md:p-3.5 border-b border-border/30 flex-shrink-0 bg-card/50 backdrop-blur-sm">
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Documents Section - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 md:p-3.5 custom-scrollbar" style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
            }}>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-primary/10">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted Documents</p>
                  </div>
                  {isEditMode && (
                    <label className="flex items-center gap-1.5 px-2 py-1 text-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Add File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const fileName = e.target.files[0].name || `Document ${Object.keys(editedFiles).length + 1}`
                            handleFileChange(fileName, e.target.files[0])
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {Object.keys(files).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(files).map(([key, fileData]) => (
                      <div
                        key={key}
                        className={`p-2.5 rounded-lg border transition-all ${
                          fileData && typeof fileData === 'string' && fileData.startsWith('data:')
                            ? isEditMode 
                              ? 'border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5'
                              : 'cursor-pointer border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary/50 hover:from-primary/10 hover:to-secondary/10 hover:shadow-md'
                            : 'border-border/30 bg-muted/20 opacity-60'
                        }`}
                        onClick={() => {
                          if (!isEditMode && fileData && typeof fileData === 'string' && fileData.startsWith('data:')) {
                            setSelectedImage(fileData)
                            setIsImageModalOpen(true)
                          }
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                            fileData && typeof fileData === 'string' && fileData.startsWith('data:')
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={key}
                                onChange={(e) => {
                                  const newKey = e.target.value
                                  if (newKey && newKey !== key) {
                                    setEditedFiles(prev => {
                                      const newFiles = { ...prev }
                                      newFiles[newKey] = newFiles[key]
                                      delete newFiles[key]
                                      return newFiles
                                    })
                                  }
                                }}
                                className="w-full px-2 py-1 text-sm font-semibold text-foreground bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mb-1.5"
                                placeholder="Document name..."
                              />
                            ) : (
                              <p className="text-sm font-semibold text-foreground break-words">{key}</p>
                            )}
                            {isEditMode ? (
                              <div className="mt-1.5 space-y-1">
                                <label className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:text-primary/80">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Replace file</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleFileChange(key, e.target.files[0])
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  onClick={() => handleRemoveFile(key)}
                                  className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            ) : fileData && typeof fileData === 'string' && fileData.startsWith('data:') ? (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Click to preview
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border/50 rounded-lg">
                    <div className="p-3 rounded-full bg-muted/30 mb-2">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-2">No documents submitted</p>
                    {isEditMode && (
                      <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Add Document</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const fileName = e.target.files[0].name || "Document 1"
                              handleFileChange(fileName, e.target.files[0])
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null

  return (
    <>
      {/* Desktop Table View - Enhanced */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gradient-to-r from-primary to-secondary">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tracker Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Program</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date Submitted</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Benefit Amount</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-white">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, index) => (
                <tr
                  key={app.id}
                  className={`border-b border-border/50 hover:bg-muted/40 transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20">
                      {app.trackerCode || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-foreground font-semibold">{app.program}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">{app.dateSubmitted}</p>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-primary">{app.amount}</p>
                    {app.benefit && app.benefit !== "N/A" && (
                      <p className="text-xs text-muted-foreground mt-0.5">{app.benefit}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleView(app)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-all duration-200 hover:shadow-md mx-auto text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View - Enhanced */}
      <div className="md:hidden space-y-3">
        {applications.map((app) => (
          <div
            key={app.id}
            className="bg-card border border-border rounded-xl p-4 space-y-3 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground truncate text-base mb-1">{app.program}</h3>
                <p className="text-xs text-muted-foreground mb-2">Submitted: {app.dateSubmitted}</p>
                <div className="mb-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20">
                    {app.trackerCode || "N/A"}
                  </span>
                </div>
              </div>
              {getStatusBadge(app.status)}
            </div>

            <div className="space-y-2 text-sm bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Benefit Amount:</span>
                <span className="text-foreground font-bold text-primary">{app.amount}</span>
              </div>
              {app.benefit && app.benefit !== "N/A" && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground font-medium">Benefit:</span>
                  <span className="text-foreground font-medium text-right flex-1 ml-2">{app.benefit}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleView(app)}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 hover:shadow-md text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Image Zoom Modal - Higher z-index to appear above main modal */}
      {isImageModalOpen && selectedImage && typeof window !== 'undefined' && createPortal(
        <ImageZoomModal
          imageSrc={selectedImage}
          alt="Application Document"
          isOpen={isImageModalOpen}
          onClose={() => {
            setIsImageModalOpen(false)
            setSelectedImage(null)
          }}
        />,
        document.body
      )}

      {/* Application Detail Modal - Rendered via Portal */}
      {typeof window !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  )
}
