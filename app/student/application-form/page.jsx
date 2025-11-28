"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import GenericForm from "@/components/student/generic-form"
import { FileText, CheckCircle, GraduationCap } from "lucide-react"

// Courses data by campus - matching signup
const coursesByCampus = {
  "Main Campus": [
    { name: "BS Agriculture", majors: ["Crop Science", "Animal Science"] },
    { name: "BS Horticulture", majors: null },
    { name: "BS Agroforestry", majors: null },
    { name: "BS Environmental Science", majors: null },
    { name: "BS Entrepreneurship", majors: null },
    { name: "BS Agricultural & Biosystems Engineering", majors: null },
    { name: "Bachelor of Elementary Education", majors: null },
    { name: "Bachelor of Secondary Education", majors: ["Mathematics", "English", "Filipino", "Biological Science"] },
    { name: "Bachelor of Arts in English Language", majors: null },
  ],
  "Calapan City Campus": [
    { name: "Bachelor of Secondary Education", majors: ["Physical Sciences", "Mathematics", "English", "Filipino"] },
    { name: "Bachelor of Technical-Vocational Teacher Education (ladderized)", majors: null },
    { name: "BS Hotel & Tourism Management", majors: null },
    { name: "BS Criminology (ladderized)", majors: null },
    { name: "BS Information Technology (ladderized)", majors: null },
  ],
  "Bongabong Campus": [
    { name: "BS Information Technology", majors: null },
    { name: "BS Computer Engineering", majors: null },
    { name: "BS Hotel & Restaurant Management (ladderized)", majors: null },
    { name: "Bachelor of Secondary Education", majors: ["Biology", "English", "Mathematics"] },
    { name: "Bachelor in Elementary Education", majors: null },
    { name: "BS Criminology (ladderized)", majors: null },
    { name: "BS Fisheries", majors: null },
  ],
}

// Get all unique courses across all campuses
const getAllCourses = () => {
  const courseSet = new Set()
  Object.values(coursesByCampus).forEach(campusCourses => {
    campusCourses.forEach(course => {
      courseSet.add(course.name)
    })
  })
  return Array.from(courseSet).sort()
}

// Get majors for a specific course
const getMajorsForCourse = (courseName) => {
  for (const campusCourses of Object.values(coursesByCampus)) {
    const course = campusCourses.find(c => c.name === courseName)
    if (course && course.majors) {
      return course.majors
    }
  }
  return null
}

export default function ApplicationFormPage() {
  const { user } = useAuth()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isClient, setIsClient] = useState(false)
  const [formData, setFormData] = useState({})
  const [selectedCourse, setSelectedCourse] = useState('')

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Detect sidebar width for banner positioning
  useEffect(() => {
    if (!isClient) return

    const detectSidebarWidth = () => {
      if (typeof window === 'undefined' || window.innerWidth < 768) return
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth)
      }
    }

    detectSidebarWidth()
    const observer = new ResizeObserver(detectSidebarWidth)
    const sidebar = document.querySelector('aside')
    if (sidebar) observer.observe(sidebar)
    window.addEventListener('resize', detectSidebarWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', detectSidebarWidth)
    }
  }, [isClient])

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setUserData(data)
            setSelectedCourse(data.course || '')
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [user])

  // Get available majors based on selected course
  const availableMajors = useMemo(() => {
    return selectedCourse ? getMajorsForCourse(selectedCourse) : null
  }, [selectedCourse])
  
  const showMajor = availableMajors && availableMajors.length > 0

  // Create form config dynamically based on course - reactive to course changes
  const formConfig = useMemo(() => {
    const allCourses = getAllCourses()
    const majorOptions = showMajor ? [...availableMajors, 'None'] : ['None']

    return {
      steps: [
        {
          title: "Step 1",
          header: {
            title: "Personal Information",
            description: "Please provide your personal information"
          },
          leftSection: [
            {
              type: 'image',
              name: 'idPicture',
              label: 'ID Picture',
              placeholder: 'Upload or take photo in white background',
              required: true,
              accept: 'image/*',
              capture: 'environment'
            },
            {
              type: 'text',
              name: 'lastName',
              label: 'Last Name',
              placeholder: 'FULL CAPS',
              required: true
            },
            {
              type: 'text',
              name: 'firstName',
              label: 'First Name',
              placeholder: 'FULL CAPS',
              required: true
            },
            {
              type: 'text',
              name: 'middleName',
              label: 'Middle Name',
              placeholder: 'FULL CAPS or "N/A"',
              required: true
            },
            {
              type: 'select',
              name: 'course',
              label: 'Course',
              required: true,
              disabled: false,
              options: allCourses
            },
            ...(showMajor ? [{
              type: 'select',
              name: 'major',
              label: 'Major',
              required: false,
              disabled: false,
              options: majorOptions
            }] : []),
            {
              type: 'select',
              name: 'yearLevel',
              label: 'Year Level',
              required: true,
              disabled: false,
              options: ['First Year', 'Second Year', 'Third Year', 'Fourth Year']
            },
            {
              type: 'text',
              name: 'studentIdNumber',
              label: 'Student ID Number',
              placeholder: 'MBC2024-0001',
              required: true,
              disabled: true
            }
          ],
          rightSection: [
            {
              type: 'select',
              name: 'civilStatus',
              label: 'Civil Status',
              required: true,
              options: ['Single', 'Married', 'Widowed', 'Separated']
            },
            {
              type: 'radio',
              name: 'gender',
              label: 'Gender',
              required: true,
              options: ['MALE', 'FEMALE']
            },
            {
              type: 'date',
              name: 'dateOfBirth',
              label: 'Date of Birth',
              required: true
            },
            {
              type: 'text',
              name: 'placeOfBirth',
              label: 'Place of Birth',
              placeholder: 'Enter place of birth',
              required: true
            },
            {
              type: 'textarea',
              name: 'fullAddress',
              label: 'Full Address',
              placeholder: 'Street, Barangay, City/Province',
              required: true,
              rows: 3
            },
            {
              type: 'radio',
              name: 'residingAt',
              label: 'Residing At',
              required: true,
              options: ['Boarding House', 'Parents House', 'With Guardian']
            },
            {
              type: 'text',
              name: 'contactNumber',
              label: 'Contact Number',
              placeholder: '+63',
              required: true
            },
            {
              type: 'email',
              name: 'email',
              label: 'Email Address',
              placeholder: 'Enter your email address',
              required: true,
              disabled: false
            },
            {
              type: 'text',
              name: 'religion',
              label: 'Religion',
              placeholder: 'Enter religion',
              required: false
            }
          ]
        },
        {
          title: "Step 2",
          header: {
            title: "Educational Background (Secondary)",
            description: "Please provide your secondary school information"
          },
          leftSection: [
            {
              type: 'text',
              name: 'schoolName',
              label: 'Name of School',
              placeholder: 'Enter school name',
              required: true
            },
            {
              type: 'text',
              name: 'schoolLocation',
              label: 'School Location',
              placeholder: 'Enter school location',
              required: true
            },
            {
              type: 'select',
              name: 'yearGraduated',
              label: 'Year Graduated',
              required: true,
              options: Array.from({ length: 20 }, (_, i) => (2024 - i).toString())
            },
            {
              type: 'number',
              name: 'generalAverage',
              label: 'General Average',
              placeholder: 'Enter general average',
              required: true
            },
            {
              type: 'text',
              name: 'honorsAwards',
              label: 'Honors/Awards',
              placeholder: 'Enter honors/awards or "N/A"',
              required: false
            }
          ],
          rightSection: [
            {
              type: 'radio',
              name: 'pwd',
              label: 'Person With Disability',
              required: true,
              options: ['Yes', 'No']
            },
            {
              type: 'conditional',
              name: 'disabilityType',
              label: 'Type of Disability',
              fieldType: 'select',
              parentField: 'pwd',
              condition: (value) => value === 'Yes',
              defaultValue: '',
              required: false,
              options: ['Psychosocial', 'Chronic illness', 'Learning', 'Mental', 'Visual', 'Orthopedic', 'Communication', 'N/A']
            },
            {
              type: 'text',
              name: 'existingScholarship',
              label: 'Existing Scholarship',
              placeholder: 'Enter scholarship name or "N/A"',
              required: false
            }
          ]
        },
        {
          title: "Step 3",
          header: {
            title: "Family Background",
            description: "Please provide your family information"
          },
          fields: [
            {
              type: 'radio',
              name: 'parentStatus',
              label: 'Status of Parents',
              required: true,
              options: ['Living Together', 'Separated', 'Single Parent', 'Father Deceased']
            }
          ],
          leftSection: [
            {
              type: 'text',
              name: 'fatherFullName',
              label: "Father's Full Name (LAST, FIRST, MIDDLE)",
              placeholder: 'LAST, FIRST, MIDDLE',
              required: true
            },
            {
              type: 'number',
              name: 'fatherAge',
              label: "Father's Age",
              placeholder: 'Enter age',
              required: true
            },
            {
              type: 'textarea',
              name: 'fatherAddress',
              label: "Father's Permanent Address",
              placeholder: 'Enter permanent address',
              required: true,
              rows: 2
            },
            {
              type: 'text',
              name: 'fatherMobile',
              label: "Father's Mobile Number",
              placeholder: 'Enter mobile number',
              required: false
            },
            {
              type: 'email',
              name: 'fatherEmail',
              label: "Father's Email Address",
              placeholder: 'Enter email address',
              required: false
            },
            {
              type: 'text',
              name: 'fatherOccupation',
              label: "Father's Occupation / Position",
              placeholder: 'Enter occupation/position',
              required: true
            },
            {
              type: 'text',
              name: 'fatherIncome',
              label: "Father's Average Monthly Income",
              placeholder: 'Enter monthly income or "N/A"',
              required: false
            },
            {
              type: 'select',
              name: 'fatherEducation',
              label: "Father's Educational Attainment",
              required: true,
              options: ['Elementary', 'High School', 'Undergrad', 'College', 'Vocational', 'Masters', 'Doctorate', 'Other']
            },
            {
              type: 'conditional',
              name: 'fatherEducationOther',
              label: "Father's Educational Attainment (Other - Please specify)",
              fieldType: 'text',
              parentField: 'fatherEducation',
              condition: (value) => value === 'Other',
              defaultValue: '',
              placeholder: 'Enter educational attainment',
              required: false
            }
          ],
          rightSection: [
            {
              type: 'text',
              name: 'motherMaidenName',
              label: "Mother's Maiden Name",
              placeholder: 'LAST, FIRST, MIDDLE',
              required: true
            },
            {
              type: 'number',
              name: 'motherAge',
              label: "Mother's Age",
              placeholder: 'Enter age',
              required: true
            },
            {
              type: 'textarea',
              name: 'motherAddress',
              label: "Mother's Permanent Address",
              placeholder: 'Enter permanent address',
              required: true,
              rows: 2
            },
            {
              type: 'text',
              name: 'motherMobile',
              label: "Mother's Mobile Number",
              placeholder: 'Enter mobile number',
              required: false
            },
            {
              type: 'email',
              name: 'motherEmail',
              label: "Mother's Email Address",
              placeholder: 'Enter email address',
              required: false
            },
            {
              type: 'text',
              name: 'motherOccupation',
              label: "Mother's Occupation / Position",
              placeholder: 'Enter occupation/position',
              required: true
            },
            {
              type: 'text',
              name: 'motherIncome',
              label: "Mother's Average Monthly Income",
              placeholder: 'Enter monthly income or "N/A"',
              required: false
            },
            {
              type: 'select',
              name: 'motherEducation',
              label: "Mother's Educational Attainment",
              required: true,
              options: ['Elementary', 'High School', 'Undergrad', 'College', 'Vocational', 'Masters', 'Doctorate', 'Other']
            },
            {
              type: 'conditional',
              name: 'motherEducationOther',
              label: "Mother's Educational Attainment (Other - Please specify)",
              fieldType: 'text',
              parentField: 'motherEducation',
              condition: (value) => value === 'Other',
              defaultValue: '',
              placeholder: 'Enter educational attainment',
              required: false
            }
          ]
        },
        {
          title: "Step 4",
          header: {
            title: "Siblings Information",
            description: "Please provide information about your siblings"
          },
          leftSection: [
            {
              type: 'number',
              name: 'totalSiblings',
              label: 'Total Number of Siblings',
              placeholder: 'Enter total number',
              required: true
            }
          ],
          rightSection: [
            {
              type: 'number',
              name: 'workingSiblings',
              label: 'Total Number of Working Siblings',
              placeholder: 'Enter number',
              required: true
            },
            {
              type: 'number',
              name: 'studyingSiblings',
              label: 'Total Number of Studying Siblings',
              placeholder: 'Enter number',
              required: true
            }
          ]
        },
        {
          title: "Step 5",
          header: {
            title: "References",
            description: "Please provide reference person information"
          },
          leftSection: [
            {
              type: 'text',
              name: 'referenceName',
              label: 'Full Name (Last, First, Middle)',
              placeholder: 'LAST, FIRST, MIDDLE',
              required: true
            },
            {
              type: 'text',
              name: 'referenceRelationship',
              label: 'Relationship to Applicant',
              placeholder: 'Enter relationship',
              required: true
            }
          ],
          rightSection: [
            {
              type: 'text',
              name: 'referenceContact',
              label: 'Contact Number',
              placeholder: 'Enter contact number',
              required: true
            },
            {
              type: 'checkbox',
              name: 'certify',
              label: 'I hereby certify that all the information given is true and correct.',
              required: true
            }
          ]
        }
      ]
    }
  }, [selectedCourse, showMajor, availableMajors])

  // Handle form data changes from GenericForm
  const handleFormDataChange = (updatedData) => {
    setFormData(updatedData)
    if (updatedData.course && updatedData.course !== selectedCourse) {
      setSelectedCourse(updatedData.course)
    }
  }

  const handleSubmit = async (formData) => {
    if (!user?.uid) {
      toast.error("Please log in to submit the form")
      return
    }

    try {
      // Ensure userId is set correctly and not overridden by formData
      const userId = user.uid
      
      // Remove userId from formData if it exists to prevent override
      const { userId: _, ...cleanFormData } = formData
      
      // Save form data to Firestore - ensure userId is explicitly set
      const formSubmissionData = {
        userId: userId, // Always set userId first to ensure it's correct
        formType: 'applicationForm',
        ...cleanFormData,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Use addDoc instead of setDoc to ensure it's a create operation
      await addDoc(
        collection(db, "applicationForms"),
        formSubmissionData
      )

      // Also update user document with application form status
      await setDoc(
        doc(db, "users", userId),
        {
          applicationFormCompleted: true,
          applicationFormData: formData,
          applicationFormSubmittedAt: serverTimestamp()
        },
        { merge: true }
      )

      toast.success("Application Form submitted successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 5000,
      })

      // Redirect to scholarship apply page (like profile form redirects to student page)
      setTimeout(() => {
        window.location.href = '/student/apply'
      }, 2000)
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("Failed to submit form. Please check your permissions and try again.", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 5000,
      })
      throw error
    }
  }

  // Map yearLevel format from stored value to form format
  const mapYearLevel = (storedValue) => {
    if (!storedValue) return ''
    const mapping = {
      '1st': 'First Year',
      '2nd': 'Second Year',
      '3rd': 'Third Year',
      '4th': 'Fourth Year',
      'First Year': 'First Year',
      'Second Year': 'Second Year',
      'Third Year': 'Third Year',
      'Fourth Year': 'Fourth Year',
      '1st Year': 'First Year',
      '2nd Year': 'Second Year',
      '3rd Year': 'Third Year',
      '4th Year': 'Fourth Year'
    }
    return mapping[storedValue] || storedValue
  }

  // Map course format from stored value to form format
  const mapCourse = (storedValue) => {
    if (!storedValue) return ''
    // Check if stored value matches any option in allCourses
    const allCourses = getAllCourses()
    if (allCourses.includes(storedValue)) {
      return storedValue
    }
    // Try to map common variations
    const mapping = {
      'BS Information Technology': 'BS Information Technology',
      'BS Computer Engineering': 'BS Computer Engineering',
      'BS Criminology': 'BS Criminology',
      'BS Criminology (ladderized)': 'BS Criminology (ladderized)',
      'BS Hotel & Restaurant Management (ladderized)': 'BS Hotel & Restaurant Management (ladderized)',
      'BS Hotel & Tourism Management': 'BS Hotel & Tourism Management',
      'BS Fisheries': 'BS Fisheries',
      'BS Entrepreneurship': 'BS Entrepreneurship',
      'Bachelor of Secondary Education': 'Bachelor of Secondary Education',
      'Bachelor of Elementary Education': 'Bachelor of Elementary Education',
      'Bachelor in Elementary Education': 'Bachelor of Elementary Education',
      'Bachelor of Arts in Political Science': 'Bachelor of Arts in Political Science',
      'Bachelor of Science in Information Technology': 'BS Information Technology',
      'Bachelor of Science in Computer Engineering': 'BS Computer Engineering',
      'Bachelor of Science in Criminology': 'BS Criminology',
    }
    return mapping[storedValue] || storedValue
  }

  const autoFillData = userData ? {
    email: userData.email || user?.email || '',
    course: mapCourse(userData.course),
    major: userData.major || (showMajor ? 'None' : 'None'),
    yearLevel: mapYearLevel(userData.yearLevel),
    studentIdNumber: userData.studentNumber || userData.studentId || '',
    contactNumber: userData.contactNumber || '',
    lastName: userData.lastName || '',
    firstName: userData.firstName || '',
    middleName: userData.middleName || ''
  } : {}

  // Update selectedCourse when userData changes
  useEffect(() => {
    if (userData?.course) {
      setSelectedCourse(userData.course)
    }
  }, [userData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Floating Banner - Matching Student Profile Form */}
      <div 
        className="fixed top-20 md:top-4 z-40 transition-all duration-300"
        style={isClient ? { 
          left: window.innerWidth >= 768 
            ? `${sidebarWidth + 16}px` 
            : '1rem',
          right: window.innerWidth >= 768 ? '1.5rem' : '1rem'
        } : {
          left: '1rem',
          right: '1rem'
        }}
      >
        <div className="bg-gradient-to-r from-primary to-secondary text-white p-4 md:p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
              <div>
                <h2 className="text-base md:text-lg font-semibold">APPLICATION FORM</h2>
                <p className="text-xs text-white/80">For Student Affairs and Services (Scholarship Unit)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Horizontal Form Matching Banner Width */}
      <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-5xl mx-auto">
          {/* Form Container - Horizontal Layout - Enhanced */}
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 w-full relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 -z-10"></div>
            <GenericForm
              formConfig={formConfig}
              initialData={autoFillData}
              autoFillData={autoFillData}
              onSubmit={handleSubmit}
              onCancel={() => window.history.back()}
              onFormDataChange={handleFormDataChange}
              horizontal={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
