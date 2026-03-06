"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import AdminLayoutWrapper from "../admin-layout"
import AdminPageBanner from "@/components/admin/page-banner"
import { Users, Search, Filter, ChevronDown, FileText, User, BarChart3, PieChart, TrendingUp, Eye, Mail, Hash, GraduationCap, Calendar, CheckCircle, MapPin, Download } from "lucide-react"
import UsersTable from "@/components/admin/users-table"
import UsersTableSkeleton from "@/components/admin/users-table-skeleton"
import ActiveUsersChart from "@/components/admin/active-users-chart"
import FormViewModal from "@/components/admin/form-view-modal"
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts"
import { toast } from "sonner"

// Helper function to convert Firestore timestamps to ISO strings
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000).toISOString()
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString()
  }
  if (typeof timestamp === 'string') {
    return timestamp
  }
  return null
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [applicationForms, setApplicationForms] = useState([])
  const [studentProfileForms, setStudentProfileForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("users") // "application", "profile", or "users"
  const [selectedFormData, setSelectedFormData] = useState(null)
  const [selectedUserPhoto, setSelectedUserPhoto] = useState(null)
  const [selectedFormType, setSelectedFormType] = useState("applicationForm")
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterCampus, setFilterCampus] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)
  
  // Application Forms Table Filters and Pagination
  const [applicationTablePage, setApplicationTablePage] = useState(1)
  const [applicationFilterCourse, setApplicationFilterCourse] = useState("all")
  const [applicationFilterDisability, setApplicationFilterDisability] = useState("all") // "all", "with", "without"
  const [applicationSortBy, setApplicationSortBy] = useState("date") // "date", "name", "course"
  const [applicationSortOrder, setApplicationSortOrder] = useState("desc") // "asc", "desc"
  const APPLICATION_TABLE_ITEMS_PER_PAGE = 10

  // Student Profile Table Filters and Pagination
  const [profileTablePage, setProfileTablePage] = useState(1)
  const [profileSearchQuery, setProfileSearchQuery] = useState("")
  const [profileFilterCourse, setProfileFilterCourse] = useState("all")
  const [profileFilterYear, setProfileFilterYear] = useState("all")
  const [profileFilterScholarship, setProfileFilterScholarship] = useState("all")
  const [profileFilterMunicipality, setProfileFilterMunicipality] = useState("all")
  const [profileFilterGender, setProfileFilterGender] = useState("all")
  const [profileFilterPWD, setProfileFilterPWD] = useState("all")
  const [profileFilterIndigenous, setProfileFilterIndigenous] = useState("all")
  const [profileFilterSelfSupporting, setProfileFilterSelfSupporting] = useState("all")
  const [profileFilterStudentParent, setProfileFilterStudentParent] = useState("all")
  const [profileFilterSocialClass, setProfileFilterSocialClass] = useState("all")
  const [profileSortBy, setProfileSortBy] = useState("name") // "name", "gwa", "age", "municipality"
  const [profileSortOrder, setProfileSortOrder] = useState("asc")
  const PROFILE_TABLE_ITEMS_PER_PAGE = 10

  const ITEMS_PER_PAGE = 10
  const ADMIN_EMAIL = "contact.ischolar@gmail.com"

  // Color palette for charts
  const CHART_COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
    "#84cc16", // lime-500
    "#6366f1", // indigo-500
    "#14b8a6", // teal-500
    "#a855f7", // purple-500
  ]

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"))
        
        const usersData = []
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Filter out admin accounts - only show student users
          if (data.email === ADMIN_EMAIL) {
            continue
          }
          
          // Filter out users without valid student data
          if (!data.email || !data.email.endsWith("@minsu.edu.ph")) {
            continue
          }
          
          const hasStudentData = data.studentNumber && 
                                 data.studentNumber !== "N/A" && 
                                 data.course && 
                                 data.course !== "N/A"
          
          const hasValidName = (data.fullName && data.fullName !== "Unknown") || 
                               (data.displayName && data.displayName !== "Unknown")
          
          if (!hasStudentData || !hasValidName) {
            continue
          }
          
          usersData.push({
            id: docSnap.id,
            uid: data.uid || docSnap.id,
            email: data.email || "N/A",
            fullName: data.fullName || data.displayName || "Unknown",
            displayName: data.displayName || data.fullName || "Unknown",
            studentNumber: data.studentNumber || "N/A",
            course: data.course || "N/A",
            yearLevel: data.yearLevel || "N/A",
            campus: data.campus || "N/A",
            photoURL: data.photoURL || null,
            status: data.status || "offline",
            createdAt: data.createdAt || data.updatedAt || null,
            lastSeen: data.lastSeen || null,
          })
        }
        usersData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Fetch Application Forms
  useEffect(() => {
    const fetchApplicationForms = async () => {
      try {
        const snapshot = await getDocs(collection(db, "applicationForms"))
        const formsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setApplicationForms(formsData)
      } catch (error) {
        console.error("Error fetching application forms:", error)
      }
    }
    fetchApplicationForms()
  }, [])

  // Fetch Student Profile Forms
  useEffect(() => {
    const fetchStudentProfileForms = async () => {
      try {
        const snapshot = await getDocs(collection(db, "studentProfileForms"))
        const formsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setStudentProfileForms(formsData)
      } catch (error) {
        console.error("Error fetching student profile forms:", error)
      }
    }
    fetchStudentProfileForms()
  }, [])

  // Get unique values for filters
  const uniqueCourses = useMemo(() => {
    const courses = [...new Set(users.map(user => user.course).filter(c => c && c !== "N/A"))]
    return courses.sort()
  }, [users])

  const uniqueCampuses = useMemo(() => {
    const campuses = [...new Set(users.map(user => user.campus).filter(c => c && c !== "N/A"))]
    return campuses.sort()
  }, [users])

  // Calculate statistics for Student Profile tab
  const profileStatistics = useMemo(() => {
    const forms = studentProfileForms
    
    // Quick Overview Statistics
    const totalApplicants = forms.length
    let totalScholars = 0
    let totalNonScholars = 0
    let totalIndigenous = 0
    let totalPWD = 0
    let totalWorking = 0
    let totalStudentParents = 0
    
    // Distribution objects
    const scholarshipDistribution = { "TES": 0, "TDP": 0, "LGU": 0, "MinSU": 0, "Other": 0, "None": 0 }
    const genderDistribution = { "Male": 0, "Female": 0, "Lesbian": 0, "Gay": 0, "Bisexual": 0, "Transgender": 0, "Other": 0 }
    const civilStatusDistribution = { "Single": 0, "Married": 0, "Widowed": 0, "Separated": 0 }
    const yearLevelDistribution = { "1st": 0, "2nd": 0, "3rd": 0, "4th": 0 }
    const residenceTypeDistribution = { "University Dormitory": 0, "Private Boarding House": 0, "House of the Family": 0, "Guardian": 0 }
    const indigenousGroupDistribution = { "Hanunuo": 0, "Bangon": 0, "Iraya": 0, "Alangan": 0, "Tadyawan": 0, "Tawbuid": 0, "Buhid": 0, "Ratagnon": 0, "Others": 0, "N/A": 0 }
    const pwdTypeDistribution = { "Psychosocial": 0, "Chronic illness": 0, "Learning": 0, "Mental": 0, "Visual": 0, "Orthopedic": 0, "Communication": 0, "None/N/A": 0 }
    const vaccinationStatusDistribution = { "Partially Vaccinated": 0, "Fully Vaccinated": 0, "First Booster": 0, "Second Booster": 0, "Third Booster": 0, "Fourth Booster": 0, "Unvaccinated": 0 }
    const socialClassDistribution = { "Poor": 0, "Low income": 0, "Lower middle class": 0, "Middle class": 0, "Upper middle income": 0, "High income": 0, "Rich": 0 }
    const ageGroupDistribution = { "17": 0, "18": 0, "19": 0, "20": 0, "21": 0, "22": 0, "23+": 0 }
    const municipalityDistribution = {}
    const courseDistribution = {}
    const dailySubmissions = {}
    
    forms.forEach(form => {
      const formData = form.formData || form
      
      // Scholarships
      const scholarships = formData.scholarship || []
      const hasScholarship = Array.isArray(scholarships) ? scholarships.some(s => s && s !== "None") : (scholarships && scholarships !== "None")
      if (hasScholarship) {
        totalScholars++
        // Categorize scholarships
        if (Array.isArray(scholarships)) {
          scholarships.forEach(sch => {
            if (sch && sch !== "None") {
              if (sch.includes("TES")) scholarshipDistribution["TES"]++
              else if (sch.includes("TDP")) scholarshipDistribution["TDP"]++
              else if (sch.includes("Municipal") || sch.includes("Provincial") || sch.includes("LGU")) scholarshipDistribution["LGU"]++
              else if (sch.includes("MinSU") || sch.includes("Academic") || sch.includes("Varsity") || sch.includes("SAP")) scholarshipDistribution["MinSU"]++
              else scholarshipDistribution["Other"]++
            }
          })
        }
      } else {
        totalNonScholars++
        scholarshipDistribution["None"]++
      }
      
      // Indigenous
      if (formData.indigenousGroup === "Yes") {
        totalIndigenous++
        const group = formData.indigenousGroupType || "N/A"
        indigenousGroupDistribution[group] = (indigenousGroupDistribution[group] || 0) + 1
      } else {
        indigenousGroupDistribution["N/A"]++
      }
      
      // PWD
      if (formData.pwd === "Yes") {
        totalPWD++
        const pwdType = formData.pwdType || "None/N/A"
        pwdTypeDistribution[pwdType] = (pwdTypeDistribution[pwdType] || 0) + 1
      } else {
        pwdTypeDistribution["None/N/A"]++
      }
      
      // Working/Self-Supporting
      if (formData.selfSupporting === "Yes") {
        totalWorking++
      }
      
      // Student Parent
      if (formData.studentParent === "Yes") {
        totalStudentParents++
      }
      
      // Gender
      const gender = formData.gender || "Unknown"
      if (genderDistribution.hasOwnProperty(gender)) {
        genderDistribution[gender]++
      }
      
      // Civil Status
      const civilStatus = formData.civilStatus || "Unknown"
      if (civilStatusDistribution.hasOwnProperty(civilStatus)) {
        civilStatusDistribution[civilStatus]++
      }
      
      // Year Level
      const yearLevel = formData.yearLevel || ""
      if (yearLevel.includes("First") || yearLevel.includes("1st")) yearLevelDistribution["1st"]++
      else if (yearLevel.includes("Second") || yearLevel.includes("2nd")) yearLevelDistribution["2nd"]++
      else if (yearLevel.includes("Third") || yearLevel.includes("3rd")) yearLevelDistribution["3rd"]++
      else if (yearLevel.includes("Fourth") || yearLevel.includes("4th")) yearLevelDistribution["4th"]++
      
      // Residence Type
      const residenceType = formData.residenceType || ""
      if (residenceType.includes("Dormitory")) residenceTypeDistribution["University Dormitory"]++
      else if (residenceType.includes("Boarding")) residenceTypeDistribution["Private Boarding House"]++
      else if (residenceType.includes("Family")) residenceTypeDistribution["House of the Family"]++
      else if (residenceType.includes("Guardian")) residenceTypeDistribution["Guardian"]++
      
      // Vaccination Status
      const vaccination = formData.vaccinationStatus || ""
      if (vaccinationStatusDistribution.hasOwnProperty(vaccination)) {
        vaccinationStatusDistribution[vaccination]++
      }
      
      // Social Class
      const socialClass = formData.socialClass || ""
      if (socialClassDistribution.hasOwnProperty(socialClass)) {
        socialClassDistribution[socialClass]++
      }
      
      // Age Group
      const age = formData.age || ""
      if (age === "23 and above") ageGroupDistribution["23+"]++
      else if (ageGroupDistribution.hasOwnProperty(age)) {
        ageGroupDistribution[age]++
      }
      
      // Municipality
      const municipality = formData.permanentAddress || "Unknown"
      municipalityDistribution[municipality] = (municipalityDistribution[municipality] || 0) + 1
      
      // Course
      const course = formData.course || "Unknown"
      courseDistribution[course] = (courseDistribution[course] || 0) + 1
      
      // Daily Submissions
      const submittedAt = form.submittedAt || formData.submittedAt
      if (submittedAt) {
        try {
          const date = new Date(submittedAt)
          if (!isNaN(date.getTime())) {
            const dateKey = date.toISOString().split('T')[0]
            dailySubmissions[dateKey] = (dailySubmissions[dateKey] || 0) + 1
          }
        } catch (error) {
          console.error("Error parsing date:", submittedAt, error)
        }
      }
    })
    
    return {
      totalApplicants,
      totalScholars,
      totalNonScholars,
      totalIndigenous,
      totalPWD,
      totalWorking,
      totalStudentParents,
      scholarshipDistribution,
      genderDistribution,
      civilStatusDistribution,
      yearLevelDistribution,
      residenceTypeDistribution,
      indigenousGroupDistribution,
      pwdTypeDistribution,
      vaccinationStatusDistribution,
      socialClassDistribution,
      ageGroupDistribution,
      municipalityDistribution,
      courseDistribution,
      dailySubmissions
    }
  }, [studentProfileForms])

  // Calculate statistics based on active tab
  const statistics = useMemo(() => {
    const forms = activeTab === "application" ? applicationForms : studentProfileForms
    
    // Total responses
    const totalResponses = forms.length
    
    // Course distribution
    const courseDistribution = {}
    forms.forEach(form => {
      const course = form.course || form.formData?.course || "Unknown"
      courseDistribution[course] = (courseDistribution[course] || 0) + 1
    })
    
    // Year level distribution
    const yearLevelDistribution = {}
    forms.forEach(form => {
      const yearLevel = form.yearLevel || form.formData?.yearLevel || "Unknown"
      yearLevelDistribution[yearLevel] = (yearLevelDistribution[yearLevel] || 0) + 1
    })
    
    // Disability statistics
    const disabilityStats = {
      withDisability: [],
      disabilityTypes: {}
    }
    
    forms.forEach(form => {
      const personWithDisability = form.personWithDisability || form.formData?.personWithDisability
      const typeOfDisability = form.typeOfDisability || form.formData?.typeOfDisability
      
      if (personWithDisability === "Yes" || personWithDisability === true) {
        const userName = form.name || form.formData?.name || form.studentName || "Unknown"
        const userEmail = form.email || form.formData?.email || "N/A"
        const course = form.course || form.formData?.course || "N/A"
        
        disabilityStats.withDisability.push({
          name: userName,
          email: userEmail,
          course: course,
          disabilityType: typeOfDisability || "Not specified"
        })
        
        const disabilityType = typeOfDisability || "Not specified"
        disabilityStats.disabilityTypes[disabilityType] = (disabilityStats.disabilityTypes[disabilityType] || 0) + 1
      }
    })
    
    // Gender distribution
    const genderDistribution = {}
    forms.forEach(form => {
      const gender = form.gender || form.formData?.gender || "Unknown"
      const normalizedGender = gender.toUpperCase() === "MALE" ? "Male" : gender.toUpperCase() === "FEMALE" ? "Female" : gender
      genderDistribution[normalizedGender] = (genderDistribution[normalizedGender] || 0) + 1
    })
    
    // Civil Status distribution
    const civilStatusDistribution = {}
    forms.forEach(form => {
      const civilStatus = form.civilStatus || form.formData?.civilStatus || "Unknown"
      civilStatusDistribution[civilStatus] = (civilStatusDistribution[civilStatus] || 0) + 1
    })
    
    // Residence Type distribution
    const residenceTypeDistribution = {}
    forms.forEach(form => {
      const residenceType = form.residingAt || form.formData?.residingAt || "Unknown"
      residenceTypeDistribution[residenceType] = (residenceTypeDistribution[residenceType] || 0) + 1
    })
    
    // PWD Yes/No distribution
    const pwdDistribution = { "Yes": 0, "No": 0 }
    forms.forEach(form => {
      const personWithDisability = form.personWithDisability || form.formData?.personWithDisability
      if (personWithDisability === "Yes" || personWithDisability === true) {
        pwdDistribution["Yes"]++
      } else {
        pwdDistribution["No"]++
      }
    })
    
    // Scholarship Type distribution
    const scholarshipTypeDistribution = {}
    forms.forEach(form => {
      const scholarships = form.scholarship || form.formData?.scholarship || []
      if (Array.isArray(scholarships)) {
        scholarships.forEach(scholarship => {
          if (scholarship && scholarship !== "None") {
            // Categorize scholarship types
            let category = "Other"
            if (scholarship.includes("TES")) {
              category = "TES"
            } else if (scholarship.includes("CHED")) {
              category = "CHED Scholarship"
            } else if (scholarship.includes("Municipal") || scholarship.includes("Provincial") || scholarship.includes("LGU")) {
              category = "LGU Scholarship"
            } else if (scholarship.includes("DOST") || scholarship.includes("BFAR") || scholarship.includes("LandBank") || scholarship.includes("Caritas") || scholarship.includes("MALAMPAYA")) {
              category = "Private Scholarship"
            } else if (scholarship === "None" || !scholarship) {
              category = "None"
            }
            scholarshipTypeDistribution[category] = (scholarshipTypeDistribution[category] || 0) + 1
          }
        })
      }
      // If no scholarships or all are "None", count as "None"
      if (!scholarships || scholarships.length === 0 || (Array.isArray(scholarships) && scholarships.every(s => !s || s === "None"))) {
        scholarshipTypeDistribution["None"] = (scholarshipTypeDistribution["None"] || 0) + 1
      }
    })
    
    // Daily/Weekly submission tracking
    const dailySubmissions = {}
    forms.forEach(form => {
      const submittedAt = form.submittedAt || form.formData?.submittedAt
      if (submittedAt) {
        try {
          const date = new Date(submittedAt)
          // Check if date is valid
          if (!isNaN(date.getTime())) {
            const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
            dailySubmissions[dateKey] = (dailySubmissions[dateKey] || 0) + 1
          }
        } catch (error) {
          console.error("Error parsing date:", submittedAt, error)
          // Skip invalid dates
        }
      }
    })
    
    // Campus distribution
    const campusDistribution = {}
    forms.forEach(form => {
      const campus = form.campus || form.formData?.campus || "Unknown"
      campusDistribution[campus] = (campusDistribution[campus] || 0) + 1
    })
    
    return {
      totalResponses,
      courseDistribution,
      yearLevelDistribution,
      disabilityStats,
      genderDistribution,
      civilStatusDistribution,
      residenceTypeDistribution,
      pwdDistribution,
      scholarshipTypeDistribution,
      dailySubmissions,
      campusDistribution
    }
  }, [activeTab, applicationForms, studentProfileForms])

  // Prepare chart data
  const courseChartData = useMemo(() => {
    return Object.entries(statistics.courseDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      // Show all courses, not just top 10
  }, [statistics.courseDistribution])

  const disabilityChartData = useMemo(() => {
    return Object.entries(statistics.disabilityStats.disabilityTypes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [statistics.disabilityStats.disabilityTypes])

  const yearLevelChartData = useMemo(() => {
    return Object.entries(statistics.yearLevelDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const order = ["1st", "2nd", "3rd", "4th", "First Year", "Second Year", "Third Year", "Fourth Year"]
        const indexA = order.indexOf(a.name)
        const indexB = order.indexOf(b.name)
        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return a.name.localeCompare(b.name)
      })
  }, [statistics.yearLevelDistribution])

  const campusChartData = useMemo(() => {
    return Object.entries(statistics.campusDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [statistics.campusDistribution])

  const genderChartData = useMemo(() => {
    const data = Object.entries(statistics.genderDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.name !== "Unknown")
    
    // Ensure Male and Female are always present, even if 0
    const maleCount = data.find(d => d.name === "Male")?.value || 0
    const femaleCount = data.find(d => d.name === "Female")?.value || 0
    
    return [
      { name: "Male", value: maleCount },
      { name: "Female", value: femaleCount }
    ]
  }, [statistics.genderDistribution])

  const civilStatusChartData = useMemo(() => {
    return Object.entries(statistics.civilStatusDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.name !== "Unknown")
  }, [statistics.civilStatusDistribution])

  const residenceTypeChartData = useMemo(() => {
    return Object.entries(statistics.residenceTypeDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.name !== "Unknown")
  }, [statistics.residenceTypeDistribution])

  const pwdChartData = useMemo(() => {
    return Object.entries(statistics.pwdDistribution)
      .map(([name, value]) => ({ name, value }))
  }, [statistics.pwdDistribution])

  const scholarshipTypeChartData = useMemo(() => {
    return Object.entries(statistics.scholarshipTypeDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [statistics.scholarshipTypeDistribution])

  const dailySubmissionsChartData = useMemo(() => {
    const entries = Object.entries(statistics.dailySubmissions)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30) // Last 30 days
    
    // Format dates for display
    return entries.map(entry => ({
      ...entry,
      formattedDate: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }))
  }, [statistics.dailySubmissions])

  // Prepare profile chart data
  const profileCourseChartData = useMemo(() => {
    // Map to specific course names
    const courseMap = {
      "Bachelor of Secondary Education": "BSED",
      "Bachelor of Elementary Education": "BEED",
      "Bachelor of Science in Information Technology": "BSIT",
      "Bachelor of Science in Criminology": "BSCRIM",
      "Bachelor of Science in Hospitality Management": "BSHM",
      "Bachelor of Science in Tourism Management": "BSTM",
      "Bachelor of Science in Fisheries": "BS Fisheries",
      "Bachelor of Science in Entrepreneurship": "BS Entrepreneurship",
      "Bachelor of Science in Computer Engineering": "BSCE / BSCoE",
      "Bachelor of Arts in Political Science": "AB PolSci"
    }
    
    return Object.entries(profileStatistics.courseDistribution)
      .map(([name, value]) => ({ 
        name: courseMap[name] || name, 
        value,
        originalName: name
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [profileStatistics.courseDistribution])

  const profileScholarshipChartData = useMemo(() => {
    return Object.entries(profileStatistics.scholarshipDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
  }, [profileStatistics.scholarshipDistribution])

  const profileGenderChartData = useMemo(() => {
    return Object.entries(profileStatistics.genderDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
  }, [profileStatistics.genderDistribution])

  const profileCivilStatusChartData = useMemo(() => {
    return Object.entries(profileStatistics.civilStatusDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
  }, [profileStatistics.civilStatusDistribution])

  const profileYearLevelChartData = useMemo(() => {
    return Object.entries(profileStatistics.yearLevelDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => {
        const order = ["1st", "2nd", "3rd", "4th"]
        return order.indexOf(a.name) - order.indexOf(b.name)
      })
  }, [profileStatistics.yearLevelDistribution])

  const profileResidenceTypeChartData = useMemo(() => {
    // Map to display names
    const residenceMap = {
      "University Dormitory": "University Dorm",
      "Private Boarding House": "Boarding House",
      "House of the Family": "Residential House",
      "Guardian": "Guardian"
    }
    
    return Object.entries(profileStatistics.residenceTypeDistribution)
      .map(([name, value]) => ({ 
        name: residenceMap[name] || name, 
        value 
      }))
      .filter(item => item.value > 0)
  }, [profileStatistics.residenceTypeDistribution])

  const profileIndigenousChartData = useMemo(() => {
    return Object.entries(profileStatistics.indigenousGroupDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [profileStatistics.indigenousGroupDistribution])

  const profilePWDTypeChartData = useMemo(() => {
    return Object.entries(profileStatistics.pwdTypeDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [profileStatistics.pwdTypeDistribution])

  const profileVaccinationChartData = useMemo(() => {
    // Map to display names
    const vaccinationMap = {
      "First Booster": "With Booster 1",
      "Second Booster": "With Booster 2",
      "Third Booster": "With Booster 3",
      "Fourth Booster": "With Booster 4"
    }
    
    return Object.entries(profileStatistics.vaccinationStatusDistribution)
      .map(([name, value]) => ({ 
        name: vaccinationMap[name] || name, 
        value 
      }))
      .filter(item => item.value > 0)
  }, [profileStatistics.vaccinationStatusDistribution])

  const profileSocialClassChartData = useMemo(() => {
    // Map to display names
    const socialClassMap = {
      "Low income": "Low Income",
      "Lower middle class": "Lower Middle Class",
      "Middle class": "Middle Class",
      "Upper middle income": "Upper Middle",
      "High income": "High Income (Not Rich)"
    }
    
    return Object.entries(profileStatistics.socialClassDistribution)
      .map(([name, value]) => ({ 
        name: socialClassMap[name] || name, 
        value 
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => {
        const order = ["Poor", "Low Income", "Lower Middle Class", "Middle Class", "Upper Middle", "High Income (Not Rich)", "Rich"]
        return order.indexOf(a.name) - order.indexOf(b.name)
      })
  }, [profileStatistics.socialClassDistribution])

  const profileAgeGroupChartData = useMemo(() => {
    return Object.entries(profileStatistics.ageGroupDistribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => {
        if (a.name === "23+") return 1
        if (b.name === "23+") return -1
        return parseInt(a.name) - parseInt(b.name)
      })
  }, [profileStatistics.ageGroupDistribution])

  const profileDailySubmissionsChartData = useMemo(() => {
    const entries = Object.entries(profileStatistics.dailySubmissions)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30) // Last 30 days
    
    return entries.map(entry => ({
      ...entry,
      formattedDate: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }))
  }, [profileStatistics.dailySubmissions])

  // Prepare application forms for table (with user data)
  const applicationFormsWithUsers = useMemo(() => {
    return applicationForms.map(form => {
      const userId = form.userId
      const user = users.find(u => u.id === userId || u.uid === userId)
      const submittedAt = form.submittedAt || form.formData?.submittedAt
      const submittedAtDate = submittedAt ? (convertTimestamp(submittedAt) ? new Date(convertTimestamp(submittedAt)) : null) : null
      const personWithDisability = form.personWithDisability || form.formData?.personWithDisability
      const hasDisability = personWithDisability === "Yes" || personWithDisability === true
      
      return {
        ...form,
        userName: user?.fullName || form.name || form.formData?.name || "Unknown",
        userPhotoURL: user?.photoURL || null,
        studentNumber: form.studentNumber || form.formData?.studentNumber || user?.studentNumber || "N/A",
        course: form.course || form.formData?.course || user?.course || "N/A",
        yearLevel: form.yearLevel || form.formData?.yearLevel || user?.yearLevel || "N/A",
        campus: form.campus || form.formData?.campus || user?.campus || "N/A",
        submittedDate: submittedAtDate ? submittedAtDate.toLocaleDateString() : "N/A",
        submittedAt: convertTimestamp(submittedAt),
        submittedAtTimestamp: submittedAtDate ? submittedAtDate.getTime() : 0,
        hasDisability: hasDisability,
        formData: form.formData || form
      }
    })
  }, [applicationForms, users])

  // Filter and sort application forms
  const filteredAndSortedApplicationForms = useMemo(() => {
    let filtered = [...applicationFormsWithUsers]

    // Filter by course
    if (applicationFilterCourse !== "all") {
      filtered = filtered.filter(form => form.course === applicationFilterCourse)
    }

    // Filter by disability
    if (applicationFilterDisability === "with") {
      filtered = filtered.filter(form => form.hasDisability === true)
    } else if (applicationFilterDisability === "without") {
      filtered = filtered.filter(form => form.hasDisability !== true)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      if (applicationSortBy === "date") {
        comparison = a.submittedAtTimestamp - b.submittedAtTimestamp
      } else if (applicationSortBy === "name") {
        comparison = a.userName.localeCompare(b.userName)
      } else if (applicationSortBy === "course") {
        comparison = a.course.localeCompare(b.course)
      }
      
      return applicationSortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [applicationFormsWithUsers, applicationFilterCourse, applicationFilterDisability, applicationSortBy, applicationSortOrder])

  // Pagination for application forms table
  const applicationTableTotalPages = Math.ceil(filteredAndSortedApplicationForms.length / APPLICATION_TABLE_ITEMS_PER_PAGE)
  const applicationTableStartIndex = (applicationTablePage - 1) * APPLICATION_TABLE_ITEMS_PER_PAGE
  const applicationTableEndIndex = applicationTableStartIndex + APPLICATION_TABLE_ITEMS_PER_PAGE
  const paginatedApplicationForms = filteredAndSortedApplicationForms.slice(applicationTableStartIndex, applicationTableEndIndex)

  // Get unique courses for filter
  const uniqueApplicationCourses = useMemo(() => {
    const courses = [...new Set(applicationFormsWithUsers.map(form => form.course).filter(c => c && c !== "N/A"))]
    return courses.sort()
  }, [applicationFormsWithUsers])

  // Prepare profile forms for table (with user data)
  const profileFormsWithUsers = useMemo(() => {
    return studentProfileForms.map(form => {
      const userId = form.userId
      const user = users.find(u => u.id === userId || u.uid === userId)
      const formData = form.formData || form
      const submittedAt = form.submittedAt || formData.submittedAt
      const submittedAtDate = submittedAt ? (convertTimestamp(submittedAt) ? new Date(convertTimestamp(submittedAt)) : null) : null
      
      // Calculate age from birthDate if available
      let age = formData.age || null
      if (!age && formData.birthDate) {
        try {
          const birthDate = new Date(formData.birthDate)
          if (!isNaN(birthDate.getTime())) {
            const today = new Date()
            age = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--
            }
          }
        } catch (e) {
          console.error("Error calculating age:", e)
        }
      }
      
      // Get scholarship names
      const scholarships = formData.scholarship || []
      const scholarshipNames = Array.isArray(scholarships) 
        ? scholarships.filter(s => s && s !== "None").join(", ") || "None"
        : (scholarships && scholarships !== "None" ? scholarships : "None")
      
      return {
        ...form,
        userName: user?.fullName || formData.name || form.name || "Unknown",
        userPhotoURL: user?.photoURL || null,
        studentId: formData.studentId || formData.studentID || "N/A",
        course: formData.course || "N/A",
        yearLevel: formData.yearLevel || "N/A",
        gender: formData.gender || "N/A",
        scholarship: scholarshipNames,
        municipality: formData.permanentAddress || "N/A",
        contact: formData.contactNumber || "N/A",
        vaccination: formData.vaccinationStatus || "N/A",
        gwa: formData.previousGWA || "N/A",
        age: age,
        pwd: formData.pwd === "Yes",
        indigenous: formData.indigenousGroup === "Yes",
        selfSupporting: formData.selfSupporting === "Yes",
        studentParent: formData.studentParent === "Yes",
        socialClass: formData.socialClass || "N/A",
        submittedDate: submittedAtDate ? submittedAtDate.toLocaleDateString() : "N/A",
        submittedAtTimestamp: submittedAtDate ? submittedAtDate.getTime() : 0,
        formData: formData
      }
    })
  }, [studentProfileForms, users])

  // Filter and sort profile forms
  const filteredAndSortedProfileForms = useMemo(() => {
    let filtered = [...profileFormsWithUsers]

    // Search filter
    if (profileSearchQuery.trim()) {
      const query = profileSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(form => 
        form.userName?.toLowerCase().includes(query) ||
        form.studentId?.toLowerCase().includes(query) ||
        form.course?.toLowerCase().includes(query) ||
        form.municipality?.toLowerCase().includes(query)
      )
    }

    // Course filter
    if (profileFilterCourse !== "all") {
      filtered = filtered.filter(form => form.course === profileFilterCourse)
    }

    // Year filter
    if (profileFilterYear !== "all") {
      filtered = filtered.filter(form => {
        const year = form.yearLevel || ""
        return year.includes(profileFilterYear) || year === profileFilterYear
      })
    }

    // Scholarship filter
    if (profileFilterScholarship !== "all") {
      filtered = filtered.filter(form => {
        if (profileFilterScholarship === "none") return form.scholarship === "None"
        return form.scholarship.toLowerCase().includes(profileFilterScholarship.toLowerCase())
      })
    }

    // Municipality filter
    if (profileFilterMunicipality !== "all") {
      filtered = filtered.filter(form => form.municipality === profileFilterMunicipality)
    }

    // Gender filter
    if (profileFilterGender !== "all") {
      filtered = filtered.filter(form => form.gender === profileFilterGender)
    }

    // PWD filter
    if (profileFilterPWD === "with") {
      filtered = filtered.filter(form => form.pwd === true)
    } else if (profileFilterPWD === "without") {
      filtered = filtered.filter(form => form.pwd !== true)
    }

    // Indigenous filter
    if (profileFilterIndigenous === "with") {
      filtered = filtered.filter(form => form.indigenous === true)
    } else if (profileFilterIndigenous === "without") {
      filtered = filtered.filter(form => form.indigenous !== true)
    }

    // Self-Supporting filter
    if (profileFilterSelfSupporting === "yes") {
      filtered = filtered.filter(form => form.selfSupporting === true)
    } else if (profileFilterSelfSupporting === "no") {
      filtered = filtered.filter(form => form.selfSupporting !== true)
    }

    // Student Parent filter
    if (profileFilterStudentParent === "yes") {
      filtered = filtered.filter(form => form.studentParent === true)
    } else if (profileFilterStudentParent === "no") {
      filtered = filtered.filter(form => form.studentParent !== true)
    }

    // Social Class filter
    if (profileFilterSocialClass !== "all") {
      filtered = filtered.filter(form => form.socialClass === profileFilterSocialClass)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      if (profileSortBy === "name") {
        comparison = a.userName.localeCompare(b.userName)
      } else if (profileSortBy === "gwa") {
        const gwaA = parseFloat(a.gwa) || 0
        const gwaB = parseFloat(b.gwa) || 0
        comparison = gwaA - gwaB
      } else if (profileSortBy === "age") {
        const ageA = a.age || 0
        const ageB = b.age || 0
        comparison = ageA - ageB
      } else if (profileSortBy === "municipality") {
        comparison = a.municipality.localeCompare(b.municipality)
      }
      
      return profileSortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [profileFormsWithUsers, profileSearchQuery, profileFilterCourse, profileFilterYear, profileFilterScholarship, profileFilterMunicipality, profileFilterGender, profileFilterPWD, profileFilterIndigenous, profileFilterSelfSupporting, profileFilterStudentParent, profileFilterSocialClass, profileSortBy, profileSortOrder])

  // Pagination for profile forms table
  const profileTableTotalPages = Math.ceil(filteredAndSortedProfileForms.length / PROFILE_TABLE_ITEMS_PER_PAGE)
  const profileTableStartIndex = (profileTablePage - 1) * PROFILE_TABLE_ITEMS_PER_PAGE
  const profileTableEndIndex = profileTableStartIndex + PROFILE_TABLE_ITEMS_PER_PAGE
  const paginatedProfileForms = filteredAndSortedProfileForms.slice(profileTableStartIndex, profileTableEndIndex)

  // Get unique values for profile filters
  const uniqueProfileCourses = useMemo(() => {
    const courses = [...new Set(profileFormsWithUsers.map(form => form.course).filter(c => c && c !== "N/A"))]
    return courses.sort()
  }, [profileFormsWithUsers])

  const uniqueProfileMunicipalities = useMemo(() => {
    const municipalities = [...new Set(profileFormsWithUsers.map(form => form.municipality).filter(m => m && m !== "N/A"))]
    return municipalities.sort()
  }, [profileFormsWithUsers])

  // Reset to page 1 when filters change
  useEffect(() => {
    setProfileTablePage(1)
  }, [profileSearchQuery, profileFilterCourse, profileFilterYear, profileFilterScholarship, profileFilterMunicipality, profileFilterGender, profileFilterPWD, profileFilterIndigenous, profileFilterSelfSupporting, profileFilterStudentParent, profileFilterSocialClass, profileSortBy, profileSortOrder])

  // Reset to page 1 when filters change
  useEffect(() => {
    setApplicationTablePage(1)
  }, [applicationFilterCourse, applicationFilterDisability, applicationSortBy, applicationSortOrder])

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = [...users]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(user => 
        user.fullName?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.studentNumber?.toLowerCase().includes(query)
      )
    }

    if (filterCourse !== "all") {
      filtered = filtered.filter(user => user.course === filterCourse)
    }

    if (filterCampus !== "all") {
      filtered = filtered.filter(user => user.campus === filterCampus)
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(user => user.status === filterStatus)
    }

    return filtered
  }, [users, filterCourse, filterCampus, filterStatus, searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterCourse, filterCampus, filterStatus, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isFilterOpen])

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-1">
            {payload[0].name}
          </p>
          <p className="text-sm text-muted-foreground">
            Count: <span className="font-semibold text-foreground">{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        <AdminPageBanner
          icon={Users}
          title="User Management"
          description="Manage and view all registered students"
        />

        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          {/* Tab Control - Enhanced for Desktop and Mobile */}
          <div className="relative mb-6">
            <div className="flex gap-1 md:gap-2 border-b-2 border-border relative bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-md rounded-t-xl p-1.5 md:p-2 overflow-x-auto scrollbar-hide shadow-lg">
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 md:px-8 py-2.5 md:py-3.5 font-bold transition-all duration-300 relative z-10 rounded-t-lg md:rounded-t-xl whitespace-nowrap flex-shrink-0 group ${
                  activeTab === "users"
                    ? "text-primary bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-br hover:from-muted/30 hover:via-muted/20 hover:to-muted/10"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                    activeTab === "users" 
                      ? "bg-primary/20 scale-110 rotate-3" 
                      : "bg-muted/30 group-hover:bg-muted/50"
                  }`}>
                    <Users className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${activeTab === "users" ? "text-primary scale-110" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-sm md:text-base font-semibold">User Management</span>
                  {users.length > 0 && (
                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      activeTab === "users" 
                        ? "bg-primary text-primary-foreground scale-110 animate-pulse shadow-md" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {users.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("application")}
                className={`px-4 md:px-8 py-2.5 md:py-3.5 font-bold transition-all duration-300 relative z-10 rounded-t-lg md:rounded-t-xl whitespace-nowrap flex-shrink-0 group ${
                  activeTab === "application"
                    ? "text-primary bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-br hover:from-muted/30 hover:via-muted/20 hover:to-muted/10"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                    activeTab === "application" 
                      ? "bg-primary/20 scale-110 rotate-3" 
                      : "bg-muted/30 group-hover:bg-muted/50"
                  }`}>
                    <FileText className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${activeTab === "application" ? "text-primary scale-110" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-sm md:text-base font-semibold">Application Form</span>
                  {applicationForms.length > 0 && (
                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      activeTab === "application" 
                        ? "bg-primary text-primary-foreground scale-110 animate-pulse shadow-md" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {applicationForms.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 md:px-8 py-2.5 md:py-3.5 font-bold transition-all duration-300 relative z-10 rounded-t-lg md:rounded-t-xl whitespace-nowrap flex-shrink-0 group ${
                  activeTab === "profile"
                    ? "text-primary bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-br hover:from-muted/30 hover:via-muted/20 hover:to-muted/10"
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                    activeTab === "profile" 
                      ? "bg-primary/20 scale-110 rotate-3" 
                      : "bg-muted/30 group-hover:bg-muted/50"
                  }`}>
                    <User className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${activeTab === "profile" ? "text-primary scale-110" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-sm md:text-base font-semibold">Student Profile</span>
                  {studentProfileForms.length > 0 && (
                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      activeTab === "profile" 
                        ? "bg-primary text-primary-foreground scale-110 animate-pulse shadow-md" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {studentProfileForms.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Statistics Cards - Only show for Application Form tab */}
          {activeTab === "application" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Responses</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{statistics.totalResponses}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{Object.keys(statistics.courseDistribution).length}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <PieChart className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Disability</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{statistics.disabilityStats.withDisability.length}</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <Users className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {users.length > 0 ? Math.round((statistics.totalResponses / users.length) * 100) : 0}%
                  </p>
                </div>
                <div className="p-3 bg-violet-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-violet-500" />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Charts Section - Only show for Application Form tab - Enhanced */}
          {activeTab === "application" && (
            <>
          {/* A. BAR GRAPH – Number of Applicants per Course */}
          <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-xl mb-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-foreground">A. Number of Applicants per Course</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Distribution across all academic programs</p>
              </div>
            </div>
            {courseChartData.length > 0 ? (
              <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={courseChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      type="number" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      width={180}
                      tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border-2 border-primary/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                              <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-base font-extrabold text-primary">
                                {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 12, 12, 0]}
                    >
                      {courseChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#appCourseGradient${index})`}
                        />
                      ))}
                    </Bar>
                    <defs>
                      {courseChartData.map((entry, index) => (
                        <linearGradient key={`gradient-${index}`} id={`appCourseGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[450px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Charts Grid - Enhanced */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* B. BAR CHART – Gender Distribution */}
            <div className="bg-gradient-to-br from-card via-card to-secondary/5 border-2 border-secondary/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-secondary to-primary rounded-xl shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-foreground">B. Gender Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Demographic breakdown</p>
                </div>
              </div>
              {genderChartData.length > 0 ? (
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={genderChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-secondary/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                  {payload[0].payload.name}
                                </p>
                                <p className="text-base font-extrabold text-secondary">
                                  {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {((payload[0].value / statistics.totalResponses) * 100).toFixed(1)}% of total
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                        {genderChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.name === "Male" ? "#3b82f6" : "#ec4899"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* C. PIE CHART – Civil Status */}
            <div className="bg-gradient-to-br from-card via-card to-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-foreground">C. Civil Status Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Marital status breakdown</p>
                </div>
              </div>
              {civilStatusChartData.length > 0 ? (
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPieChart>
                      <Pie
                        data={civilStatusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {civilStatusChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-emerald-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                  {payload[0].name}
                                </p>
                                <p className="text-base font-extrabold text-emerald-500">
                                  {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {((payload[0].value / statistics.totalResponses) * 100).toFixed(1)}% of total
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* D. BAR GRAPH – Year Level Distribution */}
            <div className="bg-gradient-to-br from-card via-card to-amber-500/5 border-2 border-amber-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-foreground">D. Year Level Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Academic progression</p>
                </div>
              </div>
              {yearLevelChartData.length > 0 ? (
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={yearLevelChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-amber-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                  {payload[0].payload.name} Year
                                </p>
                                <p className="text-base font-extrabold text-amber-500">
                                  {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                        {yearLevelChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#appYearLevelGradient${index})`}
                          />
                        ))}
                      </Bar>
                      <defs>
                        {yearLevelChartData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`appYearLevelGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1} />
                            <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* F. PIE CHART – Residence Type */}
            <div className="bg-gradient-to-br from-card via-card to-violet-500/5 border-2 border-violet-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-foreground">F. Residence Type Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Living arrangements</p>
                </div>
              </div>
              {residenceTypeChartData.length > 0 ? (
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPieChart>
                      <Pie
                        data={residenceTypeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {residenceTypeChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-violet-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                  {payload[0].name}
                                </p>
                                <p className="text-base font-extrabold text-violet-500">
                                  {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {((payload[0].value / statistics.totalResponses) * 100).toFixed(1)}% of total
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* E. LINE GRAPH – Daily/Weekly Applicant Increase */}
          <div className="bg-gradient-to-br from-card via-card to-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-6 md:p-8 shadow-xl mb-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-foreground">E. Daily Applicant Increase</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 30 days trend analysis</p>
              </div>
            </div>
            {dailySubmissionsChartData.length > 0 ? (
              <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailySubmissionsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      dataKey="formattedDate" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border-2 border-blue-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                              <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                {payload[0].payload.date}
                              </p>
                              <p className="text-base font-extrabold text-blue-500">
                                {payload[0].value} {payload[0].value === 1 ? 'Submission' : 'Submissions'}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="url(#appLineGradient)" 
                      strokeWidth={3} 
                      dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                    />
                    <defs>
                      <linearGradient id="appLineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No data available</p>
                </div>
              </div>
            )}
          </div>

          {/* G. BAR GRAPH – Applicants with PWD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-card via-card to-amber-500/5 border-2 border-amber-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-foreground">G. Applicants with PWD</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Disability status overview</p>
                </div>
              </div>
              {pwdChartData.length > 0 ? (
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={pwdChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-amber-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                  {payload[0].payload.name}
                                </p>
                                <p className="text-base font-extrabold text-amber-500">
                                  {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                        {pwdChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.name === "Yes" ? "#f59e0b" : "#6b7280"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Disability Types Breakdown */}
            <div className="bg-gradient-to-br from-card via-card to-orange-500/5 border-2 border-orange-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-foreground">Disability Types Breakdown</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Detailed disability categories</p>
                </div>
              </div>
              {disabilityChartData.length > 0 ? (
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={disabilityChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={11}
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border-2 border-orange-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                  {payload[0].payload.name}
                                </p>
                                <p className="text-base font-extrabold text-orange-500">
                                  {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                        {disabilityChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#appDisabilityGradient${index})`}
                          />
                        ))}
                      </Bar>
                      <defs>
                        {disabilityChartData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`appDisabilityGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1} />
                            <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* H. PIE GRAPH – Existing Scholarship Type */}
          <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-xl mb-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-foreground">H. Existing Scholarship Type Distribution</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Financial assistance categories</p>
              </div>
            </div>
            {scholarshipTypeChartData.length > 0 ? (
              <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                <ResponsiveContainer width="100%" height={450}>
                  <RechartsPieChart>
                    <Pie
                      data={scholarshipTypeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={140}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {scholarshipTypeChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border-2 border-primary/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                              <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                {payload[0].name}
                              </p>
                              <p className="text-base font-extrabold text-primary">
                                {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {((payload[0].value / statistics.totalResponses) * 100).toFixed(1)}% of total
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                      formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[450px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Users with Disability List */}
          {statistics.disabilityStats.withDisability.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Users with Disability ({statistics.disabilityStats.withDisability.length})
              </h3>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {statistics.disabilityStats.withDisability.map((user, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">{user.course}</span>
                        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-500 rounded">{user.disabilityType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Application Forms Table - Only for Application Form tab */}
          {activeTab === "application" && (
            <>
              {/* Filters and Sort */}
              <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-end">
                {/* Course Filter */}
                <select
                  value={applicationFilterCourse}
                  onChange={(e) => setApplicationFilterCourse(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200 w-full md:w-auto"
                >
                  <option value="all">All Courses</option>
                  {uniqueApplicationCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
                
                {/* Disability Filter */}
                <select
                  value={applicationFilterDisability}
                  onChange={(e) => setApplicationFilterDisability(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200 w-full md:w-auto"
                >
                  <option value="all">All</option>
                  <option value="with">With Disability</option>
                  <option value="without">Without Disability</option>
                </select>
                
                {/* Sort By */}
                <select
                  value={applicationSortBy}
                  onChange={(e) => setApplicationSortBy(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200 w-full md:w-auto"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="course">Sort by Course</option>
                </select>
                
                {/* Sort Order */}
                <button
                  onClick={() => setApplicationSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors text-sm flex items-center justify-center gap-1 w-full md:w-auto"
                  title={applicationSortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {applicationSortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>

              <div className="animate-in fade-in duration-300">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-primary to-secondary">
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white">Student Number</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white">Course</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white">Year</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white">Submitted Date</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedApplicationForms.length > 0 ? (
                          paginatedApplicationForms.map((form, index) => {
                            const formData = form.formData || form
                            return (
                              <tr
                                key={form.id || index}
                                className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                                  index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    {form.userPhotoURL ? (
                                      <img
                                        src={form.userPhotoURL}
                                        alt={form.userName}
                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
                                        onError={(e) => {
                                          e.target.style.display = 'none'
                                          const fallback = e.target.nextElementSibling
                                          if (fallback) fallback.style.display = 'flex'
                                        }}
                                      />
                                    ) : null}
                                    <div 
                                      className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-sm ring-2 ring-primary/20 ${form.userPhotoURL ? 'hidden' : 'flex'}`}
                                    >
                                      {form.userName?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">{form.userName}</p>
                                      {form.submittedDate && form.submittedDate !== "N/A" && (
                                        <p className="text-xs text-muted-foreground">
                                          Submitted {form.submittedDate}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm text-foreground">{formData.email || form.email || "N/A"}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-mono text-foreground">{form.studentNumber}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm text-foreground">{form.course}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-foreground">{form.yearLevel}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm text-foreground">{form.submittedDate}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => {
                                      setSelectedFormData(formData)
                                      setSelectedUserPhoto(form.userPhotoURL)
                                      setIsFormModalOpen(true)
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View</span>
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-muted-foreground">
                              No application forms found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {paginatedApplicationForms.length > 0 ? (
                    paginatedApplicationForms.map((form) => {
                      const formData = form.formData || form
                      return (
                        <div
                          key={form.id}
                          className="bg-card border border-border rounded-xl p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            {form.userPhotoURL ? (
                              <img
                                src={form.userPhotoURL}
                                alt={form.userName}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  const fallback = e.target.nextElementSibling
                                  if (fallback) fallback.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-sm ring-2 ring-primary/20 flex-shrink-0 ${form.userPhotoURL ? 'hidden' : 'flex'}`}
                            >
                              {form.userName?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground text-base mb-1 truncate">
                                {form.userName}
                              </h3>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{formData.email || form.email || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground font-mono">{form.studentNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <GraduationCap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{form.course}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Year:</span>
                              <span className="text-foreground">{form.yearLevel}</span>
                            </div>
                            {form.submittedDate && form.submittedDate !== "N/A" && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                                <Calendar className="w-3 h-3" />
                                <span>Submitted {form.submittedDate}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-border/50">
                              <button
                                onClick={() => {
                                  setSelectedFormData(formData)
                                  setSelectedUserPhoto(form.userPhotoURL)
                                  setIsFormModalOpen(true)
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Application Form</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No application forms found</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  Showing {filteredAndSortedApplicationForms.length > 0 ? applicationTableStartIndex + 1 : 0} to {Math.min(applicationTableEndIndex, filteredAndSortedApplicationForms.length)} of {filteredAndSortedApplicationForms.length} record{filteredAndSortedApplicationForms.length !== 1 ? 's' : ''}
                </div>

                {applicationTableTotalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="md:hidden flex items-center gap-2 w-full justify-center">
                      <button
                        onClick={() => setApplicationTablePage(prev => Math.max(1, prev - 1))}
                        disabled={applicationTablePage === 1}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-foreground font-medium px-3">
                        Page {applicationTablePage} of {applicationTableTotalPages}
                      </span>
                      <button
                        onClick={() => setApplicationTablePage(prev => Math.min(applicationTableTotalPages, prev + 1))}
                        disabled={applicationTablePage === applicationTableTotalPages}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Next
                      </button>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                      <button
                        onClick={() => setApplicationTablePage(1)}
                        disabled={applicationTablePage === 1}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setApplicationTablePage(prev => Math.max(1, prev - 1))}
                        disabled={applicationTablePage === 1}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: applicationTableTotalPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === applicationTableTotalPages ||
                            (page >= applicationTablePage - 1 && page <= applicationTablePage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setApplicationTablePage(page)}
                                className={`px-3 py-2 border border-border rounded-lg text-sm transition-all duration-200 active:scale-95 ${
                                  applicationTablePage === page
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-background text-foreground hover:bg-muted"
                                }`}
                              >
                                {page}
                              </button>
                            )
                          } else if (page === applicationTablePage - 2 || page === applicationTablePage + 2) {
                            return <span key={page} className="px-2 text-muted-foreground">...</span>
                          }
                          return null
                        })}
                      </div>

                      <button
                        onClick={() => setApplicationTablePage(prev => Math.min(applicationTableTotalPages, prev + 1))}
                        disabled={applicationTablePage >= applicationTableTotalPages}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setApplicationTablePage(applicationTableTotalPages)}
                        disabled={applicationTablePage === applicationTableTotalPages}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
            </>
          )}

          {/* Student Profile Tab Content */}
          {activeTab === "profile" && (
            <>
              {/* Export Button */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Student Profile Analytics</h2>
                  <p className="text-sm text-muted-foreground mt-1">View and export student profile data</p>
                </div>
                <button
                  onClick={async () => {
                    // Export to CSV function
                    const exportToCSV = async () => {
                      try {
                        // Prepare CSV data
                        const csvRows = []
                        
                        // CSV Headers - matching Annex 1 format
                        const headers = [
                          'No.',
                          'Name (Last, First, Middle)',
                          'Student I.D. Number',
                          'Email',
                          'Contact Number',
                          'Course',
                          'Major',
                          'Year Level',
                          'Scholarship',
                          'Amount Grant',
                          'Gender',
                          'Civil Status',
                          'Date of Birth',
                          'Age',
                          'Place of Birth',
                          'Municipality',
                          'Province',
                          'Barangay',
                          'Residence Type',
                          'Indigenous Group',
                          'Indigenous Group Type',
                          'PWD',
                          'PWD Type',
                          'Self-Supporting',
                          'Student Parent',
                          'GWA',
                          'Vaccination Status',
                          'Social Class',
                          'Father\'s Name',
                          'Father\'s Occupation',
                          'Father\'s Educational Attainment',
                          'Father\'s Average Monthly Income',
                          'Mother\'s Name',
                          'Mother\'s Occupation',
                          'Mother\'s Educational Attainment',
                          'Mother\'s Average Monthly Income',
                          'Guardian\'s Name',
                          'Guardian\'s Relationship',
                          'Guardian\'s Occupation',
                          'Guardian\'s Educational Attainment',
                          'Guardian\'s Average Monthly Income',
                          'Submitted Date'
                        ]
                        
                        csvRows.push(headers.join(','))
                        
                        // Process each student profile form
                        studentProfileForms.forEach((form, index) => {
                          const formData = form.formData || form
                          const user = users.find(u => (u.id === form.userId) || (u.uid === form.userId))
                          
                          // Helper function to escape CSV values
                          const escapeCSV = (value) => {
                            if (value === null || value === undefined || value === '') return ''
                            const stringValue = String(value)
                            // If value contains comma, newline, or quote, wrap in quotes and escape quotes
                            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                              return `"${stringValue.replace(/"/g, '""')}"`
                            }
                            return stringValue
                          }
                          
                          // Helper function to format array values
                          const formatArray = (arr) => {
                            if (!arr) return ''
                            if (Array.isArray(arr)) {
                              return arr.filter(item => item && item !== 'None').join('; ')
                            }
                            return String(arr)
                          }
                          
                          // Get submitted date
                          const submittedAt = form.submittedAt || formData.submittedAt
                          const submittedDate = submittedAt 
                            ? (convertTimestamp(submittedAt) ? new Date(convertTimestamp(submittedAt)).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '')
                            : ''
                          
                          const row = [
                            index + 1, // No.
                            escapeCSV(formData.name || user?.fullName || user?.displayName || ''),
                            escapeCSV(formData.studentId || formData.studentID || user?.studentNumber || ''),
                            escapeCSV(formData.email || user?.email || ''),
                            escapeCSV(formData.contactNumber || ''),
                            escapeCSV(formData.course || user?.course || ''),
                            escapeCSV(formData.major || user?.major || ''),
                            escapeCSV(formData.yearLevel || user?.yearLevel || ''),
                            escapeCSV(formatArray(formData.scholarship)),
                            escapeCSV(formData.amountGrant || ''),
                            escapeCSV(formData.gender || ''),
                            escapeCSV(formData.civilStatus || ''),
                            escapeCSV(formData.dateOfBirth || formData.birthDate || ''),
                            escapeCSV(formData.age || ''),
                            escapeCSV(formData.placeOfBirth || ''),
                            escapeCSV(formData.municipality || formData.permanentAddress || ''),
                            escapeCSV(formData.province || ''),
                            escapeCSV(formData.barangay || ''),
                            escapeCSV(formData.residenceType || ''),
                            escapeCSV(formData.indigenousGroup || ''),
                            escapeCSV(formData.indigenousGroupType || ''),
                            escapeCSV(formData.pwd || ''),
                            escapeCSV(formData.pwdType || ''),
                            escapeCSV(formData.selfSupporting || ''),
                            escapeCSV(formData.studentParent || ''),
                            escapeCSV(formData.gwa || formData.previousGWA || ''),
                            escapeCSV(formData.vaccinationStatus || ''),
                            escapeCSV(formData.socialClass || ''),
                            escapeCSV(formData.fatherName || ''),
                            escapeCSV(formData.fatherOccupation || ''),
                            escapeCSV(formData.fatherEducation || ''),
                            escapeCSV(formData.fatherIncome || ''),
                            escapeCSV(formData.motherName || ''),
                            escapeCSV(formData.motherOccupation || ''),
                            escapeCSV(formData.motherEducation || ''),
                            escapeCSV(formData.motherIncome || ''),
                            escapeCSV(formData.guardianName || ''),
                            escapeCSV(formData.guardianRelationship || ''),
                            escapeCSV(formData.guardianOccupation || ''),
                            escapeCSV(formData.guardianEducation || ''),
                            escapeCSV(formData.guardianIncome || ''),
                            escapeCSV(submittedDate)
                          ]
                          
                          csvRows.push(row.join(','))
                        })
                        
                        // Create CSV content
                        const csvContent = csvRows.join('\n')
                        
                        // Create blob and download
                        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
                        const link = document.createElement('a')
                        const url = URL.createObjectURL(blob)
                        
                        link.setAttribute('href', url)
                        link.setAttribute('download', `Annex 1 - Endorsed List of Applicants_${new Date().toISOString().split('T')[0]}.csv`)
                        link.style.visibility = 'hidden'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        
                        // Show success message
                        toast.success(`Exported ${studentProfileForms.length} student records to CSV`, {
                          icon: <CheckCircle className="w-4 h-4" />,
                        })
                      } catch (error) {
                        console.error('Error exporting to CSV:', error)
                        toast.error('Failed to export data. Please try again.', {
                          icon: <CheckCircle className="w-4 h-4" />,
                        })
                      }
                    }
                    
                    exportToCSV()
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to CSV</span>
                </button>
              </div>
              
              {/* Quick Overview Cards - Enhanced */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Applicants</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {profileStatistics.totalApplicants}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-emerald-500/5 border-2 border-emerald-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Scholars</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                        {profileStatistics.totalScholars}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="w-7 h-7 text-emerald-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-amber-500/5 border-2 border-amber-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Non-Scholars</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                        {profileStatistics.totalNonScholars}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <User className="w-7 h-7 text-amber-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-violet-500/5 border-2 border-violet-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Indigenous</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-violet-500 to-violet-600 bg-clip-text text-transparent">
                        {profileStatistics.totalIndigenous}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-violet-500/20 to-violet-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-7 h-7 text-violet-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-red-500/5 border-2 border-red-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">PWD Students</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                        {profileStatistics.totalPWD}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <User className="w-7 h-7 text-red-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-blue-500/5 border-2 border-blue-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Working Students</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                        {profileStatistics.totalWorking}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <User className="w-7 h-7 text-blue-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-pink-500/5 border-2 border-pink-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Student Parents</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
                        {profileStatistics.totalStudentParents}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-pink-500/20 to-pink-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-7 h-7 text-pink-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-green-500/5 border-2 border-green-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Vaccinated</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                        {profileStatistics.vaccinationStatusDistribution["Fully Vaccinated"] + 
                         profileStatistics.vaccinationStatusDistribution["First Booster"] +
                         profileStatistics.vaccinationStatusDistribution["Second Booster"] +
                         profileStatistics.vaccinationStatusDistribution["Third Booster"] +
                         profileStatistics.vaccinationStatusDistribution["Fourth Booster"] || 0}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="w-7 h-7 text-green-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-indigo-500/5 border-2 border-indigo-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Municipalities</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                        {Object.keys(profileStatistics.municipalityDistribution).length}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="w-7 h-7 text-indigo-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-card via-card to-cyan-500/5 border-2 border-cyan-500/20 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Courses</p>
                      <p className="text-3xl font-extrabold text-foreground mt-2 bg-gradient-to-r from-cyan-500 to-cyan-600 bg-clip-text text-transparent">
                        {Object.keys(profileStatistics.courseDistribution).length}
                      </p>
                    </div>
                    <div className="p-3.5 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="w-7 h-7 text-cyan-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section - Enhanced */}
              {/* A. BAR GRAPH – Applicants per Course */}
              <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-xl mb-8 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-foreground">A. Applicants per Course</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Distribution across all academic programs</p>
                  </div>
                </div>
                {profileCourseChartData.length > 0 ? (
                  <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                    <ResponsiveContainer width="100%" height={450}>
                      <BarChart data={profileCourseChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                        <XAxis 
                          type="number" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12}
                          width={180}
                          tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border-2 border-primary/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                  <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                    {payload[0].payload.name}
                                  </p>
                                  <p className="text-base font-extrabold text-primary">
                                    {payload[0].value} {payload[0].value === 1 ? 'Applicant' : 'Applicants'}
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 12, 12, 0]}
                        >
                          {profileCourseChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#colorGradient${index})`}
                            />
                          ))}
                        </Bar>
                        <defs>
                          {profileCourseChartData.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={`colorGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.6} />
                            </linearGradient>
                          ))}
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[450px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">No data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Charts Grid - Enhanced */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* B. PIE GRAPH – Scholarship Distribution */}
                <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">B. Scholarship Distribution</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Types of financial assistance</p>
                    </div>
                  </div>
                  {profileScholarshipChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsPieChart>
                          <Pie
                            data={profileScholarshipChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {profileScholarshipChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-primary/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].name}
                                    </p>
                                    <p className="text-base font-extrabold text-primary">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {((payload[0].value / profileStatistics.totalApplicants) * 100).toFixed(1)}% of total
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                            formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* C. PIE GRAPH – Gender Distribution */}
                <div className="bg-gradient-to-br from-card via-card to-secondary/5 border-2 border-secondary/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-secondary to-primary rounded-xl shadow-lg">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">C. Gender Distribution</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Demographic breakdown</p>
                    </div>
                  </div>
                  {profileGenderChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsPieChart>
                          <Pie
                            data={profileGenderChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {profileGenderChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name === "Male" ? "#3b82f6" : entry.name === "Female" ? "#ec4899" : CHART_COLORS[index % CHART_COLORS.length]}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-primary/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].name}
                                    </p>
                                    <p className="text-base font-extrabold text-primary">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {((payload[0].value / profileStatistics.totalApplicants) * 100).toFixed(1)}% of total
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                            formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* D. BAR GRAPH – Civil Status */}
                <div className="bg-gradient-to-br from-card via-card to-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">D. Civil Status</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Marital status breakdown</p>
                    </div>
                  </div>
                  {profileCivilStatusChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={profileCivilStatusChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-emerald-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].payload.name}
                                    </p>
                                    <p className="text-base font-extrabold text-emerald-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {profileCivilStatusChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#civilStatusGradient${index})`}
                              />
                            ))}
                          </Bar>
                          <defs>
                            {profileCivilStatusChartData.map((entry, index) => (
                              <linearGradient key={`gradient-${index}`} id={`civilStatusGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1} />
                                <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.7} />
                              </linearGradient>
                            ))}
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* E. BAR GRAPH – Year Level Distribution */}
                <div className="bg-gradient-to-br from-card via-card to-amber-500/5 border-2 border-amber-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">E. Year Level Distribution</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Academic progression</p>
                    </div>
                  </div>
                  {profileYearLevelChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={profileYearLevelChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-amber-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].payload.name} Year
                                    </p>
                                    <p className="text-base font-extrabold text-amber-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {profileYearLevelChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#yearLevelGradient${index})`}
                              />
                            ))}
                          </Bar>
                          <defs>
                            {profileYearLevelChartData.map((entry, index) => (
                              <linearGradient key={`gradient-${index}`} id={`yearLevelGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1} />
                                <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.7} />
                              </linearGradient>
                            ))}
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* F. PIE GRAPH – Residence Type */}
                <div className="bg-gradient-to-br from-card via-card to-violet-500/5 border-2 border-violet-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">F. Residence Type</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Living arrangements</p>
                    </div>
                  </div>
                  {profileResidenceTypeChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsPieChart>
                          <Pie
                            data={profileResidenceTypeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {profileResidenceTypeChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-violet-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].name}
                                    </p>
                                    <p className="text-base font-extrabold text-violet-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {((payload[0].value / profileStatistics.totalApplicants) * 100).toFixed(1)}% of total
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                            formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* G. BAR GRAPH – Indigenous Groups */}
                <div className="bg-gradient-to-br from-card via-card to-orange-500/5 border-2 border-orange-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">G. Indigenous Groups</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Tribal affiliations</p>
                    </div>
                  </div>
                  {profileIndigenousChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={profileIndigenousChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={11}
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-orange-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].payload.name}
                                    </p>
                                    <p className="text-base font-extrabold text-orange-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {profileIndigenousChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#indigenousGradient${index})`}
                              />
                            ))}
                          </Bar>
                          <defs>
                            {profileIndigenousChartData.map((entry, index) => (
                              <linearGradient key={`gradient-${index}`} id={`indigenousGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1} />
                                <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.7} />
                              </linearGradient>
                            ))}
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* H. PIE GRAPH – PWD Types */}
                <div className="bg-gradient-to-br from-card via-card to-red-500/5 border-2 border-red-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">H. PWD Types</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Disability categories</p>
                    </div>
                  </div>
                  {profilePWDTypeChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsPieChart>
                          <Pie
                            data={profilePWDTypeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {profilePWDTypeChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-red-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].name}
                                    </p>
                                    <p className="text-base font-extrabold text-red-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {((payload[0].value / profileStatistics.totalPWD) * 100).toFixed(1)}% of PWD students
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                            formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* I. BAR GRAPH – Vaccination Status */}
                <div className="bg-gradient-to-br from-card via-card to-green-500/5 border-2 border-green-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">I. Vaccination Status</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Health protection coverage</p>
                    </div>
                  </div>
                  {profileVaccinationChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={profileVaccinationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={11}
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-green-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].payload.name}
                                    </p>
                                    <p className="text-base font-extrabold text-green-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {profileVaccinationChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name.includes("Unvaccinated") ? "#ef4444" : entry.name.includes("Partially") ? "#f59e0b" : "#10b981"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* K. BAR GRAPH – Social Class Summary */}
                <div className="bg-gradient-to-br from-card via-card to-purple-500/5 border-2 border-purple-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">K. Social Class Summary</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Socioeconomic distribution</p>
                    </div>
                  </div>
                  {profileSocialClassChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={profileSocialClassChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={11}
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-purple-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      {payload[0].payload.name}
                                    </p>
                                    <p className="text-base font-extrabold text-purple-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {profileSocialClassChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#socialClassGradient${index})`}
                              />
                            ))}
                          </Bar>
                          <defs>
                            {profileSocialClassChartData.map((entry, index) => (
                              <linearGradient key={`gradient-${index}`} id={`socialClassGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={1} />
                                <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.7} />
                              </linearGradient>
                            ))}
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* L. PIE GRAPH – Age Group */}
                <div className="bg-gradient-to-br from-card via-card to-cyan-500/5 border-2 border-cyan-500/20 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-foreground">L. Age Group</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Age demographics</p>
                    </div>
                  </div>
                  {profileAgeGroupChartData.length > 0 ? (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsPieChart>
                          <Pie
                            data={profileAgeGroupChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {profileAgeGroupChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border-2 border-cyan-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                    <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                      Age {payload[0].name}
                                    </p>
                                    <p className="text-base font-extrabold text-cyan-500">
                                      {payload[0].value} {payload[0].value === 1 ? 'Student' : 'Students'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {((payload[0].value / profileStatistics.totalApplicants) * 100).toFixed(1)}% of total
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                            formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* J. LINE GRAPH – Daily Submission Count */}
              <div className="bg-gradient-to-br from-card via-card to-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-6 md:p-8 shadow-xl mb-8 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-foreground">J. Daily Submission Count</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Last 30 days trend analysis</p>
                  </div>
                </div>
                {profileDailySubmissionsChartData.length > 0 ? (
                  <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={profileDailySubmissionsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                        <XAxis 
                          dataKey="formattedDate" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border-2 border-blue-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                  <p className="text-sm font-bold text-foreground mb-2 border-b border-border pb-2">
                                    {payload[0].payload.date}
                                  </p>
                                  <p className="text-base font-extrabold text-blue-500">
                                    {payload[0].value} {payload[0].value === 1 ? 'Submission' : 'Submissions'}
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="url(#lineGradient)" 
                          strokeWidth={3} 
                          dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                        />
                        <defs>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground bg-background/30 rounded-xl border border-border/50">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">No data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Student List Table - Enhanced */}
              <div className="bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl mb-6 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-foreground">
                        Student Profiles
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {filteredAndSortedProfileForms.length} {filteredAndSortedProfileForms.length === 1 ? 'record' : 'records'} found
                      </p>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="relative flex-1 sm:flex-initial sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profileSearchQuery}
                      onChange={(e) => setProfileSearchQuery(e.target.value)}
                      placeholder="Search by name, student ID, course..."
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <select
                    value={profileFilterCourse}
                    onChange={(e) => setProfileFilterCourse(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All Courses</option>
                    {uniqueProfileCourses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={profileFilterYear}
                    onChange={(e) => setProfileFilterYear(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All Years</option>
                    <option value="First Year">1st Year</option>
                    <option value="Second Year">2nd Year</option>
                    <option value="Third Year">3rd Year</option>
                    <option value="Fourth Year">4th Year</option>
                  </select>
                  
                  <select
                    value={profileFilterScholarship}
                    onChange={(e) => setProfileFilterScholarship(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All Scholarships</option>
                    <option value="none">None</option>
                    <option value="TES">TES</option>
                    <option value="TDP">TDP</option>
                    <option value="LGU">LGU</option>
                    <option value="MinSU">MinSU</option>
                  </select>
                  
                  <select
                    value={profileFilterMunicipality}
                    onChange={(e) => setProfileFilterMunicipality(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All Municipalities</option>
                    {uniqueProfileMunicipalities.map((municipality) => (
                      <option key={municipality} value={municipality}>
                        {municipality}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={profileFilterGender}
                    onChange={(e) => setProfileFilterGender(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Lesbian">Lesbian</option>
                    <option value="Gay">Gay</option>
                    <option value="Bisexual">Bisexual</option>
                    <option value="Transgender">Transgender</option>
                    <option value="Other">Other</option>
                  </select>
                  
                  <select
                    value={profileFilterPWD}
                    onChange={(e) => setProfileFilterPWD(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All PWD</option>
                    <option value="with">With Disability</option>
                    <option value="without">Without Disability</option>
                  </select>
                  
                  <select
                    value={profileFilterIndigenous}
                    onChange={(e) => setProfileFilterIndigenous(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All Indigenous</option>
                    <option value="with">With Indigenous</option>
                    <option value="without">Without Indigenous</option>
                  </select>
                  
                  <select
                    value={profileFilterSelfSupporting}
                    onChange={(e) => setProfileFilterSelfSupporting(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All</option>
                    <option value="yes">Self-Supporting</option>
                    <option value="no">Not Self-Supporting</option>
                  </select>
                  
                  <select
                    value={profileFilterStudentParent}
                    onChange={(e) => setProfileFilterStudentParent(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All</option>
                    <option value="yes">Student Parent</option>
                    <option value="no">Not Student Parent</option>
                  </select>
                  
                  <select
                    value={profileFilterSocialClass}
                    onChange={(e) => setProfileFilterSocialClass(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="all">All Social Classes</option>
                    <option value="Poor">Poor</option>
                    <option value="Low income">Low income</option>
                    <option value="Lower middle class">Lower middle class</option>
                    <option value="Middle class">Middle class</option>
                    <option value="Upper middle income">Upper middle income</option>
                    <option value="High income">High income</option>
                    <option value="Rich">Rich</option>
                  </select>
                  
                  <select
                    value={profileSortBy}
                    onChange={(e) => setProfileSortBy(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all w-full sm:w-auto"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="gwa">Sort by GWA</option>
                    <option value="age">Sort by Age</option>
                    <option value="municipality">Sort by Municipality</option>
                  </select>
                  
                  <button
                    onClick={() => setProfileSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors text-sm flex items-center justify-center gap-1 w-full sm:w-auto"
                    title={profileSortOrder === "asc" ? "Ascending" : "Descending"}
                  >
                    {profileSortOrder === "asc" ? "↑" : "↓"}
                  </button>
                </div>

                {/* Table */}
                <div className="animate-in fade-in duration-300">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-primary to-secondary">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Picture</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Name</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Course</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Year</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Student ID</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Gender</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Scholarship</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Municipality</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Contact</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Vaccination</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProfileForms.length > 0 ? (
                            paginatedProfileForms.map((form, index) => (
                              <tr
                                key={form.id || index}
                                className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                                  index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                                }`}
                              >
                                <td className="px-6 py-4">
                                  {form.userPhotoURL ? (
                                    <img
                                      src={form.userPhotoURL}
                                      alt={form.userName}
                                      className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
                                      onError={(e) => {
                                        e.target.style.display = 'none'
                                        const fallback = e.target.nextElementSibling
                                        if (fallback) fallback.style.display = 'flex'
                                      }}
                                    />
                                  ) : null}
                                  <div 
                                    className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-sm ring-2 ring-primary/20 ${form.userPhotoURL ? 'hidden' : 'flex'}`}
                                  >
                                    {form.userName?.[0]?.toUpperCase() || "U"}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-medium text-foreground">{form.userName}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm text-foreground">{form.course}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-foreground">{form.yearLevel}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-mono text-foreground">{form.studentId}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-foreground">{form.gender}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-foreground truncate max-w-[150px]" title={form.scholarship}>
                                    {form.scholarship}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm text-foreground">{form.municipality}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-foreground">{form.contact}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-foreground">{form.vaccination}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-600 border border-gray-500/30">
                                    Active
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => {
                                      setSelectedFormData(form.formData)
                                      setSelectedUserPhoto(form.userPhotoURL)
                                      setSelectedFormType("studentProfileForm")
                                      setIsFormModalOpen(true)
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={12} className="p-6 text-center text-muted-foreground">
                                No student profiles found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {paginatedProfileForms.length > 0 ? (
                      paginatedProfileForms.map((form) => (
                        <div
                          key={form.id}
                          className="bg-card border border-border rounded-xl p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            {form.userPhotoURL ? (
                              <img
                                src={form.userPhotoURL}
                                alt={form.userName}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  const fallback = e.target.nextElementSibling
                                  if (fallback) fallback.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-sm ring-2 ring-primary/20 flex-shrink-0 ${form.userPhotoURL ? 'hidden' : 'flex'}`}
                            >
                              {form.userName?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground text-base mb-1 truncate">
                                {form.userName}
                              </h3>
                              <p className="text-xs text-muted-foreground">{form.studentId}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <GraduationCap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{form.course}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Year:</span>
                              <span className="text-foreground">{form.yearLevel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Gender:</span>
                              <span className="text-foreground">{form.gender}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Scholarship:</span>
                              <span className="text-foreground truncate">{form.scholarship}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{form.municipality}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Contact:</span>
                              <span className="text-foreground">{form.contact}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Vaccination:</span>
                              <span className="text-foreground">{form.vaccination}</span>
                            </div>
                            <div className="pt-2 border-t border-border/50">
                              <button
                                onClick={() => {
                                  setSelectedFormData(form.formData)
                                  setSelectedUserPhoto(form.userPhotoURL)
                                  setSelectedFormType("studentProfileForm")
                                  setIsFormModalOpen(true)
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Profile</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No student profiles found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pagination */}
                <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                  <div className="text-sm text-muted-foreground text-center md:text-left">
                    Showing {filteredAndSortedProfileForms.length > 0 ? profileTableStartIndex + 1 : 0} to {Math.min(profileTableEndIndex, filteredAndSortedProfileForms.length)} of {filteredAndSortedProfileForms.length} record{filteredAndSortedProfileForms.length !== 1 ? 's' : ''}
                  </div>

                  {profileTableTotalPages > 1 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="md:hidden flex items-center gap-2 w-full justify-center">
                        <button
                          onClick={() => setProfileTablePage(prev => Math.max(1, prev - 1))}
                          disabled={profileTablePage === 1}
                          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-foreground font-medium px-3">
                          Page {profileTablePage} of {profileTableTotalPages}
                        </span>
                        <button
                          onClick={() => setProfileTablePage(prev => Math.min(profileTableTotalPages, prev + 1))}
                          disabled={profileTablePage === profileTableTotalPages}
                          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                        >
                          Next
                        </button>
                      </div>

                      <div className="hidden md:flex items-center gap-2">
                        <button
                          onClick={() => setProfileTablePage(1)}
                          disabled={profileTablePage === 1}
                          className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                        >
                          First
                        </button>
                        <button
                          onClick={() => setProfileTablePage(prev => Math.max(1, prev - 1))}
                          disabled={profileTablePage === 1}
                          className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: profileTableTotalPages }, (_, i) => i + 1).map((page) => {
                            if (
                              page === 1 ||
                              page === profileTableTotalPages ||
                              (page >= profileTablePage - 1 && page <= profileTablePage + 1)
                            ) {
                              return (
                                <button
                                  key={page}
                                  onClick={() => setProfileTablePage(page)}
                                  className={`px-3 py-2 border border-border rounded-lg text-sm transition-all duration-200 active:scale-95 ${
                                    profileTablePage === page
                                      ? "bg-primary text-primary-foreground shadow-md"
                                      : "bg-background text-foreground hover:bg-muted"
                                  }`}
                                >
                                  {page}
                                </button>
                              )
                            } else if (page === profileTablePage - 2 || page === profileTablePage + 2) {
                              return <span key={page} className="px-2 text-muted-foreground">...</span>
                            }
                            return null
                          })}
                        </div>

                        <button
                          onClick={() => setProfileTablePage(prev => Math.min(profileTableTotalPages, prev + 1))}
                          disabled={profileTablePage >= profileTableTotalPages}
                          className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => setProfileTablePage(profileTableTotalPages)}
                          disabled={profileTablePage === profileTableTotalPages}
                          className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Active Users Chart - Show for all tabs */}
          {!loading && activeTab === "users" && (
            <div className="mb-6 md:mb-8 animate-in fade-in duration-300">
              <ActiveUsersChart 
                users={users} 
                uniqueCampuses={uniqueCampuses}
                uniqueCourses={uniqueCourses}
              />
            </div>
          )}

          {/* Search and Filters - Show for User Management tab */}
          {activeTab === "users" && (
          <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-end">
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or student number..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
              />
            </div>

            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-all duration-200 text-sm font-medium w-full md:w-48 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <span>Filters</span>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-3 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Course
                      </label>
                      <select
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Courses</option>
                        {uniqueCourses.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Campus
                      </label>
                      <select
                        value={filterCampus}
                        onChange={(e) => setFilterCampus(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Campuses</option>
                        {uniqueCampuses.map((campus) => (
                          <option key={campus} value={campus}>
                            {campus}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Status
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
                      >
                        <option value="all">All Status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Users Table - Only show for User Management tab */}
          {activeTab === "users" && (
            <>
          {loading ? (
            <UsersTableSkeleton />
          ) : (
            <>
              <div className="animate-in fade-in duration-300">
                <UsersTable users={paginatedUsers} />
              </div>

              <div className="mt-6 space-y-4 animate-in fade-in duration-300">
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  Showing {filteredUsers.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} record{filteredUsers.length !== 1 ? 's' : ''}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="md:hidden flex items-center gap-2 w-full justify-center">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-foreground font-medium px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Next
                      </button>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 border border-border rounded-lg text-sm transition-all duration-200 active:scale-95 ${
                                  currentPage === page
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-background text-foreground hover:bg-muted"
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
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 hover:bg-muted active:scale-95"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
            </>
          )}
        </div>
      </div>

      {/* Application Form Modal */}
      {selectedFormData && (
        <FormViewModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false)
            setSelectedFormData(null)
            setSelectedUserPhoto(null)
            setSelectedFormType("applicationForm")
          }}
          formData={selectedFormData}
          formType={selectedFormType}
          userPhoto={selectedUserPhoto}
          formName={selectedFormType === "applicationForm" ? "Application Form" : "Student Profile Form"}
          loading={false}
        />
      )}
    </AdminLayoutWrapper>
  )
}
