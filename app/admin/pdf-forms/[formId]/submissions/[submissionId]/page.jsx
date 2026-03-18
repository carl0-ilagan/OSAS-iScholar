"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { toast } from "sonner"
import AdminLayoutWrapper from "@/app/admin/admin-layout"
import { db } from "@/lib/firebase"
import { loadProtectedPdfObjectUrl } from "@/lib/pdf-form-utils"

function hexToRgbColor(hex) {
  const value = String(hex || "").trim().replace("#", "")
  if (value.length !== 6) {
    return rgb(0, 0, 0)
  }
  const parsed = Number.parseInt(value, 16)
  if (!Number.isFinite(parsed)) {
    return rgb(0, 0, 0)
  }
  const r = ((parsed >> 16) & 255) / 255
  const g = ((parsed >> 8) & 255) / 255
  const b = (parsed & 255) / 255
  return rgb(r, g, b)
}

export default function AdminSubmissionViewerPage() {
  const params = useParams()
  const formId = params?.formId
  const submissionId = params?.submissionId

  const [form, setForm] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [fields, setFields] = useState([])
  const [valueMap, setValueMap] = useState({})
  const [generating, setGenerating] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!formId || !submissionId) return
    let cancelled = false

    async function loadData() {
      setLoading(true)
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

        const loadedFields = fieldsSnapshot.docs.map((entry) => entry.data())
        const loadedValues = valuesSnapshot.docs.reduce((acc, entry) => {
          const data = entry.data()
          acc[data.fieldId] = data.value
          return acc
        }, {})

        if (!cancelled) {
          setForm({ id: formDoc.id, ...formDoc.data() })
          setSubmission({ id: submissionDoc.id, ...submissionData })
          setFields(loadedFields)
          setValueMap(loadedValues)
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
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [pdfPreviewUrl])

  const mergedFieldValues = useMemo(() => {
    return fields.map((field) => ({ ...field, value: valueMap[field.fieldId] }))
  }, [fields, valueMap])

  async function generateFilledPdf() {
    if (!form?.id) {
      toast.error("Form PDF was not found.")
      return
    }

    setGenerating(true)
    try {
      const protectedUrl = await loadProtectedPdfObjectUrl(form.id)
      const sourceBytes = await fetch(protectedUrl).then((response) => response.arrayBuffer())
      URL.revokeObjectURL(protectedUrl)

      const pdfDoc = await PDFDocument.load(sourceBytes)
      const embeddedFonts = {}
      async function pickFont(field) {
        const familyRaw = String(field?.fontFamily || "helvetica").toLowerCase()
        const weight = String(field?.fontWeight || "normal").toLowerCase()
        const style = String(field?.fontStyle || "normal").toLowerCase()
        const family =
          ["times", "georgia", "garamond"].includes(familyRaw)
            ? "times"
            : ["courier", "consolas", "monaco"].includes(familyRaw)
              ? "courier"
              : "helvetica"
        const key = `${family}-${weight}-${style}`

        if (embeddedFonts[key]) {
          return embeddedFonts[key]
        }

        let fontName = StandardFonts.Helvetica
        const isBold = weight === "bold"
        const isItalic = style === "italic"

        if (family === "times") {
          if (isBold && isItalic) fontName = StandardFonts.TimesRomanBoldItalic
          else if (isBold) fontName = StandardFonts.TimesRomanBold
          else if (isItalic) fontName = StandardFonts.TimesRomanItalic
          else fontName = StandardFonts.TimesRoman
        } else if (family === "courier") {
          if (isBold && isItalic) fontName = StandardFonts.CourierBoldOblique
          else if (isBold) fontName = StandardFonts.CourierBold
          else if (isItalic) fontName = StandardFonts.CourierOblique
          else fontName = StandardFonts.Courier
        } else {
          if (isBold && isItalic) fontName = StandardFonts.HelveticaBoldOblique
          else if (isBold) fontName = StandardFonts.HelveticaBold
          else if (isItalic) fontName = StandardFonts.HelveticaOblique
          else fontName = StandardFonts.Helvetica
        }

        embeddedFonts[key] = await pdfDoc.embedFont(fontName)
        return embeddedFonts[key]
      }

      for (const field of mergedFieldValues) {
        const page = pdfDoc.getPage(Number(field.page || 1) - 1)
        if (!page) continue

        const value = field.value
        const { width: pageWidth, height: pageHeight } = page.getSize()
        const x = Number(field.x || 0) * pageWidth
        const yTop = Number(field.y || 0) * pageHeight
        const fieldWidth = Number(field.width || 0.2) * pageWidth
        const fieldHeight = Number(field.height || 0.04) * pageHeight
        const y = pageHeight - yTop - fieldHeight

        if (field.type === "checkbox") {
          if (value === true || value === "true") {
            const font = await pickFont(field)
            const checkSize = Math.max(4, Math.min(12, fieldHeight * 0.85))
            page.drawText("X", {
              x: x + Math.max(0.5, (fieldWidth - checkSize * 0.55) / 2),
              y: y + Math.max(0.5, (fieldHeight - checkSize) / 2),
              size: checkSize,
              font,
              color: hexToRgbColor(field.textColor),
            })
          }
          continue
        }

        if ((field.type === "image" || field.type === "signature") && typeof value === "string" && value) {
          try {
            const imageBytes = await fetch(value).then((response) => response.arrayBuffer())
            let image
            if (value.startsWith("data:image/png") || value.includes("image/png")) {
              image = await pdfDoc.embedPng(imageBytes)
            } else {
              image = await pdfDoc.embedJpg(imageBytes)
            }
            page.drawImage(image, {
              x,
              y,
              width: fieldWidth,
              height: fieldHeight,
            })
          } catch (imageError) {
            console.error("Failed to embed image field:", imageError)
          }
          continue
        }

        if (value != null && value !== "") {
          const font = await pickFont(field)
          const fontSize = Math.max(7, Number(field.fontSize || 10))
          const stringValue = Array.isArray(value)
            ? value
                .map((row) => (Array.isArray(row) ? row.join(" | ") : String(row || "")))
                .join("\n")
            : String(value)
          const rawText = field.uppercaseOnly ? stringValue.toUpperCase() : stringValue
          const renderedWidth = font.widthOfTextAtSize(rawText, fontSize)
          const padding = 2
          let textX = x + padding

          if (field.textAlign === "center") {
            textX = x + Math.max(padding, (fieldWidth - renderedWidth) / 2)
          } else if (field.textAlign === "right") {
            textX = x + Math.max(padding, fieldWidth - renderedWidth - padding)
          }

          page.drawText(rawText, {
            x: textX,
            y: y + Math.max(2, fieldHeight * 0.15),
            size: fontSize,
            font,
            color: hexToRgbColor(field.textColor),
            maxWidth: fieldWidth - 4,
            lineHeight: fontSize + 1,
          })
        }
      }

      const outBytes = await pdfDoc.save()
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
      const previewBlob = new Blob([outBytes], { type: "application/pdf" })
      const previewUrl = URL.createObjectURL(previewBlob)
      setPdfPreviewUrl(previewUrl)
      toast.success("Filled PDF generated.")
    } catch (error) {
      console.error("Failed to generate final PDF:", error)
      toast.error("Unable to generate PDF.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <AdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h1 className="text-xl font-semibold">Submission Viewer</h1>
          <p className="text-sm text-muted-foreground">Generate a final PDF with all student responses applied to the original template.</p>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading submission...</p> : null}

        {!loading && submission ? (
          <>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-sm"><span className="font-medium">Form:</span> {form?.title}</p>
              <p className="text-sm"><span className="font-medium">Student ID:</span> {submission.studentId}</p>
              <p className="text-sm"><span className="font-medium">Submission ID:</span> {submission.id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={generateFilledPdf}
                disabled={generating}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {generating ? "Generating..." : "Generate Filled PDF"}
              </button>
              <button
                onClick={() => {
                  if (!pdfPreviewUrl) return
                  const link = document.createElement("a")
                  link.href = pdfPreviewUrl
                  link.download = `submission-${submissionId}.pdf`
                  link.click()
                }}
                disabled={!pdfPreviewUrl}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Download
              </button>
              <button
                onClick={() => {
                  if (!pdfPreviewUrl) return
                  window.open(pdfPreviewUrl, "_blank", "noopener,noreferrer")
                }}
                disabled={!pdfPreviewUrl}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                View / Print
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              {pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} title="Generated PDF" className="h-[700px] w-full rounded-md border border-border" />
              ) : (
                <p className="text-sm text-muted-foreground">Click "Generate Filled PDF" to preview.</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AdminLayoutWrapper>
  )
}
