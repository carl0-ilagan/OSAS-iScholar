"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Filter } from "lucide-react"

// Courses data by campus - same as signup
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

export default function VerificationFilter({ 
  filterCampus, 
  filterCourse, 
  filterMajor, 
  onCampusChange, 
  onCourseChange, 
  onMajorChange 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(null) // 'campus', 'course', 'major'
  const dropdownRef = useRef(null)

  // Get available courses based on selected campus
  const availableCourses = filterCampus ? coursesByCampus[filterCampus] || [] : []
  
  // Get available majors based on selected course
  const selectedCourseData = availableCourses.find(c => c.name === filterCourse)
  const availableMajors = selectedCourseData?.majors || null

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setActiveSection(null)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isOpen])

  const getFilterText = () => {
    if (filterMajor && filterMajor !== "all") {
      return filterMajor
    }
    if (filterCourse && filterCourse !== "all") {
      return filterCourse
    }
    if (filterCampus && filterCampus !== "all") {
      return filterCampus
    }
    return "All Filters"
  }

  const handleCampusSelect = (campus) => {
    onCampusChange(campus)
    onCourseChange("all")
    onMajorChange("all")
    if (campus === "all") {
      setIsOpen(false)
      setActiveSection(null)
    } else {
      setActiveSection("course")
    }
  }

  const handleCourseSelect = (course) => {
    onCourseChange(course)
    onMajorChange("all")
    if (course === "all") {
      setIsOpen(false)
      setActiveSection(null)
    } else {
      const courseData = availableCourses.find(c => c.name === course)
      if (courseData?.majors && courseData.majors.length > 0) {
        setActiveSection("major")
      } else {
        setIsOpen(false)
        setActiveSection(null)
      }
    }
  }

  const handleMajorSelect = (major) => {
    onMajorChange(major)
    setIsOpen(false)
    setActiveSection(null)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            setActiveSection(filterCampus && filterCampus !== "all" ? "course" : "campus")
          } else {
            setActiveSection(null)
          }
        }}
        className="flex items-center justify-between gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-all duration-200 text-sm font-medium w-48 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="truncate">{getFilterText()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          {/* Campus Section */}
          {activeSection === "campus" && (
            <div className="animate-in slide-in-from-right duration-200">
              <div className="p-2 border-b border-border bg-muted/30">
                <button
                  onClick={() => setActiveSection(null)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                  Back
                </button>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto scrollbar-hide">
                <button
                  onClick={() => handleCampusSelect("all")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterCampus === "all" || !filterCampus
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  }`}
                >
                  All Campuses
                </button>
                {Object.keys(coursesByCampus).map((campus) => (
                  <button
                    key={campus}
                    onClick={() => handleCampusSelect(campus)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      filterCampus === campus 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                  >
                    {campus}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Course Section */}
          {activeSection === "course" && filterCampus && filterCampus !== "all" && (
            <div className="animate-in slide-in-from-right duration-200">
              <div className="p-2 border-b border-border bg-muted/30">
                <button
                  onClick={() => setActiveSection("campus")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                  {filterCampus}
                </button>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto scrollbar-hide">
                <button
                  onClick={() => handleCourseSelect("all")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterCourse === "all" || !filterCourse
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  }`}
                >
                  All Courses
                </button>
                {availableCourses.map((course, index) => (
                  <button
                    key={index}
                    onClick={() => handleCourseSelect(course.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      filterCourse === course.name 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                  >
                    {course.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Major Section */}
          {activeSection === "major" && filterCourse && filterCourse !== "all" && availableMajors && availableMajors.length > 0 && (
            <div className="animate-in slide-in-from-right duration-200">
              <div className="p-2 border-b border-border bg-muted/30">
                <button
                  onClick={() => setActiveSection("course")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                  {filterCourse}
                </button>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto scrollbar-hide">
                <button
                  onClick={() => handleMajorSelect("all")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterMajor === "all" || !filterMajor
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  }`}
                >
                  All Majors
                </button>
                {availableMajors.map((major, index) => (
                  <button
                    key={index}
                    onClick={() => handleMajorSelect(major)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      filterMajor === major 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                  >
                    {major}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

