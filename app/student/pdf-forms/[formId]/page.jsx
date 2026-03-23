"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore"
import {
  ArrowLeft,
  CheckCircle2,
  Eraser,
  FileText,
  Loader2,
  PenLine,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import PdfOverlayStage from "@/components/pdf-forms/PdfOverlayStage"
import {
  deserializeSubmissionValue,
  fileToDataUrl,
  loadProtectedPdfObjectUrl,
  normalizeFieldName,
  normalizeTableRatios,
  serializeSubmissionValueForFirestore,
  withFieldDefaults,
} from "@/lib/pdf-form-utils"

function formatSubmittedAt(ts) {
  if (!ts) return ""
  try {
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date((ts.seconds || 0) * 1000)
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return ""
  }
}

function getCssFontFamily(value) {
  const family = String(value || "helvetica").toLowerCase()
  if (["times", "georgia", "garamond"].includes(family)) {
    return "Times New Roman, Georgia, serif"
  }
  if (["courier", "consolas", "monaco"].includes(family)) {
    return "Consolas, Courier New, monospace"
  }
  return "Arial, Helvetica, Verdana, sans-serif"
}

function formatDateToDdMmYyyy(rawDate) {
  const value = String(rawDate || "")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const [year, month, day] = value.split("-")
  return `${day}-${month}-${year}`
}

function resolveBackgroundColor(value) {
  const raw = String(value || "").trim()
  if (!raw || raw.toLowerCase() === "transparent") {
    return "transparent"
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw
  }
  return "transparent"
}

function createEmptyTableValue(rows = 3, cols = 3) {
  return Array.from({ length: Math.max(1, Number(rows || 3)) }, () =>
    Array.from({ length: Math.max(1, Number(cols || 3)) }, () => ""),
  )
}

function ensureTableValue(value, rows = 3, cols = 3) {
  const rowCount = Math.max(1, Number(rows || 3))
  const colCount = Math.max(1, Number(cols || 3))
  const base = Array.isArray(value) ? value : createEmptyTableValue(rowCount, colCount)
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: colCount }, (_, colIndex) => String(base?.[rowIndex]?.[colIndex] || "")),
  )
}

/** Logical size (CSS px) — must match stroke coordinates; buffer is this × devicePixelRatio */
const SIGNATURE_PAD_WIDTH = 900
const SIGNATURE_PAD_HEIGHT = 280

function resolveUniqueSubmissionKey(field, usedKeys) {
  const rawName = String(field?.name || "").trim()
  const base = rawName ? normalizeFieldName(rawName) : normalizeFieldName(field?.fieldId || "field")
  let key = base
  let suffix = 2
  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`
    suffix += 1
  }
  usedKeys.add(key)
  return key
}

function StudentPdfFormFillPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionIdParam = searchParams.get("submissionId")
  const { user } = useAuth()
  const formId = params?.formId

  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [pdfUrl, setPdfUrl] = useState("")
  const [values, setValues] = useState({})
  /** When set, we are editing an existing submission (load/save updates docs). */
  const [editingSubmissionId, setEditingSubmissionId] = useState(null)
  /** fieldId -> submission_values document id */
  const [submissionValueDocIds, setSubmissionValueDocIds] = useState({})
  const [submittedAtLabel, setSubmittedAtLabel] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingSubmission, setDeletingSubmission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [printValueOnly, setPrintValueOnly] = useState(false)
  const PDF_MAX_SCALE = 1.3
  const [maxPageWidth, setMaxPageWidth] = useState(null)
  const pdfViewportRef = useRef(null)
  const hiddenDateInputsRef = useRef({})
  const signatureCanvasRef = useRef(null)
  const signatureDrawingRef = useRef(false)
  const [activeSignatureFieldId, setActiveSignatureFieldId] = useState("")

  function drawLineOnSignatureCanvas(clientX, clientY, mode = "draw") {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    // Map pointer to *logical* coords (0…900 × 0…280). Context uses setTransform(dpr),
    // so drawing must stay in this space — NOT in canvas.width buffer pixels.
    const x = ((clientX - rect.left) / rect.width) * SIGNATURE_PAD_WIDTH
    const y = ((clientY - rect.top) / rect.height) * SIGNATURE_PAD_HEIGHT
    if (mode === "start") {
      context.beginPath()
      context.moveTo(x, y)
      return
    }
    context.lineTo(x, y)
    context.stroke()
  }

  function clearSignatureCanvas() {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, SIGNATURE_PAD_WIDTH, SIGNATURE_PAD_HEIGHT)
  }

  useEffect(() => {
    function onBeforePrint() {
      setPrintValueOnly(true)
    }
    function onAfterPrint() {
      setPrintValueOnly(false)
    }
    window.addEventListener("beforeprint", onBeforePrint)
    window.addEventListener("afterprint", onAfterPrint)
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint)
      window.removeEventListener("afterprint", onAfterPrint)
    }
  }, [])

  useEffect(() => {
    function updateMaxPageWidth() {
      const viewportWidth = pdfViewportRef.current?.clientWidth || 0
      if (viewportWidth > 0) {
        setMaxPageWidth(Math.max(240, viewportWidth - 8))
        return
      }
      const width = window.innerWidth || 1280
      setMaxPageWidth(Math.max(240, width - 28))
    }
    updateMaxPageWidth()
    let observer = null
    if (typeof ResizeObserver !== "undefined" && pdfViewportRef.current) {
      observer = new ResizeObserver(() => {
        updateMaxPageWidth()
      })
      observer.observe(pdfViewportRef.current)
    }
    window.addEventListener("resize", updateMaxPageWidth)
    return () => {
      window.removeEventListener("resize", updateMaxPageWidth)
      if (observer) observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!activeSignatureFieldId) return
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const width = SIGNATURE_PAD_WIDTH
    const height = SIGNATURE_PAD_HEIGHT
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const context = canvas.getContext("2d")
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.lineJoin = "round"
    context.lineCap = "round"
    context.lineWidth = 2
    context.strokeStyle = "#111827"
    context.clearRect(0, 0, width, height)

    const existing = values[activeSignatureFieldId]
    if (typeof existing === "string" && existing.startsWith("data:image")) {
      const image = new Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, width, height)
      }
      image.src = existing
    }
  }, [activeSignatureFieldId, values])

  useEffect(() => {
    if (!activeSignatureFieldId) return
    function onKeyDown(e) {
      if (e.key === "Escape") setActiveSignatureFieldId("")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeSignatureFieldId])

  useEffect(() => {
    if (!activeSignatureFieldId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [activeSignatureFieldId])

  useEffect(() => {
    if (!formId) return
    let cancelled = false
    let objectUrl = ""

    async function loadForm() {
      setLoading(true)
      setEditingSubmissionId(null)
      setSubmissionValueDocIds({})
      setSubmittedAtLabel("")
      try {
        if (submissionIdParam && !user?.uid) {
          toast.error("Please sign in to view this submission.")
          router.replace(`/student/pdf-forms/${formId}`)
          return
        }

        const formDoc = await getDoc(doc(db, "forms", formId))
        if (!formDoc.exists()) {
          toast.error("Form not found.")
          router.push("/student/pdf-forms")
          return
        }

        const formData = { id: formDoc.id, ...formDoc.data() }
        if (!cancelled) setForm(formData)

        const fieldsQuery = query(collection(db, "form_fields"), where("formId", "==", formId))
        const fieldsSnapshot = await getDocs(fieldsQuery)
        const nextFields = fieldsSnapshot.docs.map((entry) => withFieldDefaults(entry.data()))
        if (!cancelled) setFields(nextFields)

        const fieldById = new Map(nextFields.map((f) => [f.fieldId, f]))

        const initialValues = {}
        nextFields.forEach((field) => {
          if (field.type === "checkbox") {
            initialValues[field.fieldId] = false
            return
          }
          if (field.type === "table") {
            initialValues[field.fieldId] = createEmptyTableValue(field.tableRows, field.tableCols)
            return
          }
          initialValues[field.fieldId] = ""
        })

        let docIds = {}
        if (submissionIdParam) {
          const subDoc = await getDoc(doc(db, "submissions", submissionIdParam))
          if (!subDoc.exists()) {
            toast.error("Submission not found.")
            router.replace(`/student/pdf-forms/${formId}`)
            return
          }
          const subData = subDoc.data()
          if (!user?.uid || subData.studentId !== user.uid || subData.formId !== formId) {
            toast.error("You can’t open this submission.")
            router.replace(`/student/pdf-forms/${formId}`)
            return
          }
          if (!cancelled) {
            setEditingSubmissionId(submissionIdParam)
            setSubmittedAtLabel(formatSubmittedAt(subData.submittedAt))
          }

          const valSnap = await getDocs(
            query(collection(db, "submission_values"), where("submissionId", "==", submissionIdParam)),
          )
          valSnap.docs.forEach((d) => {
            const data = d.data()
            const fid = data.fieldId
            if (!fid || !fieldById.has(fid)) return
            docIds[fid] = d.id
            const field = fieldById.get(fid)
            const raw = deserializeSubmissionValue(data.value)
            if (field.type === "table") {
              initialValues[fid] = ensureTableValue(raw, field.tableRows, field.tableCols)
            } else if (field.type === "checkbox") {
              initialValues[fid] = raw === true || raw === "true"
            } else {
              initialValues[fid] = raw ?? ""
            }
          })
          if (!cancelled) setSubmissionValueDocIds(docIds)
        }

        if (!cancelled) setValues(initialValues)

        objectUrl = await loadProtectedPdfObjectUrl(formId)
        if (!cancelled) {
          setPdfUrl(objectUrl)
        }
      } catch (error) {
        console.error("Failed to load form:", error)
        toast.error("Failed to load PDF form.")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadForm()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [formId, router, user, submissionIdParam])

  const fieldsByPage = useMemo(() => {
    return fields.reduce((acc, field) => {
      acc[field.page] = acc[field.page] || []
      acc[field.page].push(field)
      return acc
    }, {})
  }, [fields])

  async function handleSubmit() {
    if (!user?.uid || !formId) return
    const unnamedFields = fields.filter((field) => !String(field.name || "").trim())
    if (unnamedFields.length > 0) {
      toast.error("May component na walang Field Key. Ipaayos muna sa admin.")
      return
    }

    setSubmitting(true)
    try {
      const usedSubmissionKeys = new Set()

      if (editingSubmissionId) {
        const kvEntries = await Promise.all(
          fields.map(async (field) => {
            const key = resolveUniqueSubmissionKey(field, usedSubmissionKeys)
            const firestoreValue = serializeSubmissionValueForFirestore(values[field.fieldId] ?? "")
            const existingVid = submissionValueDocIds[field.fieldId]

            if (existingVid) {
              await updateDoc(doc(db, "submission_values", existingVid), {
                value: firestoreValue,
                fieldName: key,
                type: field.type,
                updatedAt: serverTimestamp(),
              })
            } else {
              const newRef = await addDoc(collection(db, "submission_values"), {
                submissionId: editingSubmissionId,
                fieldId: field.fieldId,
                fieldName: key,
                formId,
                type: field.type,
                value: firestoreValue,
                createdAt: serverTimestamp(),
              })
              setSubmissionValueDocIds((prev) => ({ ...prev, [field.fieldId]: newRef.id }))
            }

            return [key, firestoreValue]
          }),
        )

        const valuesByFieldName = Object.fromEntries(kvEntries)
        await updateDoc(doc(db, "submissions", editingSubmissionId), {
          valuesByFieldName,
          updatedAt: serverTimestamp(),
        })

        toast.success("Changes saved.")
        return
      }

      const submissionRef = await addDoc(collection(db, "submissions"), {
        formId,
        studentId: user.uid,
        submittedAt: serverTimestamp(),
      })

      const kvEntries = await Promise.all(
        fields.map(async (field) => {
          const key = resolveUniqueSubmissionKey(field, usedSubmissionKeys)
          const firestoreValue = serializeSubmissionValueForFirestore(values[field.fieldId] ?? "")

          await addDoc(collection(db, "submission_values"), {
            submissionId: submissionRef.id,
            fieldId: field.fieldId,
            fieldName: key,
            formId,
            type: field.type,
            value: firestoreValue,
            createdAt: serverTimestamp(),
          })

          return [key, firestoreValue]
        }),
      )

      const valuesByFieldName = Object.fromEntries(kvEntries)
      await updateDoc(doc(db, "submissions", submissionRef.id), {
        valuesByFieldName,
      })

      toast.success("Form submitted successfully.")
      router.push(`/student/pdf-forms/${formId}?submissionId=${submissionRef.id}`)
    } catch (error) {
      console.error("Failed to submit form:", error)
      toast.error("Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteThisSubmission() {
    if (!editingSubmissionId || !user?.uid || !formId) return
    if (
      !window.confirm(
        "Delete this submission permanently? You can submit the form again later. This cannot be undone.",
      )
    ) {
      return
    }
    setDeletingSubmission(true)
    try {
      const valSnap = await getDocs(
        query(collection(db, "submission_values"), where("submissionId", "==", editingSubmissionId)),
      )
      for (let i = 0; i < valSnap.docs.length; i += 450) {
        const batch = writeBatch(db)
        valSnap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
        await batch.commit()
      }
      await deleteDoc(doc(db, "submissions", editingSubmissionId))
      toast.success("Submission deleted.")
      router.push("/student/pdf-forms")
    } catch (error) {
      console.error("Failed to delete submission:", error)
      toast.error("Could not delete. Try again.")
    } finally {
      setDeletingSubmission(false)
    }
  }

  function handlePrintValueOnly() {
    setPrintValueOnly(true)
    window.setTimeout(() => {
      window.print()
    }, 50)
  }

  function handleSaveSignature() {
    if (!activeSignatureFieldId || !signatureCanvasRef.current) {
      return
    }
    const dataUrl = signatureCanvasRef.current.toDataURL("image/png")
    setValues((previous) => ({ ...previous, [activeSignatureFieldId]: dataUrl }))
    setActiveSignatureFieldId("")
  }

  return (
    <div className="space-y-6 py-2 md:py-3">
      <div className="flex flex-col gap-4">
        <Link
          href="/student/pdf-forms"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200/70 bg-white px-3 py-2 text-sm font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to PDF forms
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {editingSubmissionId ? "Your submission" : "Fillable PDF"}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl">
              {loading ? "Loading form…" : form?.title || "PDF Form"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-900/75 dark:text-emerald-200/85 sm:text-base">
              {editingSubmissionId ? (
                <>
                  Submitted{submittedAtLabel ? ` ${submittedAtLabel}` : ""}. You can edit your answers below, use{" "}
                  <strong>Print (values only)</strong> for a clean copy, then <strong>Save changes</strong> when done.
                </>
              ) : (
                <>
                  Complete the fields on the document below. Use print if you need a clean copy, then submit when you&apos;re
                  done.
                </>
              )}
            </p>
            {editingSubmissionId ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  disabled={deletingSubmission || submitting}
                  onClick={handleDeleteThisSubmission}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-300/80 bg-red-50/90 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                >
                  {deletingSubmission ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete submission
                </button>
                <span className="text-xs text-muted-foreground">Removes this copy from your list (you can submit again).</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        ref={pdfViewportRef}
        className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-card p-3 shadow-sm ring-1 ring-black/[0.03] dark:border-emerald-900/50 md:p-5"
      >
        <span
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
          aria-hidden
        />
        {loading ? (
          <div className="space-y-4 py-10 pt-6">
            <div className="animate-pulse space-y-3">
              <div className="mx-auto h-4 w-48 max-w-full rounded-md bg-emerald-100/80 dark:bg-emerald-900/40" />
              <div className="h-40 w-full rounded-xl bg-muted/70 dark:bg-muted/30" />
              <div className="h-40 w-full rounded-xl bg-muted/50 dark:bg-muted/20" />
            </div>
            <p className="text-center text-sm text-muted-foreground">Preparing your form…</p>
          </div>
        ) : (
          <>
            {pdfUrl ? (
              <PdfOverlayStage
                pdfUrl={pdfUrl}
                scale={PDF_MAX_SCALE}
                maxPageWidth={maxPageWidth}
                renderOverlay={(page) => (
                  <>
                    {(fieldsByPage[page.page] || []).map((field) => {
                      const pageScale = Number(page.renderScale || PDF_MAX_SCALE || 1)
                      const getPageFontSize = (baseSize) => {
                        const base = Number(baseSize || 12)
                        const factor = Math.min(1, Math.max(0.4, pageScale / 1.3))
                        return Math.max(8, Number((base * factor).toFixed(2)))
                      }
                      const fieldBackgroundColor = resolveBackgroundColor(field.backgroundColor)
                      const commonStyle = {
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                        boxSizing: "border-box",
                      }

                      if (field.type === "checkbox") {
                        const isChecked = Boolean(values[field.fieldId])
                        if (printValueOnly && !isChecked) {
                          return null
                        }
                        return (
                          <button
                            key={field.fieldId}
                            type="button"
                            aria-label={field.label || field.name || "checkbox"}
                            title={field.label || field.name || "checkbox"}
                            className={`absolute rounded ${
                              printValueOnly
                                ? "pointer-events-none border-0 bg-transparent shadow-none"
                                : `pointer-events-auto shadow-sm ${field.borderless ? "border-0" : "border border-slate-800"}`
                            }`}
                            style={{
                              ...commonStyle,
                              minWidth: "14px",
                              minHeight: "14px",
                              backgroundColor: printValueOnly ? "transparent" : fieldBackgroundColor,
                            }}
                            onClick={() =>
                              setValues((previous) => ({
                                ...previous,
                                [field.fieldId]: !Boolean(previous[field.fieldId]),
                              }))
                            }
                            disabled={printValueOnly}
                          >
                            {isChecked ? (
                              <span
                                className="absolute left-1/2 top-1/2 block text-[12px] font-bold"
                                style={{
                                  transform: "translate(-50%, -50%)",
                                  color: field.textColor || "#111827",
                                  fontFamily: getCssFontFamily(field.fontFamily),
                                }}
                              >
                                ✓
                              </span>
                            ) : null}
                          </button>
                        )
                      }

                      if (field.type === "image") {
                        const hasPreview = typeof values[field.fieldId] === "string" && values[field.fieldId]
                        if (printValueOnly && !hasPreview) {
                          return null
                        }
                        return (
                          <label
                            key={field.fieldId}
                            className={`absolute flex items-center justify-center rounded text-[11px] ${
                              printValueOnly
                                ? "pointer-events-none border-0"
                                : "pointer-events-auto cursor-pointer border-0"
                            }`}
                            style={{
                              ...commonStyle,
                              backgroundColor: printValueOnly ? "transparent" : fieldBackgroundColor,
                              outline:
                                !printValueOnly && !field.borderless ? "1px dashed rgba(37, 99, 235, 0.7)" : "none",
                              outlineOffset: !printValueOnly && !field.borderless ? "-1px" : "0px",
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={printValueOnly}
                              onChange={(event) => {
                                const selected = event.target.files?.[0]
                                if (!selected) return

                                fileToDataUrl(selected)
                                  .then((dataUrl) => {
                                    setValues((previous) => ({ ...previous, [field.fieldId]: dataUrl }))
                                  })
                                  .catch(() => {
                                    toast.error("Failed to process image.")
                                  })
                              }}
                            />
                            {hasPreview ? (
                              <img src={values[field.fieldId]} alt={field.label} className="h-full w-full rounded object-fill" />
                            ) : (
                              <span className="flex flex-col items-center justify-center gap-1 px-1 text-center text-[10px]">
                                <UploadCloud className="h-4 w-4" />
                                <span>{field.label || "Upload image"}</span>
                              </span>
                            )}
                          </label>
                        )
                      }

                      if (field.type === "signature") {
                        const hasSignature = typeof values[field.fieldId] === "string" && values[field.fieldId]
                        if (printValueOnly && !hasSignature) {
                          return null
                        }
                        return (
                          <button
                            key={field.fieldId}
                            type="button"
                            className={`pointer-events-auto absolute rounded transition-[box-shadow,border-color] ${
                              field.borderless
                                ? "border-0"
                                : "border border-emerald-300/70 shadow-sm ring-1 ring-emerald-500/10 hover:border-emerald-400 hover:shadow-md hover:ring-emerald-500/25 dark:border-emerald-500/45 dark:ring-emerald-400/10 dark:hover:border-emerald-400/80"
                            }`}
                            style={{
                              ...commonStyle,
                              backgroundColor: fieldBackgroundColor,
                            }}
                            onClick={() => {
                              if (printValueOnly) return
                              setActiveSignatureFieldId(field.fieldId)
                            }}
                          >
                            {hasSignature ? (
                              <img
                                src={values[field.fieldId]}
                                alt={field.label || "Signature"}
                                className="h-full w-full rounded object-contain"
                              />
                            ) : (
                              <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[9px] font-medium leading-tight text-emerald-800/90 dark:text-emerald-200/90 sm:text-[10px]">
                                <PenLine className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 sm:h-4 sm:w-4" />
                                <span>{field.label || "Tap to sign"}</span>
                              </span>
                            )}
                          </button>
                        )
                      }

                      if (field.type === "date") {
                        if (printValueOnly) {
                          return (
                            <div
                              key={field.fieldId}
                              className="pointer-events-none absolute rounded border-0 bg-transparent px-1 text-left"
                              style={{
                                ...commonStyle,
                                fontFamily: getCssFontFamily(field.fontFamily),
                                fontSize: `${getPageFontSize(field.fontSize || 12)}px`,
                                fontWeight: field.fontWeight || "normal",
                                fontStyle: field.fontStyle || "normal",
                                color: field.textColor || "#111827",
                                textAlign: field.textAlign || "left",
                              }}
                            >
                              {values[field.fieldId] || ""}
                            </div>
                          )
                        }
                        return (
                          <div
                            key={field.fieldId}
                            className="pointer-events-auto absolute"
                            style={commonStyle}
                          >
                            <input
                              ref={(element) => {
                                hiddenDateInputsRef.current[field.fieldId] = element
                              }}
                              type="date"
                              className="sr-only"
                              onChange={(event) =>
                                setValues((previous) => ({
                                  ...previous,
                                  [field.fieldId]: formatDateToDdMmYyyy(event.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              className={`h-full w-full rounded px-1 text-left text-[12px] ${
                                field.borderless ? "border-0" : "border border-primary/60"
                              }`}
                              onClick={() => {
                                const input = hiddenDateInputsRef.current[field.fieldId]
                                if (!input) return
                                if (typeof input.showPicker === "function") {
                                  input.showPicker()
                                } else {
                                  input.click()
                                }
                              }}
                              style={{
                                fontFamily: getCssFontFamily(field.fontFamily),
                                fontSize: `${getPageFontSize(field.fontSize || 12)}px`,
                                fontWeight: field.fontWeight || "normal",
                                fontStyle: field.fontStyle || "normal",
                                color: field.textColor || "#111827",
                                textAlign: field.textAlign || "left",
                                backgroundColor: fieldBackgroundColor,
                              }}
                            >
                              {values[field.fieldId] || "dd-mm-yyyy"}
                            </button>
                          </div>
                        )
                      }

                      if (field.type === "table") {
                        const rows = Math.max(1, Number(field.tableRows || 3))
                        const cols = Math.max(1, Number(field.tableCols || 3))
                        const rowRatios = normalizeTableRatios(field.tableRowRatios, rows)
                        const colRatios = normalizeTableRatios(field.tableColRatios, cols)
                        const lineWidth = Math.max(0, Math.min(6, Number(field.tableLineWidth ?? 1)))
                        const rawLineColor = String(field.tableLineColor || "").trim().toLowerCase()
                        const lineColor = /^#[0-9a-f]{6}$/i.test(rawLineColor) ? rawLineColor : "#94a3b8"
                        const showInnerLines = rawLineColor !== "transparent" && lineWidth > 0
                        const tableValue = ensureTableValue(values[field.fieldId], rows, cols)
                        const colBoundaries = []
                        let colAccum = 0
                        for (let idx = 0; idx < colRatios.length - 1; idx += 1) {
                          colAccum += colRatios[idx]
                          colBoundaries.push({ index: idx, at: colAccum })
                        }
                        const rowBoundaries = []
                        let rowAccum = 0
                        for (let idx = 0; idx < rowRatios.length - 1; idx += 1) {
                          rowAccum += rowRatios[idx]
                          rowBoundaries.push({ index: idx, at: rowAccum })
                        }
                        return (
                          <div
                            key={field.fieldId}
                            className={`absolute rounded ${
                              printValueOnly
                                ? "pointer-events-none border-0 bg-transparent"
                                : field.borderless
                                  ? "pointer-events-auto border-0"
                                  : "pointer-events-auto border-0"
                            }`}
                            style={{
                              ...commonStyle,
                              backgroundColor: printValueOnly ? "transparent" : fieldBackgroundColor,
                              display: "grid",
                              gridTemplateColumns: colRatios.map((ratio) => `${ratio}fr`).join(" "),
                              gridTemplateRows: rowRatios.map((ratio) => `${ratio}fr`).join(" "),
                              gap: 0,
                              outline:
                                !printValueOnly && !field.borderless ? "1px solid rgba(37, 99, 235, 0.6)" : "none",
                              outlineOffset: !printValueOnly && !field.borderless ? "-1px" : "0px",
                            }}
                          >
                            {tableValue.map((rowValue, rowIndex) =>
                              rowValue.map((cellValue, colIndex) => (
                                <input
                                  key={`${field.fieldId}-${rowIndex}-${colIndex}`}
                                  type="text"
                                  value={cellValue}
                                  readOnly={printValueOnly}
                                  onChange={(event) => {
                                    const nextGrid = ensureTableValue(values[field.fieldId], rows, cols).map((row) => [...row])
                                    nextGrid[rowIndex][colIndex] = field.uppercaseOnly
                                      ? event.target.value.toUpperCase()
                                      : event.target.value
                                    setValues((previous) => ({ ...previous, [field.fieldId]: nextGrid }))
                                  }}
                                  className={`h-full w-full min-h-0 min-w-0 border-0 px-1 text-[11px] leading-tight outline-none ${
                                    printValueOnly ? "pointer-events-none bg-transparent" : "bg-transparent focus:bg-transparent"
                                  }`}
                                  style={{
                                    fontFamily: getCssFontFamily(field.fontFamily),
                                    fontSize: `${Math.max(8, getPageFontSize(field.fontSize || 11))}px`,
                                    fontWeight: field.fontWeight || "normal",
                                    fontStyle: field.fontStyle || "normal",
                                    textTransform: field.uppercaseOnly ? "uppercase" : "none",
                                    color: field.textColor || "#111827",
                                    textAlign: field.textAlign || "left",
                                    backgroundColor: "transparent",
                                    boxSizing: "border-box",
                                  }}
                                />
                              )),
                            )}
                            {showInnerLines
                              ? colBoundaries.map((boundary) => (
                                  <div
                                    key={`table-col-line-student-${field.fieldId}-${boundary.index}`}
                                    className="pointer-events-none absolute inset-y-0"
                                    style={{
                                      left: `${boundary.at * 100}%`,
                                      width: `${lineWidth}px`,
                                      transform: "translateX(-50%)",
                                      backgroundColor: lineColor,
                                      opacity: 0.85,
                                    }}
                                  />
                                ))
                              : null}
                            {showInnerLines
                              ? rowBoundaries.map((boundary) => (
                                  <div
                                    key={`table-row-line-student-${field.fieldId}-${boundary.index}`}
                                    className="pointer-events-none absolute inset-x-0"
                                    style={{
                                      top: `${boundary.at * 100}%`,
                                      height: `${lineWidth}px`,
                                      transform: "translateY(-50%)",
                                      backgroundColor: lineColor,
                                      opacity: 0.85,
                                    }}
                                  />
                                ))
                              : null}
                          </div>
                        )
                      }

                      return (
                        <input
                          key={field.fieldId}
                          type="text"
                          value={values[field.fieldId] || ""}
                          placeholder={printValueOnly ? "" : field.label}
                          readOnly={printValueOnly}
                          onChange={(event) =>
                            setValues((previous) => ({
                              ...previous,
                              [field.fieldId]: field.uppercaseOnly
                                ? event.target.value.toUpperCase()
                                : event.target.value,
                            }))
                          }
                          className={`pointer-events-auto absolute rounded px-1 text-[12px] outline-none shadow-none focus:outline-none focus:ring-0 ${
                            printValueOnly
                              ? "pointer-events-none border-0 bg-transparent"
                              : field.borderless
                                ? "border-0"
                                : "border border-primary/60 focus:border-primary"
                          }`}
                          style={{
                            ...commonStyle,
                            fontFamily: getCssFontFamily(field.fontFamily),
                            fontSize: `${getPageFontSize(field.fontSize || 12)}px`,
                            fontWeight: field.fontWeight || "normal",
                            fontStyle: field.fontStyle || "normal",
                            textTransform: field.uppercaseOnly ? "uppercase" : "none",
                            color: field.textColor || "#111827",
                            textAlign: field.textAlign || "left",
                            backgroundColor: printValueOnly ? "transparent" : fieldBackgroundColor,
                          }}
                        />
                      )
                    })}
                  </>
                )}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No PDF attached to this form.</p>
            )}
          </>
        )}
      </div>

      {activeSignatureFieldId ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close signature dialog"
            className="absolute inset-0 animate-in fade-in duration-200 bg-black/55 backdrop-blur-[3px]"
            onClick={() => setActiveSignatureFieldId("")}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signature-modal-title"
            className="relative z-[101] flex max-h-[min(92vh,720px)] w-full max-w-4xl animate-in slide-in-from-bottom-4 fade-in zoom-in-95 flex-col duration-200 sm:slide-in-from-bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex max-h-full flex-col overflow-hidden rounded-t-3xl border border-emerald-200/60 bg-gradient-to-b from-white via-emerald-50/40 to-white shadow-2xl ring-1 ring-emerald-500/15 dark:from-card dark:via-emerald-950/35 dark:to-card dark:border-emerald-800/70 dark:ring-emerald-400/10 sm:rounded-3xl">
              <span
                className="h-1.5 w-full shrink-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                aria-hidden
              />
              <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
                <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 shadow-inner ring-1 ring-emerald-500/20 dark:from-emerald-400/20 dark:to-teal-900/30">
                      <PenLine className="h-6 w-6 text-emerald-700 dark:text-emerald-300" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700/90 dark:text-emerald-400/95">
                        <Sparkles className="h-3 w-3" />
                        E-signature
                      </p>
                      <h2 id="signature-modal-title" className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                        Sign in the box
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Use your finger, stylus, or mouse. Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">Esc</kbd> or tap outside to cancel.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSignatureFieldId("")}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-white/90 px-3 py-2 text-sm font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
                  >
                    <span className="hidden sm:inline">Cancel</span>
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative mb-4 min-h-0 flex-1 overflow-x-auto overflow-y-hidden rounded-2xl border-2 border-dashed border-emerald-300/70 bg-white shadow-[inset_0_2px_12px_rgba(16,185,129,0.06)] dark:border-emerald-600/50 dark:bg-emerald-950/20 dark:shadow-[inset_0_2px_12px_rgba(0,0,0,0.25)]">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07] dark:opacity-[0.12]">
                    <PenLine className="h-24 w-24 text-emerald-900 dark:text-emerald-100" strokeWidth={1} />
                  </div>
                  <canvas
                    ref={signatureCanvasRef}
                    className="relative z-[1] block touch-none bg-transparent"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      try {
                        event.currentTarget.setPointerCapture(event.pointerId)
                      } catch {
                        /* ignore */
                      }
                      signatureDrawingRef.current = true
                      drawLineOnSignatureCanvas(event.clientX, event.clientY, "start")
                    }}
                    onPointerMove={(event) => {
                      if (!signatureDrawingRef.current) return
                      event.preventDefault()
                      drawLineOnSignatureCanvas(event.clientX, event.clientY, "draw")
                    }}
                    onPointerUp={(event) => {
                      signatureDrawingRef.current = false
                      try {
                        event.currentTarget.releasePointerCapture(event.pointerId)
                      } catch {
                        /* ignore */
                      }
                    }}
                    onPointerCancel={(event) => {
                      signatureDrawingRef.current = false
                      try {
                        event.currentTarget.releasePointerCapture(event.pointerId)
                      } catch {
                        /* ignore */
                      }
                    }}
                    onPointerLeave={() => {
                      /* keep drawing if pointer captured */
                    }}
                  />
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-emerald-200/50 pt-4 dark:border-emerald-800/50 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground sm:max-w-[42%]">
                    Your signature is saved only on this form until you submit it to OSAS.
                  </p>
                  <div className="flex flex-wrap items-stretch justify-end gap-2 sm:items-center">
                    <button
                      type="button"
                      onClick={clearSignatureCanvas}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 sm:flex-initial dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60"
                    >
                      <Eraser className="h-4 w-4" />
                      Clear pad
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSignature}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl sm:flex-initial"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Apply signature
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end print:hidden">
        <button
          type="button"
          onClick={handlePrintValueOnly}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200/80 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60 sm:w-auto"
        >
          Print (values only)
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-600/30 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? (editingSubmissionId ? "Saving…" : "Submitting…") : editingSubmissionId ? "Save changes" : "Submit form"}
        </button>
      </div>
    </div>
  )
}

export default function StudentPdfFormFillPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 py-2 md:py-3">
          <div className="animate-pulse rounded-2xl border border-emerald-200/30 bg-white/60 p-8 dark:border-emerald-900/40">
            <div className="mb-4 h-6 w-48 rounded bg-emerald-100/80 dark:bg-emerald-900/40" />
            <div className="h-10 max-w-md rounded-lg bg-muted" />
            <div className="mt-4 h-64 rounded-xl bg-muted/50" />
          </div>
        </div>
      }
    >
      <StudentPdfFormFillPageContent />
    </Suspense>
  )
}
