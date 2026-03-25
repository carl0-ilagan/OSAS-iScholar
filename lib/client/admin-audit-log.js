import { auth } from "@/lib/firebase"

/**
 * Fire-and-forget audit entry (requires signed-in staff; server validates role).
 * @param {object} payload
 * @param {string} payload.action
 * @param {string} payload.resourceType
 * @param {string} [payload.resourceId]
 * @param {string} [payload.detail]
 */
export async function submitAdminAuditLog(payload) {
  const user = auth.currentUser
  if (!user) return
  try {
    const token = await user.getIdToken()
    await fetch("/api/admin/audit-log", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.warn("[audit] submit failed", e)
  }
}
