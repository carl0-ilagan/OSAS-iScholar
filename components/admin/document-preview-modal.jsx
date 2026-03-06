"use client"

import { useEffect, useRef, useState } from "react"
import { X, Download, ExternalLink } from "lucide-react"

export default function DocumentPreviewModal({ isOpen, onClose, fileUrl, fileName, fileType }) {
  const modalRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [displayUrl, setDisplayUrl] = useState(null)
  const [blobUrl, setBlobUrl] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

  // Convert base64 to blob URL for PDFs (only for preview, not for images)
  useEffect(() => {
    let currentBlobUrl = null
    
    if (!isOpen || !fileUrl) {
      setDisplayUrl(null)
      setIsLoading(false)
      setDebugInfo(null)
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        setBlobUrl(null)
      }
      return
    }

    setIsLoading(true)
    setError(null)
    
    // Determine file type first
    let isImageFile = false
    let isPdfFile = false
    
    if (fileUrl.startsWith('data:')) {
      const mimeType = fileUrl.split(';')[0].split(':')[1]
      isImageFile = mimeType?.startsWith('image/') || fileType === 'image'
      isPdfFile = mimeType === 'application/pdf' || fileType === 'pdf'
    } else {
      isImageFile = fileType === 'image' || fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
      isPdfFile = fileType === 'pdf' || fileUrl.toLowerCase().match(/\.(pdf)$/i)
    }
    
    // Debug info
    const debug = {
      fileUrl: fileUrl ? (fileUrl.substring(0, 50) + '...') : 'null',
      fileName: fileName || 'not provided',
      fileType: fileType || 'not provided',
      detectedType: isImageFile ? 'image' : isPdfFile ? 'pdf' : 'unknown',
      isBase64: fileUrl?.startsWith('data:') || false,
      urlLength: fileUrl?.length || 0
    }
    setDebugInfo(debug)
    console.log('📄 Document Preview Debug Info:', debug)

    // For images, use base64 directly (like student side)
    if (isImageFile) {
      console.log('📄 Image detected - using base64 directly')
      setDisplayUrl(fileUrl)
      setIsLoading(false)
      return
    }

    // For PDFs, convert base64 to blob URL for iframe
    if (isPdfFile && fileUrl.startsWith('data:')) {
      const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        const mimeType = matches[1]
        const base64Data = matches[2]
        
        console.log('📄 PDF Base64 detected - converting to blob:', {
          mimeType,
          base64Length: base64Data.length,
          fileName,
          isValidBase64: /^[A-Za-z0-9+/=]*$/.test(base64Data.replace(/\s/g, ''))
        })
        
        try {
          // Clean up previous blob URL
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
            setBlobUrl(null)
          }
          
          // Validate base64 data
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Empty base64 data')
          }
          
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: mimeType })
          currentBlobUrl = URL.createObjectURL(blob)
          
          console.log('✅ PDF Blob created successfully:', {
            blobSize: blob.size,
            blobType: blob.type,
            expectedSize: base64Data.length * 0.75, // Approximate
            blobUrl: currentBlobUrl.substring(0, 50) + '...'
          })
          
          setBlobUrl(currentBlobUrl)
          setDisplayUrl(currentBlobUrl)
          
          // Small delay to ensure blob URL is ready
          setTimeout(() => {
            setIsLoading(false)
          }, 100)
        } catch (err) {
          console.error("❌ Error converting base64 PDF to blob:", err)
          setError(`Failed to process PDF: ${err.message}. Please try downloading it.`)
          setDisplayUrl(null)
          setIsLoading(false)
        }
      } else {
        console.warn('⚠️ Base64 PDF data URL format invalid')
        setError('Invalid base64 data URL format')
        setDisplayUrl(fileUrl)
        setIsLoading(false)
      }
    } else {
      // Regular URL (not base64)
      console.log('📄 Regular URL detected:', fileUrl.substring(0, 100))
      setDisplayUrl(fileUrl)
      setIsLoading(false)
    }

    return () => {
      // Clean up blob URL when component unmounts or fileUrl changes
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl)
      }
    }
  }, [isOpen, fileUrl, fileType])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      setIsLoading(true)
      setError(null)
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Prevent closing main modal when clicking inside preview modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        const target = event.target
        if (target && target.classList && (target.classList.contains('backdrop-blur-sm') || target.classList.contains('bg-black'))) {
          onClose()
        }
      }
    }

    if (isOpen) {
      // Use capture phase to prevent event bubbling to main modal
      document.addEventListener('mousedown', handleClickOutside, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [isOpen, onClose])

  if (!isOpen || !fileUrl) return null

  // Determine file type - check base64 mime type first, then extension
  let isImage = false
  let isPdf = false

  if (fileUrl.startsWith('data:')) {
    // Check mime type from base64 data URL
    const mimeType = fileUrl.split(';')[0].split(':')[1]
    isImage = mimeType?.startsWith('image/') || fileType === 'image'
    isPdf = mimeType === 'application/pdf' || fileType === 'pdf'
  } else {
    // Check file extension
    isImage = fileType === 'image' || fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || fileUrl.startsWith('data:image/')
    isPdf = fileType === 'pdf' || fileUrl.toLowerCase().match(/\.(pdf)$/i)
  }

  const handleClose = (e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    onClose()
  }

  const handleDownload = (e) => {
    e.stopPropagation()
    e.preventDefault()
    
    console.log('⬇️ Download initiated:', { fileName, fileUrl: fileUrl?.substring(0, 50) + '...', fileType })
    
    try {
      // Always convert base64 to blob for download (like student side)
      if (fileUrl.startsWith('data:')) {
        const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) {
          console.error("❌ Invalid base64 format")
          setError("Invalid base64 data format")
          return
        }
        
        const mimeType = matches[1]
        const base64Data = matches[2]
        
        console.log('⬇️ Converting base64 for download:', { mimeType, base64Length: base64Data.length, fileName })
        
        try {
          // Convert base64 to binary
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: mimeType })
          const blobUrl = URL.createObjectURL(blob)
          
          console.log('✅ Blob created for download:', { 
            blobSize: blob.size, 
            blobType: blob.type,
            originalFileName: fileName
          })
          
          // Determine file extension from mime type
          let extension = ''
          if (mimeType === 'application/pdf') {
            extension = '.pdf'
          } else if (mimeType.startsWith('image/')) {
            const imageType = mimeType.split('/')[1].split('+')[0]
            extension = '.' + (imageType === 'jpeg' ? 'jpg' : imageType)
          }
          
          // Use the actual file name from the document
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
          
          return
        } catch (err) {
          console.error("❌ Error converting base64 for download:", err)
          setError(`Download failed: ${err.message}. Please try opening in a new tab.`)
          return
        }
      }
      
      // Fallback for non-base64 URLs
      console.log('⬇️ Using direct URL for download (non-base64)')
      const link = document.createElement('a')
      link.href = displayUrl || fileUrl
      link.download = fileName || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("❌ Error downloading file:", error)
      setError(`Download error: ${error.message}`)
      // Fallback: open in new tab
      handleOpenInNewTab(e)
    }
  }

  const handleOpenInNewTab = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const urlToUse = displayUrl || fileUrl
    window.open(urlToUse, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10002] animate-in fade-in duration-300"
        onClick={handleClose}
      />
      <div 
        className="fixed inset-0 z-[10003] flex items-center justify-center p-4"
        onClick={(e) => {
          // Only close if clicking the backdrop area, not the content container
          if (e.target === e.currentTarget) {
            e.stopPropagation()
            handleClose()
          }
        }}
      >
        <div 
          ref={modalRef}
          className="relative w-full h-full flex flex-col items-center justify-center max-w-[95vw] max-h-[95vh] bg-card rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-sm w-full flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {fileName || 'Document Preview'}
                </h3>
                {debugInfo && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">Type: {debugInfo.fileType || 'auto-detect'}</span>
                    {debugInfo.isBase64 && <span className="ml-2">• Base64</span>}
                    {debugInfo.urlLength > 0 && <span className="ml-2">• Size: {(debugInfo.urlLength / 1024).toFixed(1)}KB</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Download"
                title="Download"
              >
                <Download className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={handleOpenInNewTab}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Open in new tab"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 w-full overflow-auto flex items-center justify-center p-4 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">
                    {isPdf ? 'Loading PDF...' : isImage ? 'Loading image...' : 'Loading document...'}
                  </p>
                </div>
              </div>
            )}
            
            {isImage ? (
              <>
                <img
                  src={displayUrl || fileUrl}
                  alt={fileName || "Preview"}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg animate-in zoom-in-95 duration-300"
                  onLoad={() => {
                    console.log('✅ Image loaded successfully')
                    setIsLoading(false)
                    setError(null)
                  }}
                  onError={(e) => {
                    console.error("❌ Error loading image:", {
                      fileUrl: fileUrl?.substring(0, 100),
                      displayUrl: displayUrl?.substring(0, 100),
                      fileName,
                      error: e
                    })
                    setError("Failed to load image. Please check the console for details.")
                    setIsLoading(false)
                    e.target.style.display = 'none'
                  }}
                />
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/95 z-20 backdrop-blur-sm">
                    <div className="text-center p-6 bg-card rounded-lg border border-border shadow-lg max-w-md">
                      <p className="text-sm text-destructive mb-2 font-semibold">{error}</p>
                      {debugInfo && (
                        <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted/50 rounded text-left font-mono">
                          <div>File: {debugInfo.fileName}</div>
                          <div>Type: {debugInfo.fileType || 'auto'}</div>
                          <div>Base64: {debugInfo.isBase64 ? 'Yes' : 'No'}</div>
                          <div>Size: {debugInfo.urlLength > 0 ? `${(debugInfo.urlLength / 1024).toFixed(1)}KB` : 'unknown'}</div>
                        </div>
                      )}
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handleDownload}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Download Image
                        </button>
                        <button
                          onClick={handleOpenInNewTab}
                          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                        >
                          Open in New Tab
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : isPdf ? (
              <div className="w-full h-full flex items-center justify-center relative">
                {displayUrl ? (
                  <div className="w-full h-full flex flex-col relative">
                    {/* Try iframe first for better compatibility */}
                    <iframe
                      key={displayUrl}
                      src={`${displayUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full h-full min-h-[600px] rounded-lg border border-border"
                      title={fileName || "PDF Preview"}
                      onLoad={() => {
                        console.log('✅ PDF iframe loaded successfully')
                        setIsLoading(false)
                        setError(null)
                      }}
                      onError={(e) => {
                        console.error("❌ PDF iframe error:", e)
                        console.error("❌ Display URL:", displayUrl?.substring(0, 100))
                        setError("Failed to load PDF in preview. Please download it to view.")
                        setIsLoading(false)
                      }}
                    />
                    {/* Fallback message if iframe fails */}
                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-card/95 z-20 backdrop-blur-sm">
                        <div className="text-center p-6 bg-card rounded-lg border border-border shadow-lg max-w-md">
                          <p className="text-sm text-destructive mb-2 font-semibold">{error}</p>
                          {debugInfo && (
                            <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted/50 rounded text-left font-mono">
                              <div>File: {debugInfo.fileName}</div>
                              <div>Type: {debugInfo.fileType || 'auto'}</div>
                              <div>Base64: {debugInfo.isBase64 ? 'Yes' : 'No'}</div>
                              <div>Size: {debugInfo.urlLength > 0 ? `${(debugInfo.urlLength / 1024).toFixed(1)}KB` : 'unknown'}</div>
                            </div>
                          )}
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={handleDownload}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Download PDF
                            </button>
                            <button
                              onClick={handleOpenInNewTab}
                              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                            >
                              Open in New Tab
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : fileUrl.startsWith('data:') ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Preparing PDF...</p>
                      {debugInfo && (
                        <p className="text-xs text-muted-foreground mt-2">Converting base64 to blob...</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-6">
                      <p className="text-sm text-muted-foreground mb-4">Unable to preview PDF</p>
                      {debugInfo && (
                        <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted/50 rounded text-left font-mono">
                          <div>File: {debugInfo.fileName}</div>
                          <div>URL: {debugInfo.fileUrl}</div>
                          <div>Type: {debugInfo.fileType || 'auto'}</div>
                        </div>
                      )}
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handleDownload}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Download PDF
                        </button>
                        <button
                          onClick={handleOpenInNewTab}
                          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                        >
                          Open in New Tab
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6">
                <p className="text-sm text-muted-foreground mb-4">Preview not available for this file type</p>
                <button
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Open in New Tab
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

