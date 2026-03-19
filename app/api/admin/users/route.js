import { NextResponse } from "next/server"
import { isAdminEmail } from "@/lib/role-check"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const UNAUTHORIZED_MESSAGE = "Unauthorized admin action."

async function requireSuperAdmin(request) {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

  if (!token) {
    throw new Error(UNAUTHORIZED_MESSAGE)
  }

  const adminAuth = getAdminAuth()
  const decoded = await adminAuth.verifyIdToken(token)
  if (!decoded?.email || !isAdminEmail(decoded.email)) {
    throw new Error(UNAUTHORIZED_MESSAGE)
  }

  return { adminAuth, decoded }
}

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function PATCH(request) {
  try {
    const { adminAuth, decoded } = await requireSuperAdmin(request)
    const body = await request.json()
    const targetUid = String(body?.uid || "").trim()
    const disabled = Boolean(body?.disabled)

    if (!targetUid) {
      return badRequest("Missing target uid.")
    }
    if (targetUid === decoded.uid) {
      return badRequest("You cannot disable your own account.")
    }

    const targetUser = await adminAuth.getUser(targetUid)
    if (isAdminEmail(targetUser.email)) {
      return badRequest("Admin account cannot be disabled.")
    }

    await adminAuth.updateUser(targetUid, { disabled })
    await getAdminDb()
      .collection("users")
      .doc(targetUid)
      .set(
        {
          accountDisabled: disabled,
          status: disabled ? "disabled" : "offline",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

    return NextResponse.json({ success: true, uid: targetUid, disabled })
  } catch (error) {
    const status = error?.message === UNAUTHORIZED_MESSAGE ? 401 : 500
    return NextResponse.json({ error: error.message || "Failed to update account state." }, { status })
  }
}

export async function POST(request) {
  try {
    const { adminAuth, decoded } = await requireSuperAdmin(request)
    const body = await request.json()
    const targetUid = String(body?.uid || "").trim()
    const newPassword = String(body?.newPassword || "")

    if (!targetUid) {
      return badRequest("Missing target uid.")
    }
    if (!newPassword || newPassword.length < 8) {
      return badRequest("Password must be at least 8 characters.")
    }
    if (targetUid === decoded.uid) {
      return badRequest("Use profile settings to change your own password.")
    }

    const targetUser = await adminAuth.getUser(targetUid)
    if (isAdminEmail(targetUser.email)) {
      return badRequest("Admin account password cannot be changed here.")
    }

    await adminAuth.updateUser(targetUid, {
      password: newPassword,
      disabled: false,
    })

    await getAdminDb()
      .collection("users")
      .doc(targetUid)
      .set(
        {
          accountDisabled: false,
          passwordResetByAdminAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

    return NextResponse.json({ success: true, uid: targetUid })
  } catch (error) {
    const status = error?.message === UNAUTHORIZED_MESSAGE ? 401 : 500
    return NextResponse.json({ error: error.message || "Failed to reset password." }, { status })
  }
}

export async function DELETE(request) {
  try {
    const { adminAuth, decoded } = await requireSuperAdmin(request)
    const body = await request.json()
    const targetUid = String(body?.uid || "").trim()

    if (!targetUid) {
      return badRequest("Missing target uid.")
    }
    if (targetUid === decoded.uid) {
      return badRequest("You cannot delete your own account.")
    }

    const targetUser = await adminAuth.getUser(targetUid)
    if (isAdminEmail(targetUser.email)) {
      return badRequest("Admin account cannot be deleted.")
    }

    await adminAuth.deleteUser(targetUid)
    await getAdminDb().collection("users").doc(targetUid).delete()

    return NextResponse.json({ success: true, uid: targetUid })
  } catch (error) {
    const status = error?.message === UNAUTHORIZED_MESSAGE ? 401 : 500
    return NextResponse.json({ error: error.message || "Failed to delete user account." }, { status })
  }
}
