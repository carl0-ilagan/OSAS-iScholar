"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy, where } from "firebase/firestore"
import StudentPageBanner from "@/components/student/page-banner"
import { ClipboardCheck, Upload, FileText, CheckCircle, X, Download, Eye, AlertCircle, ChevronLeft, ChevronRight, Calendar, Sparkles, FolderOpen, Trash2, Edit, Save, FileEdit } from "lucide-react"
import { toast } from "sonner"

function FileUploadField({ label, name, onChange, files, className = "", required = false, sampleFile = null, sampleFileName = "", maxImageUploads = null, isPdfSample = false, onDownloadSample = null }) {
  const fileArray = Array.isArray(files) ? files : (files ? [files] : [])
  const maxFiles = maxImageUploads || 2 // Use maxImageUploads if provided, otherwise default to 2
  const acceptType = isPdfSample ? "image/*" : "image/*,.pdf" // Only images if PDF sample exists
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <label className="block text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
          {fileArray.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({fileArray.length}/{maxFiles} {isPdfSample ? 'image' : 'file'}{fileArray.length > 1 ? 's' : ''})
            </span>
          )}
          {isPdfSample && (
            <span className="ml-2 text-xs text-blue-600 font-medium">
              (Images only - PDF sample provided)
            </span>
          )}
        </label>
        {sampleFile && (
          <button
            onClick={(e) => {
              e.preventDefault()
              if (onDownloadSample) {
                onDownloadSample(sampleFile, sampleFileName)
              } else {
                // Fallback: direct download
                const link = document.createElement('a')
                link.href = sampleFile
                link.download = sampleFileName || 'sample'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
          >
            <Eye className="w-3 h-3" />
            <span>View Sample</span>
          </button>
        )}
      </div>
      <div className="space-y-2">
        {/* File Input */}
      <div className="relative group">
        <div className="relative">
          <input
            type="text"
            readOnly
              value={fileArray.length > 0 ? `${fileArray.length} file${fileArray.length > 1 ? 's' : ''} selected` : "No file chosen"}
            placeholder="No file chosen"
            className={`w-full px-4 py-2.5 pr-28 sm:pr-32 border-2 rounded-lg bg-background text-sm transition-all truncate ${
                fileArray.length > 0
                ? "border-primary/50 bg-primary/5" 
                : "border-border hover:border-primary/50 focus:border-primary"
            }`}
              title={fileArray.map(f => f.name).join(', ')}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 flex-shrink-0 z-10">
              {fileArray.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  const input = document.getElementById(name)
                  if (input) {
                    input.value = ''
                  }
                  onChange({ target: { name, files: null } })
                }}
                className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors flex-shrink-0 bg-background/95 backdrop-blur-sm"
                  title="Remove all files"
              >
                <X className="w-4 h-4 text-destructive" />
              </button>
            )}
            <label
              htmlFor={name}
              className="px-3 sm:px-4 py-2 border border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all cursor-pointer text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 bg-background/95 backdrop-blur-sm"
            >
                Choose File{fileArray.length > 0 ? 's' : ''}
            </label>
            <input
              type="file"
              id={name}
              name={name}
              onChange={onChange}
                accept={acceptType}
                multiple={maxFiles > 1}
              className="hidden"
            />
          </div>
        </div>
        </div>
        
        {/* File List */}
        {fileArray.length > 0 && (
          <div className="space-y-2">
            {fileArray.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const newFiles = fileArray.filter((_, i) => i !== index)
                    onChange({ target: { name, files: newFiles.length === 1 ? newFiles[0] : newFiles } })
                  }}
                  className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors flex-shrink-0"
                  title="Remove file"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentRequirementsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState({})
  const [uploadProgress, setUploadProgress] = useState({})
  const [requirements, setRequirements] = useState([])
  const [studentDocuments, setStudentDocuments] = useState({})
  const [files, setFiles] = useState({}) // Can store single file or array of files (max 2)
  const [userName, setUserName] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedCard, setExpandedCard] = useState(null)
  const [activeTab, setActiveTab] = useState("required")
  const [myRecords, setMyRecords] = useState([])
  const [recordsPage, setRecordsPage] = useState(1)
  const [editingRecords, setEditingRecords] = useState({})
  const [editingFiles, setEditingFiles] = useState({})
  const [tabTransition, setTabTransition] = useState(false)
  const [applicationFormFilled, setApplicationFormFilled] = useState(false)
  const [profileFormFilled, setProfileFormFilled] = useState(false)
  const [replacingRequirement, setReplacingRequirement] = useState(null) // Track which requirement is being replaced
  const ITEMS_PER_PAGE = 10

  // Fetch requirements and student documents
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserName(data.fullName || data.displayName || "Student")
          
          // Check form completion status (same as scholarship apply modal)
          setApplicationFormFilled(data.applicationFormCompleted || false)
          setProfileFormFilled(data.profileFormCompleted || false)
          
          // Also check forms collections as fallback if flags are not set
          if (!data.applicationFormCompleted) {
            try {
              const applicationFormsQuery = query(
                collection(db, "applicationForms"),
                where("userId", "==", user.uid)
              )
              const applicationFormsSnapshot = await getDocs(applicationFormsQuery)
              if (!applicationFormsSnapshot.empty) {
                setApplicationFormFilled(true)
              }
            } catch (error) {
              console.error("Error checking applicationForms collection:", error)
            }
          }
          
          if (!data.profileFormCompleted) {
            try {
              const profileFormsQuery = query(
                collection(db, "studentProfileForms"),
                where("userId", "==", user.uid)
              )
              const profileFormsSnapshot = await getDocs(profileFormsQuery)
              if (!profileFormsSnapshot.empty) {
                setProfileFormFilled(true)
              }
            } catch (error) {
              console.error("Error checking studentProfileForms collection:", error)
            }
          }
        } else {
          setApplicationFormFilled(false)
          setProfileFormFilled(false)
        }

        // Fetch requirements
        let requirementsSnapshot
        try {
          requirementsSnapshot = await getDocs(
            query(collection(db, "documentRequirements"), orderBy("createdAt", "desc"))
          )
        } catch (error) {
          requirementsSnapshot = await getDocs(collection(db, "documentRequirements"))
        }

        // Reconstruct chunked sample files
        const requirementsData = await Promise.all(requirementsSnapshot.docs.map(async (docSnap) => {
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
                  chunksTotalLength: chunks.reduce((sum, chunk) => sum + chunk.length, 0),
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

        // Fetch student documents
        const studentDocsQuery = query(
          collection(db, "studentDocuments"),
          where("userId", "==", user.uid)
        )
        const studentDocsSnapshot = await getDocs(studentDocsQuery)
        
        const documentsMap = {}
        const recordsList = []
        
        console.log("📄 Fetched student documents:", studentDocsSnapshot.docs.length)
        
        // Reconstruct fileUrl from chunks for each document
        for (const docSnap of studentDocsSnapshot.docs) {
          const data = docSnap.data()
          let fileUrl = data.fileUrl || ''
          
          console.log("📄 Processing document:", {
            id: docSnap.id,
            fileName: data.fileName || data.name,
            requirementId: data.requirementId,
            documentName: data.documentName
          })
          
          // If document is chunked, fetch and reconstruct from subcollection
          if (data.isChunked) {
            try {
              let chunksSnapshot
              try {
                const chunksQuery = query(collection(db, "studentDocuments", docSnap.id, "chunks"), orderBy("index"))
                chunksSnapshot = await getDocs(chunksQuery)
              } catch (error) {
                // If orderBy fails, fetch all and sort manually
                chunksSnapshot = await getDocs(collection(db, "studentDocuments", docSnap.id, "chunks"))
              }
              const chunks = chunksSnapshot.docs
                .sort((a, b) => {
                  const indexA = a.data().index ?? parseInt(a.id.split('_')[1] || '0')
                  const indexB = b.data().index ?? parseInt(b.id.split('_')[1] || '0')
                  return indexA - indexB
                })
                .map(chunkDoc => chunkDoc.data().data)
              fileUrl = fileUrl + chunks.join('')
            } catch (error) {
              console.error("Error fetching chunks:", error)
              // Use fileUrl as fallback
            }
          }
          
          const docData = {
            id: docSnap.id,
            fileUrl: fileUrl,
            fileName: data.fileName || data.name || "Document",
            uploadedAt: data.uploadedAt,
            requirementId: data.requirementId,
            documentName: data.documentName || data.name || "Document", // Include documentName if available
          }
          
          // Always add to documentsMap if requirementId exists
          // This ensures documents show up in the "Required Documents" tab
          if (data.requirementId) {
          documentsMap[data.requirementId] = docData
            console.log("✅ Added to documentsMap:", data.requirementId, docData.fileName)
          } else {
            console.warn("⚠️ Document missing requirementId:", docSnap.id, docData.fileName)
          }
          
          // Get requirement name if it still exists
          const requirement = requirementsData.find(r => r.id === data.requirementId)
          recordsList.push({
            ...docData,
            requirementName: requirement?.name || data.documentName || data.name || "Deleted Requirement",
            requirementDescription: requirement?.description || "",
            requirementExists: !!requirement,
          })
        }
        
        console.log("📄 Final documentsMap:", Object.keys(documentsMap))
        console.log("📄 Final recordsList:", recordsList.length)
        
        setStudentDocuments(documentsMap)
        setMyRecords(recordsList.sort((a, b) => {
          const dateA = new Date(a.uploadedAt).getTime()
          const dateB = new Date(b.uploadedAt).getTime()
          return dateB - dateA
        }))
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load requirements")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleFileChange = (e, requirementId) => {
    const { files: fileList } = e.target
    if (fileList && fileList.length > 0) {
      // Get requirement to check if PDF sample exists
      const requirement = requirements.find(r => r.id === requirementId)
      const isPdfSample = requirement?.sampleFile && !requirement.sampleFile.startsWith('data:image/')
      const maxFiles = requirement?.maxImageUploads || 2
      const selectedFiles = Array.from(fileList).slice(0, maxFiles)
      
      if (fileList.length > maxFiles) {
        toast.warning(`Only ${maxFiles} ${isPdfSample ? 'image' : 'file'}${maxFiles > 1 ? 's' : ''} can be uploaded. The first ${maxFiles} ${isPdfSample ? 'image' : 'file'}${maxFiles > 1 ? 's' : ''} will be selected.`, {
          duration: 4000,
        })
      }
      
      // Validate each file
      for (const file of selectedFiles) {
        // If PDF sample exists, only allow images
        if (isPdfSample && !file.type.startsWith('image/')) {
          toast.error(`Only images are allowed for this requirement. Please upload scanned images (JPG, PNG) based on the PDF sample.`, {
            duration: 5000,
          })
          return
        }
        
      // Validate file type
        const validTypes = isPdfSample 
          ? ['image/jpeg', 'image/jpg', 'image/png']
          : ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!validTypes.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}. Please upload ${isPdfSample ? 'JPG or PNG images' : 'JPG, PNG, or PDF files'}.`)
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
          toast.error(`File size too large: ${file.name}. Maximum size is 10MB.`)
        return
      }
      }
      
      // Store as array if multiple files, single file if one
      setFiles(prev => ({ 
        ...prev, 
        [requirementId]: selectedFiles.length === 1 ? selectedFiles[0] : selectedFiles 
      }))
    } else {
      setFiles(prev => {
        const newFiles = { ...prev }
        delete newFiles[requirementId]
        return newFiles
      })
    }
  }

  // Compress image if it's an image file - more aggressive compression for Firestore 1MB limit
  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.6) => {
    return new Promise((resolve) => {
      // If not an image, return original file (PDFs will be handled separately)
      if (!file.type.startsWith('image/')) {
        // For PDFs, we can't compress them, so we'll need to check size
        resolve(file)
        return
      }

      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions - more aggressive resizing
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          // Try to compress with decreasing quality until under 800KB (leaving room for base64 overhead)
          const tryCompress = (currentQuality) => {
            canvas.toBlob(
              (blob) => {
                if (blob && blob.size < 800000) {
                  // Under 800KB, good to go
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  })
                  resolve(compressedFile)
                } else if (currentQuality > 0.3 && blob && blob.size >= 800000) {
                  // Still too large, reduce quality further
                  tryCompress(currentQuality - 0.1)
                } else if (blob) {
                  // Accept what we have
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  })
                  resolve(compressedFile)
                } else {
                  resolve(file)
                }
              },
              file.type,
              currentQuality
            )
          }

          tryCompress(quality)
        }
        img.onerror = () => resolve(file)
      }
      reader.onerror = () => resolve(file)
    })
  }

  // Convert file to base64 with progress
  const fileToBase64 = (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      if (onProgress) {
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentLoaded = Math.round((e.loaded / e.total) * 100)
            onProgress(percentLoaded)
          }
        }
      }
      
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  const handleUpload = async (requirementId) => {
    const fileOrFiles = files[requirementId]
    if (!fileOrFiles) {
      toast.error("Please select a file to upload")
      return
    }

    if (!user?.uid) {
      toast.error("User not authenticated")
      return
    }

    // Convert to array if single file
    const filesToUpload = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles]

    try {
      setUploading(prev => ({ ...prev, [requirementId]: true }))
      setUploadProgress(prev => ({ ...prev, [requirementId]: 0 }))
      
      // Upload each file sequentially
      for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex++) {
        const file = filesToUpload[fileIndex]
        const isLastFile = fileIndex === filesToUpload.length - 1
        
        // Update progress based on file index
        const baseProgress = (fileIndex / filesToUpload.length) * 100
        const fileProgressRange = 100 / filesToUpload.length
        
        if (filesToUpload.length > 1) {
          toast.info(`Uploading file ${fileIndex + 1} of ${filesToUpload.length}: ${file.name}`, { duration: 2000 })
        }
      
      // Compress image if it's an image file
      if (file.type.startsWith('image/')) {
          if (filesToUpload.length === 1) {
        toast.info("Compressing image...", { duration: 1000 })
          }
      }
      const processedFile = await compressImage(file)
      
      // Convert file to base64 with progress
        const fileStartProgress = baseProgress + (fileProgressRange * 0.3)
        setUploadProgress(prev => ({ ...prev, [requirementId]: fileStartProgress }))
      const base64File = await fileToBase64(processedFile, (progress) => {
          // Map progress for this specific file
          const mappedProgress = fileStartProgress + Math.round((progress / 100) * (fileProgressRange * 0.6))
        setUploadProgress(prev => ({ ...prev, [requirementId]: mappedProgress }))
      })
      
      // Check if file needs chunking (Firestore limit is 1MB per document)
      // We'll store in fileUrl if under 900KB, otherwise split into chunks in subcollection
      const CHUNK_SIZE = 900000 // ~900KB per chunk
      let fileUrl = base64File
      let needsChunking = false
      
      if (base64File.length > CHUNK_SIZE) {
        needsChunking = true
        // For now, store first chunk in fileUrl for quick access
        fileUrl = base64File.slice(0, CHUNK_SIZE)
      }
      
      // If file is too large even for chunking (first chunk alone exceeds limit)
      if (fileUrl.length > 1000000) {
          toast.error(`File "${file.name}" is too large. Please compress the file or use a smaller one (under ~750KB original size).`)
          if (isLastFile) {
        setUploading(prev => ({ ...prev, [requirementId]: false }))
          }
          continue // Skip this file and continue with next
      }
      
        const fileEndProgress = baseProgress + (fileProgressRange * 0.9)
        setUploadProgress(prev => ({ ...prev, [requirementId]: fileEndProgress }))
      
        // For multiple files, create unique docId for each file
        const docId = filesToUpload.length > 1 
          ? `${user.uid}_${requirementId}_${fileIndex}_${Date.now()}`
          : (studentDocuments[requirementId]?.id || `${user.uid}_${requirementId}`)
      
      const documentData = {
        userId: user.uid,
        requirementId: requirementId,
        fileUrl: fileUrl,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isChunked: needsChunking,
      }

        // For single file, update existing if it exists. For multiple files, always create new
        if (filesToUpload.length === 1 && studentDocuments[requirementId]) {
        // Update existing document
        await setDoc(doc(db, "studentDocuments", docId), documentData, { merge: true })
        
        // Delete old chunks if they exist
          if (studentDocuments[requirementId].isChunked) {
          const chunksQuery = query(collection(db, "studentDocuments", docId, "chunks"))
          const chunksSnapshot = await getDocs(chunksQuery)
          for (const chunkDoc of chunksSnapshot.docs) {
            await deleteDoc(doc(db, "studentDocuments", docId, "chunks", chunkDoc.id))
          }
        }
      } else {
        // Create new document
        await setDoc(doc(collection(db, "studentDocuments"), docId), documentData)
      }
      
      // Store remaining chunks in subcollection if needed
      if (needsChunking) {
        const chunks = []
        for (let i = CHUNK_SIZE; i < base64File.length; i += CHUNK_SIZE) {
          chunks.push({
            index: Math.floor(i / CHUNK_SIZE),
            data: base64File.slice(i, i + CHUNK_SIZE)
          })
        }
        
        // Store each chunk as a separate document
        for (const chunk of chunks) {
          await setDoc(
            doc(collection(db, "studentDocuments", docId, "chunks"), `chunk_${chunk.index}`),
            { index: chunk.index, data: chunk.data }
          )
        }
      }

      // Update local state - reconstruct full fileUrl for local use
      const newDocData = {
        id: docId,
        fileUrl: base64File, // Store full file for local use
        fileName: file.name,
        uploadedAt: documentData.uploadedAt,
        requirementId: requirementId,
        isChunked: needsChunking,
      }

        // For single file, replace. For multiple files, we'll handle records separately
        if (filesToUpload.length === 1) {
      setStudentDocuments(prev => ({
        ...prev,
        [requirementId]: newDocData,
      }))
        }

      // Update my records
        const requirement = requirements.find(r => r.id === requirementId)
        setMyRecords(prev => {
          const existing = prev.find(r => r.id === docId)
        
        if (existing) {
          return prev.map(r => 
              r.id === docId
              ? {
                  ...r,
                  ...newDocData,
                  requirementName: requirement?.name || r.requirementName,
                  requirementDescription: requirement?.description || r.requirementDescription,
                  requirementExists: !!requirement,
                }
              : r
          )
        } else {
          return [{
            ...newDocData,
            requirementName: requirement?.name || "Unknown Requirement",
            requirementDescription: requirement?.description || "",
            requirementExists: !!requirement,
          }, ...prev]
        }
      })
      } // End of file loop

      setFiles(prev => {
        const newFiles = { ...prev }
        delete newFiles[requirementId]
        return newFiles
      })

      setUploadProgress(prev => ({ ...prev, [requirementId]: 100 }))
      
      toast.success(filesToUpload.length > 1 
        ? `${filesToUpload.length} documents uploaded successfully!`
        : "Document uploaded successfully!", {
        icon: <CheckCircle className="w-4 h-4" />,
      })
    } catch (error) {
      console.error("Error uploading document:", error)
      toast.error("Failed to upload document. Please try again.")
    } finally {
      setUploading(prev => ({ ...prev, [requirementId]: false }))
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[requirementId]
          return newProgress
        })
      }, 500)
    }
  }

  const handleDownloadSample = (sampleFile, sampleFileName) => {
    if (!sampleFile) {
      toast.error("No file available to download")
      return
    }
    
    console.log('⬇️ Download sample initiated:', { 
      fileName: sampleFileName, 
      fileUrl: sampleFile?.substring(0, 50) + '...',
      isBase64: sampleFile?.startsWith('data:'),
      totalLength: sampleFile?.length
    })
    
    try {
      // Always convert base64 to blob for download (like admin side)
      if (sampleFile.startsWith('data:')) {
        // Extract mime type and base64 data
        const dataUrlMatch = sampleFile.match(/^data:([^;]+);base64,(.+)$/s) // Use 's' flag for multiline
        if (!dataUrlMatch) {
          console.error("❌ Invalid base64 format - no match found")
          console.error("Sample file preview:", sampleFile.substring(0, 100))
          toast.error("Invalid file format")
          return
        }
        
        const mimeType = dataUrlMatch[1]
        let base64Data = dataUrlMatch[2]
        
        console.log('📄 Extracted data:', {
          mimeType,
          base64DataLength: base64Data.length,
          base64DataPreview: base64Data.substring(0, 50) + '...' + base64Data.substring(base64Data.length - 20)
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
        
        console.log('⬇️ Converting base64 for download:', { 
          mimeType, 
          base64Length: base64Data.length, 
          fileName: sampleFileName,
          isValidBase64,
          firstChars: base64Data.substring(0, 20),
          lastChars: base64Data.substring(base64Data.length - 20)
        })
        
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
          
          console.log('✅ Blob created for download:', { 
            blobSize: blob.size, 
            blobType: blob.type,
            originalFileName: sampleFileName,
            expectedSize: Math.ceil(base64Data.length * 3 / 4),
            sizeMatch: Math.abs(blob.size - Math.ceil(base64Data.length * 3 / 4)) < 100
          })
          
          // Warn if blob size doesn't match expected size (might indicate corruption)
          const expectedSize = Math.ceil(base64Data.length * 3 / 4)
          if (Math.abs(blob.size - expectedSize) > 100) {
            console.warn("⚠️ Blob size doesn't match expected size. File might be incomplete or corrupted.")
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
          
          return
        } catch (err) {
          console.error("❌ Error converting base64 for download:", err)
          toast.error(`Download failed: ${err.message}. Please try again.`)
          return
        }
      }
      
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
    } catch (error) {
      console.error("❌ Error downloading sample file:", error)
      toast.error("Failed to download file. Please try again.")
    }
  }

  const handleDownloadDocument = (fileUrl, fileName) => {
    if (!fileUrl) {
      toast.error("No file available to download")
      return
    }
    
    console.log('⬇️ Download document initiated:', { 
      fileName, 
      fileUrl: fileUrl?.substring(0, 50) + '...',
      isBase64: fileUrl?.startsWith('data:'),
      totalLength: fileUrl?.length
    })
    
    try {
      // Always convert base64 to blob for download (like admin side)
      if (fileUrl.startsWith('data:')) {
        // Extract mime type and base64 data
        const dataUrlMatch = fileUrl.match(/^data:([^;]+);base64,(.+)$/s)
        if (!dataUrlMatch) {
          console.error("❌ Invalid base64 format - no match found")
          toast.error("Invalid file format")
          return
        }
        
        const mimeType = dataUrlMatch[1]
        let base64Data = dataUrlMatch[2]
        
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
            originalFileName: fileName,
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
              difference: sizeDifference
            })
            toast.warning("File size mismatch detected. The file might be incomplete.", {
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
          
          // Use the actual file name
          let downloadName = fileName || 'document'
          
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
        link.href = fileUrl
        link.download = fileName || 'document'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success("File downloaded successfully", {
          icon: <CheckCircle className="w-4 h-4" />,
        })
      }
    } catch (error) {
      console.error("❌ Error downloading document:", error)
      toast.error("Failed to download file. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <StudentPageBanner
        icon={ClipboardCheck}
        title="Document Requirements"
        description="Upload required documents and view your submissions"
        userName={userName}
      />
      
      <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Document Requirements</h1>
          <p className="text-muted-foreground">Upload the required documents as specified by the administration</p>
        </div>

        {/* Tab Controls - Enhanced for Desktop */}
        <div className="relative mb-6">
          <div className="flex gap-1 md:gap-2 border-b-2 border-border relative bg-card/50 backdrop-blur-sm rounded-t-lg p-1 md:p-0">
            <button
              onClick={() => {
                if (activeTab !== "required") {
                  setTabTransition(true)
                  setTimeout(() => {
                    setActiveTab("required")
                    setCurrentPage(1)
                    setTimeout(() => setTabTransition(false), 300)
                  }, 50)
                }
              }}
              className={`px-4 md:px-8 py-2.5 md:py-3.5 font-semibold transition-all duration-300 relative z-10 rounded-t-lg md:rounded-t-xl ${
                activeTab === "required"
                  ? "text-primary bg-primary/10 shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <ClipboardCheck className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${activeTab === "required" ? "scale-110 rotate-3 text-primary" : ""}`} />
                <span className="text-sm md:text-base">Required Documents</span>
                {requirements.filter(r => r.required && !studentDocuments[r.id]).length > 0 && (
                  <span className={`px-2 py-0.5 md:px-2.5 md:py-1 bg-red-500/20 text-red-600 rounded-full text-xs font-semibold transition-all duration-300 ${
                    activeTab === "required" ? "scale-110 animate-pulse" : ""
                  }`}>
                    {requirements.filter(r => r.required && !studentDocuments[r.id]).length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                if (activeTab !== "records") {
                  setTabTransition(true)
                  setTimeout(() => {
                    setActiveTab("records")
                    setRecordsPage(1)
                    setTimeout(() => setTabTransition(false), 300)
                  }, 50)
                }
              }}
              className={`px-4 md:px-8 py-2.5 md:py-3.5 font-semibold transition-all duration-300 relative z-10 rounded-t-lg md:rounded-t-xl ${
                activeTab === "records"
                  ? "text-primary bg-primary/10 shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <FolderOpen className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${activeTab === "records" ? "scale-110 rotate-3 text-primary" : ""}`} />
                <span className="text-sm md:text-base">My Records</span>
                {myRecords.length > 0 && (
                  <span className={`px-2 py-0.5 md:px-2.5 md:py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold transition-all duration-300 ${
                    activeTab === "records" ? "scale-110 animate-pulse" : ""
                  }`}>
                    {myRecords.length}
                  </span>
                )}
              </div>
            </button>
            {/* Animated underline indicator */}
            <div 
              className="absolute bottom-0 h-1 md:h-1.5 bg-gradient-to-r from-primary via-secondary to-primary transition-all duration-500 ease-in-out rounded-t-full animate-pulse"
              style={{
                width: activeTab === "required" ? "calc(50% - 8px)" : "calc(50% - 8px)",
                left: activeTab === "required" ? "4px" : "calc(50% + 4px)",
              }}
            />
          </div>
        </div>

        {/* Required Documents Tab */}
        <div className={`transition-all duration-300 ${tabTransition ? "opacity-0 transform translate-y-2" : "opacity-100 transform translate-y-0"}`}>
        {activeTab === "required" && (
          <>
            {/* Forms Status Section */}
            <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-border rounded-xl p-5 sm:p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
                  <FileEdit className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Required Forms</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Application Form */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  applicationFormFilled
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-yellow-500/30 bg-yellow-500/5'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        applicationFormFilled
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-yellow-500/20 text-yellow-600'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Application Form</p>
                        <p className="text-xs text-muted-foreground">
                          {applicationFormFilled ? 'Already filled up' : 'Not yet filled'}
                        </p>
                      </div>
                    </div>
                    {applicationFormFilled ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Filled</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push('/student/application-form')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <FileEdit className="w-4 h-4" />
                        Fill Up
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile Form */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  profileFormFilled
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-yellow-500/30 bg-yellow-500/5'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        profileFormFilled
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-yellow-500/20 text-yellow-600'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Student Profile Form</p>
                        <p className="text-xs text-muted-foreground">
                          {profileFormFilled ? 'Already filled up' : 'Not yet filled'}
                        </p>
                      </div>
                    </div>
                    {profileFormFilled ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Filled</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push('/student/profile-form')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <FileEdit className="w-4 h-4" />
                        Fill Up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {requirements.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No requirements available at this time</p>
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
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {requirements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((requirement) => {
              const uploadedDoc = studentDocuments[requirement.id]
              const hasFile = files[requirement.id]
              const isUploading = uploading[requirement.id]
              const isExpanded = expandedCard === requirement.id

              return (
                <div 
                  key={requirement.id} 
                  className={`bg-gradient-to-br from-card via-card to-primary/5 border-2 border-border rounded-xl p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                    uploadedDoc 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : requirement.required 
                      ? 'border-red-500/30 bg-red-500/5' 
                      : 'border-blue-500/30 bg-blue-500/5'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
                          <ClipboardCheck className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-foreground flex-1 min-w-0">{requirement.name}</h2>
                        {requirement.required && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 border border-red-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Required
                          </span>
                        )}
                        {!requirement.required && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 border border-blue-500/30">
                            Optional
                          </span>
                        )}
                      </div>
                      {requirement.description && (
                        <p className={`text-sm text-muted-foreground transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {requirement.description}
                        </p>
                      )}
                      {requirement.description && requirement.description.length > 100 && (
                        <button
                          onClick={() => setExpandedCard(isExpanded ? null : requirement.id)}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  </div>

                  {uploadedDoc ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-500/10 to-primary/10 border-2 border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-green-500/20 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <span className="font-semibold text-foreground">Document Uploaded</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4 p-3 bg-background rounded-lg border border-border">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate flex-1">{uploadedDoc.fileName}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => {
                              handleDownloadDocument(uploadedDoc.fileUrl, uploadedDoc.fileName)
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => {
                              // Show the replace file upload field
                              setReplacingRequirement(requirement.id)
                              // Clear any existing file selection
                              setFiles(prev => ({ ...prev, [requirement.id]: null }))
                              // Reset file input
                              const input = document.getElementById(`file-replace-${requirement.id}`)
                              if (input) input.value = ''
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all font-medium"
                          >
                            <Upload className="w-4 h-4 flex-shrink-0" />
                            <span>Replace</span>
                          </button>
                        </div>
                        {uploadedDoc.uploadedAt && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                            <Calendar className="w-3 h-3" />
                            <span>Uploaded: {new Date(uploadedDoc.uploadedAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requirement.sampleFile && (
                        <div className={`rounded-lg p-3 mb-3 border ${
                          requirement.sampleFile.startsWith('data:image/')
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-green-500/10 border-green-500/30'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className={`w-4 h-4 ${requirement.sampleFile.startsWith('data:image/') ? 'text-blue-600' : 'text-green-600'}`} />
                            <span className={`text-xs font-semibold ${requirement.sampleFile.startsWith('data:image/') ? 'text-blue-600' : 'text-green-600'}`}>
                              {requirement.sampleFile.startsWith('data:image/') ? 'Sample Available' : 'PDF Template Available'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <button
                              onClick={() => handleDownloadSample(requirement.sampleFile, requirement.sampleFileName)}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                              <Download className="w-4 h-4" />
                              <span>Download {requirement.sampleFile.startsWith('data:image/') ? 'Sample' : 'PDF Template'}</span>
                            </button>
                            {!requirement.sampleFile.startsWith('data:image/') && (
                              <p className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded border border-border">
                                <strong>Note:</strong> Please upload scanned images (JPG/PNG) based on this PDF template. Maximum {requirement.maxImageUploads || 1} image{requirement.maxImageUploads > 1 ? 's' : ''} allowed.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {!uploadedDoc ? (
                        <>
                          <FileUploadField
                            label={requirement.name}
                            name={`file-${requirement.id}`}
                            onChange={(e) => handleFileChange(e, requirement.id)}
                            files={hasFile}
                            required={requirement.required}
                            sampleFile={requirement.sampleFile}
                            sampleFileName={requirement.sampleFileName}
                            maxImageUploads={requirement.maxImageUploads}
                            isPdfSample={requirement.sampleFile && !requirement.sampleFile.startsWith('data:image/')}
                            onDownloadSample={handleDownloadSample}
                          />
                          <button
                            onClick={() => handleUpload(requirement.id)}
                            disabled={!hasFile || isUploading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium relative overflow-hidden"
                          >
                            {isUploading ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Uploading... {uploadProgress[requirement.id] || 0}%</span>
                                </div>
                                {/* Progress bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                  <div 
                                    className="h-full bg-white transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress[requirement.id] || 0}%` }}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 flex-shrink-0" />
                                <span>Upload Document</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 border-2 border-green-500/30 rounded-lg font-medium text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Already Uploaded</span>
                        </div>
                      )}
                       {!uploadedDoc && (
                         <p className="text-xs text-muted-foreground text-center">
                           {requirement.sampleFile && !requirement.sampleFile.startsWith('data:image/')
                             ? `Accepted formats: JPG, PNG images only (Max ${requirement.maxImageUploads || 1} image${requirement.maxImageUploads > 1 ? 's' : ''}, 10MB each - will be compressed)`
                             : 'Accepted formats: JPG, PNG, PDF (Max 10MB - will be compressed to fit Firestore limit)'}
                         </p>
                       )}
                    </div>
                  )}

                  {/* Replace file section when document is already uploaded */}
                  {uploadedDoc && replacingRequirement === requirement.id && (
                    <div className="mt-4 pt-4 border-t-2 border-border">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">Replace Document</p>
                        <button
                          onClick={() => {
                            setReplacingRequirement(null)
                            setFiles(prev => {
                              const newFiles = { ...prev }
                              delete newFiles[requirement.id]
                              return newFiles
                            })
                            const input = document.getElementById(`file-replace-${requirement.id}`)
                            if (input) input.value = ''
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <FileUploadField
                        label="Upload new file"
                        name={`file-replace-${requirement.id}`}
                        onChange={(e) => handleFileChange(e, requirement.id)}
                        files={files[requirement.id]}
                        maxImageUploads={requirement.maxImageUploads}
                        isPdfSample={requirement.sampleFile && !requirement.sampleFile.startsWith('data:image/')}
                        sampleFile={requirement.sampleFile}
                        sampleFileName={requirement.sampleFileName}
                        onDownloadSample={handleDownloadSample}
                      />
                      <button
                        onClick={() => {
                          handleUpload(requirement.id).then(() => {
                            // Hide replace section after successful upload
                            setReplacingRequirement(null)
                          })
                        }}
                        disabled={!files[requirement.id] || isUploading}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium relative overflow-hidden"
                      >
                        {isUploading ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Uploading... {uploadProgress[requirement.id] || 0}%</span>
                            </div>
                            {/* Progress bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                              <div 
                                className="h-full bg-white transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress[requirement.id] || 0}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 flex-shrink-0" />
                            <span>Replace Document</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            </div>

            {/* Pagination */}
            {requirements.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
        </>
      )}
        </div>

        {/* My Records Tab */}
        <div className={`transition-all duration-300 ${tabTransition ? "opacity-0 transform translate-y-2" : "opacity-100 transform translate-y-0"}`}>
        {activeTab === "records" && (
          <>
            {myRecords.length === 0 ? (
              <div className="bg-card border-2 border-border rounded-xl p-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No records found</p>
                <p className="text-sm text-muted-foreground mt-1">You haven't uploaded any documents yet</p>
              </div>
            ) : (
              <>
                {/* Pagination Info */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((recordsPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(recordsPage * ITEMS_PER_PAGE, myRecords.length)} of {myRecords.length} records
                  </p>
                </div>

                {/* Records Grid */}
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {myRecords.slice((recordsPage - 1) * ITEMS_PER_PAGE, recordsPage * ITEMS_PER_PAGE).map((record) => {
                    const requirement = requirements.find(r => r.id === record.requirementId)
                    
                    return (
                      <div
                        key={record.id}
                        className={`bg-gradient-to-br from-card via-card to-primary/5 border-2 border-border rounded-xl p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                          record.requirementExists
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-orange-500/30 bg-orange-500/5'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
                                <FolderOpen className="w-4 h-4 text-white" />
                              </div>
                              <h2 className="text-lg sm:text-xl font-bold text-foreground flex-1 min-w-0">{record.requirementName}</h2>
                              {!record.requirementExists && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-600 border border-orange-500/30">
                                  Deleted
                                </span>
                              )}
                            </div>
                            {record.requirementDescription && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{record.requirementDescription}</p>
                            )}
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30 rounded-xl p-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                            <span className="font-semibold text-foreground truncate flex-1">{record.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Calendar className="w-3 h-3" />
                            <span>Uploaded: {new Date(record.uploadedAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>

                          {/* Actions */}
                          {!editingRecords[record.id] ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => {
                                  handleDownloadDocument(record.fileUrl, record.fileName)
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-md hover:shadow-lg font-medium"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                              <button
                                onClick={() => setEditingRecords(prev => ({ ...prev, [record.id]: true }))}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all font-medium"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Update</span>
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to delete "${record.fileName}"? This action cannot be undone.`)) {
                                    return
                                  }
                                  
                                  try {
                                    await deleteDoc(doc(db, "studentDocuments", record.id))
                                    setMyRecords(prev => prev.filter(r => r.id !== record.id))
                                    setStudentDocuments(prev => {
                                      const newDocs = { ...prev }
                                      delete newDocs[record.requirementId]
                                      return newDocs
                                    })
                                    toast.success("Record deleted successfully!", {
                                      icon: <CheckCircle className="w-4 h-4" />,
                                    })
                                  } catch (error) {
                                    console.error("Error deleting record:", error)
                                    toast.error("Failed to delete record. Please try again.")
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-destructive/30 rounded-lg hover:bg-destructive/10 hover:border-destructive/50 transition-all font-medium text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <FileUploadField
                                label="Upload new file"
                                name={`edit-${record.id}`}
                                onChange={(e) => {
                                  const fileList = e.target.files
                                  if (fileList && fileList.length > 0) {
                                    const file = fileList[0]
                                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
                                    if (!validTypes.includes(file.type)) {
                                      toast.error("Please upload a valid file (JPG, PNG, or PDF)")
                                      return
                                    }
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast.error("File size must be less than 10MB")
                                      return
                                    }
                                    setEditingFiles(prev => ({ ...prev, [record.id]: file }))
                                  }
                                }}
                                file={editingFiles[record.id]}
                                sampleFile={requirement?.sampleFile}
                                sampleFileName={requirement?.sampleFileName}
                                maxImageUploads={requirement?.maxImageUploads}
                                isPdfSample={requirement?.sampleFile && !requirement.sampleFile.startsWith('data:image/')}
                                onDownloadSample={handleDownloadSample}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const editingFile = editingFiles[record.id]
                                    if (!editingFile) {
                                      toast.error("Please select a file to upload")
                                      return
                                    }
                                    
                                    try {
                                      // Compress image if it's an image file
                                      const processedFile = await compressImage(editingFile)
                                      const base64File = await fileToBase64(processedFile)
                                      await setDoc(doc(db, "studentDocuments", record.id), {
                                        ...record,
                                        fileUrl: base64File,
                                        fileName: editingFile.name,
                                        uploadedAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                      }, { merge: true })
                                      
                                      setMyRecords(prev => prev.map(r => 
                                        r.id === record.id 
                                          ? { ...r, fileUrl: base64File, fileName: editingFile.name, uploadedAt: new Date().toISOString() }
                                          : r
                                      ))
                                      setStudentDocuments(prev => ({
                                        ...prev,
                                        [record.requirementId]: {
                                          ...prev[record.requirementId],
                                          fileUrl: base64File,
                                          fileName: editingFile.name,
                                        }
                                      }))
                                      
                                      setEditingFiles(prev => {
                                        const newFiles = { ...prev }
                                        delete newFiles[record.id]
                                        return newFiles
                                      })
                                      setEditingRecords(prev => {
                                        const newEditing = { ...prev }
                                        delete newEditing[record.id]
                                        return newEditing
                                      })
                                      const input = document.getElementById(`edit-${record.id}`)
                                      if (input) input.value = ''
                                      
                                      toast.success("Record updated successfully!", {
                                        icon: <CheckCircle className="w-4 h-4" />,
                                      })
                                    } catch (error) {
                                      console.error("Error updating record:", error)
                                      toast.error("Failed to update record. Please try again.")
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all font-medium"
                                >
                                  <Save className="w-4 h-4" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRecords(prev => {
                                      const newEditing = { ...prev }
                                      delete newEditing[record.id]
                                      return newEditing
                                    })
                                    setEditingFiles(prev => {
                                      const newFiles = { ...prev }
                                      delete newFiles[record.id]
                                      return newFiles
                                    })
                                    const input = document.getElementById(`edit-${record.id}`)
                                    if (input) input.value = ''
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-border rounded-lg hover:bg-muted transition-all font-medium"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination for Records */}
                {myRecords.length > ITEMS_PER_PAGE && (
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
                      {Array.from({ length: Math.ceil(myRecords.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === Math.ceil(myRecords.length / ITEMS_PER_PAGE) ||
                          (page >= recordsPage - 1 && page <= recordsPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setRecordsPage(page)}
                              className={`px-3 py-2 rounded-lg transition-all font-medium ${
                                recordsPage === page
                                  ? 'bg-primary text-white shadow-lg'
                                  : 'border-2 border-border hover:bg-muted hover:border-primary/50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        } else if (page === recordsPage - 2 || page === recordsPage + 2) {
                          return <span key={page} className="px-2 text-muted-foreground">...</span>
                        }
                        return null
                      })}
                    </div>

                    <button
                      onClick={() => setRecordsPage(prev => Math.min(Math.ceil(myRecords.length / ITEMS_PER_PAGE), prev + 1))}
                      disabled={recordsPage === Math.ceil(myRecords.length / ITEMS_PER_PAGE)}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
        </div>
      </div>
    </>
  )
}

