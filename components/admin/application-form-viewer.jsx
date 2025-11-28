"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, FileText, User, Mail, Phone, MapPin, Calendar, GraduationCap, Building, Award, Users, Briefcase, Home, School } from "lucide-react"
import ImageZoomModal from "./image-zoom-modal"

export default function ApplicationFormViewer({ formData, formType, userPhoto, onClose = null }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Helper function to format field labels
  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
      .replace(/Id/g, 'ID')
      .replace(/Pwd/g, 'PWD')
  }

  // Helper function to get field value (handles "Other" fields)
  const getFieldValue = (key, value) => {
    // Handle "Other" fields for education - show the typed value
    if (key === 'fatherEducation' && value === 'Other' && formData.fatherEducationOther) {
      return formData.fatherEducationOther
    }
    if (key === 'motherEducation' && value === 'Other' && formData.motherEducationOther) {
      return formData.motherEducationOther
    }
    
    // Check if value exists (including 0, false, empty string)
    if (value === null || value === undefined) {
      return "N/A"
    }
    
    // Return the value as string
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    return String(value).trim() || "N/A"
  }

  // Split form data into pages (resume-style sections)
  const pages = []
  
  if (formType === 'applicationForm') {
    // Get all form data and organize into pages
    const personalInfoFields = []
    const familyInfoFields = []
    const additionalInfoFields = []
    
    // Personal Information fields
    const personalKeys = ['name', 'fullName', 'email', 'studentIdNumber', 'studentNumber', 'course', 'major', 'yearLevel', 'civilStatus', 'gender', 'dateOfBirth', 'placeOfBirth', 'fullAddress', 'residingAt', 'contactNumber', 'religion']
    // Family Information fields
    const familyKeys = ['fatherName', 'fatherAge', 'fatherAddress', 'fatherMobile', 'fatherEmail', 'fatherOccupation', 'fatherIncome', 'fatherEducation', 'motherMaidenName', 'motherName', 'motherAge', 'motherAddress', 'motherMobile', 'motherEmail', 'motherOccupation', 'motherIncome', 'motherEducation']
    // Additional Information fields
    const additionalKeys = ['pwd', 'disabilityType', 'siblings', 'address', 'schoolName', 'schoolLocation', 'yearGraduated']
    
    // Process all form data
    Object.entries(formData).forEach(([key, value]) => {
      // Skip internal fields
      if (['userId', 'formType', 'submittedAt', 'updatedAt', 'createdAt', 'id'].includes(key)) {
        return
      }
      
      // Skip "Other" fields (we'll show them merged with the main field)
      if (key.endsWith('Other')) {
        return
      }
      
      // Check if this is an image field
      const isImageField = key.toLowerCase().includes('picture') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('image')
      
      const fieldValue = getFieldValue(key, value)
      const fieldLabel = formatLabel(key)
      
      const field = {
        label: fieldLabel,
        value: fieldValue,
        icon: FileText,
        isImage: isImageField && fieldValue && typeof fieldValue === 'string' && (fieldValue.startsWith('data:') || fieldValue.startsWith('http'))
      }
      
      // Assign icon based on field type
      if (['name', 'fullName', 'fatherName', 'motherName', 'motherMaidenName'].includes(key)) {
        field.icon = User
      } else if (['email', 'fatherEmail', 'motherEmail'].includes(key)) {
        field.icon = Mail
      } else if (['course', 'major', 'schoolName'].includes(key)) {
        field.icon = GraduationCap
      } else if (['yearLevel', 'dateOfBirth', 'yearGraduated'].includes(key)) {
        field.icon = Calendar
      } else if (['address', 'fullAddress', 'fatherAddress', 'motherAddress', 'schoolLocation', 'placeOfBirth'].includes(key)) {
        field.icon = MapPin
      } else if (['occupation', 'fatherOccupation', 'motherOccupation', 'fatherIncome', 'motherIncome'].includes(key)) {
        field.icon = Briefcase
      } else if (['fatherEducation', 'motherEducation'].includes(key)) {
        field.icon = School
      } else if (key === 'siblings') {
        field.icon = Users
      }
      
      // Categorize fields
      if (personalKeys.includes(key)) {
        personalInfoFields.push(field)
      } else if (familyKeys.includes(key)) {
        familyInfoFields.push(field)
      } else if (additionalKeys.includes(key)) {
        additionalInfoFields.push(field)
      } else {
        // Add unknown fields to additional info
        additionalInfoFields.push(field)
      }
    })
    
    if (personalInfoFields.length > 0) {
      pages.push({
        title: "Personal Information",
        fields: personalInfoFields
      })
    }
    
    if (familyInfoFields.length > 0) {
      pages.push({
        title: "Family Information",
        fields: familyInfoFields
      })
    }
    
    if (additionalInfoFields.length > 0) {
      pages.push({
        title: "Additional Information",
        fields: additionalInfoFields
      })
    }
  } else if (formType === 'studentProfileForm') {
    // Student Profile Form - show all fields
    const personalFields = []
    const otherFields = []
    
    // Process all form data
    Object.entries(formData).forEach(([key, value]) => {
      // Skip internal fields
      if (['userId', 'formType', 'submittedAt', 'updatedAt', 'createdAt', 'id', 'profileFormCompleted', 'profileFormSubmittedAt'].includes(key)) {
        return
      }
      
      // Check if this is an image field
      const isImageField = key.toLowerCase().includes('picture') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('image')
      
      const fieldValue = getFieldValue(key, value)
      const fieldLabel = formatLabel(key)
      
      const field = {
        label: fieldLabel,
        value: fieldValue,
        icon: FileText,
        isImage: isImageField && fieldValue && typeof fieldValue === 'string' && (fieldValue.startsWith('data:') || fieldValue.startsWith('http'))
      }
      
      // Assign icon based on field type
      if (['name', 'fullName'].includes(key)) {
        field.icon = User
      } else if (key === 'email') {
        field.icon = Mail
      } else if (key === 'course') {
        field.icon = GraduationCap
      } else if (['yearLevel'].includes(key)) {
        field.icon = Calendar
      } else if (key === 'campus') {
        field.icon = Building
      }
      
      // Categorize
      if (['name', 'fullName', 'email', 'studentIdNumber', 'studentNumber', 'course', 'yearLevel', 'campus'].includes(key)) {
        personalFields.push(field)
      } else {
        otherFields.push(field)
      }
    })
    
    if (personalFields.length > 0) {
      pages.push({
        title: "Personal & Academic Information",
        fields: personalFields
      })
    }
    
    if (otherFields.length > 0) {
      pages.push({
        title: "Additional Details",
        fields: otherFields
      })
    }
  }

  const totalPages = pages.length

  const handleImageClick = (imageSrc) => {
    if (imageSrc && typeof imageSrc === 'string' && (imageSrc.startsWith('data:') || imageSrc.startsWith('http'))) {
      setSelectedImage(imageSrc)
      setIsImageModalOpen(true)
    }
  }

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No form data available</p>
        </div>
      </div>
    )
  }

  const currentPageData = pages[currentPage]

  return (
    <>
      <div className="flex flex-col h-full w-full">
        {/* Header - Enhanced */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-border bg-gradient-to-r from-card to-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-foreground">{currentPageData.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Form Information</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <span className="text-xs sm:text-sm font-semibold text-primary">
                Page {currentPage + 1} of {totalPages}
              </span>
            </div>
          </div>
        </div>

        {/* Content - Resume Style */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              {/* Resume Body */}
              <div className="p-4 sm:p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary">
                    {currentPageData.title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentPageData.fields.map((field, index) => {
                      const Icon = field.icon || FileText
                      const isImage = field.isImage
                      
                      return (
                        <div 
                          key={index} 
                          className={`flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors ${
                            isImage ? 'md:col-span-2' : ''
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                              {field.label}
                            </p>
                            {isImage ? (
                              <div className="mt-2">
                                <img
                                  src={field.value}
                                  alt={field.label}
                                  className="max-w-full h-auto rounded-lg border-2 border-border/50 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    handleImageClick(field.value)
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                  }}
                                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                                />
                                <p className="text-xs text-muted-foreground mt-2 italic">Click image to view full size</p>
                              </div>
                            ) : (
                              <p className="text-sm font-medium text-foreground break-words">
                                {field.value}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Footer - Enhanced */}
        <div 
          className="flex-shrink-0 p-3 sm:p-4 border-t-2 border-primary/20 bg-gradient-to-r from-card via-muted/10 to-card navigation-footer"
          data-navigation="true"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          <div className="flex items-center justify-between max-w-5xl mx-auto gap-2 sm:gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (e.nativeEvent) {
                  e.nativeEvent.stopImmediatePropagation()
                }
                setCurrentPage(prev => Math.max(0, prev - 1))
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base shadow-md hover:shadow-lg disabled:shadow-none"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>
            
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center px-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (e.nativeEvent) {
                      e.nativeEvent.stopImmediatePropagation()
                    }
                    setCurrentPage(index)
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    currentPage === index
                      ? 'bg-primary w-10 sm:w-12 shadow-md'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2.5'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (e.nativeEvent) {
                  e.nativeEvent.stopImmediatePropagation()
                }
                setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              disabled={currentPage === totalPages - 1}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base shadow-md hover:shadow-lg disabled:shadow-none"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isImageModalOpen && selectedImage && (
        <ImageZoomModal
          imageSrc={selectedImage}
          alt="Student Photo"
          isOpen={isImageModalOpen}
          onClose={(e) => {
            if (e) {
              e.stopPropagation()
              e.preventDefault()
            }
            setIsImageModalOpen(false)
            setSelectedImage(null)
          }}
        />
      )}
    </>
  )
}

