import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"

/**
 * Append an audit entry (Admin SDK only — bypasses client rules).
 * @param {object} params
 * @param {string} [params.actorUid]
 * @param {string} [params.actorEmail]
 * @param {string} params.action
 * @param {string} params.resourceType
 * @param {string} [params.resourceId]
 * @param {string} [params.detail]
 * @param {string|null} [params.ip]
 */
export async function writeAuditLog({
  actorUid,
  actorEmail,
  action,
  resourceType,
  resourceId,
  detail,
  ip,
}) {
  const type = String(resourceType || "event").trim() || "event"
  const idPart = resourceId != null && String(resourceId).trim() ? String(resourceId).trim() : ""
  const resource = idPart ? `${type} / ${idPart}` : type

  await getAdminDb()
    .collection("auditLogs")
    .add({
      actorUid: actorUid || null,
      actorEmail: actorEmail || null,
      action: String(action || "update").trim().toLowerCase(),
      resource,
      detail: detail != null ? String(detail).slice(0, 2000) : "",
      ip: ip || null,
      createdAt: FieldValue.serverTimestamp(),
    })
}
