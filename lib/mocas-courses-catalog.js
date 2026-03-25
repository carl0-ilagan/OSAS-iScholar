/**
 * MinSU undergraduate programs by campus (registrar-aligned).
 * Graduate programs excluded. Majors / specializations per campus where they differ.
 */

export const coursesByCampus = {
  "Main Campus": [
    {
      name: "Bachelor of Science in Agriculture",
      majors: ["Animal Science", "Crop Science"],
    },
    { name: "Bachelor of Science in Horticulture", majors: null },
    { name: "Bachelor of Science in Agroforestry", majors: null },
    { name: "Bachelor of Arts in English Language", majors: null },
    { name: "Bachelor of Science in Environmental Science", majors: null },
    {
      name: "Bachelor of Science in Entrepreneurship",
      majors: ["Farm Business", "Tourism Business"],
    },
    { name: "Bachelor of Science in Tourism Management", majors: null },
    { name: "Bachelor of Science in Information Technology", majors: null },
    {
      name: "Bachelor of Secondary Education",
      majors: ["English", "Filipino", "Mathematics", "Science"],
    },
    { name: "Bachelor of Elementary Education", majors: null },
    { name: "Bachelor of Agricultural and Biosystems Engineering", majors: null },
  ],
  "Calapan City Campus": [
    { name: "Bachelor of Arts in English Language", majors: null },
    { name: "Bachelor of Arts in Psychology", majors: null },
    { name: "Bachelor of Science in Tourism Management", majors: null },
    { name: "Bachelor of Science in Hospitality Management", majors: null },
    { name: "Bachelor of Science in Information Technology", majors: null },
    { name: "Bachelor of Science in Criminology", majors: null },
    {
      name: "Bachelor of Secondary Education",
      majors: ["English", "Filipino", "Mathematics", "Science"],
    },
    {
      name: "Bachelor of Technical-Vocational Teacher Education",
      majors: [
        "Food and Service Management",
        "Electronics Technology",
        "Electrical Technology",
        "Automotive Technology",
        "Drafting Technology",
        "Fashion and Garments Technology",
      ],
    },
    {
      name: "Bachelor of Technology and Livelihood Education",
      majors: ["Industrial Arts", "Home Economics"],
    },
  ],
  "Bongabong Campus": [
    { name: "Bachelor of Arts in Political Science", majors: null },
    {
      name: "Bachelor of Science in Entrepreneurship",
      majors: ["Farm Business", "Tourism Business"],
    },
    { name: "Bachelor of Science in Tourism Management", majors: null },
    { name: "Bachelor of Science in Hospitality Management", majors: null },
    { name: "Bachelor of Science in Information Technology", majors: null },
    { name: "Bachelor of Science in Computer Engineering", majors: null },
    { name: "Bachelor of Science in Criminology", majors: null },
    {
      name: "Bachelor of Secondary Education",
      majors: ["English", "Mathematics", "Science"],
    },
    { name: "Bachelor of Elementary Education", majors: null },
    { name: "Bachelor of Science in Fisheries", majors: null },
  ],
}

/** Map legacy / shortened stored course strings to current catalog names (Firestore migration UX). */
export const LEGACY_COURSE_TO_CANONICAL = {
  "BS Agriculture": "Bachelor of Science in Agriculture",
  "BS Horticulture": "Bachelor of Science in Horticulture",
  "BS Agroforestry": "Bachelor of Science in Agroforestry",
  "BS Environmental Science": "Bachelor of Science in Environmental Science",
  "BS Entrepreneurship": "Bachelor of Science in Entrepreneurship",
  "BS Agricultural & Biosystems Engineering": "Bachelor of Agricultural and Biosystems Engineering",
  "BS Information Technology": "Bachelor of Science in Information Technology",
  "BS Computer Engineering": "Bachelor of Science in Computer Engineering",
  "BS Criminology": "Bachelor of Science in Criminology",
  "BS Criminology (ladderized)": "Bachelor of Science in Criminology",
  "BS Information Technology (ladderized)": "Bachelor of Science in Information Technology",
  "BS Fisheries": "Bachelor of Science in Fisheries",
  "BS Hotel & Tourism Management": "Bachelor of Science in Tourism Management",
  "BS Hotel & Restaurant Management (ladderized)": "Bachelor of Science in Hospitality Management",
  "Bachelor in Elementary Education": "Bachelor of Elementary Education",
  "Bachelor of Science in Information Technology": "Bachelor of Science in Information Technology",
  "Bachelor of Science in Computer Engineering": "Bachelor of Science in Computer Engineering",
  "Bachelor of Science in Criminology": "Bachelor of Science in Criminology",
  "Bachelor of Technical-Vocational Teacher Education (ladderized)":
    "Bachelor of Technical-Vocational Teacher Education",
}

/** Old BSEd major labels → current catalog labels */
export const LEGACY_MAJOR_TO_CANONICAL = {
  "Biological Science": "Science",
  "Physical Sciences": "Science",
  Biology: "Science",
}

export function resolveCanonicalMajor(stored) {
  if (!stored) return ""
  const m = String(stored).trim()
  if (!m || m === "none") return m
  return LEGACY_MAJOR_TO_CANONICAL[m] || m
}

export function resolveCanonicalCourseName(stored) {
  if (!stored) return ""
  const s = String(stored).trim()
  const all = getAllCourseNames()
  if (all.includes(s)) return s
  return LEGACY_COURSE_TO_CANONICAL[s] || s
}

export function getAllCourseNames() {
  const courseSet = new Set()
  Object.values(coursesByCampus).forEach((campusCourses) => {
    campusCourses.forEach((course) => {
      courseSet.add(course.name)
    })
  })
  return Array.from(courseSet).sort((a, b) => a.localeCompare(b))
}

/** Course names offered at a given campus (for scholarship eligibility pickers). */
export function getCourseNamesForCampus(campus) {
  const c = String(campus || "").trim()
  if (!c || !coursesByCampus[c]) return getAllCourseNames()
  return coursesByCampus[c].map((row) => row.name).sort((a, b) => a.localeCompare(b))
}

export function getMajorsForCourse(courseName) {
  const resolved = resolveCanonicalCourseName(courseName)
  for (const campusCourses of Object.values(coursesByCampus)) {
    const course = campusCourses.find((c) => c.name === resolved)
    if (course && course.majors) {
      return course.majors
    }
  }
  return null
}

/** Majors list for a course at a specific campus (avoids duplicate course names across campuses). */
export function getMajorsForCourseAtCampus(courseName, campus) {
  const c = String(campus || "").trim()
  const rows = coursesByCampus[c]
  if (!rows) return null
  const resolved = resolveCanonicalCourseName(courseName)
  const course = rows.find((row) => row.name === resolved)
  if (course?.majors?.length) return course.majors
  return null
}

export function getCampusNames() {
  return Object.keys(coursesByCampus).sort((a, b) => a.localeCompare(b))
}

export function courseRequiresMajorAtCampus(courseName, campus) {
  const m = getMajorsForCourseAtCampus(courseName, campus)
  return Array.isArray(m) && m.length > 0
}

/** True if this program typically has majors (campus-specific first, then any campus in catalog). */
export function profileShouldHaveMajor(courseName, campus) {
  if (courseRequiresMajorAtCampus(courseName, campus)) return true
  const fallback = getMajorsForCourse(courseName)
  return Array.isArray(fallback) && fallback.length > 0
}
