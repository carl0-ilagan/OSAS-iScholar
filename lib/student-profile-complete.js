/**
 * Student "profile setup" completeness for UI (banner, gating copy).
 * Align with required fields on /student/profile.
 */

import { profileShouldHaveMajor } from "@/lib/mocas-courses-catalog"

export function hasDisplayableProfilePhoto(firestorePhoto, authUserPhoto) {
  const u = String(firestorePhoto || authUserPhoto || "").trim()
  if (!u) return false
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:image/")
}

/**
 * At least one external scholarship row on users/{uid} (name filled).
 * @param {Record<string, unknown> | null | undefined} data
 */
export function hasExternalScholarshipOnUserDoc(data) {
  const raw = data?.externalScholarships
  if (!Array.isArray(raw) || raw.length === 0) return false
  return raw.some((item) => {
    if (typeof item === "string") return item.trim().length > 0
    return String(item?.name || "").trim().length > 0
  })
}

/**
 * @param {Record<string, unknown> | null | undefined} data - users/{uid} document
 * @param {{ photoURL?: string | null, providerData?: { photoURL?: string }[] } | null} [authUser]
 * @param {{ hasApprovedScholarshipApplication?: boolean }} [options] — set true when applications query shows an approved scholarship
 */
export function isStudentProfileSetupComplete(data, authUser, options = {}) {
  if (!data) return false
  const fullName = String(data.fullName || data.displayName || "").trim()
  const studentNumber = String(data.studentNumber || "").trim()
  const course = String(data.course || "").trim()
  const yearLevel = String(data.yearLevel || "").trim()
  const campus = String(data.campus || "").trim()
  const major = String(data.major || "").trim()
  const authPhoto = authUser?.photoURL || authUser?.providerData?.[0]?.photoURL || null
  const majorOk =
    !profileShouldHaveMajor(course, campus) || (major.length > 0 && major !== "none")
  const fieldsOk = Boolean(fullName && studentNumber && course && yearLevel && campus && majorOk)
  const photoOk = hasDisplayableProfilePhoto(data.photoURL, authPhoto)

  const ig = data.indigenousGroup
  const indigenousAnswered = ig === "Yes" || ig === "No"
  const indigenousOk =
    indigenousAnswered &&
    (ig !== "Yes" || String(data.indigenousGroupType || "").trim().length > 0)

  const pwd = data.pwd
  const pwdAnswered = pwd === "Yes" || pwd === "No"
  const pwdOk =
    pwdAnswered && (pwd !== "Yes" || String(data.pwdType || "").trim().length > 0)

  const { hasApprovedScholarshipApplication = false } = options
  const scholarshipOk =
    hasExternalScholarshipOnUserDoc(data) || hasApprovedScholarshipApplication
  return fieldsOk && photoOk && indigenousOk && pwdOk && scholarshipOk
}
