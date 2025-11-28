"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

// Image Upload Field Component with Live Camera Modal
function ImageUploadField({ field, value, error, onChange }) {
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        } 
      })
      setStream(mediaStream)
      setShowCameraModal(true)
      setCapturedImage(null)
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("Failed to access camera. Please allow camera permissions.", {
        icon: <AlertCircle className="w-4 h-4" />,
        duration: 3000,
      })
    }
  }
  
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCameraModal(false)
    setCapturedImage(null)
  }
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      const imageData = canvas.toDataURL('image/jpeg', 0.9)
      setCapturedImage(imageData)
      // Stop video stream but keep modal open for retake
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
    }
  }
  
  const useCapturedImage = () => {
    if (capturedImage) {
      onChange(capturedImage)
      setShowCameraModal(false)
      setCapturedImage(null)
    }
  }
  
  const retakePhoto = () => {
    setCapturedImage(null)
    startCamera()
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])
  
  const hasImage = value
  
  return (
    <>
      <div className="space-y-2 group">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-primary"></span>
          {field.label}
        </label>
        <div className="relative">
          {/* Hidden file input for upload */}
          <input
            type="file"
            accept={field.accept || "image/*"}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("Image size must be less than 5MB", {
                    icon: <AlertCircle className="w-4 h-4" />,
                    duration: 3000,
                  })
                  return
                }
                // Convert to base64
                const reader = new FileReader()
                reader.onloadend = () => {
                  onChange(reader.result)
                }
                reader.onerror = () => {
                  toast.error("Failed to read image", {
                    icon: <AlertCircle className="w-4 h-4" />,
                    duration: 3000,
                  })
                }
                reader.readAsDataURL(file)
              } else {
                onChange('')
              }
            }}
            className="hidden"
            id={`file-upload-${field.name}`}
          />
          
          {/* 2x2 Image Holder Box - Only shows preview */}
          <div className="w-48 h-48 mx-auto border-2 border-border rounded-lg bg-white overflow-hidden relative flex items-center justify-center">
            {hasImage ? (
              <div className="relative w-full h-full">
                <img 
                  src={value} 
                  alt={field.label}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-all shadow-lg z-10"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="text-center p-4">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">2x2 ID Picture</p>
                <p className="text-xs text-muted-foreground mt-1">White Background</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <label
              htmlFor={`file-upload-${field.name}`}
              className="flex-1 px-4 py-2.5 border-2 rounded-xl bg-background text-foreground focus:outline-none transition-all duration-200 text-sm shadow-sm border-border/50 hover:border-primary/60 hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{hasImage ? 'Change Image' : 'Upload'}</span>
            </label>
            {field.capture && (
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2.5 border-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all duration-200 text-sm shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Take Photo</span>
              </button>
            )}
          </div>
          {field.placeholder && !hasImage && (
            <p className="text-xs text-muted-foreground mt-1 text-center">{field.placeholder}</p>
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 pl-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-2 sm:p-4">
          <div className="bg-card rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 1rem)' }}>
            <div className="p-2 sm:p-4 border-b border-border flex-shrink-0">
              <h3 className="text-sm sm:text-lg font-semibold text-foreground">Take ID Picture</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Position yourself with a white background</p>
            </div>
            
            <div className="p-2 sm:p-4 flex-1 flex flex-col justify-center min-h-0">
              {capturedImage ? (
                <div className="space-y-2 sm:space-y-4">
                  <div className="w-full max-w-[280px] sm:max-w-xs mx-auto aspect-square border-2 border-border rounded-lg overflow-hidden bg-white flex-shrink-0">
                    <img 
                      src={capturedImage} 
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={useCapturedImage}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium text-xs sm:text-sm"
                    >
                      Use This Photo
                    </button>
                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-border rounded-lg hover:bg-muted transition-all text-xs sm:text-sm"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-all text-xs sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-4">
                  <div className="w-full max-w-[280px] sm:max-w-xs mx-auto aspect-square border-2 border-border rounded-lg overflow-hidden bg-black relative flex-shrink-0">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium text-xs sm:text-sm"
                    >
                      Capture
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-all text-xs sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function GenericForm({ 
  formConfig, 
  initialData = {}, 
  onSubmit, 
  onCancel,
  autoFillData = {},
  onFormDataChange,
  horizontal = false
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slideDirection, setSlideDirection] = useState('right')

  // Auto-fill form data
  useEffect(() => {
    if (autoFillData && Object.keys(autoFillData).length > 0) {
      setFormData(prev => {
        const updated = { ...prev }
        Object.keys(autoFillData).forEach(key => {
          if (!updated[key] && autoFillData[key]) {
            updated[key] = autoFillData[key]
          }
        })
        return updated
      })
    }
  }, [autoFillData])

  const steps = formConfig.steps || []
  const totalSteps = steps.length

  // Memoize validation result to prevent infinite loops
  const isStepValid = useMemo(() => {
    const step = steps[currentStep]
    if (!step) return true

    const currentFields = step.fields || []
    const leftFields = step.leftSection || []
    const rightFields = step.rightSection || []
    const allFields = [...currentFields, ...leftFields, ...rightFields]

    for (const field of allFields) {
      if (field.required) {
        const value = formData[field.name]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return false
        }
        
        // Custom validation
        if (field.validation && value) {
          const validationResult = field.validation(value, formData)
          if (validationResult !== true) {
            return false
          }
        }
      }
    }
    return true
  }, [formData, currentStep, steps])

  const handleInputChange = (field, value) => {
    const updatedData = { ...formData, [field]: value }
    setFormData(updatedData)
    // Notify parent component of data changes
    if (onFormDataChange) {
      onFormDataChange(updatedData)
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Validate step and set errors (for form submission)
  const validateStep = (stepIndex) => {
    const step = steps[stepIndex]
    if (!step) return true

    const currentFields = step.fields || []
    const leftFields = step.leftSection || []
    const rightFields = step.rightSection || []
    const allFields = [...currentFields, ...leftFields, ...rightFields]

    const stepErrors = {}
    allFields.forEach(field => {
      if (field.required) {
        const value = formData[field.name]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          stepErrors[field.name] = `${field.label} is required`
        }
      }
      
      // Custom validation
      if (field.validation && formData[field.name]) {
        const validationResult = field.validation(formData[field.name], formData)
        if (validationResult !== true) {
          stepErrors[field.name] = validationResult
        }
      }
    })

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    const stepConfig = steps[currentStep]
    
    // Auto-fill "N/A" for optional fields that are empty
    const currentFields = stepConfig?.fields || []
    const leftFields = stepConfig?.leftSection || []
    const rightFields = stepConfig?.rightSection || []
    const allFields = [...currentFields, ...leftFields, ...rightFields]
    
    allFields.forEach(field => {
      if (!field.required && !formData[field.name] && field.type !== 'checkbox' && field.type !== 'radio' && field.type !== 'file' && field.type !== 'image') {
        handleInputChange(field.name, 'N/A')
      }
    })
    
    // Validate step before proceeding
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setSlideDirection('left')
        setCurrentStep(prev => prev + 1)
      }
    } else {
      toast.error("Please fill in all required fields", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 3000,
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setSlideDirection('right')
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error("Please fill in all required fields", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 3000,
      })
      return
    }

    // Validate all steps
    let allValid = true
    for (let i = 0; i < totalSteps; i++) {
      if (!validateStep(i)) {
        allValid = false
        break
      }
    }

    if (!allValid) {
      toast.error("Please complete all required fields in all steps", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 3000,
      })
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(formData)
    } catch (error) {
      console.error("Form submission error:", error)
      toast.error("Failed to submit form. Please try again.", {
        icon: <AlertCircle className="w-5 h-5" />,
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderReviewField = (field) => {
    // Review all form data
    const reviewData = formData
    const reviewFields = []
    
    // Collect all fields from all steps
    steps.forEach((step) => {
      if (step.fields) {
        step.fields.forEach(f => {
          if (f.type !== 'display' && f.type !== 'review' && f.type !== 'checkbox' && f.name !== 'certify' && f.name !== 'dataPrivacyAgree') {
            reviewFields.push({
              label: f.label,
              name: f.name,
              value: reviewData[f.name],
              type: f.type
            })
          }
        })
      }
    })

    return (
      <div key={field.name} className="space-y-4">
        <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-xl">
          <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Review Your Information
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {reviewFields.map((rf) => {
              let displayValue = rf.value
              
              if (Array.isArray(displayValue)) {
                displayValue = displayValue.length > 0 ? displayValue.join(', ') : 'None selected'
              } else if (displayValue === '' || displayValue === null || displayValue === undefined) {
                displayValue = 'Not provided'
              } else if (rf.type === 'date' && displayValue) {
                displayValue = new Date(displayValue).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              } else if (rf.type === 'checkbox') {
                displayValue = displayValue ? 'Yes' : 'No'
              }

              return (
                <div key={rf.name} className="p-3 bg-card border border-border rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{rf.label}</p>
                  <p className="text-sm text-foreground">{displayValue}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderField = (field) => {
    // For review field, use special renderer
    if (field.type === 'review') {
      return renderReviewField(field)
    }
    
    const value = formData[field.name] || ''
    const error = errors[field.name]
    const hasError = !!error

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={field.name} className="space-y-2 group">
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary"></span>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </label>
            <div className="relative">
              <input
                type={field.type}
                value={value}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-lg sm:rounded-xl bg-background text-foreground focus:outline-none transition-all duration-200 text-sm shadow-sm ${
                  hasError
                    ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
                    : 'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
                } ${field.disabled ? 'opacity-60 cursor-not-allowed bg-muted/40' : 'hover:border-primary/60 hover:shadow-md'} max-w-full`}
                style={{ maxWidth: '100%' }}
              />
              {/* Focus indicator */}
              {!field.disabled && (
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-focus-within:from-primary/5 group-focus-within:via-primary/10 group-focus-within:to-primary/5 transition-all duration-200 pointer-events-none -z-10"></div>
              )}
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 pl-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2 group">
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary"></span>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </label>
            <div className="relative">
              <textarea
                value={value}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={field.rows || 4}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-lg sm:rounded-xl bg-background text-foreground focus:outline-none transition-all duration-200 resize-y shadow-sm text-sm ${
                  hasError
                    ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
                    : 'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
                } hover:border-primary/60 hover:shadow-md`}
              />
              {/* Focus indicator */}
              <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-focus-within:from-primary/5 group-focus-within:via-primary/10 group-focus-within:to-primary/5 transition-all duration-200 pointer-events-none -z-10"></div>
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 pl-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        )

      case 'select':
        return (
          <div key={field.name} className="space-y-2 group">
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary"></span>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </label>
            <div className="relative">
              <select
                value={value || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                disabled={field.disabled === true}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 border-2 rounded-lg sm:rounded-xl bg-background text-foreground focus:outline-none transition-all duration-200 appearance-none text-sm shadow-sm ${
                  hasError
                    ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
                    : 'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
                } ${value ? 'text-foreground' : 'text-muted-foreground'} ${field.disabled === true ? 'opacity-60 cursor-not-allowed bg-muted/40' : 'cursor-pointer hover:border-primary/60 hover:shadow-md'} max-w-full`}
                style={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                <option value="" disabled>Select {field.label}</option>
                {field.options?.map((option) => (
                  <option 
                    key={typeof option === 'object' ? option.value : option} 
                    value={typeof option === 'object' ? option.value : option}
                    className="truncate"
                  >
                    {typeof option === 'object' ? option.label : option}
                  </option>
                ))}
              </select>
              {/* Enhanced dropdown indicator */}
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 ${field.disabled ? 'opacity-50' : 'group-hover:scale-110'}`}>
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* Focus gradient background */}
              {!field.disabled && (
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-focus-within:from-primary/5 group-focus-within:via-primary/10 group-focus-within:to-primary/5 transition-all duration-200 pointer-events-none -z-10"></div>
              )}
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 pl-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        )

      case 'multiselect':
        return (
          <div key={field.name} className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1">
              {field.label}
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border-2 border-border rounded-lg p-2">
              {field.options?.map((option) => {
                const optionValue = typeof option === 'object' ? option.value : option
                const optionLabel = typeof option === 'object' ? option.label : option
                const isSelected = Array.isArray(value) && value.includes(optionValue)
                
                return (
                  <label
                    key={optionValue}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const currentValues = Array.isArray(value) ? value : []
                        if (e.target.checked) {
                          handleInputChange(field.name, [...currentValues, optionValue])
                        } else {
                          handleInputChange(field.name, currentValues.filter(v => v !== optionValue))
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{optionLabel}</span>
                  </label>
                )
              })}
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        )

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary"></span>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </label>
            <div className={`flex ${field.name === 'parentStatus' ? 'flex-row' : 'flex-col sm:flex-row'} gap-2 flex-wrap`}>
              {field.options?.map((option) => {
                const optionValue = typeof option === 'object' ? option.value : option
                const optionLabel = typeof option === 'object' ? option.label : option
                const isSelected = value === optionValue
                
                return (
                  <label
                    key={optionValue}
                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 justify-center text-xs sm:text-sm min-w-0 shadow-sm whitespace-nowrap ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-primary/20 scale-[1.02]'
                        : 'border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md'
                    }`}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={optionValue}
                      checked={isSelected}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary focus:ring-primary flex-shrink-0"
                    />
                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {optionLabel}
                    </span>
                  </label>
                )
              })}
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 pl-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        )

      case 'date':
        return (
          <div key={field.name} className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1">
              {field.label}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className={`w-full px-3 py-2.5 border-2 rounded-lg bg-background text-foreground focus:outline-none transition-all ${
                hasError
                  ? 'border-destructive focus:ring-destructive/20'
                  : 'border-border focus:border-primary focus:ring-primary/20'
              }`}
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-1.5">
            <label className="flex items-start gap-2.5 p-3 rounded-lg border-2 border-border hover:border-primary/30 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={value === true || value === 'true'}
                onChange={(e) => handleInputChange(field.name, e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                  {field.label}
                </span>
                {field.description && (
                  <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                )}
              </div>
            </label>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1 ml-6">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        )

      case 'display':
        return (
          <div key={field.name} className="p-4 bg-muted/30 border border-border rounded-lg">
            <p className="text-sm text-foreground whitespace-pre-line">{field.content}</p>
          </div>
        )

      case 'review':
        return renderReviewField(field)

      case 'file':
      case 'image':
        return (
          <ImageUploadField
            key={field.name}
            field={field}
            value={formData[field.name]}
            error={errors[field.name]}
            onChange={(value) => handleInputChange(field.name, value)}
          />
        )

      case 'conditional':
        // Show conditional fields based on parent field value
        const parentValue = formData[field.parentField]
        const shouldShow = field.condition ? field.condition(parentValue, formData) : true
        
        if (!shouldShow) {
          // Clear conditional field data when hidden
          if (formData[field.name]) {
            handleInputChange(field.name, field.defaultValue || '')
          }
          return null
        }

        return (
          <div key={field.name} className="animate-in fade-in duration-300">
            {renderField({ ...field, type: field.fieldType })}
          </div>
        )

      default:
        return null
    }
  }

  const currentStepConfig = steps[currentStep]

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Indicator - Smaller & Mobile Optimized */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center mx-auto relative px-1 sm:px-0 overflow-x-auto">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-xl blur-xl -z-10"></div>
          
          <div className="flex items-center justify-center min-w-max px-2 sm:px-0">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center relative z-10 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs transition-all duration-300 shadow-md ${
                      index < currentStep
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white scale-105 shadow-green-500/30'
                        : index === currentStep
                        ? 'bg-gradient-to-br from-primary to-secondary text-white scale-110 ring-2 sm:ring-3 ring-primary/20 shadow-primary/30'
                        : 'bg-muted text-muted-foreground scale-100'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className={`text-[9px] sm:text-[10px] md:text-xs mt-1 sm:mt-1.5 font-medium transition-colors whitespace-nowrap text-center ${
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 sm:h-0.5 md:h-1 w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 mx-1 sm:mx-1.5 md:mx-2 lg:mx-3 rounded-full transition-all duration-300 flex-shrink-0 ${
                    index < currentStep 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-sm' 
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="relative min-h-[400px]">
        <div
          key={currentStep}
          className={`animate-in ${
            slideDirection === 'left' ? 'slide-in-from-right' : 'slide-in-from-left'
          } duration-300`}
        >
          {/* Step Header - Enhanced */}
          {currentStepConfig?.header && (
            <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 relative">
              {/* Decorative gradient line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-0.5 sm:w-1 h-6 sm:h-8 bg-gradient-to-b from-primary to-secondary rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {currentStepConfig.header.title}
                  </h2>
                  {currentStepConfig.header.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{currentStepConfig.header.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step Fields - Horizontal with Left/Right Sections or Vertical Layout */}
          {horizontal && (currentStepConfig?.leftSection || currentStepConfig?.rightSection) ? (
            <div className="space-y-6">
              {/* Full-width fields first (like Status of Parents) */}
              {currentStepConfig?.fields && currentStepConfig.fields.length > 0 && (
                <div className="space-y-6 flex justify-center">
                  <div className="w-full max-w-2xl">
                    {currentStepConfig.fields.map((field) => (
                      <div key={field.name}>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Left/Right Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Left Section */}
                {currentStepConfig?.leftSection && (
                  <div className="space-y-6 relative">
                    {/* Decorative accent */}
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 rounded-full hidden lg:block"></div>
                    {currentStepConfig.leftSection.map((field) => renderField(field))}
                  </div>
                )}
                {/* Right Section */}
                {currentStepConfig?.rightSection && (
                  <div className="space-y-6 relative">
                    {/* Decorative accent */}
                    <div className="absolute -right-4 top-0 bottom-0 w-1 bg-gradient-to-b from-secondary/20 via-secondary/40 to-secondary/20 rounded-full hidden lg:block"></div>
                    {currentStepConfig.rightSection.map((field) => renderField(field))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={horizontal ? "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6" : "space-y-4 sm:space-y-5"}>
              {currentStepConfig?.fields?.map((field) => {
                // For horizontal layout, some fields should span full width
                const shouldSpanFull = horizontal && (
                  field.type === 'display' || 
                  field.type === 'review' || 
                  field.type === 'textarea' ||
                  field.name === 'fullName' ||
                  field.name === 'name' ||
                  field.label?.toLowerCase().includes('address')
                )
                
                return (
                  <div key={field.name} className={shouldSpanFull ? "md:col-span-2" : ""}>
                    {renderField(field)}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons - Enhanced */}
      <div className="flex items-center justify-between mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border/30 relative sticky bottom-0 bg-card pb-2 -mb-2">
        {/* Decorative gradient line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-all rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {currentStep < totalSteps - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid}
            className="flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-primary to-secondary text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-primary to-secondary text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Submit</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

