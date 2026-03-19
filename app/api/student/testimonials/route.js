import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || ""
  if (!authHeader.startsWith("Bearer ")) return null
  return authHeader.slice(7).trim()
}

async function requireUser(request) {
  const token = getBearerToken(request)
  if (!token) {
    throw new Error("Unauthorized")
  }

  const adminAuth = getAdminAuth()
  const decoded = await adminAuth.verifyIdToken(token)
  if (!decoded?.uid) {
    throw new Error("Unauthorized")
  }
  return decoded
}

function serializeDoc(docSnap) {
  const data = docSnap.data() || {}
  let createdAt = null

  if (data.createdAt?.toDate) {
    createdAt = data.createdAt.toDate().toISOString()
  } else if (data.createdAt) {
    const parsed = new Date(data.createdAt)
    createdAt = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  return {
    id: docSnap.id,
    userId: data.userId || "",
    name: data.name || "Anonymous",
    photoURL: data.photoURL || null,
    testimonial: data.testimonial || "",
    rating: Number(data.rating || 0),
    scholarship: data.scholarship || "N/A",
    course: data.course || "N/A",
    campus: data.campus || "N/A",
    createdAt,
  }
}

export async function GET(request) {
  try {
    await requireUser(request)

    const adminDb = getAdminDb()
    let snapshot
    try {
      snapshot = await adminDb.collection("testimonials").orderBy("createdAt", "desc").limit(500).get()
    } catch {
      snapshot = await adminDb.collection("testimonials").limit(500).get()
    }

    const items = snapshot.docs.map(serializeDoc).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })

    return NextResponse.json({ items })
  } catch (error) {
    const status = error?.message === "Unauthorized" ? 401 : 500
    console.error("Error fetching student testimonials:", error)
    return NextResponse.json({ error: "Failed to fetch testimonials" }, { status })
  }
}

export async function POST(request) {
  try {
    const decoded = await requireUser(request)
    const body = await request.json()
    const rating = Number(body?.rating || 0)
    const scholarship = String(body?.scholarship || "").trim()
    const testimonial = String(body?.testimonial || "").trim()

    if (!scholarship) {
      return NextResponse.json({ error: "Scholarship is required." }, { status: 400 })
    }
    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial is required." }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const userRef = adminDb.collection("users").doc(decoded.uid)
    const userSnap = await userRef.get()
    const userData = userSnap.exists ? userSnap.data() || {} : {}

    const name =
      String(userData.fullName || userData.displayName || decoded.name || decoded.email || "Anonymous").trim() ||
      "Anonymous"
    const photoURL = userData.photoURL || decoded.picture || null
    const course = userData.course || "N/A"
    const campus = userData.campus || "N/A"

    const payload = {
      userId: decoded.uid,
      name,
      photoURL,
      testimonial,
      rating,
      scholarship,
      course,
      campus,
      createdAt: FieldValue.serverTimestamp(),
    }

    const added = await adminDb.collection("testimonials").add(payload)
    return NextResponse.json({ success: true, id: added.id })
  } catch (error) {
    const status = error?.message === "Unauthorized" ? 401 : 500
    console.error("Error creating student testimonial:", error)
    return NextResponse.json({ error: "Failed to submit testimonial" }, { status })
  }
}
