"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { PDFDocument } from "pdf-lib"
import { toast } from "sonner"
import AdminLayoutWrapper from "@/app/admin/admin-layout"
import PdfFormReadonlyOverlay from "@/components/pdf-forms/PdfFormReadonlyOverlay"
import PdfOverlayStage from "@/components/pdf-forms/PdfOverlayStage"
import { db } from "@/lib/firebase"
import { deserializeSubmissionValue, loadProtectedPdfObjectUrl, withFieldDefaults } from "@/lib/pdf-form-utils"
import { pickStudentDisplayName, sanitizeForFilename } from "@/lib/user-display"

export default function AdminSubmissionViewerPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const formId = params?.formId
  const submissionId = params?.submissionId
  const isEmbedded = searchParams?.get("embedded") === "1"
  const embeddedView = searchParams?.get("view") || "live"

  const [form, setForm] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [fields, setFields] = useState([])
  const [valueMap, setValueMap] = useState({})
  const [templatePdfUrl, setTemplatePdfUrl] = useState("")
  const [maxPageWidth, setMaxPageWidth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [embeddedPdfUrl, setEmbeddedPdfUrl] = useState("")
  const [buildingEmbeddedPdf, setBuildingEmbeddedPdf] = useState(false)
  /** Firestore `users/{uid}` — fullName, studentNumber, etc. */
  const [studentProfile, setStudentProfile] = useState(null)
  /** Used as ref + effect dep so resize logic has a stable `[el]` dependency (avoids HMR “dependency array size changed”). */
  const [pdfViewportEl, setPdfViewportEl] = useState(null)
  const PDF_MAX_SCALE = 1.3

  useEffect(() => {
    if (!formId || !submissionId) return
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setStudentProfile(null)
      try {
        const [formDoc, submissionDoc] = await Promise.all([
          getDoc(doc(db, "forms", formId)),
          getDoc(doc(db, "submissions", submissionId)),
        ])

        if (!formDoc.exists() || !submissionDoc.exists()) {
          toast.error("Submission or form not found.")
          return
        }

        const submissionData = submissionDoc.data()
        if (submissionData.formId !== formId) {
          toast.error("Submission does not match this form.")
          return
        }

        const [fieldsSnapshot, valuesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "form_fields"), where("formId", "==", formId))),
          getDocs(query(collection(db, "submission_values"), where("submissionId", "==", submissionId))),
        ])

        const loadedFields = fieldsSnapshot.docs.map((entry) => withFieldDefaults(entry.data()))
        const loadedValues = valuesSnapshot.docs.reduce((acc, entry) => {
          const data = entry.data()
          acc[data.fieldId] = deserializeSubmissionValue(data.value)
          return acc
        }, {})

        let profile = null
        const studentUid = submissionData.studentId
        if (studentUid) {
          try {
            const userSnap = await getDoc(doc(db, "users", studentUid))
            if (userSnap.exists()) {
              profile = userSnap.data()
            }
          } catch {
            profile = null
          }
        }

        if (!cancelled) {
          setForm({ id: formDoc.id, ...formDoc.data() })
          setSubmission({ id: submissionDoc.id, ...submissionData })
          setFields(loadedFields)
          setValueMap(loadedValues)
          setStudentProfile(profile)
        }
      } catch (error) {
        console.error("Failed to load submission details:", error)
        toast.error("Unable to load submission.")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [formId, submissionId])

  useEffect(() => {
    if (!form?.id) return
    let cancelled = false
    let objectUrl = ""

    async function loadTemplate() {
      try {
        objectUrl = await loadProtectedPdfObjectUrl(form.id)
        if (!cancelled) {
          setTemplatePdfUrl(objectUrl)
        }
      } catch (error) {
        console.error("Failed to load PDF template:", error)
        if (!cancelled) {
          toast.error("Could not load PDF for live preview.")
        }
      }
    }

    loadTemplate()
    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [form?.id])

  useEffect(() => {
    function updateMaxPageWidth() {
      const viewportWidth = pdfViewportEl?.clientWidth || 0
      if (viewportWidth > 0) {
        setMaxPageWidth(Math.max(240, viewportWidth - 8))
        return
      }
      const width = typeof window !== "undefined" ? window.innerWidth || 1280 : 1280
      setMaxPageWidth(Math.max(240, width - 28))
    }

    updateMaxPageWidth()

    if (typeof window === "undefined") {
      return undefined
    }

    window.addEventListener("resize", updateMaxPageWidth)

    let resizeObserver = null
    if (pdfViewportEl && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateMaxPageWidth())
      resizeObserver.observe(pdfViewportEl)
    }

    return () => {
      window.removeEventListener("resize", updateMaxPageWidth)
      if (resizeObserver && pdfViewportEl) {
        resizeObserver.disconnect()
      }
    }
  }, [pdfViewportEl])

  useEffect(() => {
    return () => {
      if (embeddedPdfUrl) {
        URL.revokeObjectURL(embeddedPdfUrl)
      }
    }
  }, [embeddedPdfUrl])

  const normalizedFields = useMemo(() => fields.map((field) => withFieldDefaults(field)), [fields])

  const fieldsByPage = useMemo(() => {
    return normalizedFields.reduce((acc, field) => {
      const pg = Number(field.page || 1)
      acc[pg] = acc[pg] || []
      acc[pg].push(field)
      return acc
    }, {})
  }, [normalizedFields])

  async function buildFilledPdfBlob() {
    if (!form?.id) {
      throw new Error("Missing form id")
    }
    const root = pdfViewportEl || document.getElementById("accurate-print-root")
    if (!root) {
      throw new Error("Live preview root not found")
    }
    const pageNodes = Array.from(root.querySelectorAll("[data-page]"))
    if (pageNodes.length === 0) {
      throw new Error("No preview pages found")
    }

    const protectedUrl = await loadProtectedPdfObjectUrl(form.id)
    const sourceBytes = await fetch(protectedUrl).then((response) => response.arrayBuffer())
    URL.revokeObjectURL(protectedUrl)
    const sourcePdf = await PDFDocument.load(sourceBytes)
    const sourcePages = sourcePdf.getPages()

    const html2canvas = (await import("html2canvas")).default
    const outPdf = await PDFDocument.create()
    const captureScale = 2

    // Capture the entire composed preview once (base canvas + absolute overlays),
    // then crop per page so exported PDF matches live preview exactly.
    const rootRect = root.getBoundingClientRect()
    const pageSlices = pageNodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return {
        left: rect.left - rootRect.left,
        top: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
      }
    })

    const fullCanvas = await html2canvas(root, {
      backgroundColor: "#ffffff",
      scale: captureScale,
      useCORS: true,
      scrollX: 0,
      scrollY: -window.scrollY,
    })

    for (let i = 0; i < pageSlices.length; i += 1) {
      const slice = pageSlices[i]
      const sx = Math.max(0, Math.round(slice.left * captureScale))
      const sy = Math.max(0, Math.round(slice.top * captureScale))
      const sw = Math.max(1, Math.round(slice.width * captureScale))
      const sh = Math.max(1, Math.round(slice.height * captureScale))

      const pageCanvas = document.createElement("canvas")
      pageCanvas.width = sw
      pageCanvas.height = sh
      const ctx = pageCanvas.getContext("2d")
      if (!ctx) {
        throw new Error("Failed to initialize page canvas")
      }
      ctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh)

      const imageBytes = await fetch(pageCanvas.toDataURL("image/png")).then((response) => response.arrayBuffer())
      const embeddedImage = await outPdf.embedPng(imageBytes)

      const sourcePage = sourcePages[i]
      const pageWidth = sourcePage ? sourcePage.getWidth() : embeddedImage.width
      const pageHeight = sourcePage ? sourcePage.getHeight() : embeddedImage.height
      const outPage = outPdf.addPage([pageWidth, pageHeight])
      outPage.drawImage(embeddedImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })
    }

    const outBytes = await outPdf.save()
    return new Blob([outBytes], { type: "application/pdf" })
  }

  function handlePrintAccurate() {
    if (exporting) return
    setExporting(true)
    buildFilledPdfBlob()
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank", "noopener,noreferrer")
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
        toast.success("Opened exact filled PDF. Use browser print there.")
      })
      .catch((error) => {
        console.error(error)
        toast.error("Unable to prepare exact print PDF.")
      })
      .finally(() => setExporting(false))
  }

  function handleDownloadAccurate() {
    if (exporting) return
    setExporting(true)
    buildFilledPdfBlob()
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const studentName = sanitizeForFilename(pickStudentDisplayName(studentProfile)) || "student"
        const formTitle = sanitizeForFilename(form?.title) || "form"
        const link = document.createElement("a")
        link.href = url
        link.download = `${formTitle}-${studentName}.pdf`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      })
      .catch((error) => {
        console.error(error)
        toast.error("Unable to download exact PDF.")
      })
      .finally(() => setExporting(false))
  }

  useEffect(() => {
    if (!isEmbedded || embeddedView !== "pdf") return
    if (loading || !templatePdfUrl || buildingEmbeddedPdf || embeddedPdfUrl) return

    let cancelled = false
    let attempts = 0
    const timer = setInterval(() => {
      if (cancelled) return
      const root = pdfViewportEl || document.getElementById("accurate-print-root")
      const pageCount = root?.querySelectorAll?.("[data-page]")?.length || 0
      attempts += 1
      if (pageCount > 0 || attempts > 30) {
        clearInterval(timer)
        setBuildingEmbeddedPdf(true)
        buildFilledPdfBlob()
          .then((blob) => {
            if (cancelled) return
            const nextUrl = URL.createObjectURL(blob)
            setEmbeddedPdfUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev)
              return nextUrl
            })
          })
          .catch((error) => {
            console.error(error)
            if (!cancelled) {
              toast.error("Unable to render filled PDF preview.")
            }
          })
          .finally(() => {
            if (!cancelled) setBuildingEmbeddedPdf(false)
          })
      }
    }, 150)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [isEmbedded, embeddedView, loading, templatePdfUrl, pdfViewportEl, embeddedPdfUrl, buildingEmbeddedPdf])

  const pageContent = (
    <div className={`${isEmbedded ? "h-full overflow-auto p-3 md:p-4" : "p-4 md:p-6 lg:p-8"} space-y-4 print:p-0`}>
      {!isEmbedded ? (
        <div className="rounded-xl border border-border bg-card p-4 print:hidden">
          <h1 className="text-xl font-semibold">Submission Viewer</h1>
          <p className="text-sm text-muted-foreground">Live preview is now the only source for printing/downloading (accurate layout).</p>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-muted-foreground print:hidden">Loading submission...</p> : null}

      {!loading && submission ? (
        <>
          {!isEmbedded ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 print:hidden">
              <p className="text-sm">
                <span className="font-medium">Form:</span> {form?.title || "—"}
              </p>
              {form?.originalFileName ? (
                <p className="text-sm">
                  <span className="font-medium">PDF file:</span> {form.originalFileName}
                </p>
              ) : null}
              <p className="text-sm">
                <span className="font-medium">Student:</span>{" "}
                {pickStudentDisplayName(studentProfile) || (
                  <span className="text-muted-foreground">(walang pangalan sa profile)</span>
                )}
              </p>
              {studentProfile?.studentNumber ? (
                <p className="text-sm">
                  <span className="font-medium">Student no.:</span> {studentProfile.studentNumber}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Account ID (Firebase):</span>{" "}
                <span className="font-mono">{submission.studentId}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Submission ID:</span>{" "}
                <span className="font-mono">{submission.id}</span>
              </p>
            </div>
          ) : null}

          <div
            id="accurate-print-root"
            ref={(el) => setPdfViewportEl(el)}
            className={`${isEmbedded ? (embeddedView === "pdf" && embeddedPdfUrl ? "hidden" : "rounded-lg border border-border bg-white p-2") : "rounded-xl border border-border bg-card p-4"} space-y-3 print:border-0 print:p-0 print:rounded-none`}
          >
            {!isEmbedded ? (
              <div className="print:hidden">
                <h2 className="text-base font-semibold">Live preview (same as student)</h2>
                <p className="text-sm text-muted-foreground">
                  Original PDF + field positions — ito ang base ng Print at Download (Save as PDF).
                </p>
              </div>
            ) : null}
            {templatePdfUrl ? (
              <PdfOverlayStage
                pdfUrl={templatePdfUrl}
                scale={PDF_MAX_SCALE}
                maxPageWidth={maxPageWidth}
                renderOverlay={(pageMetrics) => (
                  <PdfFormReadonlyOverlay
                    page={pageMetrics}
                    fields={fieldsByPage[pageMetrics.page] || []}
                    values={valueMap}
                    pdfMaxScale={PDF_MAX_SCALE}
                  />
                )}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading template PDF…</p>
            )}
          </div>

          {isEmbedded && embeddedView === "pdf" ? (
            <div className="rounded-lg border border-border bg-white p-0">
              {embeddedPdfUrl ? (
                <iframe
                  src={embeddedPdfUrl}
                  title="Filled PDF preview"
                  className="h-[82vh] w-full rounded-lg bg-white"
                />
              ) : (
                <div className="grid h-[82vh] place-items-center text-sm text-muted-foreground">
                  {buildingEmbeddedPdf ? "Preparing filled PDF..." : "Rendering preview..."}
                </div>
              )}
            </div>
          ) : null}

          {!isEmbedded ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                onClick={handlePrintAccurate}
                disabled={!templatePdfUrl || exporting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {exporting ? "Preparing..." : "Print (Exact PDF)"}
              </button>
              <button
                onClick={handleDownloadAccurate}
                disabled={!templatePdfUrl || exporting}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {exporting ? "Preparing..." : "Download (Exact PDF)"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )

  if (isEmbedded) {
    return pageContent
  }

  return (
    <AdminLayoutWrapper>
      {pageContent}
    </AdminLayoutWrapper>
  )
}
