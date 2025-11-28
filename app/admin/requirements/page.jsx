"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDoc } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { FolderCheck, Plus, Edit, Trash2, Save, Upload, FileText, CheckCircle, Sparkles, ChevronLeft, ChevronRight, Calendar, Eye, Download, Users, AlertCircle, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { sendNewDocumentRequirementEmail } from "@/lib/email-service"
import DocumentPreviewModal from "@/components/admin/document-preview-modal"

export default function DocumentRequirementsPage() {
  const [activeTab, setActiveTab] = useState("requirements") // "requirements" or "records"
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedCard, setExpandedCard] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [requirementToDelete, setRequirementToDelete] = useState(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewFileName, setPreviewFileName] = useState(null)
  const [previewFileType, setPreviewFileType] = useState(null)
  const ITEMS_PER_PAGE = 10
  
  // Student Records state
  const [studentRecords, setStudentRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsSearchQuery, setRecordsSearchQuery] = useState("")
  const [recordsFilterRequirement, setRecordsFilterRequirement] = useState("all")
  const RECORDS_PER_PAGE = 10

  // Reset records page when filters change
  useEffect(() => {
    setRecordsPage(1)
  }, [recordsSearchQuery, recordsFilterRequirement])

  // Reset records page when switching tabs
  useEffect(() => {
    if (activeTab === "records") {
      setRecordsPage(1)
    }
  }, [activeTab])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    required: true,
    sampleFile: null,
    sampleFileName: "",
    maxImageUploads: 1, // Default to 1 image
  })
  const [sampleFilePreview, setSampleFilePreview] = useState(null)

  // Fetch requirements
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        let snapshot
      try {
        const requirementsQuery = query(
          collection(db, "documentRequirements"),
          orderBy("createdAt", "desc")
        )
          snapshot = await getDocs(requirementsQuery)
        } catch (error) {
          // Fallback without orderBy
          snapshot = await getDocs(collection(db, "documentRequirements"))
        }
        
        // Reconstruct chunked sample files
        const requirementsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data()
          let sampleFile = data.sampleFile || ''
          
          // If sample is chunked, fetch and reconstruct from subcollection
          if (data.isSampleChunked && sampleFile) {
            try {
              let chunksSnapshot
              try {
                const chunksQuery = query(collection(db, "documentRequirements", docSnap.id, "sampleChunks"), orderBy("index"))
                chunksSnapshot = await getDocs(chunksQuery)
              } catch (error) {
                // If orderBy fails, fetch all and sort manually
                chunksSnapshot = await getDocs(collection(db, "documentRequirements", docSnap.id, "sampleChunks"))
              }
              const chunks = chunksSnapshot.docs
                .sort((a, b) => {
                  const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                  const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                  return indexA - indexB
                })
                .map(chunkDoc => chunkDoc.data().data)
              
              // Reconstruct full base64 string
              if (chunks.length > 0) {
                const reconstructedBase64 = sampleFile + chunks.join('')
                console.log(`✅ Reconstructed sample file for requirement ${docSnap.id}:`, {
                  originalLength: sampleFile.length,
                  chunksCount: chunks.length,
                  chunksTotalLength: chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0),
                  reconstructedLength: reconstructedBase64.length,
                  hasDataPrefix: reconstructedBase64.startsWith('data:')
                })
                sampleFile = reconstructedBase64
              } else {
                console.warn(`⚠️ No chunks found for chunked sample file ${docSnap.id}, using first chunk only`)
              }
            } catch (error) {
              console.error(`Error reconstructing chunks for requirement ${docSnap.id}:`, error)
            }
          }
          
          return {
            id: docSnap.id,
            ...data,
            sampleFile: sampleFile,
          }
        }))
        
        setRequirements(requirementsData)
      } catch (error) {
        console.error("Error fetching requirements:", error)
        // Fallback without orderBy
        try {
          const snapshot = await getDocs(collection(db, "documentRequirements"))
          const requirementsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          setRequirements(requirementsData)
        } catch (fallbackError) {
          console.error("Error fetching requirements (fallback):", fallbackError)
          // Try to fetch with chunk reconstruction even on error
          try {
            const snapshot = await getDocs(collection(db, "documentRequirements"))
            const requirementsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data()
              let sampleFile = data.sampleFile || ''
              
              if (data.isSampleChunked && sampleFile) {
                try {
                  const chunksSnapshot = await getDocs(collection(db, "documentRequirements", docSnap.id, "sampleChunks"))
                  const chunks = chunksSnapshot.docs
                    .sort((a, b) => {
                      const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                      const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                      return indexA - indexB
                    })
                    .map(chunkDoc => chunkDoc.data().data)
                  
                  if (chunks.length > 0) {
                    sampleFile = sampleFile + chunks.join('')
                  }
                } catch (error) {
                  console.error(`Error reconstructing chunks for requirement ${docSnap.id}:`, error)
                }
              }
              
              return {
                id: docSnap.id,
                ...data,
                sampleFile: sampleFile,
              }
            }))
            setRequirements(requirementsData)
          } catch (finalError) {
            console.error("Error fetching requirements (final fallback):", finalError)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchRequirements()
  }, [])

  // Fetch student records
  useEffect(() => {
    const fetchStudentRecords = async () => {
      if (activeTab !== "records") return
      
      setRecordsLoading(true)
      try {
        // Fetch all student documents
        const studentDocsSnapshot = await getDocs(collection(db, "studentDocuments"))
        
        // Fetch all users for names
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersMap = new Map()
        usersSnapshot.forEach((userDoc) => {
          usersMap.set(userDoc.id, userDoc.data())
        })
        
        // Fetch all requirements for names
        const requirementsSnapshot = await getDocs(collection(db, "documentRequirements"))
        const requirementsMap = new Map()
        requirementsSnapshot.forEach((reqDoc) => {
          requirementsMap.set(reqDoc.id, reqDoc.data())
        })
        
        // Reconstruct chunked documents and prepare records
        const recordsData = await Promise.all(studentDocsSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data()
          let fileUrl = data.fileUrl || ''
          
          // Reconstruct chunked files
          if (data.isChunked && fileUrl) {
            try {
              const chunksSnapshot = await getDocs(collection(db, "studentDocuments", docSnap.id, "chunks"))
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
          
          const user = usersMap.get(data.userId)
          const requirement = requirementsMap.get(data.requirementId)
          
          // Determine file type
          const isImage = fileUrl.startsWith('data:image/')
          const isPdf = fileUrl.startsWith('data:application/pdf') || data.fileName?.toLowerCase().endsWith('.pdf')
          
          return {
            id: docSnap.id,
            userId: data.userId,
            userName: user?.fullName || user?.displayName || "Unknown User",
            userEmail: user?.email || "N/A",
            userPhotoURL: user?.photoURL || null,
            requirementId: data.requirementId,
            requirementName: requirement?.name || "Unknown Requirement",
            fileName: data.fileName || "Unknown File",
            fileUrl: fileUrl,
            fileType: isImage ? 'image' : isPdf ? 'pdf' : 'other',
            uploadedAt: data.uploadedAt || data.updatedAt || null,
            uploadedAtDate: data.uploadedAt ? new Date(data.uploadedAt) : (data.updatedAt ? new Date(data.updatedAt) : new Date())
          }
        }))
        
        // Sort by upload date (newest first)
        recordsData.sort((a, b) => b.uploadedAtDate.getTime() - a.uploadedAtDate.getTime())
        
        setStudentRecords(recordsData)
      } catch (error) {
        console.error("Error fetching student records:", error)
        toast.error("Failed to load student records")
      } finally {
        setRecordsLoading(false)
      }
    }
    
    fetchStudentRecords()
  }, [activeTab])

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type - only PDF for sample files
      if (file.type !== 'application/pdf') {
        toast.error("Sample file must be a PDF. Students will upload scanned images based on this PDF.")
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB")
        return
      }
      
      setFormData({
        ...formData,
        sampleFile: file,
        sampleFileName: file.name,
      })
      
      // For PDF, show file info instead of preview
      setSampleFilePreview('pdf')
    }
  }

  const handleOpenModal = (requirement = null) => {
    if (requirement) {
      setEditingRequirement(requirement)
      setFormData({
        name: requirement.name || "",
        description: requirement.description || "",
        required: requirement.required !== undefined ? requirement.required : true,
        sampleFile: null,
        sampleFileName: requirement.sampleFileName || "",
        maxImageUploads: requirement.maxImageUploads || 1,
      })
      setSampleFilePreview(requirement.sampleFile ? (requirement.sampleFile.startsWith('data:image/') ? requirement.sampleFile : 'pdf') : null)
    } else {
      setEditingRequirement(null)
      setFormData({
        name: "",
        description: "",
        required: true,
        sampleFile: null,
        sampleFileName: "",
        maxImageUploads: 1,
      })
      setSampleFilePreview(null)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingRequirement(null)
    setFormData({
      name: "",
      description: "",
      required: true,
      sampleFile: null,
      sampleFileName: "",
        maxImageUploads: 1,
    })
    setSampleFilePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Please enter a requirement name")
      return
    }

    try {
      let sampleFileBase64 = null
      let needsChunking = false
      const CHUNK_SIZE = 600000 // ~600KB per chunk (leaving room for other fields - Firestore limit is 1MB per field)
      // Note: Base64 encoding increases size by ~33%, so a 778KB PDF becomes ~1.03MB
      // We chunk at 600KB to ensure we stay well under the 1MB limit
      
      if (formData.sampleFile) {
        const fullBase64 = await fileToBase64(formData.sampleFile)
        
        console.log("📄 PDF Sample File Info:", {
          fileName: formData.sampleFile.name,
          fileSize: formData.sampleFile.size,
          base64Length: fullBase64.length,
          base64SizeKB: (fullBase64.length / 1024).toFixed(2),
          needsChunking: fullBase64.length > CHUNK_SIZE
        })
        
        // Check if file needs chunking (Firestore limit is 1MB = 1048576 bytes per document field)
        // We use 600KB to ensure we stay well under the limit
        // Extract the base64 data portion (after the prefix)
        const base64Match = fullBase64.match(/^data:([^;]+);base64,(.+)$/s)
        if (!base64Match) {
          toast.error("Failed to process file. Invalid format.")
          return
        }
        
        const mimeType = base64Match[1]
        const base64Data = base64Match[2]
        const prefix = `data:${mimeType};base64,`
        
        if (fullBase64.length > CHUNK_SIZE) {
          needsChunking = true
          // Store first chunk in sampleFile (prefix + first chunk of base64 data)
          // We need to ensure the first chunk stays under CHUNK_SIZE including the prefix
          const maxBase64InFirstChunk = CHUNK_SIZE - prefix.length
          const firstChunkBase64 = base64Data.slice(0, maxBase64InFirstChunk)
          sampleFileBase64 = prefix + firstChunkBase64
          console.log("✅ File will be chunked. First chunk size:", (sampleFileBase64.length / 1024).toFixed(2), "KB", {
            prefixLength: prefix.length,
            base64DataLength: base64Data.length,
            firstChunkBase64Length: firstChunkBase64.length,
            remainingBase64Length: base64Data.length - firstChunkBase64.length
          })
        } else {
          // If file is small enough, store directly
          sampleFileBase64 = fullBase64
          console.log("✅ File is small enough to store directly")
        }
      } else if (editingRequirement && editingRequirement.sampleFile) {
        // Keep existing file if not changed
        sampleFileBase64 = editingRequirement.sampleFile
        // Check if existing file was chunked
        if (editingRequirement.isSampleChunked) {
          needsChunking = true
        }
      }

      const requirementData = {
        name: formData.name.trim(),
        description: formData.description.trim() || "",
        required: formData.required,
        sampleFile: sampleFileBase64,
        sampleFileName: formData.sampleFile ? formData.sampleFile.name : (editingRequirement?.sampleFileName || ""),
        maxImageUploads: formData.maxImageUploads || 1, // Limit for image uploads when PDF sample is provided
        isSampleChunked: needsChunking, // Flag to indicate if sample is chunked
        updatedAt: new Date().toISOString(),
      }

      if (editingRequirement) {
        // Update existing requirement
        const requirementRef = doc(db, "documentRequirements", editingRequirement.id)
        await updateDoc(requirementRef, requirementData)
        
        // Delete old chunks if they exist and we're replacing the file
        if (formData.sampleFile && editingRequirement.isSampleChunked) {
          try {
            const chunksQuery = query(collection(db, "documentRequirements", editingRequirement.id, "sampleChunks"))
            const chunksSnapshot = await getDocs(chunksQuery)
            for (const chunkDoc of chunksSnapshot.docs) {
              await deleteDoc(doc(db, "documentRequirements", editingRequirement.id, "sampleChunks", chunkDoc.id))
            }
          } catch (error) {
            console.error("Error deleting old chunks:", error)
          }
        }
        
        // Store remaining chunks in subcollection if needed
        if (formData.sampleFile && needsChunking) {
          // Re-read the file to get full base64 (we already have it, but to be safe)
          const fullBase64 = await fileToBase64(formData.sampleFile)
          const base64Match = fullBase64.match(/^data:([^;]+);base64,(.+)$/s)
          if (!base64Match) {
            throw new Error("Invalid base64 format")
          }
          
          const base64Data = base64Match[2]
          const prefix = `data:${base64Match[1]};base64,`
          const maxBase64InFirstChunk = CHUNK_SIZE - prefix.length
          
          const chunks = []
          
          // Start from where the first chunk ended (only base64 data, no prefix)
          // Index starts from 1 (since index 0 is the first chunk stored in sampleFile)
          let chunkIndex = 1
          for (let i = maxBase64InFirstChunk; i < base64Data.length; i += CHUNK_SIZE) {
            const chunkEnd = Math.min(i + CHUNK_SIZE, base64Data.length)
            chunks.push({
              index: chunkIndex,
              data: base64Data.slice(i, chunkEnd)
            })
            chunkIndex++
          }
          
          // Store each chunk as a separate document
          for (const chunk of chunks) {
            await addDoc(
              collection(db, "documentRequirements", editingRequirement.id, "sampleChunks"),
              { index: chunk.index, data: chunk.data }
            )
          }
        }
        
        toast.success("Requirement updated successfully!", {
          icon: <CheckCircle className="w-4 h-4" />,
        })
      } else {
        // Create new requirement
        requirementData.createdAt = new Date().toISOString()
        const newRequirementRef = await addDoc(collection(db, "documentRequirements"), requirementData)
        
        // Store remaining chunks in subcollection if needed
        if (formData.sampleFile && needsChunking) {
          // Re-read the file to get full base64 (we already have it, but to be safe)
          const fullBase64 = await fileToBase64(formData.sampleFile)
          const base64Match = fullBase64.match(/^data:([^;]+);base64,(.+)$/s)
          if (!base64Match) {
            throw new Error("Invalid base64 format")
          }
          
          const base64Data = base64Match[2]
          const prefix = `data:${base64Match[1]};base64,`
          const maxBase64InFirstChunk = CHUNK_SIZE - prefix.length
          
          const chunks = []
          
          // Start from where the first chunk ended (only base64 data, no prefix)
          // Index starts from 1 (since index 0 is the first chunk stored in sampleFile)
          let chunkIndex = 1
          for (let i = maxBase64InFirstChunk; i < base64Data.length; i += CHUNK_SIZE) {
            const chunkEnd = Math.min(i + CHUNK_SIZE, base64Data.length)
            chunks.push({
              index: chunkIndex,
              data: base64Data.slice(i, chunkEnd)
            })
            chunkIndex++
          }
          
          // Store each chunk as a separate document
          for (const chunk of chunks) {
            await addDoc(
              collection(db, "documentRequirements", newRequirementRef.id, "sampleChunks"),
              { index: chunk.index, data: chunk.data }
            )
          }
        }
        
        // Send email notifications to all students
        try {
          const usersSnapshot = await getDocs(collection(db, "users"))
          const emailPromises = []
          
          usersSnapshot.docs.forEach(async (userDoc) => {
            const userData = userDoc.data()
            // Only send to students (not admin)
            if (userData.email && userData.email.endsWith("@minsu.edu.ph") && userData.email !== "contact.ischolar@gmail.com") {
              const studentName = userData.fullName || userData.displayName || "Student"
              const microsoftEmail = userData.email
              const secondaryEmail = userData.secondaryEmail
              
              // Send to Microsoft email
              if (microsoftEmail) {
                emailPromises.push(
                  sendNewDocumentRequirementEmail(
                    microsoftEmail,
                    studentName,
                    requirementData.name,
                    requirementData.description,
                    requirementData.required
                  ).catch(err => {
                    console.error(`Error sending email to ${microsoftEmail}:`, err)
                  })
                )
              }
              
              // Send to secondary email if available
              if (secondaryEmail && secondaryEmail !== microsoftEmail) {
                emailPromises.push(
                  sendNewDocumentRequirementEmail(
                    secondaryEmail,
                    studentName,
                    requirementData.name,
                    requirementData.description,
                    requirementData.required
                  ).catch(err => {
                    console.error(`Error sending email to ${secondaryEmail}:`, err)
                  })
                )
              }
            }
          })
          
          // Wait for all emails to be sent (but don't block the UI)
          Promise.all(emailPromises).then(() => {
            console.log("All notification emails sent")
          }).catch(err => {
            console.error("Error sending some notification emails:", err)
          })
        } catch (emailError) {
          console.error("Error sending notification emails:", emailError)
          // Don't fail the requirement creation if email fails
        }
        
        toast.success("Requirement added successfully! Students will be notified via email.", {
          icon: <CheckCircle className="w-4 h-4" />,
        })
      }

      // Refresh requirements with chunk reconstruction
      const snapshot = await getDocs(query(collection(db, "documentRequirements"), orderBy("createdAt", "desc")))
      
      // Reconstruct chunked sample files
      const requirementsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data()
        let sampleFile = data.sampleFile || ''
        
        // If sample is chunked, fetch and reconstruct from subcollection
        if (data.isSampleChunked && sampleFile) {
          try {
            let chunksSnapshot
            try {
              const chunksQuery = query(collection(db, "documentRequirements", docSnap.id, "sampleChunks"), orderBy("index"))
              chunksSnapshot = await getDocs(chunksQuery)
            } catch (error) {
              // If orderBy fails, fetch all and sort manually
              chunksSnapshot = await getDocs(collection(db, "documentRequirements", docSnap.id, "sampleChunks"))
            }
            const chunks = chunksSnapshot.docs
              .sort((a, b) => {
                const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                return indexA - indexB
              })
              .map(chunkDoc => chunkDoc.data().data)
            
            // Reconstruct full base64 string
            if (chunks.length > 0) {
              const reconstructedBase64 = sampleFile + chunks.join('')
              console.log(`✅ Reconstructed sample file for requirement ${docSnap.id}:`, {
                originalLength: sampleFile.length,
                chunksCount: chunks.length,
                chunksTotalLength: chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0),
                reconstructedLength: reconstructedBase64.length,
                hasDataPrefix: reconstructedBase64.startsWith('data:'),
                firstChars: sampleFile.substring(0, 50),
                lastChars: chunks[chunks.length - 1]?.substring(Math.max(0, (chunks[chunks.length - 1]?.length || 0) - 50)) || 'N/A'
              })
              sampleFile = reconstructedBase64
            } else {
              console.warn(`⚠️ No chunks found for chunked sample file ${docSnap.id}, using first chunk only`)
            }
          } catch (error) {
            console.error(`Error reconstructing chunks for requirement ${docSnap.id}:`, error)
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          sampleFile: sampleFile,
        }
      }))
      
      setRequirements(requirementsData)

      handleCloseModal()
    } catch (error) {
      console.error("Error saving requirement:", error)
      toast.error("Failed to save requirement. Please try again.")
    }
  }

  const handleDeleteClick = (requirementId) => {
    const requirement = requirements.find(r => r.id === requirementId)
    setRequirementToDelete(requirement)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!requirementToDelete) return

    try {
      // Delete chunks if they exist
      try {
        const chunksQuery = query(collection(db, "documentRequirements", requirementToDelete.id, "sampleChunks"))
        const chunksSnapshot = await getDocs(chunksQuery)
        for (const chunkDoc of chunksSnapshot.docs) {
          await deleteDoc(doc(db, "documentRequirements", requirementToDelete.id, "sampleChunks", chunkDoc.id))
        }
      } catch (error) {
        console.error("Error deleting chunks:", error)
        // Continue with deletion even if chunks deletion fails
      }
      
      await deleteDoc(doc(db, "documentRequirements", requirementToDelete.id))
      toast.success("Requirement deleted successfully!", {
        icon: <CheckCircle className="w-4 h-4" />,
      })
      
      // Refresh requirements with chunk reconstruction
      const snapshot = await getDocs(query(collection(db, "documentRequirements"), orderBy("createdAt", "desc")))
      
      // Reconstruct chunked sample files
      const requirementsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data()
        let sampleFile = data.sampleFile || ''
        
        // If sample is chunked, fetch and reconstruct from subcollection
        if (data.isSampleChunked && sampleFile) {
          try {
            let chunksSnapshot
            try {
              const chunksQuery = query(collection(db, "documentRequirements", docSnap.id, "sampleChunks"), orderBy("index"))
              chunksSnapshot = await getDocs(chunksQuery)
            } catch (error) {
              // If orderBy fails, fetch all and sort manually
              chunksSnapshot = await getDocs(collection(db, "documentRequirements", docSnap.id, "sampleChunks"))
            }
            const chunks = chunksSnapshot.docs
              .sort((a, b) => {
                const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                return indexA - indexB
              })
              .map(chunkDoc => chunkDoc.data().data)
            
            // Reconstruct full base64 string
            if (chunks.length > 0) {
              const reconstructedBase64 = sampleFile + chunks.join('')
              console.log(`✅ Reconstructed sample file for requirement ${docSnap.id}:`, {
                originalLength: sampleFile.length,
                chunksCount: chunks.length,
                chunksTotalLength: chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0),
                reconstructedLength: reconstructedBase64.length,
                hasDataPrefix: reconstructedBase64.startsWith('data:'),
                firstChars: sampleFile.substring(0, 50),
                lastChars: chunks[chunks.length - 1]?.substring(Math.max(0, (chunks[chunks.length - 1]?.length || 0) - 50)) || 'N/A'
              })
              sampleFile = reconstructedBase64
            } else {
              console.warn(`⚠️ No chunks found for chunked sample file ${docSnap.id}, using first chunk only`)
            }
          } catch (error) {
            console.error(`Error reconstructing chunks for requirement ${docSnap.id}:`, error)
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          sampleFile: sampleFile,
        }
      }))
      
      setRequirements(requirementsData)
      setDeleteModalOpen(false)
      setRequirementToDelete(null)
    } catch (error) {
      console.error("Error deleting requirement:", error)
      toast.error("Failed to delete requirement. Please try again.", {
        icon: <AlertCircle className="w-4 h-4" />,
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setRequirementToDelete(null)
  }

  const handleDownloadSample = (sampleFile, sampleFileName) => {
    if (!sampleFile) {
      toast.error("No file available to download")
      return
    }
    
    console.log('⬇️ Download sample initiated (admin):', { 
      fileName: sampleFileName, 
      fileUrl: sampleFile?.substring(0, 50) + '...',
      isBase64: sampleFile?.startsWith('data:'),
      totalLength: sampleFile?.length
    })
    
    try {
      // Always convert base64 to blob for download (like student documents)
      if (sampleFile.startsWith('data:')) {
        // Extract mime type and base64 data
        const dataUrlMatch = sampleFile.match(/^data:([^;]+);base64,(.+)$/s)
        if (!dataUrlMatch) {
          console.error("❌ Invalid base64 format - no match found")
          toast.error("Invalid file format")
          return
        }
        
        const mimeType = dataUrlMatch[1]
        let base64Data = dataUrlMatch[2]
        
        console.log('📄 Extracted data:', {
          mimeType,
          base64DataLength: base64Data.length,
          base64DataPreview: base64Data.substring(0, 50) + '...' + base64Data.substring(Math.max(0, base64Data.length - 50)),
          expectedSizeKB: Math.ceil(base64Data.length * 3 / 4 / 1024),
          fullSampleFileLength: sampleFile.length
        })
        
        // Validate base64 data
        if (!base64Data || base64Data.length === 0) {
          console.error("❌ Empty base64 data")
          toast.error("File data is empty")
          return
        }
        
        // Clean base64 data (remove whitespace)
        base64Data = base64Data.replace(/\s/g, '')
        
        // Check if base64 is valid
        const isValidBase64 = /^[A-Za-z0-9+/=]*$/.test(base64Data)
        if (!isValidBase64) {
          console.error("❌ Invalid base64 characters")
          toast.error("Invalid file data format")
          return
        }
        
        // Validate base64 padding
        if (base64Data.length % 4 !== 0) {
          console.warn("⚠️ Base64 length not multiple of 4, adding padding")
          base64Data = base64Data + '='.repeat((4 - base64Data.length % 4) % 4)
        }
        
        // Convert to blob for more reliable download
        try {
          // Validate base64 can be decoded
          let byteCharacters
          try {
            byteCharacters = atob(base64Data)
          } catch (decodeError) {
            console.error("❌ Failed to decode base64:", decodeError)
            toast.error("Invalid file data. The file may be corrupted.")
            return
          }
          
          if (!byteCharacters || byteCharacters.length === 0) {
            console.error("❌ Decoded data is empty")
            toast.error("File data is empty or corrupted")
            return
          }
          
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: mimeType })
          
          // Validate blob was created successfully
          if (!blob || blob.size === 0) {
            console.error("❌ Blob creation failed or blob is empty")
            toast.error("Failed to create file. The file may be corrupted.")
            return
          }
          
          const blobUrl = URL.createObjectURL(blob)
          
          const expectedSize = Math.ceil(base64Data.length * 3 / 4)
          const sizeDifference = Math.abs(blob.size - expectedSize)
          const sizeMatch = sizeDifference < 100 // Allow 100 bytes difference
          
          console.log('✅ Blob created for download:', { 
            blobSize: blob.size, 
            blobType: blob.type,
            originalFileName: sampleFileName,
            expectedSize: expectedSize,
            sizeDifference: sizeDifference,
            sizeMatch: sizeMatch,
            base64Length: base64Data.length
          })
          
          // Warn if blob size doesn't match expected size (might indicate corruption or incomplete data)
          if (!sizeMatch) {
            console.warn("⚠️ Blob size doesn't match expected size. File might be incomplete or corrupted.", {
              blobSize: blob.size,
              expectedSize: expectedSize,
              difference: sizeDifference,
              base64Length: base64Data.length,
              fileName: sampleFileName
            })
            toast.warning("File size mismatch detected. The file might be incomplete. Please check if all chunks were properly loaded.", {
              duration: 5000,
            })
          }
          
          // Determine file extension from mime type
          let extension = ''
          if (mimeType === 'application/pdf') {
            extension = '.pdf'
          } else if (mimeType.startsWith('image/')) {
            const imageType = mimeType.split('/')[1].split('+')[0]
            extension = '.' + (imageType === 'jpeg' ? 'jpg' : imageType)
          }
          
          // Use the actual file name from the requirement
          let downloadName = sampleFileName || 'sample'
          
          // Ensure correct extension
          if (extension) {
            // Remove existing extension if it doesn't match
            const currentExt = downloadName.match(/\.([^.]+)$/)?.[1]?.toLowerCase()
            const expectedExt = extension.replace('.', '').toLowerCase()
            if (currentExt && currentExt !== expectedExt) {
              downloadName = downloadName.replace(/\.[^.]+$/, '')
            }
            // Add extension if not present
            if (!downloadName.toLowerCase().endsWith(extension.toLowerCase())) {
              downloadName = downloadName + extension
            }
          }
          
          console.log('⬇️ Downloading with name:', downloadName)
          
          // Create download link
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = downloadName
          
          // Trigger download
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          // Clean up blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl)
            console.log('✅ Blob URL cleaned up')
          }, 1000)
          
          toast.success("File downloaded successfully", {
            icon: <CheckCircle className="w-4 h-4" />,
          })
        } catch (blobError) {
          console.error('❌ Error creating blob:', blobError)
          toast.error("Failed to download file. Please try again.")
        }
      } else {
        // Fallback for non-base64 URLs
        console.log('⬇️ Using direct URL for download (non-base64)')
        const link = document.createElement('a')
        link.href = sampleFile
        link.download = sampleFileName || 'sample'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success("File downloaded successfully", {
          icon: <CheckCircle className="w-4 h-4" />,
        })
      }
    } catch (error) {
      console.error("❌ Error downloading sample file:", error)
      toast.error("Failed to download file. Please try again.")
    }
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        <AdminPageBanner
          icon={FolderCheck}
          title="Document Requirements"
          description="Manage document requirements that students need to submit"
        />

        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Tab Controls */}
          <div className="relative mb-6">
            <div className="flex gap-1 md:gap-2 border-b-2 border-border relative bg-card/50 backdrop-blur-sm rounded-t-lg p-1 md:p-0 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab("requirements")}
                className={`px-4 md:px-8 py-2.5 md:py-3.5 font-bold transition-all duration-300 relative z-10 rounded-t-lg md:rounded-t-xl whitespace-nowrap flex-shrink-0 group ${
                  activeTab === "requirements"
                    ? "text-primary bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-br hover:from-muted/30 hover:via-muted/20 hover:to-muted/10"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                    activeTab === "requirements" 
                      ? "bg-primary/20 scale-110 rotate-3" 
                      : "bg-muted/30 group-hover:bg-muted/50"
                  }`}>
                    <FolderCheck className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${activeTab === "requirements" ? "text-primary scale-110" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-sm md:text-base font-semibold">Requirements</span>
                  {requirements.length > 0 && (
                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      activeTab === "requirements" 
                        ? "bg-primary text-primary-foreground scale-110 animate-pulse shadow-md" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {requirements.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("records")}
                className={`px-4 md:px-8 py-2.5 md:py-3.5 font-bold transition-all duration-300 relative z-10 rounded-t-lg md:rounded-t-xl whitespace-nowrap flex-shrink-0 group ${
                  activeTab === "records"
                    ? "text-primary bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-br hover:from-muted/30 hover:via-muted/20 hover:to-muted/10"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                    activeTab === "records" 
                      ? "bg-primary/20 scale-110 rotate-3" 
                      : "bg-muted/30 group-hover:bg-muted/50"
                  }`}>
                    <Users className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${activeTab === "records" ? "text-primary scale-110" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-sm md:text-base font-semibold">Student Records</span>
                  {studentRecords.length > 0 && (
                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      activeTab === "records" 
                        ? "bg-primary text-primary-foreground scale-110 animate-pulse shadow-md" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {studentRecords.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Requirements Tab Content */}
          {activeTab === "requirements" && (
            <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Document Requirements</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Add and manage document requirements for students</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add Requirement</span>
            </button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : requirements.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <FolderCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No requirements added yet</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Requirement</span>
              </button>
            </div>
          ) : (
            <>
              {/* Pagination Info */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, requirements.length)} of {requirements.length} requirements
                </p>
              </div>

              {/* Requirements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {requirements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((requirement) => {
                  const isExpanded = expandedCard === requirement.id
                  const createdAt = requirement.createdAt ? new Date(requirement.createdAt) : new Date()
                  
                  return (
                    <div
                      key={requirement.id}
                      className={`bg-gradient-to-br from-card via-card to-primary/5 border-2 border-border rounded-xl p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group ${
                        requirement.required
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-blue-500/30 bg-blue-500/5'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg group-hover:scale-110 transition-transform">
                              <FolderCheck className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-bold text-foreground text-base sm:text-lg flex-1 min-w-0">{requirement.name}</h3>
                          </div>
                          {requirement.description && (
                            <>
                              <p className={`text-sm text-muted-foreground transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {requirement.description}
                              </p>
                              {requirement.description.length > 100 && (
                                <button
                                  onClick={() => setExpandedCard(isExpanded ? null : requirement.id)}
                                  className="text-xs text-primary hover:underline mt-1"
                                >
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleOpenModal(requirement)}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-primary" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(requirement.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                          requirement.required
                            ? "bg-red-500/20 text-red-600 border-red-500/30"
                            : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                        }`}>
                          {requirement.required ? "Required" : "Optional"}
                        </span>
                        {requirement.createdAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Sample File Section */}
                      {requirement.sampleFile && (
                        <div className="mt-4 pt-4 border-t-2 border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sample File</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-foreground truncate flex-1 break-words">{requirement.sampleFileName}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => {
                                  // Determine file type
                                  const isImage = requirement.sampleFile.startsWith('data:image/')
                                  const isPdf = requirement.sampleFile.startsWith('data:application/pdf') || requirement.sampleFileName?.toLowerCase().endsWith('.pdf')
                                  
                                  if (isImage) {
                                    // Open image in preview modal
                                    setPreviewFile(requirement.sampleFile)
                                    setPreviewFileName(requirement.sampleFileName)
                                    setPreviewFileType('image')
                                    setPreviewModalOpen(true)
                                  } else if (isPdf) {
                                    // Open PDF in preview modal
                                    setPreviewFile(requirement.sampleFile)
                                    setPreviewFileName(requirement.sampleFileName)
                                    setPreviewFileType('pdf')
                                    setPreviewModalOpen(true)
                                  } else {
                                    // Fallback: open in new tab
                                    window.open(requirement.sampleFile, '_blank')
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors w-full sm:w-auto"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => handleDownloadSample(requirement.sampleFile, requirement.sampleFileName)}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors w-full sm:w-auto"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Created Date */}
                      {requirement.createdAt && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>Created {createdAt.toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {requirements.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-border">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.ceil(requirements.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === Math.ceil(requirements.length / ITEMS_PER_PAGE) ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition-all font-medium ${
                              currentPage === page
                                ? 'bg-primary text-white shadow-lg'
                                : 'border-2 border-border hover:bg-muted hover:border-primary/50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-muted-foreground">...</span>
                      }
                      return null
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(requirements.length / ITEMS_PER_PAGE), prev + 1))}
                    disabled={currentPage === Math.ceil(requirements.length / ITEMS_PER_PAGE)}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
          </>)}

          {/* Student Records Tab Content */}
          {activeTab === "records" && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">Student Records</h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">View all uploaded documents and images from students</p>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mb-6 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={recordsSearchQuery}
                    onChange={(e) => setRecordsSearchQuery(e.target.value)}
                    placeholder="Search by student name, email, or file name..."
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                  />
                </div>
                <select
                  value={recordsFilterRequirement}
                  onChange={(e) => setRecordsFilterRequirement(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200 w-full md:w-auto"
                >
                  <option value="all">All Requirements</option>
                  {requirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtered Records */}
              {(() => {
                let filteredRecords = [...studentRecords]
                
                // Search filter
                if (recordsSearchQuery.trim()) {
                  const query = recordsSearchQuery.toLowerCase().trim()
                  filteredRecords = filteredRecords.filter(record =>
                    record.userName?.toLowerCase().includes(query) ||
                    record.userEmail?.toLowerCase().includes(query) ||
                    record.fileName?.toLowerCase().includes(query) ||
                    record.requirementName?.toLowerCase().includes(query)
                  )
                }
                
                // Requirement filter
                if (recordsFilterRequirement !== "all") {
                  filteredRecords = filteredRecords.filter(record => record.requirementId === recordsFilterRequirement)
                }
                
                const paginatedRecords = filteredRecords.slice(
                  (recordsPage - 1) * RECORDS_PER_PAGE,
                  recordsPage * RECORDS_PER_PAGE
                )
                const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE)
                
                return (
                  <>
                    {recordsLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : filteredRecords.length === 0 ? (
                      <div className="bg-card border border-border rounded-lg p-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No student records found</p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto mb-6">
                          <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gradient-to-r from-primary to-secondary">
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Student</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Record Name</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">File Name</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Type</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Upload Date</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedRecords.map((record, index) => (
                                  <tr
                                    key={record.id}
                                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                                      index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                                    }`}
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        {record.userPhotoURL ? (
                                          <img
                                            src={record.userPhotoURL}
                                            alt={record.userName}
                                            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                                            onError={(e) => {
                                              e.target.style.display = 'none'
                                              const fallback = e.target.nextElementSibling
                                              if (fallback) fallback.style.display = 'flex'
                                            }}
                                          />
                                        ) : null}
                                        <div 
                                          className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-sm ring-2 ring-primary/20 flex-shrink-0 ${record.userPhotoURL ? 'hidden' : 'flex'}`}
                                        >
                                          {record.userName?.[0]?.toUpperCase() || "U"}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-medium text-foreground truncate">{record.userName}</p>
                                          <p className="text-xs text-muted-foreground truncate">{record.userEmail}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <p className="text-sm text-foreground">{record.requirementName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <p className="text-sm text-foreground truncate max-w-[200px]" title={record.fileName}>
                                          {record.fileName}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        record.fileType === 'image' 
                                          ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                                          : record.fileType === 'pdf'
                                          ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                                          : 'bg-gray-500/20 text-gray-600 border border-gray-500/30'
                                      }`}>
                                        {record.fileType.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <p className="text-sm text-foreground">
                                          {record.uploadedAtDate.toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                          })}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setPreviewFile(record.fileUrl)
                                            setPreviewFileName(record.fileName)
                                            setPreviewFileType(record.fileType)
                                            setPreviewModalOpen(true)
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                                        >
                                          <Eye className="w-4 h-4" />
                                          <span>Preview</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            // Download function
                                            try {
                                              const base64Data = record.fileUrl
                                              if (!base64Data) {
                                                toast.error("File data not available")
                                                return
                                              }
                                              
                                              // Extract base64 data
                                              const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/s)
                                              if (!base64Match) {
                                                toast.error("Invalid file format")
                                                return
                                              }
                                              
                                              const mimeType = base64Match[1]
                                              const base64String = base64Match[2]
                                              
                                              // Decode base64
                                              const byteCharacters = atob(base64String)
                                              const byteNumbers = new Array(byteCharacters.length)
                                              for (let i = 0; i < byteCharacters.length; i++) {
                                                byteNumbers[i] = byteCharacters.charCodeAt(i)
                                              }
                                              const byteArray = new Uint8Array(byteNumbers)
                                              const blob = new Blob([byteArray], { type: mimeType })
                                              
                                              // Create download link
                                              const url = URL.createObjectURL(blob)
                                              const link = document.createElement('a')
                                              link.href = url
                                              link.download = record.fileName || 'download'
                                              document.body.appendChild(link)
                                              link.click()
                                              document.body.removeChild(link)
                                              URL.revokeObjectURL(url)
                                              
                                              toast.success("File downloaded successfully")
                                            } catch (error) {
                                              console.error("Error downloading file:", error)
                                              toast.error("Failed to download file")
                                            }
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm font-medium"
                                        >
                                          <Download className="w-4 h-4" />
                                          <span>Download</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Mobile Card View - Enhanced */}
                        <div className="md:hidden space-y-4 mb-6">
                          {paginatedRecords.map((record) => (
                            <div
                              key={record.id}
                              className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              {/* Header with Profile Image */}
                              <div className="flex items-start gap-3 mb-4">
                                {record.userPhotoURL ? (
                                  <img
                                    src={record.userPhotoURL}
                                    alt={record.userName}
                                    className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      const fallback = e.target.nextElementSibling
                                      if (fallback) fallback.style.display = 'flex'
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className={`w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-base ring-2 ring-primary/20 flex-shrink-0 ${record.userPhotoURL ? 'hidden' : 'flex'}`}
                                >
                                  {record.userName?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold text-foreground text-base mb-0.5 truncate">
                                        {record.userName}
                                      </h3>
                                      <p className="text-xs text-muted-foreground truncate">{record.userEmail}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                                      record.fileType === 'image' 
                                        ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                                        : record.fileType === 'pdf'
                                        ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                                        : 'bg-gray-500/20 text-gray-600 border border-gray-500/30'
                                    }`}>
                                      {record.fileType.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Details Section */}
                              <div className="bg-background/50 rounded-lg p-3 mb-4 border border-border/50 space-y-2.5">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0 mt-0.5">
                                    <FolderCheck className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Record Name</p>
                                    <p className="text-sm font-medium text-foreground">{record.requirementName}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1.5 bg-blue-500/10 rounded-lg flex-shrink-0 mt-0.5">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">File Name</p>
                                    <p className="text-sm font-medium text-foreground break-words">{record.fileName}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1.5 bg-amber-500/10 rounded-lg flex-shrink-0 mt-0.5">
                                    <Calendar className="w-4 h-4 text-amber-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Upload Date</p>
                                    <p className="text-sm font-medium text-foreground">
                                      {record.uploadedAtDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-3 border-t-2 border-border/50">
                                <button
                                  onClick={() => {
                                    setPreviewFile(record.fileUrl)
                                    setPreviewFileName(record.fileName)
                                    setPreviewFileType(record.fileType)
                                    setPreviewModalOpen(true)
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 active:scale-95 transition-all text-sm font-semibold shadow-sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  onClick={() => {
                                    // Download function
                                    try {
                                      const base64Data = record.fileUrl
                                      if (!base64Data) {
                                        toast.error("File data not available")
                                        return
                                      }
                                      
                                      const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/s)
                                      if (!base64Match) {
                                        toast.error("Invalid file format")
                                        return
                                      }
                                      
                                      const mimeType = base64Match[1]
                                      const base64String = base64Match[2]
                                      const byteCharacters = atob(base64String)
                                      const byteNumbers = new Array(byteCharacters.length)
                                      for (let i = 0; i < byteCharacters.length; i++) {
                                        byteNumbers[i] = byteCharacters.charCodeAt(i)
                                      }
                                      const byteArray = new Uint8Array(byteNumbers)
                                      const blob = new Blob([byteArray], { type: mimeType })
                                      const url = URL.createObjectURL(blob)
                                      const link = document.createElement('a')
                                      link.href = url
                                      link.download = record.fileName || 'download'
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                      URL.revokeObjectURL(url)
                                      toast.success("File downloaded successfully")
                                    } catch (error) {
                                      console.error("Error downloading file:", error)
                                      toast.error("Failed to download file")
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 active:scale-95 transition-all text-sm font-semibold shadow-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-border">
                            <button
                              onClick={() => setRecordsPage(prev => Math.max(1, prev - 1))}
                              disabled={recordsPage === 1}
                              className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Previous</span>
                            </button>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                Page {recordsPage} of {totalPages}
                              </span>
                            </div>

                            <button
                              onClick={() => setRecordsPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={recordsPage === totalPages}
                              className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Records Count */}
                        <div className="mt-4 text-sm text-muted-foreground text-center">
                          Showing {((recordsPage - 1) * RECORDS_PER_PAGE) + 1} to {Math.min(recordsPage * RECORDS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal - Enhanced */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal()
            }
          }}
        >
          <div className="bg-card border border-border rounded-xl sm:rounded-2xl w-full max-w-lg sm:max-w-2xl h-auto max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
            {/* Enhanced Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border backdrop-blur-sm">
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      {editingRequirement ? "Edit Requirement" : "Add New Requirement"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {editingRequirement ? "Update the requirement details" : "Create a new document requirement for students"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
              {/* Requirement Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Requirement Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Barangay Indigency, Certificate of Good Moral Character"
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter a clear and descriptive name for this requirement
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Description <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add detailed instructions or notes for students about this requirement..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all text-sm sm:text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Help students understand what they need to submit
                </p>
              </div>

              {/* Required Toggle */}
              <div className="bg-muted/50 border-2 border-border rounded-xl p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                      formData.required ? 'bg-primary' : 'bg-muted'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 mt-0.5 ${
                        formData.required ? 'translate-x-5' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-foreground block">
                      Required Document
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.required 
                        ? "Students must upload this document to proceed" 
                        : "This document is optional for students"}
                    </p>
                  </div>
                </label>
              </div>

              {/* Sample File Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">
                  Sample PDF File <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </label>
                <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <strong>Note:</strong> If you upload a PDF sample, students will be required to upload scanned images (not PDFs) based on this template. You can set the maximum number of images below.
                </p>
                
                <div className="space-y-3">
                  {/* Preview Section */}
                  {sampleFilePreview ? (
                    <div className="border-2 border-primary/30 rounded-xl p-4 bg-primary/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">New Preview</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSampleFilePreview(null)
                            setFormData({ ...formData, sampleFile: null, sampleFileName: "" })
                          }}
                          className="text-xs text-destructive hover:underline font-medium"
                        >
                          Remove
                        </button>
                      </div>
                      {sampleFilePreview === 'pdf' || (sampleFilePreview && !sampleFilePreview.startsWith('data:image/')) ? (
                        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                          <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{formData.sampleFileName}</p>
                            <p className="text-xs text-muted-foreground">PDF Document - Students will upload scanned images</p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg overflow-hidden border border-border">
                          <img
                            src={sampleFilePreview}
                            alt="Preview"
                            className="w-full max-h-64 object-contain bg-muted"
                          />
                        </div>
                      )}
                    </div>
                  ) : editingRequirement?.sampleFile ? (
                    <div className="border-2 border-border rounded-xl p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Sample</span>
                      </div>
                      {editingRequirement.sampleFile && !editingRequirement.sampleFile.startsWith('data:image/') ? (
                        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                          <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{editingRequirement.sampleFileName}</p>
                            <p className="text-xs text-muted-foreground">PDF Document - Students will upload scanned images</p>
                          </div>
                        </div>
                      ) : editingRequirement.sampleFile ? (
                        <div className="rounded-lg overflow-hidden border border-border">
                          <img
                            src={editingRequirement.sampleFile}
                            alt="Current sample"
                            className="w-full max-h-64 object-contain bg-muted"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  
                  {/* Upload Button */}
                  <label className="flex flex-col sm:flex-row items-center gap-3 px-4 sm:px-6 py-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <span className="text-sm font-semibold text-foreground block">
                        {formData.sampleFile || editingRequirement?.sampleFile ? "Replace Sample File" : "Upload Sample File"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF only (Max 10MB) - Students will upload scanned images
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Max Image Uploads (only shown if PDF sample is uploaded) */}
              {(formData.sampleFile || editingRequirement?.sampleFile) && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Maximum Image Uploads <span className="text-xs font-normal text-muted-foreground">(Required when PDF sample is provided)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxImageUploads}
                    onChange={(e) => setFormData({ ...formData, maxImageUploads: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Set how many scanned images students can upload for this requirement (1-10 images)
                  </p>
                </div>
              )}

              {/* Action Buttons - Enhanced */}
              <div className="sticky bottom-0 bg-card border-t border-border -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 sm:py-5 mt-6 sm:mt-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 sm:px-6 py-3 border-2 border-border rounded-xl hover:bg-muted hover:border-primary/50 transition-all font-medium text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{editingRequirement ? "Update Requirement" : "Add Requirement"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && requirementToDelete && (
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
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Delete Requirement</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">This action cannot be undone</p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-sm sm:text-base text-foreground mb-3">
                    Are you sure you want to delete <span className="font-semibold text-destructive">{requirementToDelete.name}</span>?
                  </p>
                  <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-xs sm:text-sm text-destructive font-medium">
                      ⚠️ Students who have uploaded this document will still have their files, but the requirement will no longer be visible.
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
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Delete Requirement</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false)
          setPreviewFile(null)
          setPreviewFileName(null)
          setPreviewFileType(null)
        }}
        fileUrl={previewFile}
        fileName={previewFileName}
        fileType={previewFileType}
      />
    </AdminLayoutWrapper>
  )
}

