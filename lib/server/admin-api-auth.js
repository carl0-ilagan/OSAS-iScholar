import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { isAdminEmail, ROLE_ADMIN } from "@/lib/role-check"

export const UNAUTHORIZED = "UNAUTHORIZED"
export const FORBIDDEN = "FORBIDDEN"

/** Firebase Admin failed to load (missing file on host, bad env, etc.) — not the user's ID token. */
function isFirebaseAdminConfigurationError(err) {
  const msg = String(err?.message || err || "")
  return (
    msg.includes("Could not read Firebase service account") ||
    msg.includes("Missing Firebase Admin credentials") ||
    (msg.includes("ENOENT") && msg.toLowerCase().includes("json"))
  )
}

/**
 * Maps errors from verifyBearerToken / getAdminAuth to an API response.
 * Use when Admin SDK cannot load credentials on the server (common on Vercel if only a local file path is set).
 */
export function nextResponseForVerifyBearerFailure(err) {
  if (err?.message === UNAUTHORIZED) {
    return NextResponse.json(
      { error: "Missing sign-in token. Refresh the page or sign in again." },
      { status: 401 },
    )
  }
  if (isFirebaseAdminConfigurationError(err)) {
    return NextResponse.json(
      {
        error:
          "Server configuration: Firebase Admin cannot load credentials. On hosting, a path like ./service-account.json usually fails because that file is not on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON (paste the full JSON from Firebase Console), or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (use \\n in the private key). Then redeploy.",
      },
      { status: 503 },
    )
  }
  console.error("[verifyBearerToken / Admin SDK]", err)
  return NextResponse.json(
    { error: "Invalid or expired session. Try signing out and back in." },
    { status: 401 },
  )
}

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
