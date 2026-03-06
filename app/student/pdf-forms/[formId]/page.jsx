"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import PdfOverlayStage from "@/components/pdf-forms/PdfOverlayStage"
import { fileToDataUrl, loadProtectedPdfObjectUrl, withFieldDefaults } from "@/lib/pdf-form-utils"

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
  const hiddenDateInputsRef = useRef({})

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
          initialValues[field.fieldId] = field.type === "checkbox" ? false : ""
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
    setSubmitting(true)
    try {
      const submissionRef = await addDoc(collection(db, "submissions"), {
        formId,
        studentId: user.uid,
        submittedAt: serverTimestamp(),
      })

      const kvEntries = await Promise.all(
        fields.map(async (field) => {
          let value = values[field.fieldId]
          const key = field.name || field.fieldId

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

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold">{form?.title || "PDF Form"}</h1>
        <p className="text-sm text-muted-foreground">Complete all needed fields, then submit to admin.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 md:p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading form...</p>
        ) : (
          <>
            {pdfUrl ? (
              <PdfOverlayStage
                pdfUrl={pdfUrl}
                renderOverlay={(page) => (
                  <>
                    {(fieldsByPage[page.page] || []).map((field) => {
                      const commonStyle = {
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                      }

                      if (field.type === "checkbox") {
                        return (
                          <button
                            key={field.fieldId}
                            type="button"
                            aria-label={field.label || field.name || "checkbox"}
                            className="pointer-events-auto absolute rounded border border-primary/70 bg-transparent"
                            style={commonStyle}
                            onClick={() =>
                              setValues((previous) => ({
                                ...previous,
                                [field.fieldId]: !Boolean(previous[field.fieldId]),
                              }))
                            }
                          >
                            {Boolean(values[field.fieldId]) ? (
                              <span
                                className="absolute left-1/2 top-1/2 block bg-black"
                                style={{
                                  width: "65%",
                                  height: "65%",
                                  transform: "translate(-50%, -50%)",
                                }}
                              />
                            ) : null}
                          </button>
                        )
                      }

                      if (field.type === "image") {
                        const hasPreview = typeof values[field.fieldId] === "string" && values[field.fieldId]
                        return (
                          <label
                            key={field.fieldId}
                            className="pointer-events-auto absolute flex cursor-pointer items-center justify-center rounded border border-dashed border-primary/70 bg-transparent text-[11px]"
                            style={commonStyle}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
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
                              <span className="px-1 text-center">{field.label || "Upload image"}</span>
                            )}
                          </label>
                        )
                      }

                      if (field.type === "date") {
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
                              className="h-full w-full rounded border border-primary/60 bg-transparent px-1 text-left text-[12px]"
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
                                fontSize: `${field.fontSize || 12}px`,
                                fontWeight: field.fontWeight || "normal",
                                fontStyle: field.fontStyle || "normal",
                                color: field.textColor || "#111827",
                                textAlign: field.textAlign || "left",
                              }}
                            >
                              {values[field.fieldId] || "dd-mm-yyyy"}
                            </button>
                          </div>
                        )
                      }

                      return (
                        <input
                          key={field.fieldId}
                          type="text"
                          value={values[field.fieldId] || ""}
                          placeholder={field.label}
                          onChange={(event) =>
                            setValues((previous) => ({
                              ...previous,
                              [field.fieldId]: field.uppercaseOnly
                                ? event.target.value.toUpperCase()
                                : event.target.value,
                            }))
                          }
                          className="pointer-events-auto absolute rounded border border-primary/60 bg-transparent px-1 text-[12px] outline-none focus:border-primary"
                          style={{
                            ...commonStyle,
                            fontFamily: getCssFontFamily(field.fontFamily),
                            fontSize: `${field.fontSize || 12}px`,
                            fontWeight: field.fontWeight || "normal",
                            fontStyle: field.fontStyle || "normal",
                            textTransform: field.uppercaseOnly ? "uppercase" : "none",
                            color: field.textColor || "#111827",
                            textAlign: field.textAlign || "left",
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

      <div className="flex justify-end">
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
