"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import interact from "interactjs"
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore"
import {
  FilePlus2,
  Save,
  Trash2,
  Move,
  FileText,
  Copy,
  Pencil,
  Eye,
  Grid2X2,
  Magnet,
  Lock,
  Unlock,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import AdminLayoutWrapper from "@/app/admin/admin-layout"
import PdfOverlayStage from "@/components/pdf-forms/PdfOverlayStage"
import { clamp01, createId, ensureUniqueFieldName, fileToDataUrl, loadProtectedPdfObjectUrl, normalizeFieldName, splitIntoChunks, withFieldDefaults } from "@/lib/pdf-form-utils"

const FIELD_TYPES = [
  { value: "textbox", label: "Textbox" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date (Calendar)" },
  { value: "image", label: "Image / Signature" },
]

const FONT_FAMILIES = [
  { value: "helvetica", label: "Helvetica" },
  { value: "arial", label: "Arial" },
  { value: "verdana", label: "Verdana" },
  { value: "tahoma", label: "Tahoma" },
  { value: "trebuchet", label: "Trebuchet MS" },
  { value: "times", label: "Times New Roman" },
  { value: "georgia", label: "Georgia" },
  { value: "garamond", label: "Garamond" },
  { value: "courier", label: "Courier New" },
  { value: "consolas", label: "Consolas" },
  { value: "monaco", label: "Monaco" },
]

const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
]

const FONT_STYLES = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italic" },
]

const TEXT_ALIGNMENTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
]

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

export default function AdminPdfFormsPage() {
  const { user } = useAuth()
  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState("")
  const [selectedForm, setSelectedForm] = useState(null)
  const [title, setTitle] = useState("")
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfUrl, setPdfUrl] = useState("")
  const [fields, setFields] = useState([])
  const [persistedIds, setPersistedIds] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [isEditMode, setIsEditMode] = useState(true)
  const [fieldType, setFieldType] = useState("textbox")
  const [fieldName, setFieldName] = useState("")
  const [fieldLabel, setFieldLabel] = useState("")
  const [selectedFieldId, setSelectedFieldId] = useState("")
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [gridStep, setGridStep] = useState(0.01)
  const [zoom, setZoom] = useState(1.3)
  const [scanHintsByPage, setScanHintsByPage] = useState({})
  const [isScanningPdf, setIsScanningPdf] = useState(false)
  const canvasScrollRef = useRef(null)
  const panStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const [isPanningCanvas, setIsPanningCanvas] = useState(false)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])

  function cloneFields(items) {
    return items.map((entry) => ({ ...entry }))
  }

  function pushUndoSnapshot(currentFields, currentSelectedFieldId) {
    const snapshot = {
      fields: cloneFields(currentFields),
      selectedFieldId: currentSelectedFieldId || "",
    }

    setUndoStack((previous) => {
      const next = [...previous, snapshot]
      return next.length > 120 ? next.slice(next.length - 120) : next
    })
    setRedoStack([])
  }

  function applyFieldsChange(transform, options = {}) {
    const { nextSelectedFieldId } = options
    setFields((previous) => {
      pushUndoSnapshot(previous, selectedFieldId)
      return transform(previous)
    })

    if (nextSelectedFieldId !== undefined) {
      setSelectedFieldId(nextSelectedFieldId || "")
    }
  }

  async function fetchForms() {
    try {
      const formsQuery = query(collection(db, "forms"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(formsQuery)
      const data = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
      setForms(data)
      if (!selectedFormId && data.length) {
        setSelectedFormId(data[0].id)
      }
    } catch (error) {
      console.error("Failed to fetch forms:", error)
      toast.error("Unable to load forms.")
    }
  }

  async function fetchFormFields(formId) {
    if (!formId) {
      setFields([])
      setPersistedIds([])
      return
    }

    try {
      const fieldsQuery = query(collection(db, "form_fields"), where("formId", "==", formId))
      const snapshot = await getDocs(fieldsQuery)
      const nextFields = snapshot.docs.map((entry) => withFieldDefaults(entry.data()))
      setFields(nextFields)
      setPersistedIds(nextFields.map((entry) => entry.fieldId))
      setUndoStack([])
      setRedoStack([])
    } catch (error) {
      console.error("Failed to fetch form fields:", error)
      toast.error("Unable to load field definitions.")
    }
  }

  async function fetchSubmissions(formId) {
    if (!formId) {
      setSubmissions([])
      return
    }

    try {
      const submissionsQuery = query(collection(db, "submissions"), where("formId", "==", formId), orderBy("submittedAt", "desc"))
      const snapshot = await getDocs(submissionsQuery)
      setSubmissions(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))
    } catch (error) {
      try {
        const fallbackQuery = query(collection(db, "submissions"), where("formId", "==", formId))
        const fallbackSnapshot = await getDocs(fallbackQuery)
        setSubmissions(fallbackSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))
      } catch (fallbackError) {
        console.error("Failed to fetch submissions:", fallbackError)
      }
    }
  }

  useEffect(() => {
    fetchForms()
  }, [])

  useEffect(() => {
    const form = forms.find((entry) => entry.id === selectedFormId) || null
    setSelectedForm(form)
    setSelectedFieldId("")
  }, [forms, selectedFormId])

  useEffect(() => {
    let cancelled = false
    let objectUrl = ""

    async function loadPdf() {
      if (!selectedForm?.id) {
        setPdfUrl("")
        return
      }
      try {
        objectUrl = await loadProtectedPdfObjectUrl(selectedForm.id)
        if (!cancelled) {
          setPdfUrl(objectUrl)
        }
      } catch (error) {
        console.error("Failed to load protected PDF:", error)
        if (!cancelled) {
          setPdfUrl("")
          toast.error("Unable to render PDF file.")
        }
      }
    }

    loadPdf()
    fetchFormFields(selectedFormId)
    fetchSubmissions(selectedFormId)

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [selectedForm?.id, selectedFormId])

  useEffect(() => {
    const draggable = interact(".builder-field")
      .draggable({
        inertia: false,
        listeners: {
          move(event) {
            if (!isEditMode) return
            if (event.target.dataset.locked === "true") return
            const target = event.target
            const dx = (Number(target.dataset.dx) || 0) + event.dx
            const dy = (Number(target.dataset.dy) || 0) + event.dy
            target.dataset.dx = String(dx)
            target.dataset.dy = String(dy)
            target.style.transform = `translate(${dx}px, ${dy}px)`
          },
          end(event) {
            if (!isEditMode) return
            const target = event.target
            if (target.dataset.locked === "true") return
            const fieldId = target.dataset.fieldId
            const dx = Number(target.dataset.dx) || 0
            const dy = Number(target.dataset.dy) || 0
            target.dataset.dx = "0"
            target.dataset.dy = "0"
            target.style.transform = "translate(0px, 0px)"

            const parentRect = target.parentElement?.getBoundingClientRect()
            if (!fieldId || !parentRect?.width || !parentRect?.height) {
              return
            }

            const xShift = dx / parentRect.width
            const yShift = dy / parentRect.height

            applyFieldsChange((previous) =>
              previous.map((entry) => {
                if (entry.fieldId !== fieldId) {
                  return entry
                }
                const nextX = clamp01(entry.x + xShift)
                const nextY = clamp01(entry.y + yShift)
                return {
                  ...entry,
                  x: snapToGrid ? snapValue(nextX, gridStep) : nextX,
                  y: snapToGrid ? snapValue(nextY, gridStep) : nextY,
                }
              }),
            )
          },
        },
      })
      .resizable({
        edges: { right: true, bottom: true },
        listeners: {
          move(event) {
            if (!isEditMode) return
            if (event.target.dataset.locked === "true") return
            const target = event.target
            target.style.width = `${event.rect.width}px`
            target.style.height = `${event.rect.height}px`
          },
          end(event) {
            if (!isEditMode) return
            const target = event.target
            if (target.dataset.locked === "true") return
            const fieldId = target.dataset.fieldId
            const parentRect = target.parentElement?.getBoundingClientRect()
            if (!fieldId || !parentRect?.width || !parentRect?.height) {
              return
            }

            const width = clamp01(event.rect.width / parentRect.width)
            const height = clamp01(event.rect.height / parentRect.height)

            applyFieldsChange((previous) =>
              previous.map((entry) => {
                if (entry.fieldId !== fieldId) {
                  return entry
                }
                const minSize = entry.type === "checkbox" ? 0.0015 : 0.01
                const nextWidth = Math.max(minSize, width)
                const nextHeight = Math.max(minSize, height)
                if (entry.type === "checkbox") {
                  return {
                    ...entry,
                    width: Math.max(0.0015, nextWidth),
                    height: Math.max(0.0015, nextHeight),
                  }
                }
                return {
                  ...entry,
                  width: snapToGrid ? snapValue(nextWidth, gridStep) : nextWidth,
                  height: snapToGrid ? snapValue(nextHeight, gridStep) : nextHeight,
                }
              }),
            )
          },
        },
      })

    return () => draggable.unset()
  }, [fields.length, selectedFormId, isEditMode, snapToGrid, gridStep, selectedFieldId])

  const selectedField = useMemo(() => fields.find((entry) => entry.fieldId === selectedFieldId) || null, [fields, selectedFieldId])

  function updateSelectedField(patch) {
    if (!selectedFieldId) return
    applyFieldsChange((previous) =>
      previous.map((entry) => {
        if (entry.fieldId !== selectedFieldId) return entry
        return { ...entry, ...patch }
      }),
    )
  }

  function snapValue(value, step = 0.01) {
    if (!step) return value
    return clamp01(Math.round(value / step) * step)
  }

  useEffect(() => {
    function handleNudge(event) {
      if (!isEditMode || !selectedFieldId) return
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
      if (!arrowKeys.includes(event.key)) return

      event.preventDefault()
      const step = event.shiftKey ? 0.01 : 0.003

      applyFieldsChange((previous) =>
        previous.map((entry) => {
          if (entry.fieldId !== selectedFieldId) return entry

          if (event.key === "ArrowUp") return { ...entry, y: clamp01(entry.y - step) }
          if (event.key === "ArrowDown") return { ...entry, y: clamp01(entry.y + step) }
          if (event.key === "ArrowLeft") return { ...entry, x: clamp01(entry.x - step) }
          return { ...entry, x: clamp01(entry.x + step) }
        }),
      )
    }

    window.addEventListener("keydown", handleNudge)
    return () => window.removeEventListener("keydown", handleNudge)
  }, [selectedFieldId, isEditMode])

  function handleUndo() {
    setUndoStack((previous) => {
      if (!previous.length) return previous
      const last = previous[previous.length - 1]
      setRedoStack((redoPrevious) => [
        ...redoPrevious,
        { fields: cloneFields(fields), selectedFieldId: selectedFieldId || "" },
      ])
      setFields(cloneFields(last.fields))
      setSelectedFieldId(last.selectedFieldId || "")
      return previous.slice(0, -1)
    })
  }

  function handleRedo() {
    setRedoStack((previous) => {
      if (!previous.length) return previous
      const last = previous[previous.length - 1]
      setUndoStack((undoPrevious) => [
        ...undoPrevious,
        { fields: cloneFields(fields), selectedFieldId: selectedFieldId || "" },
      ])
      setFields(cloneFields(last.fields))
      setSelectedFieldId(last.selectedFieldId || "")
      return previous.slice(0, -1)
    })
  }

  useEffect(() => {
    function onHistoryHotkey(event) {
      if (!isEditMode) return
      const targetTag = event.target?.tagName?.toLowerCase()
      const isTypingTarget =
        targetTag === "input" || targetTag === "textarea" || event.target?.isContentEditable
      if (isTypingTarget) return

      const isMod = event.ctrlKey || event.metaKey
      if (!isMod) return

      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault()
        handleRedo()
        return
      }

      if (event.key.toLowerCase() === "z") {
        event.preventDefault()
        handleUndo()
        return
      }

      if (event.key.toLowerCase() === "y") {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener("keydown", onHistoryHotkey)
    return () => window.removeEventListener("keydown", onHistoryHotkey)
  }, [isEditMode, undoStack.length, redoStack.length, fields, selectedFieldId])

  async function handleCreateForm() {
    if (!title.trim()) {
      toast.error("Please enter a form title.")
      return
    }
    if (!file) {
      toast.error("Please upload a PDF file.")
      return
    }

    setUploading(true)
    try {
      const formDoc = await addDoc(collection(db, "forms"), {
        title: title.trim(),
        createdBy: user?.uid || null,
        originalFileName: file.name,
        pdfSource: "firestore-chunks",
        pdfChunkCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const dataUrl = await fileToDataUrl(file)
      const chunks = splitIntoChunks(dataUrl)
      await Promise.all(
        chunks.map((chunk, index) =>
          setDoc(doc(db, "form_pdf_chunks", `${formDoc.id}_${index}`), {
            formId: formDoc.id,
            index,
            chunk,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        ),
      )

      await updateDoc(doc(db, "forms", formDoc.id), {
        pdfChunkCount: chunks.length,
        updatedAt: serverTimestamp(),
      })

      setTitle("")
      setFile(null)
      await fetchForms()
      setSelectedFormId(formDoc.id)
      toast.success("PDF form created.")
    } catch (error) {
      console.error("Failed to create form:", error)
      toast.error("Failed to create form.")
    } finally {
      setUploading(false)
    }
  }

  function handleAddField(event) {
    if (!isEditMode || !selectedFormId) {
      return
    }

    const usedNames = fields.map((entry) => entry.name)
    const autoLabel = fieldLabel.trim() || `${fieldType.toUpperCase()} Field`
    const nameCandidate = fieldName.trim() || autoLabel
    const uniqueName = ensureUniqueFieldName(nameCandidate, usedNames)

    if (fieldName.trim() && normalizeFieldName(fieldName) !== uniqueName) {
      toast.info(`Field name adjusted to "${uniqueName}" to avoid duplicates.`)
    }

    const newField = withFieldDefaults({
      fieldId: createId("field"),
      formId: selectedFormId,
      page: event.page,
      type: fieldType,
      name: uniqueName,
      label: autoLabel,
      x: event.x,
      y: event.y,
    })

    applyFieldsChange((previous) => [...previous, newField], { nextSelectedFieldId: newField.fieldId })
    setFieldName("")
    setFieldLabel("")
  }

  function duplicateSelectedField() {
    if (!selectedField) return
    const usedNames = fields.map((entry) => entry.name)
    const duplicate = withFieldDefaults({
      ...selectedField,
      fieldId: createId("field"),
      name: ensureUniqueFieldName(`${selectedField.name}_copy`, usedNames),
      x: clamp01((selectedField.x || 0) + 0.01),
      y: clamp01((selectedField.y || 0) + 0.01),
    })

    applyFieldsChange((previous) => [...previous, duplicate], { nextSelectedFieldId: duplicate.fieldId })
    toast.success("Field duplicated.")
  }

  function toggleFieldLock() {
    if (!selectedField) return
    updateSelectedField({ locked: !selectedField.locked })
  }

  function alignSelectedCenter(axis = "horizontal") {
    if (!selectedField) return
    if (axis === "horizontal") {
      updateSelectedField({ x: clamp01((1 - selectedField.width) / 2) })
      return
    }
    updateSelectedField({ y: clamp01((1 - selectedField.height) / 2) })
  }

  async function handleScanPdfStyles() {
    if (!pdfUrl) {
      toast.error("No PDF loaded to scan.")
      return
    }

    setIsScanningPdf(true)
    try {
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
      const task = pdfjs.getDocument(pdfUrl)
      const pdf = await task.promise

      const byPage = {}
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1 })
        const content = await page.getTextContent()
        const items = (content?.items || []).slice(0, 250)

        byPage[pageNumber] = items
          .map((item) => {
            const transform = item.transform || [1, 0, 0, 1, 0, 0]
            const x = Number(transform[4] || 0)
            const yBottom = Number(transform[5] || 0)
            const fontSize = Math.max(6, Math.abs(Number(transform[0] || transform[3] || 10)))
            const normalizedX = clamp01(x / viewport.width)
            const normalizedY = clamp01((viewport.height - yBottom) / viewport.height)

            return {
              x: normalizedX,
              y: normalizedY,
              fontSize: Number(fontSize.toFixed(1)),
              fontFamily: String(item.fontName || "helvetica"),
              text: String(item.str || "").trim().slice(0, 24),
            }
          })
          .filter((entry) => entry.text.length > 0)
      }

      setScanHintsByPage(byPage)
      toast.success("PDF scan complete. Style hints are now visible.")
    } catch (error) {
      console.error("Failed to scan PDF styles:", error)
      toast.error("Scan failed for this PDF.")
    } finally {
      setIsScanningPdf(false)
    }
  }

  function normalizeScannedFontFamily(scannedValue = "") {
    const value = String(scannedValue).toLowerCase()
    if (value.includes("times")) return "times"
    if (value.includes("courier")) return "courier"
    if (value.includes("mono")) return "consolas"
    if (value.includes("verdana")) return "verdana"
    if (value.includes("tahoma")) return "tahoma"
    if (value.includes("trebuchet")) return "trebuchet"
    if (value.includes("georgia")) return "georgia"
    return "helvetica"
  }

  function applyNearestScannedStyle() {
    if (!selectedField) {
      toast.error("Select a textbox first.")
      return
    }
    if (selectedField.type !== "textbox") {
      toast.error("Style scan applies to textbox fields only.")
      return
    }

    const hints = scanHintsByPage[selectedField.page] || []
    if (!hints.length) {
      toast.error("No scanned hints found on this page.")
      return
    }

    let nearest = hints[0]
    let minDistance = Number.POSITIVE_INFINITY
    for (const hint of hints) {
      const dx = hint.x - selectedField.x
      const dy = hint.y - selectedField.y
      const distance = dx * dx + dy * dy
      if (distance < minDistance) {
        minDistance = distance
        nearest = hint
      }
    }

    updateSelectedField({
      fontFamily: normalizeScannedFontFamily(nearest.fontFamily),
      fontSize: Math.max(8, Math.min(24, Math.round(nearest.fontSize))),
    })
    toast.success(`Applied scanned style: ${nearest.fontSize}pt`)
  }

  function handleClearScanHints() {
    setScanHintsByPage({})
    toast.success("Scan labels removed.")
  }

  const hasScanHints = useMemo(() => {
    return Object.values(scanHintsByPage).some((items) => Array.isArray(items) && items.length > 0)
  }, [scanHintsByPage])

  useEffect(() => {
    function onMouseMove(event) {
      if (!panStateRef.current.active || !canvasScrollRef.current) return
      const dx = event.clientX - panStateRef.current.startX
      const dy = event.clientY - panStateRef.current.startY
      canvasScrollRef.current.scrollLeft = panStateRef.current.scrollLeft - dx
      canvasScrollRef.current.scrollTop = panStateRef.current.scrollTop - dy
    }

    function onMouseUp() {
      if (!panStateRef.current.active) return
      panStateRef.current.active = false
      setIsPanningCanvas(false)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  function handleCanvasMouseDown(event) {
    if (event.button !== 0) return
    if (isEditMode) return
    if (zoom <= 1) return
    if (!canvasScrollRef.current) return

    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvasScrollRef.current.scrollLeft,
      scrollTop: canvasScrollRef.current.scrollTop,
    }
    setIsPanningCanvas(true)
    event.preventDefault()
  }

  function removeSelectedField() {
    if (!selectedFieldId) return
    applyFieldsChange((previous) => previous.filter((entry) => entry.fieldId !== selectedFieldId), {
      nextSelectedFieldId: "",
    })
  }

  async function handleSaveConfiguration() {
    if (!selectedFormId) return
    setSaving(true)
    try {
      const currentIds = new Set(fields.map((entry) => entry.fieldId))
      const deletedIds = persistedIds.filter((fieldId) => !currentIds.has(fieldId))

      await Promise.all(
        fields.map(async (entry) => {
          const payload = {
            ...entry,
            updatedAt: serverTimestamp(),
          }
          if (!persistedIds.includes(entry.fieldId)) {
            payload.createdAt = serverTimestamp()
          }
          await setDoc(doc(db, "form_fields", entry.fieldId), payload, { merge: true })
        }),
      )

      await Promise.all(deletedIds.map((fieldId) => deleteDoc(doc(db, "form_fields", fieldId))))
      await updateDoc(doc(db, "forms", selectedFormId), { updatedAt: serverTimestamp() })

      setPersistedIds(fields.map((entry) => entry.fieldId))
      toast.success("Form configuration saved.")
    } catch (error) {
      console.error("Failed to save form fields:", error)
      toast.error("Unable to save field changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayoutWrapper>
      <div className="p-2 md:p-3 lg:p-4">
        <div className="h-[calc(100vh-1rem)] rounded-xl border border-border bg-card shadow-sm overflow-hidden md:h-[calc(100vh-1.5rem)] lg:h-[calc(100vh-2rem)]">
          <div className="border-b border-border bg-card/95 p-3 md:p-4">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-background/50 p-2">
                <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Form</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedFormId}
                    onChange={(event) => setSelectedFormId(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                  >
                    <option value="">Select form</option>
                    {forms.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="New form title"
                    className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={handleCreateForm}
                    disabled={uploading}
                    className="shrink-0 rounded-md border border-primary bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                    title="Create form"
                  >
                    <FilePlus2 className="inline h-4 w-4" />
                    <span className="ml-1">{uploading ? "..." : "Create"}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background/50 p-2">
                <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Field</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <select
                    value={fieldType}
                    onChange={(event) => setFieldType(event.target.value)}
                    className="min-w-[100px] rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    disabled={!isEditMode}
                  >
                    {FIELD_TYPES.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(event) => setFieldName(event.target.value)}
                    placeholder="Field Key"
                    className="min-w-[110px] rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    disabled={!isEditMode}
                  />
                  <input
                    type="text"
                    value={fieldLabel}
                    onChange={(event) => setFieldLabel(event.target.value)}
                    placeholder="Display Label"
                    className="min-w-[110px] rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    disabled={!isEditMode}
                  />
                </div>
                <div className="mt-2 flex w-full items-center justify-between gap-2 pb-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleUndo}
                      disabled={undoStack.length === 0}
                      className="rounded-md border border-input px-2 py-1.5 text-xs disabled:opacity-40"
                      title="Undo (Ctrl/Cmd+Z)"
                    >
                      <Undo2 className="inline h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="rounded-md border border-input px-2 py-1.5 text-xs disabled:opacity-40"
                      title="Redo (Ctrl/Cmd+Y)"
                    >
                      <Redo2 className="inline h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    <button
                      onClick={() => setIsEditMode((value) => !value)}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                        isEditMode
                          ? "border border-amber-500 bg-amber-400 text-black"
                          : "border border-primary bg-primary text-primary-foreground"
                      }`}
                      title={isEditMode ? "Switch to view mode" : "Switch to edit mode"}
                    >
                      {isEditMode ? <Pencil className="inline h-3.5 w-3.5" /> : <Eye className="inline h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={duplicateSelectedField}
                      disabled={!selectedField}
                      className="rounded-md border border-slate-500 bg-slate-600 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      title="Duplicate selected field"
                    >
                      <Copy className="inline h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={removeSelectedField}
                      disabled={!selectedFieldId}
                      className="rounded-md border border-destructive bg-destructive px-2 py-1.5 text-xs font-medium text-destructive-foreground disabled:opacity-50"
                      title="Delete selected field"
                    >
                      <Trash2 className="inline h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleSaveConfiguration}
                      disabled={saving || !selectedFormId}
                      className="rounded-md border border-emerald-600 bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      title="Save form configuration"
                    >
                      <Save className="inline h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background/50 p-2">
                <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Canvas Tools</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
                  <button
                    onClick={() => setShowGrid((v) => !v)}
                    className={`rounded-md border px-2 py-1.5 text-xs ${showGrid ? "border-primary text-primary" : "border-input"}`}
                    title="Toggle grid"
                  >
                    <Grid2X2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setSnapToGrid((v) => !v)}
                    className={`rounded-md border px-2 py-1.5 text-xs ${snapToGrid ? "border-primary text-primary" : "border-input"}`}
                    title="Toggle snap to grid"
                  >
                    <Magnet className="h-3.5 w-3.5" />
                  </button>
                  <select
                    value={String(gridStep)}
                    onChange={(event) => setGridStep(Number(event.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="0.005">Fine</option>
                    <option value="0.01">Medium</option>
                    <option value="0.02">Coarse</option>
                  </select>
                  <button
                    onClick={handleScanPdfStyles}
                    disabled={!pdfUrl || isScanningPdf}
                    className="rounded-md border border-input px-2 py-1.5 text-[11px] font-medium disabled:opacity-50"
                    title="Scan PDF text style hints"
                  >
                    {isScanningPdf ? "Scanning..." : "Scan"}
                  </button>
                  <button
                    onClick={handleClearScanHints}
                    disabled={!hasScanHints}
                    className="rounded-md border border-input px-2 py-1.5 text-[11px] font-medium disabled:opacity-50"
                    title="Remove scan labels"
                  >
                    Clear Scan
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 text-sm">
                  <button
                    onClick={() => setZoom((previous) => Math.max(0.5, Number((previous - 0.1).toFixed(2))))}
                    className="rounded-md border border-input px-2 py-1.5 text-xs"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="h-2 w-40 cursor-pointer accent-primary"
                    title="Zoom slider"
                  />
                  <span className="rounded-md border border-input px-2 py-1.5 text-[11px] font-medium">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((previous) => Math.min(2.5, Number((previous + 0.1).toFixed(2))))}
                    className="rounded-md border border-input px-2 py-1.5 text-xs"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(1.3)}
                    className="rounded-md border border-input px-2 py-1.5 text-[11px] font-medium"
                    title="Reset zoom"
                  >
                    Default
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              <span className="font-semibold">Field Key</span> = backend key in Firestore,{" "}
              <span className="font-semibold">Display Label</span> = text shown to users.
            </div>
          </div>

          <div className="flex h-[calc(100%-84px)] overflow-hidden">
            <aside className="hidden md:flex md:w-80 md:flex-col md:border-r md:border-border bg-card">
              <div className="p-4 space-y-4 overflow-y-auto">
                <div className="rounded-md border border-border bg-background p-3 space-y-2">
                  <p className="text-xs font-semibold">Properties</p>
                  {!selectedField ? <p className="text-xs text-muted-foreground">Select a component on PDF.</p> : null}
                  <p className="text-[11px] text-muted-foreground">
                    Mode: <span className="font-medium">{isEditMode ? "Edit" : "View"}</span> | Arrows = nudge, Shift+Arrows = bigger move
                  </p>
                  {selectedField ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={selectedField.name || ""}
                        onChange={(event) => {
                          const usedNames = fields
                            .filter((entry) => entry.fieldId !== selectedField.fieldId)
                            .map((entry) => entry.name)
                          const unique = ensureUniqueFieldName(event.target.value || "field", usedNames)
                          updateSelectedField({ name: unique })
                        }}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        placeholder="Field Key (Firestore)"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold">Field Key</span> is your backend key/column name in Firestore.
                      </p>
                      <input
                        type="text"
                        value={selectedField.label || ""}
                        onChange={(event) => updateSelectedField({ label: event.target.value })}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        placeholder="Display Label"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold">Display Label</span> is what students see on the form.
                      </p>
                      {selectedField.type === "textbox" || selectedField.type === "date" ? (
                        <>
                          <select
                            value={selectedField.fontFamily || "helvetica"}
                            onChange={(event) => updateSelectedField({ fontFamily: event.target.value })}
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                          >
                            {FONT_FAMILIES.map((entry) => (
                              <option key={entry.value} value={entry.value}>
                                {entry.label}
                              </option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              min={8}
                              max={48}
                              value={selectedField.fontSize || 12}
                              onChange={(event) => updateSelectedField({ fontSize: Number(event.target.value || 12) })}
                              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                              placeholder="Font size"
                            />
                            <select
                              value={selectedField.fontWeight || "normal"}
                              onChange={(event) => updateSelectedField({ fontWeight: event.target.value })}
                              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                            >
                              {FONT_WEIGHTS.map((entry) => (
                                <option key={entry.value} value={entry.value}>
                                  {entry.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <select
                            value={selectedField.fontStyle || "normal"}
                            onChange={(event) => updateSelectedField({ fontStyle: event.target.value })}
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                          >
                            {FONT_STYLES.map((entry) => (
                              <option key={entry.value} value={entry.value}>
                                {entry.label}
                              </option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={selectedField.textAlign || "left"}
                              onChange={(event) => updateSelectedField({ textAlign: event.target.value })}
                              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                            >
                              {TEXT_ALIGNMENTS.map((entry) => (
                                <option key={entry.value} value={entry.value}>
                                  {entry.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="color"
                              value={selectedField.textColor || "#111827"}
                              onChange={(event) => updateSelectedField({ textColor: event.target.value })}
                              className="h-8 rounded-md border border-input bg-background px-1 py-1"
                              title="Text Color"
                            />
                          </div>
                          <label className="flex items-center gap-2 rounded-md border border-input px-2 py-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedField.uppercaseOnly)}
                              onChange={(event) => updateSelectedField({ uppercaseOnly: event.target.checked })}
                            />
                            ALL CAPS only
                          </label>
                          <button
                            onClick={applyNearestScannedStyle}
                            className="w-full rounded-md border border-input px-2 py-1.5 text-xs"
                            title="Apply nearest scanned text style to this textbox"
                          >
                            Apply scanned style
                          </button>
                        </>
                      ) : null}
                      <p className="text-[11px] text-muted-foreground">
                        {selectedField.type} | page {selectedField.page} | {(selectedField.width * 100).toFixed(1)}% x{" "}
                        {(selectedField.height * 100).toFixed(1)}%
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => alignSelectedCenter("horizontal")}
                          className="rounded-md border border-input px-2 py-1 text-[11px]"
                          title="Center selected field horizontally"
                        >
                          Center X
                        </button>
                        <button
                          onClick={() => alignSelectedCenter("vertical")}
                          className="rounded-md border border-input px-2 py-1 text-[11px]"
                          title="Center selected field vertically"
                        >
                          Center Y
                        </button>
                        <button
                          onClick={toggleFieldLock}
                          className="rounded-md border border-input px-2 py-1 text-[11px]"
                          title={selectedField?.locked ? "Unlock selected field" : "Lock selected field"}
                        >
                          {selectedField?.locked ? (
                            <span className="inline-flex items-center gap-1"><Unlock className="h-3 w-3" /> Unlock</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Lock</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-md border border-border bg-background p-3 space-y-2">
                  <p className="text-xs font-semibold">Submissions</p>
                  {submissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No submissions yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {submissions.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/admin/pdf-forms/${selectedFormId}/submissions/${entry.id}`}
                          className="block rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
                        >
                          <FileText className="mr-1 inline h-3 w-3" />
                          Submission {entry.id.slice(0, 8)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <section
              ref={canvasScrollRef}
              onMouseDown={handleCanvasMouseDown}
              className={`flex-1 overflow-auto bg-muted/20 p-3 md:p-4 ${
                zoom > 1 && !isEditMode ? (isPanningCanvas ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
              }`}
            >
              {!pdfUrl ? (
                <div className="grid min-h-[500px] place-items-center rounded-lg border border-dashed border-border bg-card">
                  <p className="text-sm text-muted-foreground">Select a form with a PDF to start building.</p>
                </div>
              ) : (
                <div
                  className="rounded-lg border border-border/80 bg-card p-2"
                  style={{
                    backgroundImage: showGrid
                      ? "linear-gradient(to right, rgba(100,116,139,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.15) 1px, transparent 1px)"
                      : "none",
                    backgroundSize: "16px 16px",
                  }}
                >
                  <PdfOverlayStage
                    pdfUrl={pdfUrl}
                    scale={zoom}
                    onPageClick={isEditMode ? handleAddField : undefined}
                    renderOverlay={(page) => (
                      <>
                        {fields
                          .filter((field) => field.page === page.page)
                          .map((field) => (
                            <button
                              key={field.fieldId}
                              type="button"
                              data-field-id={field.fieldId}
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedFieldId(field.fieldId)
                              }}
                              data-locked={field.locked ? "true" : "false"}
                              className={`builder-field pointer-events-auto absolute rounded border ${
                                selectedFieldId === field.fieldId ? "border-amber-500" : "border-blue-500"
                              }`}
                              style={{
                                left: `${field.x * 100}%`,
                                top: `${field.y * 100}%`,
                                width: `${field.width * 100}%`,
                                height: `${field.height * 100}%`,
                                cursor: isEditMode ? "move" : "default",
                                backgroundColor: "transparent",
                                fontFamily: getCssFontFamily(field.fontFamily),
                                fontSize: `${field.fontSize || 12}px`,
                                fontWeight: field.fontWeight || "normal",
                                fontStyle: field.fontStyle || "normal",
                                color: field.textColor || "#111827",
                                textAlign: field.textAlign || "left",
                                opacity: field.locked ? 0.65 : 1,
                              }}
                            >
                              <span className="pointer-events-none block truncate px-1 py-0.5">
                                <Move className="mr-1 inline h-3 w-3" />
                                {field.type} - {field.name}
                              </span>
                              <span className="absolute bottom-0 right-0 h-2 w-2 bg-blue-700" />
                            </button>
                          ))}
                        {(scanHintsByPage[page.page] || []).slice(0, 120).map((hint, index) => (
                          <div
                            key={`hint-${page.page}-${index}`}
                            className="pointer-events-none absolute text-[9px] text-blue-800"
                            style={{
                              left: `${hint.x * 100}%`,
                              top: `${hint.y * 100}%`,
                              transform: "translate(-10%, -100%)",
                            }}
                          >
                            <span className="inline-flex items-center gap-1 rounded border border-blue-300 bg-blue-100/80 px-1 py-0.5">
                              ↘ {hint.fontSize}pt
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}
