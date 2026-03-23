/**
 * Display helpers for Firestore `users` docs (student profile).
 */

export function pickStudentDisplayName(userData) {
  if (!userData || typeof userData !== "object") return ""
  const name = String(userData.fullName || userData.displayName || "").trim()
  return name
}

/** Safe fragment for download filenames (ASCII-ish, no path chars). */
export function sanitizeForFilename(value, maxLen = 72) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
  if (!raw) return ""
  return raw.length > maxLen ? raw.slice(0, maxLen) : raw
}
