"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore"
import { Eraser, PenLine, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import PdfOverlayStage from "@/components/pdf-forms/PdfOverlayStage"
import { fileToDataUrl, loadProtectedPdfObjectUrl, normalizeFieldName, normalizeTableRatios, withFieldDefaults } from "@/lib/pdf-form-utils"

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

export default function StudentPdfFormFillPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const formId = params?.formId

  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [pdfUrl, setPdfUrl] = useState("")
  const [values, setValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [printValueOnly, setPrintValueOnly] = useState(false)
  const [pdfScale, setPdfScale] = useState(1.3)
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
    const x = ((clientX - rect.left) / rect.width) * canvas.width
    const y = ((clientY - rect.top) / rect.height) * canvas.height
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
    context.clearRect(0, 0, canvas.width, canvas.height)
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
    function updateResponsiveScale() {
      const width = window.innerWidth || 1280
      if (width < 430) {
        setPdfScale(0.62)
        return
      }
      if (width < 560) {
        setPdfScale(0.72)
        return
      }
      if (width < 768) {
        setPdfScale(0.84)
        return
      }
      if (width < 1024) {
        setPdfScale(1)
        return
      }
      setPdfScale(1.3)
    }

    updateResponsiveScale()
    window.addEventListener("resize", updateResponsiveScale)
    return () => window.removeEventListener("resize", updateResponsiveScale)
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
    const width = 900
    const height = 280
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
    if (!formId) return
    let cancelled = false
    let objectUrl = ""

    async function loadForm() {
      setLoading(true)
      try {
        const formDoc = await getDoc(doc(db, "forms", formId))
        if (!formDoc.exists()) {
          toast.error("Form not found.")
          router.push("/student/pdf-forms")
          return
        }

        const formData = { id: formDoc.id, ...formDoc.data() }
        setForm(formData)

        const fieldsQuery = query(collection(db, "form_fields"), where("formId", "==", formId))
        const fieldsSnapshot = await getDocs(fieldsQuery)
        const nextFields = fieldsSnapshot.docs.map((entry) => withFieldDefaults(entry.data()))
        setFields(nextFields)

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
        setValues(initialValues)

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
  }, [formId, router])

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
      const submissionRef = await addDoc(collection(db, "submissions"), {
        formId,
        studentId: user.uid,
        submittedAt: serverTimestamp(),
      })

      const usedSubmissionKeys = new Set()
      const kvEntries = await Promise.all(
        fields.map(async (field) => {
          let value = values[field.fieldId]
          const key = resolveUniqueSubmissionKey(field, usedSubmissionKeys)

          await addDoc(collection(db, "submission_values"), {
            submissionId: submissionRef.id,
            fieldId: field.fieldId,
            fieldName: key,
            formId,
            type: field.type,
            value: value ?? "",
            createdAt: serverTimestamp(),
          })

          return [key, value ?? ""]
        }),
      )

      const valuesByFieldName = Object.fromEntries(kvEntries)
      await updateDoc(doc(db, "submissions", submissionRef.id), {
        valuesByFieldName,
      })

      toast.success("Form submitted successfully.")
      router.push("/student/pdf-forms")
    } catch (error) {
      console.error("Failed to submit form:", error)
      toast.error("Submission failed.")
    } finally {
      setSubmitting(false)
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
    <div className="p-2 sm:p-3 md:p-6 lg:p-8 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold">{form?.title || "PDF Form"}</h1>
        <p className="text-sm text-muted-foreground">Complete all needed fields, then submit to admin.</p>
      </div>

      <div ref={pdfViewportRef} className="rounded-xl border border-border bg-card p-3 md:p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading form...</p>
        ) : (
          <>
            {pdfUrl ? (
              <PdfOverlayStage
                pdfUrl={pdfUrl}
                scale={pdfScale}
                maxPageWidth={maxPageWidth}
                renderOverlay={(page) => (
                  <>
                    {(fieldsByPage[page.page] || []).map((field) => {
                      const pageScale = Number(page.renderScale || pdfScale || 1)
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
                                : `pointer-events-auto cursor-pointer ${field.borderless ? "border-0" : "border border-dashed border-primary/70"}`
                            }`}
                            style={{
                              ...commonStyle,
                              backgroundColor: printValueOnly ? "transparent" : fieldBackgroundColor,
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
                              <img src={values[field.fieldId]} alt={field.label} className="h-full w-full rounded object-contain" />
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
                            className={`pointer-events-auto absolute rounded ${
                              field.borderless ? "border-0" : "border border-primary/60"
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
                              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground">
                                <PenLine className="h-4 w-4" />
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
                                  : "pointer-events-auto border border-primary/60"
                            }`}
                            style={{
                              ...commonStyle,
                              backgroundColor: printValueOnly ? "transparent" : fieldBackgroundColor,
                              display: "grid",
                              gridTemplateColumns: colRatios.map((ratio) => `${ratio}fr`).join(" "),
                              gridTemplateRows: rowRatios.map((ratio) => `${ratio}fr`).join(" "),
                              gap: 0,
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
              <p className="text-sm text-muted-foreground">No PDF attached to this form.</p>
            )}
          </>
        )}
      </div>

      {activeSignatureFieldId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Draw Signature</h2>
              <button
                type="button"
                onClick={() => setActiveSignatureFieldId("")}
                className="rounded-md border border-input px-2 py-1 text-xs"
                title="Close signature pad"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-md border border-input bg-background p-2">
              <canvas
                ref={signatureCanvasRef}
                className="w-full touch-none rounded bg-white"
                onPointerDown={(event) => {
                  signatureDrawingRef.current = true
                  drawLineOnSignatureCanvas(event.clientX, event.clientY, "start")
                }}
                onPointerMove={(event) => {
                  if (!signatureDrawingRef.current) return
                  drawLineOnSignatureCanvas(event.clientX, event.clientY, "draw")
                }}
                onPointerUp={() => {
                  signatureDrawingRef.current = false
                }}
                onPointerLeave={() => {
                  signatureDrawingRef.current = false
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={clearSignatureCanvas}
                className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs"
              >
                <Eraser className="h-3.5 w-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                <PenLine className="h-3.5 w-3.5" />
                Save Signature
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={handlePrintValueOnly}
          disabled={loading}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Print (Values Only)
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Form"}
        </button>
      </div>
    </div>
  )
}
