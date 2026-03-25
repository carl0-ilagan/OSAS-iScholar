/**
 * Student "profile setup" completeness for UI (banner, gating copy).
 * Align with required fields on /student/profile.
 */

export function hasDisplayableProfilePhoto(firestorePhoto, authUserPhoto) {
  const u = String(firestorePhoto || authUserPhoto || "").trim()
  if (!u) return false
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:image/")
}

/**
 * @param {Record<string, unknown> | null | undefined} data - users/{uid} document
 * @param {{ photoURL?: string | null, providerData?: { photoURL?: string }[] } | null} [authUser]
 */
export function isStudentProfileSetupComplete(data, authUser) {
  if (!data) return false
  const fullName = String(data.fullName || data.displayName || "").trim()
  const studentNumber = String(data.studentNumber || "").trim()
  const course = String(data.course || "").trim()
  const yearLevel = String(data.yearLevel || "").trim()
  const campus = String(data.campus || "").trim()
  const authPhoto = authUser?.photoURL || authUser?.providerData?.[0]?.photoURL || null
  const fieldsOk = Boolean(fullName && studentNumber && course && yearLevel && campus)
  const photoOk = hasDisplayableProfilePhoto(data.photoURL, authPhoto)
  return fieldsOk && photoOk
}
