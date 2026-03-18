export const CAMPUS_MAIN = "Main Campus"
export const CAMPUS_BONGABONG = "Bongabong Campus"
export const CAMPUS_CALAPAN = "Calapan City Campus"

export const SUPPORTED_CAMPUSES = [CAMPUS_MAIN, CAMPUS_BONGABONG, CAMPUS_CALAPAN]

// Update these emails to your official campus admin accounts.
export const CAMPUS_ADMIN_ACCOUNTS = [
  { email: "main.campus.admin@minsu.edu.ph", campus: CAMPUS_MAIN, label: "Main Campus Admin" },
  { email: "bongabong.campus.admin@minsu.edu.ph", campus: CAMPUS_BONGABONG, label: "Bongabong Campus Admin" },
  { email: "calapan.campus.admin@minsu.edu.ph", campus: CAMPUS_CALAPAN, label: "Calapan Campus Admin" },
]

function normalizeText(value) {
  return String(value || "").trim().toLowerCase()
}

function normalizeCampusName(value) {
  const raw = normalizeText(value)
  if (!raw) return ""

  if (raw === "main campus" || raw === "main") return CAMPUS_MAIN
  if (raw === "bongabong campus" || raw === "bongabong") return CAMPUS_BONGABONG
  if (raw === "calapan city campus" || raw === "calapan campus" || raw === "calapan") return CAMPUS_CALAPAN
  return value
}

export function getCampusAdminProfileByEmail(email) {
  const normalizedEmail = normalizeText(email)
  if (!normalizedEmail) return null
  return CAMPUS_ADMIN_ACCOUNTS.find((item) => normalizeText(item.email) === normalizedEmail) || null
}

export function isCampusAdminEmail(email) {
  return Boolean(getCampusAdminProfileByEmail(email))
}

export function normalizeCampus(campus) {
  return normalizeCampusName(campus)
}
