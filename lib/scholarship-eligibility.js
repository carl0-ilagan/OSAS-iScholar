/**
 * Scholarship eligibility vs student profile (users doc).
 * Firestore fields (optional): eligibleCourses[], eligibleMajorsByCourse{}, requireIndigenousPeoples, requirePWD
 *
 * eligibleMajorsByCourse: { "Course Name": ["Major A", "Major B"] } — only for courses that need major filtering;
 * if a course is in eligibleCourses but has no entry (or empty array), any major is allowed for that course.
 */

import {
  profileShouldHaveMajor,
  resolveCanonicalCourseName,
  resolveCanonicalMajor,
} from "@/lib/mocas-courses-catalog"

function normalizeCourseArray(raw) {
  if (!Array.isArray(raw)) return []
  const resolved = raw
    .map((c) => resolveCanonicalCourseName(String(c).trim()))
    .filter(Boolean)
  return [...new Set(resolved)]
}

function normalizeMajorsByCourse(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  /** @type {Record<string, string[]>} */
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    const course = resolveCanonicalCourseName(String(k).trim())
    if (!course) continue
    if (!Array.isArray(v) || v.length === 0) continue
    const majors = [...new Set(v.map((m) => String(m).trim()).filter(Boolean))]
    if (majors.length) {
      out[course] = out[course] ? [...new Set([...out[course], ...majors])] : majors
    }
  }
  return out
}

/**
 * @param {{
 *   eligibleCourses?: string[]
 *   eligibleMajorsByCourse?: Record<string, string[]>
 *   requireIndigenousPeoples?: boolean
 *   requirePWD?: boolean
 * }} scholarship
 * @param {Record<string, unknown> | null | undefined} userData
 * @returns {{ eligible: boolean, reasons: string[] }}
 */
export function evaluateScholarshipEligibility(scholarship, userData) {
  const reasons = []
  const s = scholarship || {}

  if (!userData) {
    return {
      eligible: false,
      reasons: ["Sign in and complete your profile to check eligibility."],
    }
  }

  const course = resolveCanonicalCourseName(userData.course)
  const campus = String(userData.campus || "").trim()
  const major = resolveCanonicalMajor(userData.major)
  const eligibleCourses = normalizeCourseArray(s.eligibleCourses)
  const majorsByCourse = normalizeMajorsByCourse(s.eligibleMajorsByCourse)

  if (eligibleCourses.length > 0) {
    if (!course) {
      reasons.push("Add your course on your profile to apply.")
    } else if (!eligibleCourses.some((c) => c === course)) {
      reasons.push("Your course is not eligible for this scholarship.")
    } else {
      const allowedMajors = majorsByCourse[course]
      if (allowedMajors && allowedMajors.length > 0) {
        if (!major || major === "none") {
          reasons.push("Add your major on your profile — this scholarship is limited to specific majors.")
        } else if (!allowedMajors.includes(major)) {
          reasons.push("Your major is not eligible for this scholarship.")
        }
      } else if (profileShouldHaveMajor(course, campus)) {
        if (!major || major === "none") {
          reasons.push("Add your major on your profile for this program.")
        }
      }
    }
  }

  if (s.requireIndigenousPeoples === true && userData.indigenousGroup !== "Yes") {
    reasons.push("This scholarship is for Indigenous Peoples (IP) students only.")
  }

  if (s.requirePWD === true && userData.pwd !== "Yes") {
    reasons.push("This scholarship is for Persons with Disability (PWD) only.")
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  }
}
