import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyBearerToken,
  loadUserPrimaryAdmin,
  nextResponseForVerifyBearerFailure,
} from "@/lib/server/admin-api-auth"
import { isAdminEmail } from "@/lib/role-check"

function jsonError(msg, status) {
  return NextResponse.json({ error: msg }, { status })
}

function toMillis(v) {
  if (v == null) return null
  if (typeof v.toMillis === "function") return v.toMillis()
  if (typeof v.toDate === "function") return v.toDate().getTime()
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

function inPeriod(ms, fromMs, toMs) {
  if (fromMs == null && toMs == null) return true
  if (ms == null) return false
  if (fromMs != null && ms < fromMs) return false
  if (toMs != null && ms > toMs) return false
  return true
}

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
}

function isStaffUser(data) {
  const r = norm(data.appRole || data.role)
  if (r === "admin" || r === "campus_admin" || r === "campusadmin") return true
  const em = String(data.email || "").trim().toLowerCase()
  if (em && isAdminEmail(em)) return true
  return false
}

function bump(map, key) {
  const k = key || "Unknown"
  map[k] = (map[k] || 0) + 1
}

/** UTC date key YYYY-MM-DD */
function utcDayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

function shortDateLabel(isoKey) {
  try {
    const [y, m, day] = isoKey.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  } catch {
    return isoKey
  }
}

/**
 * Daily buckets for trend (applications submitted + testimonials created in range).
 * Long ranges collapse to weekly sums. "All time" uses the last 60 days.
 */
function buildTrendSeries(fromMs, toMs, appsSnap, testSnap) {
  const dayMs = 86400000
  let rangeStart = fromMs
  let rangeEnd = toMs
  if (rangeStart == null || rangeEnd == null) {
    rangeEnd = Date.now()
    rangeStart = rangeEnd - 59 * dayMs
  }
  const start = Math.floor(rangeStart / dayMs) * dayMs
  const end = Math.floor(rangeEnd / dayMs) * dayMs
  const spanDays = Math.max(1, Math.round((end - start) / dayMs) + 1)

  const daily = new Map()
  for (let t = start; t <= end; t += dayMs) {
    const k = utcDayKey(t)
    daily.set(k, { key: k, applications: 0, testimonials: 0 })
  }

  const inTrendWindow = (ms) => {
    if (ms == null) return false
    const day = Math.floor(ms / dayMs) * dayMs
    return day >= start && day <= end
  }

  appsSnap.forEach((doc) => {
    const d = doc.data() || {}
    const ms = toMillis(d.submittedAt) ?? toMillis(d.updatedAt) ?? toMillis(d.createdAt)
    if (!inTrendWindow(ms)) return
    const k = utcDayKey(ms)
    const row = daily.get(k)
    if (row) row.applications += 1
  })

  testSnap.forEach((doc) => {
    const d = doc.data() || {}
    const ms = toMillis(d.createdAt)
    if (!inTrendWindow(ms)) return
    const k = utcDayKey(ms)
    const row = daily.get(k)
    if (row) row.testimonials += 1
  })

  let rows = [...daily.values()].sort((a, b) => a.key.localeCompare(b.key))
  let granularity = "day"

  if (spanDays > 40 && rows.length > 0) {
    granularity = "week"
    const weeks = []
    for (let i = 0; i < rows.length; i += 7) {
      const chunk = rows.slice(i, i + 7)
      weeks.push({
        key: chunk[0].key,
        applications: chunk.reduce((s, p) => s + p.applications, 0),
        testimonials: chunk.reduce((s, p) => s + p.testimonials, 0),
        endKey: chunk[chunk.length - 1].key,
      })
    }
    rows = weeks
  }

  const points = rows.map((p) => ({
    key: p.key,
    label:
      granularity === "week" && p.endKey
        ? `${shortDateLabel(p.key)} – ${shortDateLabel(p.endKey)}`
        : shortDateLabel(p.key),
    applications: p.applications,
    testimonials: p.testimonials,
  }))

  return { granularity, points }
}

export async function GET(request) {
  let decoded
  try {
    ;({ decoded } = await verifyBearerToken(request))
  } catch (e) {
    return nextResponseForVerifyBearerFailure(e)
  }

  try {
    const allowed = await loadUserPrimaryAdmin(decoded)
    if (!allowed) return jsonError("Forbidden", 403)
  } catch (e) {
    console.error("[reports/summary] role", e)
    return jsonError("Could not verify access", 500)
  }

  const { searchParams } = new URL(request.url)
  const preset = searchParams.get("preset") || "30d"
  const fromQ = searchParams.get("from")
  const toQ = searchParams.get("to")

  let fromMs = null
  let toMs = null

  if (fromQ && toQ) {
    fromMs = new Date(`${fromQ}T00:00:00.000Z`).getTime()
    toMs = new Date(`${toQ}T23:59:59.999Z`).getTime()
  } else if (preset === "all") {
    fromMs = null
    toMs = null
  } else {
    const days = preset === "7d" ? 7 : preset === "term" ? 120 : preset === "30d" ? 30 : 30
    toMs = Date.now()
    fromMs = toMs - days * 86400000
  }

  let db
  try {
    db = getAdminDb()
  } catch (e) {
    console.error("[reports/summary] admin db", e)
    return jsonError("Server missing Firebase Admin credentials.", 503)
  }

  let snaps
  try {
    snaps = await Promise.all([
      db.collection("applications").get(),
      db.collection("users").get(),
      db.collection("scholarships").get(),
      db.collection("testimonials").get(),
      db.collection("announcements").get(),
      db.collection("verifications").get(),
    ])
  } catch (e) {
    console.error("[reports/summary] firestore", e)
    return NextResponse.json({ error: e?.message || "Firestore query failed" }, { status: 500 })
  }

  const [appsSnap, usersSnap, scholSnap, testSnap, annSnap, verSnap] = snaps

  const byStatus = {}
  let appsInPeriod = 0
  const scholarshipCounts = {}
  const campusCounts = {}

  appsSnap.forEach((doc) => {
    const d = doc.data() || {}
    const ms = toMillis(d.submittedAt) ?? toMillis(d.updatedAt) ?? toMillis(d.createdAt)
    const st = norm(d.status) || "unknown"
    byStatus[st] = (byStatus[st] || 0) + 1
    if (inPeriod(ms, fromMs, toMs)) {
      appsInPeriod += 1
      bump(scholarshipCounts, String(d.scholarshipName || "").trim() || "—")
      bump(campusCounts, String(d.campus || "").trim() || "—")
    }
  })

  const topScholarships = Object.entries(scholarshipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const topCampuses = Object.entries(campusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  let usersTotal = 0
  let usersStaff = 0
  let usersStudents = 0
  usersSnap.forEach((doc) => {
    usersTotal += 1
    const data = doc.data() || {}
    if (isStaffUser(data)) usersStaff += 1
    else usersStudents += 1
  })

  let testimonialsInPeriod = 0
  testSnap.forEach((doc) => {
    const d = doc.data() || {}
    const ms = toMillis(d.createdAt)
    if (inPeriod(ms, fromMs, toMs)) testimonialsInPeriod += 1
  })

  let verPending = 0
  let verInPeriod = 0
  verSnap.forEach((doc) => {
    const d = doc.data() || {}
    const st = norm(d.status)
    if (st === "pending" || !d.status) verPending += 1
    const ms = toMillis(d.submittedAt) ?? toMillis(d.createdAt)
    if (inPeriod(ms, fromMs, toMs)) verInPeriod += 1
  })

  const periodLabel =
    fromMs != null && toMs != null
      ? { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString(), preset }
      : { from: null, to: null, preset: preset === "all" ? "all" : preset }

  const trendBase = buildTrendSeries(fromMs, toMs, appsSnap, testSnap)
  const trend =
    fromMs == null && toMs == null
      ? { ...trendBase, note: "All-time preset: trend shows the most recent 60 days." }
      : trendBase

  const body = {
    generatedAt: new Date().toISOString(),
    period: periodLabel,
    trend,
    applications: {
      total: appsSnap.size,
      inPeriod: appsInPeriod,
      byStatus,
      topScholarships,
      topCampuses,
    },
    users: {
      total: usersTotal,
      staff: usersStaff,
      students: usersStudents,
    },
    scholarships: { total: scholSnap.size },
    testimonials: { total: testSnap.size, inPeriod: testimonialsInPeriod },
    announcements: { total: annSnap.size },
    verifications: { total: verSnap.size, pending: verPending, submissionsInPeriod: verInPeriod },
  }

  return NextResponse.json(body)
}
