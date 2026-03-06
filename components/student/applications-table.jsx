"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Eye, CheckCircle, XCircle, Clock, FileText, User, GraduationCap, MapPin, Calendar, FolderOpen, ClipboardList, Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import ImageZoomModal from "@/components/admin/image-zoom-modal"
import DocumentPreviewModal from "@/components/admin/document-preview-modal"
import FormViewModal from "@/components/admin/form-view-modal"

export default function ApplicationsTable({ applications, onUpdate }) {
  const { user } = useAuth()
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [studentDocuments, setStudentDocuments] = useState([])
  const [applicationForm, setApplicationForm] = useState(null)
  const [profileForm, setProfileForm] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [isApplicationFormModalOpen, setIsApplicationFormModalOpen] = useState(false)
  const [isProfileFormModalOpen, setIsProfileFormModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [userPhoto, setUserPhoto] = useState(null)

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
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setSelectedApplication(null)
    setStudentDocuments([])
    setApplicationForm(null)
    setProfileForm(null)
  }

  // Fetch student documents, application form, and profile form
  useEffect(() => {
    const fetchData = async () => {
      if (!isModalOpen || !selectedApplication?.id || !user?.uid) {
        setLoadingData(false)
        return
      }

      try {
        setLoadingData(true)

        // Fetch student documents
        try {
          const studentDocsQuery = query(
            collection(db, "studentDocuments"),
            where("userId", "==", user.uid)
          )
          const studentDocsSnapshot = await getDocs(studentDocsQuery)
          const docs = []
          
          // Reconstruct fileUrl from chunks for each document
          for (const docSnap of studentDocsSnapshot.docs) {
            const data = docSnap.data()
            let fileUrl = data.fileUrl || data.file || ''
            
            // If document is chunked, fetch and reconstruct from subcollection
            if (data.isChunked) {
              try {
                let chunksSnapshot
                try {
                  const chunksQuery = query(collection(db, "studentDocuments", docSnap.id, "chunks"), orderBy("index"))
                  chunksSnapshot = await getDocs(chunksQuery)
      } catch (error) {
                  chunksSnapshot = await getDocs(collection(db, "studentDocuments", docSnap.id, "chunks"))
                }
                const chunks = chunksSnapshot.docs
                  .sort((a, b) => {
                    const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                    const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                    return indexA - indexB
                  })
                  .map(chunkDoc => chunkDoc.data().data)
                
                if (chunks.length > 0) {
                  fileUrl = fileUrl + chunks.join('')
                }
              } catch (error) {
                console.error(`Error reconstructing chunks for document ${docSnap.id}:`, error)
              }
            }
            
            docs.push({
              id: docSnap.id,
              name: data.documentName || data.name || "Document",
              fileName: data.fileName || data.name || "Document",
              fileUrl: fileUrl,
              uploadedAt: data.uploadedAt || data.createdAt,
              requirementId: data.requirementId || null,
            })
          }
          
          docs.sort((a, b) => {
            const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
            const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
            return dateB - dateA
          })
          setStudentDocuments(docs)
        } catch (error) {
          console.error("Error fetching student documents:", error)
        }

        // Fetch application form
        try {
          const applicationFormsQuery = query(
            collection(db, "applicationForms"),
            where("userId", "==", user.uid)
          )
          const applicationFormsSnapshot = await getDocs(applicationFormsQuery)
          if (!applicationFormsSnapshot.empty) {
            const sortedForms = applicationFormsSnapshot.docs.map(doc => doc.data())
                                                          .sort((a, b) => (b.submittedAt?.toMillis() || 0) - (a.submittedAt?.toMillis() || 0))
            setApplicationForm(sortedForms[0])
          }
        } catch (error) {
          console.error("Error fetching application form:", error)
        }

        // Fetch student profile form
        try {
          const profileFormsQuery = query(
            collection(db, "studentProfileForms"),
            where("userId", "==", user.uid)
          )
          const profileFormsSnapshot = await getDocs(profileFormsQuery)
          if (!profileFormsSnapshot.empty) {
            const sortedForms = profileFormsSnapshot.docs.map(doc => doc.data())
                                                        .sort((a, b) => (b.submittedAt?.toMillis() || 0) - (a.submittedAt?.toMillis() || 0))
            setProfileForm(sortedForms[0])
          }
        } catch (error) {
          console.error("Error fetching profile form:", error)
        }

        // Fetch user photo from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserPhoto(userData.photoURL || user?.photoURL || null)
          }
        } catch (error) {
          console.error("Error fetching user photo:", error)
          // Fallback to auth user photoURL
          setUserPhoto(user?.photoURL || null)
      }
    } catch (error) {
        console.error("Error fetching application data:", error)
    } finally {
        setLoadingData(false)
    }
  }

    fetchData()
  }, [isModalOpen, selectedApplication?.id, user?.uid])

  // Removed edit functionality - students can only view their applications

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-lg">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg font-medium">No applications found</p>
        <p className="text-sm text-muted-foreground mt-2">You haven't submitted any scholarship applications yet.</p>
      </div>
    )
  }

  const formData = selectedApplication?.formData || {}

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
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(selectedApplication.status)}
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
                          <p className="text-sm font-semibold text-foreground break-words">{value || "N/A"}</p>
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

          {/* Right Side - Documents and Forms */}
          <div className="w-full md:w-3/5 flex flex-col flex-shrink-0 min-h-0 bg-card">
            {/* Content Section - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 md:p-3.5 space-y-4 custom-scrollbar" style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
            }}>
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Submitted Documents */}
              <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted Documents</p>
                  </div>
                    {studentDocuments.length > 0 ? (
                      <div className="space-y-2.5">
                        {studentDocuments.map((doc) => {
                          const isBase64 = doc.fileUrl && doc.fileUrl.startsWith('data:')
                          let fileType = null
                          if (isBase64) {
                            const mimeType = doc.fileUrl.split(';')[0].split(':')[1]
                            if (mimeType?.startsWith('image/')) {
                              fileType = 'image'
                            } else if (mimeType === 'application/pdf') {
                              fileType = 'pdf'
                            }
                          } else if (doc.fileUrl) {
                            if (doc.fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
                              fileType = 'image'
                            } else if (doc.fileUrl.toLowerCase().match(/\.(pdf)$/i)) {
                              fileType = 'pdf'
                            }
                          }
                          
                          const handleDocumentClick = (e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (doc.fileUrl) {
                              if (fileType === 'image') {
                                setSelectedDocument({
                                  url: doc.fileUrl,
                                  name: doc.fileName || doc.name || 'Document',
                                  type: fileType
                                })
                                setIsDocumentModalOpen(true)
                              } else if (fileType === 'pdf') {
                                // For PDFs, download directly
                                const link = document.createElement('a')
                                link.href = doc.fileUrl
                                link.download = doc.fileName || doc.name || 'document'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              } else {
                                window.open(doc.fileUrl, '_blank', 'noopener,noreferrer')
                              }
                            }
                          }
                          
                          return (
                            <div
                              key={doc.id}
                              onClick={handleDocumentClick}
                              className={`p-3 rounded-lg border transition-all ${
                                doc.fileUrl
                                  ? 'cursor-pointer border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary/50 hover:from-primary/10 hover:to-secondary/10 hover:shadow-md'
                                  : 'border-border/30 bg-muted/20 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                                  doc.fileUrl
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground break-words">{doc.name}</p>
                                  {doc.fileUrl && (
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                      {fileType === 'image' ? 'Click to preview' : fileType === 'pdf' ? 'Click to download' : 'Click to open file'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border/50 rounded-lg">
                        <div className="p-4 rounded-full bg-muted/30 mb-3">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">No documents submitted</p>
                      </div>
                    )}
                  </div>

                  {/* Forms Status Section */}
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <ClipboardList className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Forms Status</p>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Application Form Status */}
                      <div className="p-4 bg-card rounded-lg border border-border/50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              applicationForm
                                ? 'bg-green-500/20 text-green-600'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">Application Form</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {applicationForm ? 'Form has been submitted' : 'Form not submitted yet'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {applicationForm ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <button
                                  onClick={() => setIsApplicationFormModalOpen(true)}
                                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                                >
                                  View
                                </button>
                              </>
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Profile Form Status */}
                      <div className="p-4 bg-card rounded-lg border border-border/50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              profileForm
                                ? 'bg-green-500/20 text-green-600'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <ClipboardList className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">Student Profile Form</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {profileForm ? 'Form has been submitted' : 'Form not submitted yet'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {profileForm ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <button
                                  onClick={() => setIsProfileFormModalOpen(true)}
                                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                                >
                                  View
                                </button>
                              </>
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
                )}
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

      {/* Document Preview Modal */}
      {isDocumentModalOpen && selectedDocument && typeof window !== 'undefined' && createPortal(
        <DocumentPreviewModal
          isOpen={isDocumentModalOpen}
          onClose={() => {
            setIsDocumentModalOpen(false)
            setSelectedDocument(null)
          }}
          fileUrl={selectedDocument.url}
          fileName={selectedDocument.name}
          fileType={selectedDocument.type}
        />,
        document.body
      )}

      {/* Application Form View Modal */}
      {isApplicationFormModalOpen && applicationForm && typeof window !== 'undefined' && createPortal(
        <FormViewModal
          formData={applicationForm}
          formType="applicationForm"
          userPhoto={userPhoto}
          isOpen={isApplicationFormModalOpen}
          onClose={() => setIsApplicationFormModalOpen(false)}
          loading={loadingData || !applicationForm}
          formName="Application Form"
        />,
        document.body
      )}

      {/* Profile Form View Modal */}
      {isProfileFormModalOpen && profileForm && typeof window !== 'undefined' && createPortal(
        <FormViewModal
          formData={profileForm}
          formType="studentProfileForm"
          userPhoto={userPhoto}
          isOpen={isProfileFormModalOpen}
          onClose={() => setIsProfileFormModalOpen(false)}
          loading={loadingData || !profileForm}
          formName="Student Profile Form"
        />,
        document.body
      )}

      {/* Application Detail Modal - Rendered via Portal */}
      {typeof window !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  )
}
