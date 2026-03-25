import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { writeAuditLog } from "@/lib/server/audit-log"
import {
  requireStaffForAuditWrite,
  verifyBearerToken,
  loadUserPrimaryAdmin,
  clientIpFromRequest,
  nextResponseForVerifyBearerFailure,
  UNAUTHORIZED,
  FORBIDDEN,
} from "@/lib/server/admin-api-auth"

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status })
}

/** Primary admin: list recent audit entries */
export async function GET(request) {
  let decoded
  try {
    ;({ decoded } = await verifyBearerToken(request))
  } catch (e) {
    return nextResponseForVerifyBearerFailure(e)
  }

  try {
    const allowed = await loadUserPrimaryAdmin(decoded)
    if (!allowed) {
      return jsonError("Only primary admins can view the audit log.", 403)
    }
  } catch (e) {
    console.error("[audit-log GET] loadUserPrimaryAdmin", e)
    return jsonError("Could not verify admin access. Check Firebase Admin credentials and Firestore.", 500)
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") || "200")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200

  let snap
  try {
    snap = await getAdminDb()
      .collection("auditLogs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()
  } catch (e) {
    console.error("[audit-log GET] Firestore", e)
    const hint =
      String(e?.message || "").includes("index")
        ? " Create the Firestore composite index for auditLogs (createdAt) using the link in the server log."
        : ""
    return jsonError(`Could not load audit log.${hint}`, 500)
  }

  const entries = snap.docs.map((d) => {
    const data = d.data() || {}
    const ts = data.createdAt
    let createdAtIso = null
    if (ts && typeof ts.toDate === "function") {
      try {
        createdAtIso = ts.toDate().toISOString()
      } catch {
        createdAtIso = null
      }
    }
    return {
      id: d.id,
      actor: data.actorEmail || data.actorUid || "—",
      action: data.action || "update",
      resource: data.resource || "—",
      detail: data.detail || "",
      ip: data.ip || null,
      createdAt: createdAtIso,
    }
  })

  return NextResponse.json({ entries })
}

/** Staff: append audit line (validated server-side) */
export async function POST(request) {
  let decoded
  try {
    ;({ decoded } = await requireStaffForAuditWrite(request))
  } catch (e) {
    if (e?.message === FORBIDDEN) return jsonError("Forbidden", 403)
    return nextResponseForVerifyBearerFailure(e)
  }

  let body = {}
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON", 400)
  }

  const action = String(body?.action || "").trim().toLowerCase()
  const resourceType = String(body?.resourceType || "").trim()
  if (!action || !resourceType) {
    return jsonError("action and resourceType are required", 400)
  }

  const resourceId = body?.resourceId != null ? String(body.resourceId).trim() : ""
  const detail = body?.detail != null ? String(body.detail) : ""

  try {
    await writeAuditLog({
      actorUid: decoded.uid,
      actorEmail: decoded.email || null,
      action,
      resourceType,
      resourceId: resourceId || undefined,
      detail,
      ip: clientIpFromRequest(request),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[audit-log POST]", err)
    return jsonError("Failed to write audit entry", 500)
  }
}
