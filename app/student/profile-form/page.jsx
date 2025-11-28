"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import GenericForm from "@/components/student/generic-form"
import { FileText, CheckCircle, User } from "lucide-react"

const formConfig = {
    steps: [
      {
        title: "Step 1",
        header: {
          title: "Personal & Student Information",
          description: "Please provide your personal and academic information"
        },
        fields: [
          {
            type: 'display',
            name: 'dataPrivacy',
            content: 'DATA PRIVACY NOTICE\n\nMindoro State University-Bongabong Campus is committed to protecting the privacy of the students and ensuring the safety and security of personal data under its control and custody. The personal data that will be collected will be used solely for the verification of the authenticity of student\'s data and documents, scholarship application, supporting the student\'s well-being, ensuring the safety of the students, documentation of student\'s data, accreditation and evaluation, research and other school-related purposes. The data will be kept confidential, and the information shall be disclosed only to authorized recipients of the data.'
          },
          {
            type: 'checkbox',
            name: 'dataPrivacyAgree',
            label: 'I agree and understand the Data Privacy Notice',
            required: true
          },
          {
            type: 'email',
            name: 'email',
            label: 'Email',
            placeholder: 'Enter your email',
            required: true
          },
          {
            type: 'text',
            name: 'name',
            label: 'Name (Last, First, Middle)',
            placeholder: 'Enter your full name',
            required: true
          },
          {
            type: 'multiselect',
            name: 'scholarship',
            label: 'Scholarship',
            options: [
              'CHED - TES',
              'CHED - TES under 4P\'s SWDI',
              'CHED - TES TDP',
              'CHED - TDP - IP\'s',
              'CHED Scholarship Program (CSP)',
              'DIWA',
              'PEAP',
              'Provincial Scholar',
              'DOST',
              'BFAR',
              'Caritas Manila YSLEP Scholars',
              'Municipal Scholar - Calapan',
              'Municipal Scholar - Puerto Galera',
              'Municipal Scholar - San Teodoro',
              'Municipal Scholar - Baco',
              'Municipal Scholar - Naujan',
              'Municipal Scholar - Victoria',
              'Municipal Scholar - Socorro',
              'Municipal Scholar - Pola',
              'Municipal Scholar - Pinamalayan',
              'Municipal Scholar - Gloria',
              'Municipal Scholar - Bansud',
              'Municipal Scholar - Bongabong',
              'Municipal Scholar - Roxas',
              'Municipal Scholar - Mansalay',
              'Municipal Scholar - Bulalacao',
              'MinSU Scholars - Academic',
              'MinSU Scholars - Varsity',
              'MinSU Scholars - Brass Band',
              'MinSU Scholars - Dance Troupe / Chorale',
              'MinSU Regular Scholar',
              'MinSU SAP',
              'MALAMPAYA',
              'LandBank',
              'Other CHED Scholarship',
              'COSCHO',
              'NCIP',
              'None'
            ]
          },
          {
            type: 'number',
            name: 'amountGrant',
            label: 'Amount Grant',
            placeholder: 'Enter amount'
          },
          {
            type: 'select',
            name: 'course',
            label: 'Course',
            required: true,
            disabled: false,
            options: [
              'Bachelor of Secondary Education',
              'Bachelor of Elementary Education',
              'Bachelor of Science in Criminology',
              'Bachelor of Science in Information Technology',
              'Bachelor of Science in Computer Engineering',
              'Bachelor of Arts in Political Science',
              'Bachelor of Science in Hospitality Management',
              'Bachelor of Science in Tourism Management',
              'Bachelor of Science in Fisheries',
              'Bachelor of Science in Entrepreneurship'
            ]
          },
          {
            type: 'select',
            name: 'major',
            label: 'Major',
            options: [
              'Mathematics',
              'English',
              'Science',
              'Farm Business',
              'None'
            ]
          },
          {
            type: 'select',
            name: 'yearLevel',
            label: 'Year Level',
            required: true,
            disabled: false,
            options: [
              'First Year',
              'Second Year',
              'Third Year',
              'Fourth Year'
            ]
          },
          {
            type: 'text',
            name: 'studentId',
            label: 'Student I.D. Number',
            placeholder: 'Enter your student ID',
            required: true
          },
          {
            type: 'text',
            name: 'contactNumber',
            label: 'Existing Contact Number',
            placeholder: 'Enter your contact number',
            required: true
          },
          {
            type: 'select',
            name: 'permanentAddress',
            label: 'Permanent Address',
            required: true,
            options: [
              'Puerto Galera',
              'San Teodoro',
              'Baco',
              'Calapan',
              'Pola',
              'Naujan',
              'Socorro',
              'Victoria',
              'Pinamalayan',
              'Gloria',
              'Bansud',
              'Bongabong',
              'Roxas',
              'Mansalay',
              'Bulalacao',
              'Others'
            ]
          },
          {
            type: 'radio',
            name: 'gender',
            label: 'Gender',
            required: true,
            options: [
              'Male',
              'Female',
              'Lesbian',
              'Gay',
              'Bisexual',
              'Transgender',
              'Other'
            ]
          },
          {
            type: 'select',
            name: 'civilStatus',
            label: 'Civil Status',
            required: true,
            options: [
              'Single',
              'Married',
              'Widowed',
              'Separated'
            ]
          },
          {
            type: 'date',
            name: 'birthDate',
            label: 'Birth Date',
            required: true
          },
          {
            type: 'text',
            name: 'birthPlace',
            label: 'Birth Place',
            placeholder: 'Enter your birth place',
            required: true
          },
          {
            type: 'radio',
            name: 'indigenousGroup',
            label: 'Member of Indigenous Group?',
            required: true,
            options: ['Yes', 'No']
          },
          {
            type: 'conditional',
            name: 'indigenousGroupType',
            label: 'Indigenous Group',
            fieldType: 'select',
            parentField: 'indigenousGroup',
            condition: (value) => value === 'Yes',
            defaultValue: '',
            options: [
              'Hanunuo',
              'Bangon',
              'Iraya',
              'Alangan',
              'Tadyawan',
              'Tawbuid',
              'Buhid',
              'Ratagnon',
              'Others'
            ]
          },
          {
            type: 'radio',
            name: 'pwd',
            label: 'PWD?',
            required: true,
            options: ['Yes', 'No']
          },
          {
            type: 'conditional',
            name: 'pwdType',
            label: 'PWD Type',
            fieldType: 'select',
            parentField: 'pwd',
            condition: (value) => value === 'Yes',
            defaultValue: '',
            options: [
              'Psychosocial',
              'Chronic illness',
              'Learning',
              'Mental',
              'Visual',
              'Orthopedic',
              'Communication'
            ]
          },
          {
            type: 'text',
            name: 'previousGWA',
            label: 'Previous GWA',
            placeholder: 'Enter your previous GWA'
          },
          {
            type: 'select',
            name: 'vaccinationStatus',
            label: 'Vaccination Status',
            required: true,
            options: [
              'Partially Vaccinated',
              'Fully Vaccinated',
              'First Booster',
              'Second Booster',
              'Third Booster',
              'Fourth Booster',
              'Unvaccinated'
            ]
          }
        ]
      },
      {
        title: "Step 2",
        header: {
          title: "Other Information / Family Background",
          description: "Please provide information about your family and background"
        },
        fields: [
          {
            type: 'text',
            name: 'motherName',
            label: "Mother's Name",
            placeholder: "Enter mother's name"
          },
          {
            type: 'text',
            name: 'motherOccupation',
            label: "Mother's Occupation",
            placeholder: "Enter mother's occupation"
          },
          {
            type: 'text',
            name: 'motherContact',
            label: "Mother's Contact Number",
            placeholder: "Enter mother's contact number"
          },
          {
            type: 'text',
            name: 'fatherName',
            label: "Father's Name",
            placeholder: "Enter father's name"
          },
          {
            type: 'text',
            name: 'fatherOccupation',
            label: "Father's Occupation",
            placeholder: "Enter father's occupation"
          },
          {
            type: 'text',
            name: 'fatherContact',
            label: "Father's Contact Number",
            placeholder: "Enter father's contact number"
          },
          {
            type: 'select',
            name: 'householdMembers',
            label: 'Household Members',
            options: [
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              'more than 10'
            ]
          },
          {
            type: 'radio',
            name: 'selfSupporting',
            label: 'Self-Supporting / Working Student?',
            required: true,
            options: ['Yes', 'No']
          },
          {
            type: 'select',
            name: 'numberOfSisters',
            label: 'Number of Sisters',
            options: [
              'None',
              '1',
              '2',
              '3',
              '4',
              '5 and above'
            ]
          },
          {
            type: 'select',
            name: 'numberOfBrothers',
            label: 'Number of Brothers',
            options: [
              'None',
              '1',
              '2',
              '3',
              '4',
              '5 and above'
            ]
          },
          {
            type: 'text',
            name: 'guardianName',
            label: "Guardian's Name",
            placeholder: "Enter guardian's name (if applicable)"
          },
          {
            type: 'text',
            name: 'guardianAddress',
            label: "Guardian's Address",
            placeholder: "Enter guardian's address"
          },
          {
            type: 'text',
            name: 'guardianContact',
            label: "Guardian's Contact Number",
            placeholder: "Enter guardian's contact number"
          },
          {
            type: 'select',
            name: 'socialClass',
            label: 'Social Class (Monthly Income)',
            options: [
              'Poor',
              'Low income',
              'Lower middle class',
              'Middle class',
              'Upper middle income',
              'High income',
              'Rich'
            ]
          },
          {
            type: 'radio',
            name: 'firstGeneration',
            label: 'First-generation Student?',
            required: true,
            options: ['Yes', 'No']
          },
          {
            type: 'radio',
            name: 'studentParent',
            label: 'Student Parent?',
            required: true,
            options: ['Yes', 'No']
          },
          {
            type: 'select',
            name: 'age',
            label: 'Age',
            required: true,
            options: [
              '17',
              '18',
              '19',
              '20',
              '21',
              '22',
              '23 and above'
            ]
          },
          {
            type: 'select',
            name: 'residenceType',
            label: 'Where do you reside while enrolled?',
            required: true,
            options: [
              'University Dormitory',
              'Private Boarding House',
              'House of the Family'
            ]
          },
          {
            type: 'conditional',
            name: 'boardingOwnerName',
            label: 'Name of Owner',
            fieldType: 'text',
            parentField: 'residenceType',
            condition: (value) => value === 'Private Boarding House',
            defaultValue: '',
            placeholder: 'Enter owner name'
          },
          {
            type: 'conditional',
            name: 'boardingOwnerContact',
            label: 'Owner Contact Number',
            fieldType: 'text',
            parentField: 'residenceType',
            condition: (value) => value === 'Private Boarding House',
            defaultValue: '',
            placeholder: 'Enter owner contact number'
          },
          {
            type: 'conditional',
            name: 'boardingAddress',
            label: 'Boarding House Address',
            fieldType: 'text',
            parentField: 'residenceType',
            condition: (value) => value === 'Private Boarding House',
            defaultValue: '',
            placeholder: 'Enter boarding house address'
          }
        ]
      },
      {
        title: "Step 3",
        header: {
          title: "Confirmation",
          description: "Please review your information before submitting"
        },
        fields: [
          {
            type: 'display',
            name: 'review',
            content: 'Please review all the information you have provided. Make sure all details are correct before submitting.'
          },
          {
            type: 'review',
            name: 'reviewData'
          },
          {
            type: 'checkbox',
            name: 'certify',
            label: 'I hereby certify that the information given above is true.',
            required: true
          }
        ]
      }
    ]
}

export default function StudentProfileFormPage() {
  const { user } = useAuth()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const detectSidebarWidth = () => {
      const sidebar = document.querySelector('[data-sidebar]')
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth || 256)
      }
    }

    detectSidebarWidth()
    const observer = new MutationObserver(detectSidebarWidth)
    const sidebar = document.querySelector('[data-sidebar]')
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] })
    }

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
            setUserData(userDoc.data())
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

  const handleSubmit = async (formData) => {
    if (!user?.uid) {
      toast.error("Please log in to submit the form")
      return
    }

    try {
      // Save form data to Firestore
      const formSubmissionData = {
        userId: user.uid,
        formType: 'studentProfile',
        academicYear: '2024-2025',
        semester: '2nd Semester',
        campus: 'MinSU Bongabong Campus',
        ...formData,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Save to user's profile form submissions
      await setDoc(
        doc(db, "studentProfileForms", `${user.uid}_${Date.now()}`),
        formSubmissionData
      )

      // Also update user document with profile form status, yearLevel, and course
      await setDoc(
        doc(db, "users", user.uid),
        {
          profileFormCompleted: true,
          profileFormData: formData,
          profileFormSubmittedAt: serverTimestamp(),
          yearLevel: formData.yearLevel || userData?.yearLevel, // Update yearLevel if provided
          course: formData.course || userData?.course, // Update course if provided
        },
        { merge: true }
      )

      toast.success("Student Profile Form submitted successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 5000,
      })

      // Redirect or close modal
      setTimeout(() => {
        window.location.href = '/student'
      }, 2000)
    } catch (error) {
      console.error("Error submitting form:", error)
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
    const mapping = {
      'BS Information Technology': 'Bachelor of Science in Information Technology',
      'BS Computer Engineering': 'Bachelor of Science in Computer Engineering',
      'BS Criminology': 'Bachelor of Science in Criminology',
      'BS Criminology (ladderized)': 'Bachelor of Science in Criminology',
      'BS Hotel & Restaurant Management (ladderized)': 'Bachelor of Science in Hospitality Management',
      'BS Hotel & Tourism Management': 'Bachelor of Science in Tourism Management',
      'BS Fisheries': 'Bachelor of Science in Fisheries',
      'BS Entrepreneurship': 'Bachelor of Science in Entrepreneurship',
      'Bachelor of Secondary Education': 'Bachelor of Secondary Education',
      'Bachelor of Elementary Education': 'Bachelor of Elementary Education',
      'Bachelor in Elementary Education': 'Bachelor of Elementary Education',
      'Bachelor of Arts in Political Science': 'Bachelor of Arts in Political Science',
      // Keep exact matches as is
      'Bachelor of Science in Information Technology': 'Bachelor of Science in Information Technology',
      'Bachelor of Science in Computer Engineering': 'Bachelor of Science in Computer Engineering',
      'Bachelor of Science in Criminology': 'Bachelor of Science in Criminology',
      'Bachelor of Science in Hospitality Management': 'Bachelor of Science in Hospitality Management',
      'Bachelor of Science in Tourism Management': 'Bachelor of Science in Tourism Management',
      'Bachelor of Science in Fisheries': 'Bachelor of Science in Fisheries',
      'Bachelor of Science in Entrepreneurship': 'Bachelor of Science in Entrepreneurship',
    }
    return mapping[storedValue] || storedValue
  }

  const autoFillData = userData ? {
    email: userData.email || user?.email || '',
    name: userData.fullName || userData.displayName || '',
    studentId: userData.studentNumber || '',
    contactNumber: userData.contactNumber || '',
    course: mapCourse(userData.course),
    yearLevel: mapYearLevel(userData.yearLevel),
    permanentAddress: userData.address || userData.permanentAddress || ''
  } : {}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Floating Banner - Matching Application Form Exactly */}
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
              <User className="w-5 h-5 md:w-6 md:h-6" />
              <div>
                <h2 className="text-base md:text-lg font-semibold">STUDENT&apos;S PROFILE FORM</h2>
                <p className="text-xs text-white/80">Fill out your student profile information</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Horizontal Form Matching Banner Width */}
      <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-5xl mx-auto">
          {/* Form Container - Horizontal Layout - Enhanced with Scrollable Content */}
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 w-full relative overflow-hidden max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-10rem)] flex flex-col">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 -z-10"></div>
            <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 -mr-2">
              <GenericForm
                formConfig={formConfig}
                initialData={autoFillData}
                autoFillData={autoFillData}
                onSubmit={handleSubmit}
                onCancel={() => window.history.back()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

