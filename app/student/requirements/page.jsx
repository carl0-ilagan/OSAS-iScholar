"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy, where } from "firebase/firestore"
import { ClipboardCheck, Upload, FileText, CheckCircle, X, Download, Eye, AlertCircle, ChevronLeft, ChevronRight, Calendar, Sparkles, FolderOpen, Trash2, Edit, Save, FileEdit } from "lucide-react"
import { toast } from "sonner"
import DocumentPreviewModal from "@/components/admin/document-preview-modal"
import { normalizeCampus } from "@/lib/campus-admin-config"

function FileUploadField({ label, name, onChange, files, className = "", required = false, sampleFile = null, sampleFileName = "", maxImageUploads = null, isPdfSample = false, onViewSample = null, onDownloadSample = null }) {
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
            <span className="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              (Images only — PDF sample provided)
            </span>
          )}
        </label>
        {sampleFile && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              if (onViewSample) {
                onViewSample(sampleFile, sampleFileName)
              } else if (onDownloadSample) {
                onDownloadSample(sampleFile, sampleFileName)
              } else {
                // Fallback: open in new tab when possible (avoid forced download)
                if (sampleFile.startsWith('http://') || sampleFile.startsWith('https://')) {
                  window.open(sampleFile, '_blank', 'noopener,noreferrer')
                } else if (sampleFile.startsWith('data:')) {
                  window.open(sampleFile, '_blank', 'noopener,noreferrer')
                } else {
                  const link = document.createElement('a')
                  link.href = sampleFile
                  link.download = sampleFileName || 'sample'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }
              }
            }}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
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
            className={`w-full truncate rounded-xl border-2 bg-background px-4 py-2.5 pr-28 text-sm transition-all sm:pr-32 ${
                fileArray.length > 0
                ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30"
                : "border-border hover:border-emerald-400/50 focus:border-emerald-500"
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
              className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-emerald-200/70 bg-white px-3 py-2 text-xs font-medium backdrop-blur-sm transition-all hover:border-emerald-400/60 hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/70 sm:px-4 sm:text-sm"
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
              <div key={index} className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/40 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/25">
                <FileText className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
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
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewFileName, setPreviewFileName] = useState(null)
  const [previewFileType, setPreviewFileType] = useState(null)
  const [userCampus, setUserCampus] = useState(null)
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
          const resolvedCampus = normalizeCampus(data.campus || user?.campus || null)
          setUserCampus(resolvedCampus)

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
          setUserCampus(normalizeCampus(user?.campus || null))
          setApplicationFormFilled(false)
          setProfileFormFilled(false)
        }

        // Fetch requirements
        const studentCampus = normalizeCampus((userDoc.exists() ? userDoc.data()?.campus : user?.campus) || userCampus || null)
        let requirementsSnapshot
        if (!studentCampus) {
          requirementsSnapshot = { docs: [] }
        } else {
          try {
            requirementsSnapshot = await getDocs(query(
              collection(db, "documentRequirements"),
              where("campus", "==", studentCampus),
              orderBy("createdAt", "desc"),
            ))
          } catch (error) {
            requirementsSnapshot = await getDocs(query(
              collection(db, "documentRequirements"),
              where("campus", "==", studentCampus),
            ))
          }
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

  // Compress image if needed; keep uploads fast for already-small files.
  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.6) => {
    return new Promise((resolve) => {
      // If not an image, return original file (PDFs will be handled separately)
      if (!file.type.startsWith('image/')) {
        // For PDFs, we can't compress them, so we'll need to check size
        resolve(file)
        return
      }
      // Small images are already fine; skip expensive canvas pipeline.
      if (file.size <= 350000) {
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

          // Keep attempts limited so large images don't stall uploads.
          const tryCompress = (currentQuality, attemptsLeft = 2) => {
            canvas.toBlob(
              (blob) => {
                if (blob && blob.size < 800000) {
                  // Under 800KB, good to go
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  })
                  resolve(compressedFile)
                } else if (attemptsLeft > 0 && currentQuality > 0.3 && blob && blob.size >= 800000) {
                  // Still too large, reduce quality further
                  tryCompress(currentQuality - 0.12, attemptsLeft - 1)
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
        campus: normalizeCampus(userCampus || user?.campus || null),
        requirementId: requirementId,
        fileUrl: fileUrl,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isChunked: needsChunking,
      }

        // For single-file requirements, always clear previous chunk docs to avoid stale/invalid reconstruction.
        if (filesToUpload.length === 1) {
          const chunksQuery = query(collection(db, "studentDocuments", docId, "chunks"))
          const chunksSnapshot = await getDocs(chunksQuery)
          await Promise.all(
            chunksSnapshot.docs.map((chunkDoc) =>
              deleteDoc(doc(db, "studentDocuments", docId, "chunks", chunkDoc.id)),
            ),
          )
          await setDoc(doc(db, "studentDocuments", docId), documentData, { merge: true })
        } else {
        // Create new document
        await setDoc(doc(collection(db, "studentDocuments"), docId), documentData)
      }
      // Document metadata saved; continue with chunk writes/finalization.
      const afterDocProgress = baseProgress + (fileProgressRange * 0.92)
      setUploadProgress(prev => ({ ...prev, [requirementId]: afterDocProgress }))
      
      // Store remaining chunks in subcollection if needed
      if (needsChunking) {
        const chunks = []
        for (let i = CHUNK_SIZE; i < base64File.length; i += CHUNK_SIZE) {
          chunks.push({
            index: Math.floor(i / CHUNK_SIZE),
            data: base64File.slice(i, i + CHUNK_SIZE)
          })
        }

        if (chunks.length > 0) {
          // Upload chunks in small parallel batches and keep progress moving (90 -> 99).
          const chunkProgressStart = baseProgress + (fileProgressRange * 0.92)
          const chunkProgressEnd = baseProgress + (fileProgressRange * 0.99)
          const concurrency = 4
          let completedChunks = 0

          for (let i = 0; i < chunks.length; i += concurrency) {
            const batch = chunks.slice(i, i + concurrency)
            await Promise.all(
              batch.map(async (chunk) => {
                await setDoc(
                  doc(collection(db, "studentDocuments", docId, "chunks"), `chunk_${chunk.index}`),
                  { index: chunk.index, data: chunk.data },
                )
                completedChunks += 1
                const chunkProgress =
                  chunkProgressStart +
                  Math.round((completedChunks / chunks.length) * (chunkProgressEnd - chunkProgressStart))
                setUploadProgress(prev => ({ ...prev, [requirementId]: chunkProgress }))
              }),
            )
          }
        }
      } else {
        // Non-chunked files should quickly show near-complete before final state updates.
        const finalizeProgress = baseProgress + (fileProgressRange * 0.99)
        setUploadProgress(prev => ({ ...prev, [requirementId]: finalizeProgress }))
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

      // Best-effort email notification to account email (not secondary email).
      try {
        const requirement = requirements.find((r) => r.id === requirementId)
        const accountEmail = String(user?.email || "").trim()
        const studentName = user?.fullName || user?.displayName || accountEmail || "Student"
        const campusLabel = normalizeCampus(userCampus || user?.campus || null) || "N/A"
        if (accountEmail) {
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: accountEmail,
              subject: `Document Uploaded Successfully (${campusLabel}) - MOCAS`,
              html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8" /></head>
                <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="margin: 0 0 12px;">Document upload confirmation</h2>
                    <p>Hi ${studentName},</p>
                    <p>Your document upload was received successfully.</p>
                    <p><strong>Requirement:</strong> ${requirement?.name || "Required Document"}</p>
                    <p><strong>Campus:</strong> ${campusLabel}</p>
                    <p><strong>Files uploaded:</strong> ${filesToUpload.length}</p>
                    <p>Best regards,<br/>MOCAS Team</p>
                  </div>
                </body>
                </html>
              `,
            }),
          }).catch((sendErr) => {
            console.error("Failed to send upload confirmation email:", sendErr)
          })
        }
      } catch (emailError) {
        console.error("Failed to send upload confirmation email:", emailError)
      }
      
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

  /** Same behavior as admin requirements: preview PDF/image in modal, not download */
  const handleViewSample = (sampleFile, sampleFileName) => {
    if (!sampleFile) {
      toast.error("No sample file available")
      return
    }
    const isImage = sampleFile.startsWith("data:image/")
    const isPdf =
      sampleFile.startsWith("data:application/pdf") || sampleFileName?.toLowerCase().endsWith(".pdf")

    if (isImage) {
      setPreviewFile(sampleFile)
      setPreviewFileName(sampleFileName)
      setPreviewFileType("image")
      setPreviewModalOpen(true)
    } else if (isPdf) {
      setPreviewFile(sampleFile)
      setPreviewFileName(sampleFileName)
      setPreviewFileType("pdf")
      setPreviewModalOpen(true)
    } else {
      window.open(sampleFile, "_blank", "noopener,noreferrer")
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
      <div className="space-y-8 py-2">
        <div className="animate-pulse space-y-4 rounded-2xl border border-emerald-200/30 bg-white/60 p-8 dark:border-emerald-900/40 dark:bg-card/40">
          <div className="h-4 w-32 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50" />
          <div className="h-10 max-w-md rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50" />
          <div className="h-4 max-w-lg rounded bg-muted" />
        </div>
        <div className="h-12 rounded-xl border border-emerald-200/30 bg-muted/40" />
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-card/50"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 py-2 md:py-3">
        {/* Hero — same family as dashboard / apply */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Compliance & uploads
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl">
              Document requirements
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-900/75 dark:text-emerald-200/85 sm:text-base">
              Complete the required forms and upload documents so OSAS can verify your records.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative">
          <div className="flex gap-1 rounded-2xl border border-emerald-200/50 bg-emerald-50/40 p-1.5 shadow-sm ring-1 ring-black/[0.03] dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:ring-white/5">
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
              className={`relative z-10 flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 md:px-4 ${
                activeTab === "required"
                  ? "bg-white text-emerald-900 shadow-md dark:bg-emerald-900/80 dark:text-emerald-50"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-emerald-950/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ClipboardCheck
                  className={`h-4 w-4 ${activeTab === "required" ? "text-emerald-600 dark:text-emerald-300" : ""}`}
                />
                <span>Required</span>
                {requirements.filter((r) => r.required && !studentDocuments[r.id]).length > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                    {requirements.filter((r) => r.required && !studentDocuments[r.id]).length}
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
              className={`relative z-10 flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 md:px-4 ${
                activeTab === "records"
                  ? "bg-white text-emerald-900 shadow-md dark:bg-emerald-900/80 dark:text-emerald-50"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-emerald-950/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FolderOpen className={`h-4 w-4 ${activeTab === "records" ? "text-emerald-600 dark:text-emerald-300" : ""}`} />
                <span>My records</span>
                {myRecords.length > 0 && (
                  <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {myRecords.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Required Documents Tab */}
        <div className={`transition-all duration-300 ${tabTransition ? "opacity-0 transform translate-y-2" : "opacity-100 transform translate-y-0"}`}>
        {activeTab === "required" && (
          <>
            {/* Required forms — mini cards */}
            <div className="rounded-2xl border border-emerald-200/50 bg-card/90 p-5 shadow-sm ring-1 ring-black/[0.03] dark:border-emerald-900/40 dark:bg-card/95">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
                  <FileEdit className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Required forms</h3>
                  <p className="text-xs text-muted-foreground">Finish these before submitting documents</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className={`rounded-xl border p-4 transition-all ${
                    applicationFormFilled
                      ? "border-emerald-400/40 bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-card"
                      : "border-amber-300/45 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-900/40 dark:from-amber-950/25"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-xl p-2.5 ${
                          applicationFormFilled
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-800 dark:text-amber-400"
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Application form</p>
                        <p className="text-xs text-muted-foreground">
                          {applicationFormFilled ? "Completed" : "Not filled yet"}
                        </p>
                      </div>
                    </div>
                    {applicationFormFilled ? (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-semibold">Done</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push("/student/application-form")}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700"
                      >
                        <FileEdit className="h-4 w-4" />
                        Fill up
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-4 transition-all ${
                    profileFormFilled
                      ? "border-emerald-400/40 bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-card"
                      : "border-amber-300/45 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-900/40 dark:from-amber-950/25"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-xl p-2.5 ${
                          profileFormFilled
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-800 dark:text-amber-400"
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Student profile form</p>
                        <p className="text-xs text-muted-foreground">
                          {profileFormFilled ? "Completed" : "Not filled yet"}
                        </p>
                      </div>
                    </div>
                    {profileFormFilled ? (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-semibold">Done</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push("/student/profile-form")}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700"
                      >
                        <FileEdit className="h-4 w-4" />
                        Fill up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {requirements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/30 py-16 text-center dark:border-emerald-800/50 dark:bg-emerald-950/20">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-emerald-950/80">
              <ClipboardCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-medium text-foreground">No document requirements yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Check back later for updates from OSAS</p>
          </div>
        ) : (
          <>
            {/* Pagination Info */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, requirements.length)}
                </span>{" "}
                of {requirements.length}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              {requirements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((requirement) => {
              const uploadedDoc = studentDocuments[requirement.id]
              const hasFile = files[requirement.id]
              const isUploading = uploading[requirement.id]
              const isExpanded = expandedCard === requirement.id

              return (
                <div
                  key={requirement.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-card/95 p-5 shadow-sm ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/[0.06] ${
                    uploadedDoc
                      ? "border-emerald-400/45 bg-gradient-to-b from-emerald-50/50 to-card dark:from-emerald-950/30"
                      : requirement.required
                      ? "border-rose-300/50 bg-gradient-to-b from-rose-50/40 to-card dark:border-rose-900/40 dark:from-rose-950/20"
                      : "border-teal-300/40 bg-gradient-to-b from-teal-50/35 to-card dark:border-teal-900/35 dark:from-teal-950/20"
                  }`}
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                      uploadedDoc
                        ? "from-emerald-500 to-teal-500"
                        : requirement.required
                        ? "from-rose-500 to-orange-400"
                        : "from-teal-500 to-cyan-500"
                    }`}
                    aria-hidden
                  />
                  <div className="mb-4 flex items-start justify-between pt-1">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <div className="rounded-xl bg-emerald-500/15 p-2 ring-1 ring-emerald-500/15">
                          <ClipboardCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        </div>
                        <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">
                          {requirement.name}
                        </h2>
                        {requirement.required && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/35 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                            <AlertCircle className="h-3 w-3" />
                            Required
                          </span>
                        )}
                        {!requirement.required && (
                          <span className="rounded-full border border-teal-400/35 bg-teal-500/10 px-2.5 py-1 text-xs font-bold text-teal-800 dark:text-teal-300">
                            Optional
                          </span>
                        )}
                      </div>
                      {requirement.description && (
                        <p className={`text-xs text-muted-foreground transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {requirement.description}
                        </p>
                      )}
                      {requirement.description && requirement.description.length > 100 && (
                        <button
                          onClick={() => setExpandedCard(isExpanded ? null : requirement.id)}
                          className="mt-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  </div>

                  {uploadedDoc ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-emerald-300/35 bg-emerald-50/60 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/25">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-lg bg-emerald-500/20 p-1.5 dark:bg-emerald-500/25">
                            <CheckCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                          </div>
                          <span className="font-semibold text-foreground">Document uploaded</span>
                        </div>
                        <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-white/90 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                          <FileText className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                          <span className="flex-1 truncate text-sm font-medium text-foreground">{uploadedDoc.fileName}</span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={() => {
                              handleDownloadDocument(uploadedDoc.fileUrl, uploadedDoc.fileName)
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => {
                              setReplacingRequirement(requirement.id)
                              setFiles((prev) => ({ ...prev, [requirement.id]: null }))
                              const input = document.getElementById(`file-replace-${requirement.id}`)
                              if (input) input.value = ""
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
                          >
                            <Upload className="h-4 w-4 shrink-0" />
                            <span>Replace</span>
                          </button>
                        </div>
                        {uploadedDoc.uploadedAt && (
                          <div className="mt-3 flex items-center gap-2 border-t border-emerald-200/50 pt-3 text-xs text-muted-foreground dark:border-emerald-800/40">
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
                        <div
                          className={`mb-3 rounded-xl border p-3 ${
                            requirement.sampleFile.startsWith("data:image/")
                              ? "border-teal-400/35 bg-teal-50/50 dark:border-teal-800/40 dark:bg-teal-950/25"
                              : "border-emerald-400/35 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/25"
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Sparkles
                              className={`h-4 w-4 ${
                                requirement.sampleFile.startsWith("data:image/")
                                  ? "text-teal-700 dark:text-teal-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                              }`}
                            />
                            <span
                              className={`text-xs font-bold ${
                                requirement.sampleFile.startsWith("data:image/")
                                  ? "text-teal-800 dark:text-teal-300"
                                  : "text-emerald-800 dark:text-emerald-300"
                              }`}
                            >
                              {requirement.sampleFile.startsWith("data:image/") ? "Sample available" : "PDF template available"}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <button
                              onClick={() => handleDownloadSample(requirement.sampleFile, requirement.sampleFileName)}
                            className="flex items-center gap-2 text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-300"
                          >
                              <Download className="w-4 h-4" />
                              <span>Download {requirement.sampleFile.startsWith('data:image/') ? 'Sample' : 'PDF Template'}</span>
                            </button>
                            {!requirement.sampleFile.startsWith("data:image/") && (
                              <p className="mt-2 rounded-lg border border-emerald-200/50 bg-white/80 p-2 text-xs text-muted-foreground dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                <strong className="text-emerald-900 dark:text-emerald-200">Note:</strong> Upload scanned JPG/PNG based on this PDF. Max {requirement.maxImageUploads || 1} image{requirement.maxImageUploads > 1 ? "s" : ""}.
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
                            onViewSample={handleViewSample}
                          />
                          <button
                            onClick={() => handleUpload(requirement.id)}
                            disabled={!hasFile || isUploading}
                            className="relative w-full overflow-hidden rounded-xl border border-emerald-600/30 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUploading ? (
                              <>
                                <div className="flex w-full items-center justify-center gap-2">
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
                              <span className="inline-flex w-full items-center justify-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/15">
                                  <Upload className="h-3.5 w-3.5" />
                                </span>
                                <span>Upload Document</span>
                              </span>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-50/80 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                          <CheckCircle className="h-4 w-4" />
                          <span>Already uploaded</span>
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
                    <div className="mt-4 border-t border-emerald-200/50 pt-4 dark:border-emerald-800/40">
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
                        onViewSample={handleViewSample}
                      />
                      <button
                        onClick={() => {
                          handleUpload(requirement.id).then(() => {
                            // Hide replace section after successful upload
                            setReplacingRequirement(null)
                          })
                        }}
                        disabled={!files[requirement.id] || isUploading}
                        className="relative mt-2 w-full overflow-hidden rounded-md border border-primary/30 bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <div className="flex w-full items-center justify-center gap-2">
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
                          <span className="inline-flex w-full items-center justify-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/15">
                              <Upload className="h-3.5 w-3.5" />
                            </span>
                            <span>Replace Document</span>
                          </span>
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
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200/40 pt-5 dark:border-emerald-900/40">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
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
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                              : "border border-emerald-200/70 bg-white hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(Math.ceil(requirements.length / ITEMS_PER_PAGE), prev + 1))
                  }
                  disabled={currentPage === Math.ceil(requirements.length / ITEMS_PER_PAGE)}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
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
              <div className="rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/30 py-16 text-center dark:border-emerald-800/50 dark:bg-emerald-950/20">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-emerald-950/80">
                  <FolderOpen className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-medium text-foreground">No uploads yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Documents you submit will appear here</p>
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
                <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                  {myRecords.slice((recordsPage - 1) * ITEMS_PER_PAGE, recordsPage * ITEMS_PER_PAGE).map((record) => {
                    const requirement = requirements.find(r => r.id === record.requirementId)
                    
                    return (
                      <div
                        key={record.id}
                        className={`group relative overflow-hidden rounded-2xl border bg-card/95 p-5 shadow-sm ring-1 ring-black/[0.03] transition-all hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/[0.06] ${
                          record.requirementExists
                            ? "border-emerald-300/45 bg-gradient-to-b from-emerald-50/40 to-card dark:border-emerald-800/40 dark:from-emerald-950/25"
                            : "border-amber-300/45 bg-gradient-to-b from-amber-50/40 to-card dark:border-amber-900/40 dark:from-amber-950/20"
                        }`}
                      >
                        <span
                          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                            record.requirementExists ? "from-emerald-500 to-teal-500" : "from-amber-500 to-orange-400"
                          }`}
                          aria-hidden
                        />
                        <div className="mb-4 flex items-start justify-between pt-1">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <div className="rounded-xl bg-emerald-500/15 p-2 ring-1 ring-emerald-500/15">
                                <FolderOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                              </div>
                              <h2 className="min-w-0 flex-1 text-base font-semibold text-foreground">{record.requirementName}</h2>
                              {!record.requirementExists && (
                                <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-300">
                                  Requirement removed
                                </span>
                              )}
                            </div>
                            {record.requirementDescription && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{record.requirementDescription}</p>
                            )}
                          </div>
                        </div>

                        <div className="mb-4 rounded-xl border border-emerald-200/50 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                          <div className="mb-3 flex items-center gap-2">
                            <FileText className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                            <span className="flex-1 truncate font-semibold text-foreground">{record.fileName}</span>
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
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download</span>
                              </button>
                              <button
                                onClick={() => setEditingRecords(prev => ({ ...prev, [record.id]: true }))}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
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
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-300/60 bg-red-50/50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100/80 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
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
                                onViewSample={handleViewSample}
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
                                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700"
                                >
                                  <Save className="h-4 w-4" />
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
                                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
                                >
                                  <X className="h-4 w-4" />
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
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200/40 pt-5 dark:border-emerald-900/40">
                    <button
                      onClick={() => setRecordsPage((prev) => Math.max(1, prev - 1))}
                      disabled={recordsPage === 1}
                      className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
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
                              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                recordsPage === page
                                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                                  : "border border-emerald-200/70 bg-white hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
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
                      onClick={() =>
                        setRecordsPage((prev) => Math.min(Math.ceil(myRecords.length / ITEMS_PER_PAGE), prev + 1))
                      }
                      disabled={recordsPage === Math.ceil(myRecords.length / ITEMS_PER_PAGE)}
                      className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
        </div>
      </div>

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
    </>
  )
}

