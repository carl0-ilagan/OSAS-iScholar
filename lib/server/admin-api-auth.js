import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { isAdminEmail, ROLE_ADMIN } from "@/lib/role-check"

export const UNAUTHORIZED = "UNAUTHORIZED"
export const FORBIDDEN = "FORBIDDEN"

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase()
}

/**
 * @param {Request} request
 * @returns {Promise<{ decoded: import("firebase-admin/auth").DecodedIdToken }>}
 */
export async function verifyBearerToken(request) {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null
  if (!token) {
    const err = new Error(UNAUTHORIZED)
    throw err
  }
  const decoded = await getAdminAuth().verifyIdToken(token)
  return { decoded }
}

/**
 * Matches client `isPrimaryAdmin`: listed admin emails OR role `admin` on the user doc.
 * Also accepts admin email stored only on `users/{uid}.email` if the token omits it.
 * @param {import("firebase-admin/auth").DecodedIdToken} decoded
 */
export async function loadUserPrimaryAdmin(decoded) {
  if (isAdminEmail(decoded.email)) return true
  const snap = await getAdminDb().collection("users").doc(decoded.uid).get()
  const data = snap.data() || {}
  const role = normalizeRole(data.appRole || data.role)
  if (role === ROLE_ADMIN) return true
  if (isAdminEmail(data.email)) return true
  return false
}

/**
 * Primary admin only (can open /admin and audit UI).
 */
export async function requirePrimaryAdmin(request) {
  const { decoded } = await verifyBearerToken(request)
  const ok = await loadUserPrimaryAdmin(decoded)
  if (!ok) {
    const err = new Error(FORBIDDEN)
    throw err
  }
  return { decoded }
}

/**
 * Anyone who may perform auditable staff actions (primary admin or campus admin).
 */
export async function requireStaffForAuditWrite(request) {
  const { decoded } = await verifyBearerToken(request)
  if (isAdminEmail(decoded.email)) return { decoded }
  const snap = await getAdminDb().collection("users").doc(decoded.uid).get()
  const data = snap.data() || {}
  const role = normalizeRole(data.appRole || data.role)
  if (role === "admin" || role === "campus_admin" || role === "campusadmin") {
    return { decoded }
  }
  const err = new Error(FORBIDDEN)
  throw err
}

export function clientIpFromRequest(request) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim() || null
  }
  return request.headers.get("x-real-ip") || null
}
