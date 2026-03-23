"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, where, writeBatch } from "firebase/firestore"
import { CheckCircle2, ChevronRight, Clock, FileText, FolderOpen, Loader2, Printer, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

function formatTs(ts) {
  if (!ts) return "—"
  try {
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date((ts.seconds || 0) * 1000)
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return "—"
  }
}

export default function StudentPdfFormsPage() {
  const { user } = useAuth()
  const [forms, setForms] = useState([])
  const [mySubmissions, setMySubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  async function handleDeleteSubmission(submission) {
    if (!user?.uid || submission.studentId !== user.uid) return
    const ok = window.confirm(
      `Delete this submission for "${submission.formTitle}"? This cannot be undone.`,
    )
    if (!ok) return

    setDeletingId(submission.id)
    try {
      const valSnap = await getDocs(
        query(collection(db, "submission_values"), where("submissionId", "==", submission.id)),
      )
      for (let i = 0; i < valSnap.docs.length; i += 450) {
        const batch = writeBatch(db)
        valSnap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
        await batch.commit()
      }
      await deleteDoc(doc(db, "submissions", submission.id))
      setMySubmissions((prev) => prev.filter((s) => s.id !== submission.id))
      toast.success("Submission deleted.")
    } catch (e) {
      console.error(e)
      toast.error("Could not delete submission. Try again.")
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    async function fetchForms() {
      try {
        const formsQuery = query(collection(db, "forms"), where("isActive", "==", true), orderBy("createdAt", "desc"))
        const snapshot = await getDocs(formsQuery)
        setForms(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))
      } catch (error) {
        console.error("Failed to fetch forms:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchForms()
  }, [])

  useEffect(() => {
    if (!user?.uid) {
      setMySubmissions([])
      return
    }

    async function loadMine() {
      try {
        const subQ = query(collection(db, "submissions"), where("studentId", "==", user.uid))
        const snap = await getDocs(subQ)
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        rows.sort((a, b) => {
          const ta = a.submittedAt?.toMillis?.() ?? a.updatedAt?.toMillis?.() ?? 0
          const tb = b.submittedAt?.toMillis?.() ?? b.updatedAt?.toMillis?.() ?? 0
          return tb - ta
        })
        const formIds = [...new Set(rows.map((r) => r.formId).filter(Boolean))]
        const titles = {}
        await Promise.all(
          formIds.map(async (fid) => {
            const fd = await getDoc(doc(db, "forms", fid))
            if (fd.exists()) titles[fid] = fd.data().title || "Form"
            else titles[fid] = "Form"
          }),
        )
        setMySubmissions(
          rows.map((r) => ({
            ...r,
            formTitle: titles[r.formId] || "Form",
          })),
        )
      } catch (e) {
        console.error("Failed to load submissions:", e)
      }
    }

    loadMine()
  }, [user?.uid])

  if (loading) {
    return (
      <div className="space-y-8 py-2 md:py-3">
        <div className="animate-pulse space-y-4 rounded-2xl border border-emerald-200/30 bg-white/60 p-6 dark:border-emerald-900/40 dark:bg-card/40 sm:p-8">
          <div className="h-4 w-36 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50" />
          <div className="h-10 max-w-md rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50" />
          <div className="h-4 max-w-lg rounded bg-muted" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-card/50"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 py-2 md:py-3">
      {/* Hero — same family as requirements / apply */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -bottom-8 left-1/4 h-28 w-28 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Digital forms
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl lg:text-4xl">
              Fillable PDF forms
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-900/75 dark:text-emerald-200/85 sm:text-base">
              Open a form, fill it out, and submit. After submitting, you can review, edit, and print from{" "}
              <strong>My submissions</strong> below.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm dark:border-emerald-600 dark:bg-emerald-700">
              <Sparkles className="h-4 w-4 opacity-90" />
              {forms.length} form{forms.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {user?.uid && mySubmissions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-foreground">My submissions</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Open a submission to change answers, then use <strong>Print (values only)</strong> inside the form for a clean
            copy.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {mySubmissions.map((sub) => (
              <div
                key={sub.id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-b from-white to-emerald-50/30 p-5 shadow-sm ring-1 ring-black/[0.03] dark:from-card dark:to-emerald-950/20 dark:border-emerald-800/45"
              >
                <span
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                  aria-hidden
                />
                <div className="mb-3 flex items-start gap-3 pt-1">
                  <div className="rounded-xl bg-emerald-500/15 p-2 ring-1 ring-emerald-500/15">
                    <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug text-foreground">{sub.formTitle}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Submitted {formatTs(sub.submittedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link
                    href={`/student/pdf-forms/${sub.formId}?submissionId=${sub.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700 sm:flex-initial"
                  >
                    View &amp; edit
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={`/student/pdf-forms/${sub.formId}?submissionId=${sub.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
                  >
                    <Printer className="h-4 w-4" />
                    Print (open form)
                  </a>
                  <button
                    type="button"
                    disabled={deletingId === sub.id}
                    onClick={() => handleDeleteSubmission(sub)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-300/70 bg-red-50/80 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                  >
                    {deletingId === sub.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {forms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-300/60 bg-emerald-50/40 px-6 py-14 text-center dark:border-emerald-800/50 dark:bg-emerald-950/20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
            <FolderOpen className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No forms available</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When OSAS publishes a fillable PDF, it will appear here. Check back later or contact your campus office if you were
            expecting a form.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Available forms</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {forms.map((entry) => (
              <Link
                key={entry.id}
                href={`/student/pdf-forms/${entry.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-b from-white to-emerald-50/35 p-5 shadow-sm ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:from-card dark:to-emerald-950/25 dark:border-emerald-800/45 dark:ring-white/[0.06]"
              >
                <span
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                  aria-hidden
                />
                <div className="mb-3 flex items-start justify-between gap-3 pt-1">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="rounded-xl bg-emerald-500/15 p-2.5 ring-1 ring-emerald-500/15">
                      <FileText className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold leading-snug text-foreground transition group-hover:text-emerald-800 dark:group-hover:text-emerald-200">
                        {entry.title || "Untitled form"}
                      </h2>
                      {entry.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.description}</p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Tap to open and fill in your browser.</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-emerald-600/50 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-emerald-400/60" />
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Open form
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
