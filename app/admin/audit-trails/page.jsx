"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayoutWrapper from "../admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Filter, History, Loader2, RefreshCw, Search, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { auth, db } from "@/lib/firebase"
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore"

const ITEMS_PER_PAGE = 15
const FIRESTORE_AUDIT_LIMIT = 300

function mapAuditDocToEntry(docSnap) {
  const data = docSnap.data() || {}
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
    id: docSnap.id,
    actor: data.actorEmail || data.actorUid || "—",
    action: data.action || "update",
    resource: data.resource || "—",
    detail: data.detail || "",
    ip: data.ip || null,
    createdAt: createdAtIso,
  }
}

async function fetchAuditLogsFromFirestore() {
  const q = query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(FIRESTORE_AUDIT_LIMIT))
  const snap = await getDocs(q)
  return snap.docs.map(mapAuditDocToEntry)
}

function shouldTryFirestoreFallback(status, errorMessage) {
  const msg = String(errorMessage || "")
  if (status === 503) return true
  if (msg.includes("Firebase Admin")) return true
  if (msg.includes("SERVICE_ACCOUNT")) return true
  if (msg.includes("PRIVATE_KEY")) return true
  if (msg.includes("FIREBASE_PROJECT_ID")) return true
  return false
}

function actionBadge(action) {
  const a = String(action || "").toLowerCase()
  const map = {
    login: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    update: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
    approve: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    reject: "bg-red-500/15 text-red-800 dark:text-red-200",
    create: "bg-teal-500/15 text-teal-800 dark:text-teal-200",
    delete: "bg-orange-500/15 text-orange-900 dark:text-orange-200",
    delete_user: "bg-red-600/15 text-red-900 dark:text-red-200",
    disable_user: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    enable_user: "bg-lime-500/15 text-lime-900 dark:text-lime-200",
    reset_password: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
    export: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
    settings: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  }
  return map[a] || "bg-muted text-muted-foreground"
}

function formatActionLabel(action) {
  return String(action || "—").replace(/_/g, " ")
}

function formatTimestamp(iso) {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function AdminAuditTrailsPage() {
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  /** Non-error notice when data is loaded via Firestore because Admin API is unavailable */
  const [loadInfo, setLoadInfo] = useState(null)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("All")
  const [page, setPage] = useState(1)

  const fetchEntries = useCallback(async () => {
    if (!user || !auth.currentUser) {
      setEntries([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setLoadError(null)
      setLoadInfo(null)
      const token = await auth.currentUser.getIdToken(true)
      const res = await fetch("/api/admin/audit-log?limit=300", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = data?.error || `Failed to load (${res.status})`
        if (shouldTryFirestoreFallback(res.status, errMsg)) {
          try {
            const fromFs = await fetchAuditLogsFromFirestore()
            setEntries(fromFs)
            setLoadError(null)
            setLoadInfo(
              "Admin API is not configured on this machine (missing Firebase Admin credentials). Showing entries loaded directly from Firestore. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env for the API, verified tokens, and posting new audit lines from the server.",
            )
            return
          } catch (fsErr) {
            const code = fsErr?.code || ""
            const fsMsg = fsErr?.message || String(fsErr)
            setEntries([])
            setLoadError(
              code === "permission-denied"
                ? "Cannot read audit logs (Firestore permission denied). Use a primary admin account, or deploy firestore.rules with auditLogs read access."
                : `${errMsg} · Firestore fallback failed: ${fsMsg}`,
            )
            return
          }
        }
        throw new Error(errMsg)
      }
      setEntries(Array.isArray(data.entries) ? data.entries : [])
    } catch (e) {
      setLoadError(e?.message || "Failed to load audit log")
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    fetchEntries()
  }, [authLoading, fetchEntries])

  const rows = useMemo(() => {
    return entries.map((e) => ({
      id: e.id,
      at: formatTimestamp(e.createdAt),
      actor: e.actor || "—",
      action: e.action || "update",
      resource: e.resource || "—",
      detail: [e.detail, e.ip ? `IP ${e.ip}` : ""].filter(Boolean).join(" · ") || "—",
    }))
  }, [entries])

  const actionOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action).filter(Boolean))
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const filtered = useMemo(() => {
    let list = [...rows]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.actor.toLowerCase().includes(q) ||
          r.resource.toLowerCase().includes(q) ||
          r.detail.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q),
      )
    }
    if (actionFilter !== "All") {
      list = list.filter((r) => r.action === actionFilter)
    }
    return list
  }, [rows, search, actionFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const safePage = Math.min(page, totalPages)
  const sliceStart = (safePage - 1) * ITEMS_PER_PAGE
  const pageRows = filtered.slice(sliceStart, sliceStart + ITEMS_PER_PAGE)

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="w-full">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Audit trails · Activity log</CardTitle>
                      <CardDescription>
                        Records admin and campus-admin actions (applications, verifications, announcements, scholarships,
                        PDF forms, branding, user management, etc.). Student profile-only edits are not logged.
                      </CardDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchEntries()}
                    disabled={loading || !user}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Refresh
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadInfo ? (
                  <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/30 dark:text-amber-100/95">
                    {loadInfo}
                  </div>
                ) : null}
                {loadError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {loadError}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder="Search actor, resource, or detail…"
                      className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground lg:ml-2">
                      <Filter className="h-3.5 w-3.5" />
                      Action
                    </span>
                    <select
                      value={actionFilter}
                      onChange={(e) => {
                        setActionFilter(e.target.value)
                        setPage(1)
                      }}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {actionOptions.map((a) => (
                        <option key={a} value={a}>
                          {a === "All" ? "All actions" : formatActionLabel(a)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Resource</th>
                        <th className="px-4 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
                            <p className="mt-2 text-sm">Loading audit log…</p>
                          </td>
                        </tr>
                      ) : pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            {rows.length === 0
                              ? "No audit entries yet. Actions will appear here after staff perform updates in the portal."
                              : "No rows match your filters."}
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((row) => (
                          <tr key={row.id} className="bg-card/50 transition-colors hover:bg-muted/40">
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                              {row.at}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                {row.actor}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                                  actionBadge(row.action),
                                )}
                              >
                                {formatActionLabel(row.action)}
                              </span>
                            </td>
                            <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{row.resource}</td>
                            <td className="max-w-[300px] break-words px-4 py-3 text-muted-foreground">{row.detail}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
                  <p className="text-xs text-muted-foreground">
                    Showing {filtered.length === 0 ? 0 : sliceStart + 1}–
                    {Math.min(sliceStart + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                    {rows.length >= FIRESTORE_AUDIT_LIMIT ? ` (latest ${FIRESTORE_AUDIT_LIMIT})` : ""}
                    {loadInfo ? " · via Firestore" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safePage <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>
                    <span className="px-2 text-sm text-muted-foreground">
                      Page {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages || loading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}
