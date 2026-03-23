"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import interact from "interactjs"
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore"
import {
  AlertTriangle,
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
import {
  clamp01,
  createId,
  ensureUniqueFieldName,
  fileToDataUrl,
  loadProtectedPdfObjectUrl,
  normalizeFieldName,
  normalizeTableRatios,
  splitIntoChunks,
  withFieldDefaults,
} from "@/lib/pdf-form-utils"
import { pickStudentDisplayName } from "@/lib/user-display"

const FIELD_TYPES = [
  { value: "textbox", label: "Textbox" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date (Calendar)" },
  { value: "image", label: "Image Upload" },
  { value: "signature", label: "Signature (Draw on screen)" },
  { value: "table", label: "Table" },
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
const COLOR_SWATCHES = ["#111827", "#000000", "#ffffff", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#db2777"]
const MAX_TABLE_DIMENSION = 50

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

function getColorInputValue(value, fallback = "#ffffff") {
  const raw = String(value || "").trim()
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw
  }
  return fallback
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

function isTransparentLineColor(value) {
  return String(value || "").trim().toLowerCase() === "transparent"
}

function resolveLineColor(value, fallback = "#94a3b8") {
  const raw = String(value || "").trim()
  if (isTransparentLineColor(raw)) {
    return "transparent"
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw
  }
  return fallback
}

function createEqualRatios(count) {
  return normalizeTableRatios(Array.from({ length: Math.max(1, Number(count || 1)) }, () => 1), count)
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
  const [previewSubmission, setPreviewSubmission] = useState(null)
  const [isEditMode, setIsEditMode] = useState(true)
  const [fieldType, setFieldType] = useState("textbox")
  const [fieldName, setFieldName] = useState("")
  const [fieldLabel, setFieldLabel] = useState("")
  const [selectedFieldId, setSelectedFieldId] = useState("")
  const [selectedFieldIds, setSelectedFieldIds] = useState([])
  const [clipboardFields, setClipboardFields] = useState([])
  const [selectionBox, setSelectionBox] = useState(null)
  const selectionStateRef = useRef({
    active: false,
    page: 1,
    startX: 0,
    startY: 0,
    append: false,
    rect: null,
  })
  const [contextMenu, setContextMenu] = useState(null)
  const [suppressNextAddClick, setSuppressNextAddClick] = useState(false)
  const tableLineDragRef = useRef({
    active: false,
    fieldId: "",
    axis: "col",
    index: 0,
    startClientX: 0,
    startClientY: 0,
    parentRect: null,
    ratios: [],
  })
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
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  function cloneFields(items) {
    return items.map((entry) => ({ ...entry }))
  }

  function setSelection(nextIds = [], nextPrimaryId = "") {
    const uniqueIds = Array.from(new Set(nextIds))
    const primary = nextPrimaryId || uniqueIds[0] || ""
    setSelectedFieldIds(uniqueIds)
    setSelectedFieldId(primary)
  }

  function getRectFromPoints(startX, startY, endX, endY) {
    const left = Math.min(startX, endX)
    const right = Math.max(startX, endX)
    const top = Math.min(startY, endY)
    const bottom = Math.max(startY, endY)
    return { left, right, top, bottom, width: right - left, height: bottom - top }
  }

  function doesFieldIntersectRect(field, rect) {
    const fieldLeft = Number(field.x || 0)
    const fieldTop = Number(field.y || 0)
    const fieldRight = fieldLeft + Number(field.width || 0)
    const fieldBottom = fieldTop + Number(field.height || 0)
    return !(fieldRight < rect.left || fieldLeft > rect.right || fieldBottom < rect.top || fieldTop > rect.bottom)
  }

  function getTableRatios(field) {
    const rowCount = Math.max(1, Number(field?.tableRows || 3))
    const colCount = Math.max(1, Number(field?.tableCols || 3))
    return {
      rowRatios: normalizeTableRatios(field?.tableRowRatios, rowCount),
      colRatios: normalizeTableRatios(field?.tableColRatios, colCount),
    }
  }

  function pushUndoSnapshot(currentFields, currentSelectedFieldId, currentSelectedFieldIds) {
    const snapshot = {
      fields: cloneFields(currentFields),
      selectedFieldId: currentSelectedFieldId || "",
      selectedFieldIds: Array.isArray(currentSelectedFieldIds) ? [...currentSelectedFieldIds] : [],
    }

    setUndoStack((previous) => {
      const next = [...previous, snapshot]
      return next.length > 120 ? next.slice(next.length - 120) : next
    })
    setRedoStack([])
  }

  function applyFieldsChange(transform, options = {}) {
    const { nextSelectedFieldId, nextSelectedFieldIds } = options
    setFields((previous) => {
      pushUndoSnapshot(previous, selectedFieldId, selectedFieldIds)
      return transform(previous)
    })

    if (nextSelectedFieldIds !== undefined) {
      setSelection(nextSelectedFieldIds, nextSelectedFieldId)
      return
    }
    if (nextSelectedFieldId !== undefined) {
      setSelection(nextSelectedFieldId ? [nextSelectedFieldId] : [], nextSelectedFieldId || "")
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

    async function attachStudentProfiles(list) {
      const ids = [...new Set(list.map((s) => s.studentId).filter(Boolean))]
      const profileMap = {}
      await Promise.all(
        ids.map(async (uid) => {
          try {
            const userSnap = await getDoc(doc(db, "users", uid))
            if (userSnap.exists()) {
              profileMap[uid] = userSnap.data()
            }
          } catch {
            // Missing doc or permission — table will show UID only
          }
        }),
      )
      return list.map((s) => ({
        ...s,
        _studentProfile: profileMap[s.studentId] || null,
      }))
    }

    try {
      const submissionsQuery = query(collection(db, "submissions"), where("formId", "==", formId), orderBy("submittedAt", "desc"))
      const snapshot = await getDocs(submissionsQuery)
      const list = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
      setSubmissions(await attachStudentProfiles(list))
    } catch (error) {
      try {
        const fallbackQuery = query(collection(db, "submissions"), where("formId", "==", formId))
        const fallbackSnapshot = await getDocs(fallbackQuery)
        const list = fallbackSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
        setSubmissions(await attachStudentProfiles(list))
      } catch (fallbackError) {
        console.error("Failed to fetch submissions:", fallbackError)
      }
    }
  }

  useEffect(() => {
    fetchForms()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    const mediaQuery = window.matchMedia("(max-width: 767px)")
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches)
    syncViewport()
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport)
      return () => mediaQuery.removeEventListener("change", syncViewport)
    }
    mediaQuery.addListener(syncViewport)
    return () => mediaQuery.removeListener(syncViewport)
  }, [])

  useEffect(() => {
    const form = forms.find((entry) => entry.id === selectedFormId) || null
    setSelectedForm(form)
    setSelection([], "")
  }, [forms, selectedFormId])

  useEffect(() => {
    function onEscClose(event) {
      if (event.key === "Escape") {
        setPreviewSubmission(null)
      }
    }
    window.addEventListener("keydown", onEscClose)
    return () => window.removeEventListener("keydown", onEscClose)
  }, [])

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
            if (tableLineDragRef.current.active) return
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
            if (tableLineDragRef.current.active) return
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
            if (tableLineDragRef.current.active) return
            if (event.target.dataset.locked === "true") return
            const target = event.target
            target.style.width = `${event.rect.width}px`
            target.style.height = `${event.rect.height}px`
          },
          end(event) {
            if (!isEditMode) return
            if (tableLineDragRef.current.active) return
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
  const selectedFields = useMemo(
    () => fields.filter((entry) => selectedFieldIds.includes(entry.fieldId)),
    [fields, selectedFieldIds],
  )
  const unnamedFields = useMemo(() => {
    return fields.filter((entry) => !String(entry.name || "").trim())
  }, [fields])
  const duplicateFieldNameKeys = useMemo(() => {
    const counts = new Map()
    fields.forEach((entry) => {
      const rawName = String(entry.name || "").trim()
      if (!rawName) return
      const normalized = normalizeFieldName(rawName)
      counts.set(normalized, (counts.get(normalized) || 0) + 1)
    })
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  }, [fields])

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
      if (!isEditMode || selectedFieldIds.length === 0) return
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
      if (!arrowKeys.includes(event.key)) return

      event.preventDefault()
      const step = event.shiftKey ? 0.01 : 0.003

      const selectedSet = new Set(selectedFieldIds)
      applyFieldsChange((previous) =>
        previous.map((entry) => {
          if (!selectedSet.has(entry.fieldId)) return entry

          if (event.key === "ArrowUp") return { ...entry, y: clamp01(entry.y - step) }
          if (event.key === "ArrowDown") return { ...entry, y: clamp01(entry.y + step) }
          if (event.key === "ArrowLeft") return { ...entry, x: clamp01(entry.x - step) }
          return { ...entry, x: clamp01(entry.x + step) }
        }),
      )
    }

    window.addEventListener("keydown", handleNudge)
    return () => window.removeEventListener("keydown", handleNudge)
  }, [selectedFieldIds, isEditMode])

  function handleUndo() {
    setUndoStack((previous) => {
      if (!previous.length) return previous
      const last = previous[previous.length - 1]
      setRedoStack((redoPrevious) => [
        ...redoPrevious,
        {
          fields: cloneFields(fields),
          selectedFieldId: selectedFieldId || "",
          selectedFieldIds: [...selectedFieldIds],
        },
      ])
      setFields(cloneFields(last.fields))
      setSelection(last.selectedFieldIds || (last.selectedFieldId ? [last.selectedFieldId] : []), last.selectedFieldId || "")
      return previous.slice(0, -1)
    })
  }

  function handleRedo() {
    setRedoStack((previous) => {
      if (!previous.length) return previous
      const last = previous[previous.length - 1]
      setUndoStack((undoPrevious) => [
        ...undoPrevious,
        {
          fields: cloneFields(fields),
          selectedFieldId: selectedFieldId || "",
          selectedFieldIds: [...selectedFieldIds],
        },
      ])
      setFields(cloneFields(last.fields))
      setSelection(last.selectedFieldIds || (last.selectedFieldId ? [last.selectedFieldId] : []), last.selectedFieldId || "")
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
    if (suppressNextAddClick) {
      setSuppressNextAddClick(false)
      return
    }
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
    if (!selectedFields.length) return
    const usedNames = fields.map((entry) => entry.name)
    const takenNames = [...usedNames]
    const duplicates = selectedFields.map((entry, index) => {
      const nextName = ensureUniqueFieldName(`${entry.name || "field"}_copy`, takenNames)
      takenNames.push(nextName)
      return withFieldDefaults({
        ...entry,
        fieldId: createId("field"),
        name: nextName,
        x: clamp01((entry.x || 0) + 0.01 + index * 0.002),
        y: clamp01((entry.y || 0) + 0.01 + index * 0.002),
      })
    })

    applyFieldsChange((previous) => [...previous, ...duplicates], {
      nextSelectedFieldIds: duplicates.map((entry) => entry.fieldId),
      nextSelectedFieldId: duplicates[0]?.fieldId || "",
    })
    toast.success(`${duplicates.length} field(s) duplicated.`)
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
    function closeContextMenu() {
      setContextMenu(null)
    }
    window.addEventListener("click", closeContextMenu)
    window.addEventListener("scroll", closeContextMenu, true)
    return () => {
      window.removeEventListener("click", closeContextMenu)
      window.removeEventListener("scroll", closeContextMenu, true)
    }
  }, [])

  useEffect(() => {
    function onClipboardHotkeys(event) {
      if (!isEditMode) return
      const targetTag = event.target?.tagName?.toLowerCase()
      const isTypingTarget =
        targetTag === "input" || targetTag === "textarea" || event.target?.isContentEditable
      if (isTypingTarget) return

      const isMod = event.ctrlKey || event.metaKey
      if (!isMod) {
        if (event.key === "Delete" || event.key === "Backspace") {
          if (!selectedFieldIds.length) return
          event.preventDefault()
          removeSelectedField()
        }
        return
      }

      const key = event.key.toLowerCase()
      if (key === "c") {
        event.preventDefault()
        copySelectedFields()
        return
      }
      if (key === "x") {
        event.preventDefault()
        cutSelectedFields()
        return
      }
      if (key === "v") {
        event.preventDefault()
        pasteClipboardFields()
      }
    }

    window.addEventListener("keydown", onClipboardHotkeys)
    return () => window.removeEventListener("keydown", onClipboardHotkeys)
  }, [isEditMode, selectedFieldIds, selectedFields, clipboardFields, fields])

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
    if (!selectedFieldIds.length) return
    const selectedSet = new Set(selectedFieldIds)
    applyFieldsChange((previous) => previous.filter((entry) => !selectedSet.has(entry.fieldId)), {
      nextSelectedFieldIds: [],
      nextSelectedFieldId: "",
    })
  }

  function copySelectedFields() {
    if (!selectedFields.length) {
      toast.error("Select component(s) to copy.")
      return false
    }
    const cloned = selectedFields.map((entry) => ({ ...entry }))
    setClipboardFields(cloned)
    toast.success(`${cloned.length} field(s) copied.`)
    return true
  }

  function cutSelectedFields() {
    const copied = copySelectedFields()
    if (!copied) return
    removeSelectedField()
  }

  function pasteClipboardFields(anchor = null) {
    if (!clipboardFields.length) {
      toast.error("Clipboard is empty.")
      return
    }

    const baseMinX = Math.min(...clipboardFields.map((entry) => Number(entry.x || 0)))
    const baseMinY = Math.min(...clipboardFields.map((entry) => Number(entry.y || 0)))
    const usedNames = fields.map((entry) => entry.name)
    const takenNames = [...usedNames]
    const offsetX = anchor ? clamp01(anchor.x) - baseMinX : 0.01
    const offsetY = anchor ? clamp01(anchor.y) - baseMinY : 0.01
    const targetPage = anchor?.page || clipboardFields[0]?.page || 1

    const pasted = clipboardFields.map((entry, index) => {
      const nextName = ensureUniqueFieldName(`${entry.name || "field"}_copy`, takenNames)
      takenNames.push(nextName)
      return withFieldDefaults({
        ...entry,
        fieldId: createId("field"),
        name: nextName,
        page: targetPage,
        x: clamp01((entry.x || 0) + offsetX + index * 0.002),
        y: clamp01((entry.y || 0) + offsetY + index * 0.002),
      })
    })

    applyFieldsChange((previous) => [...previous, ...pasted], {
      nextSelectedFieldIds: pasted.map((entry) => entry.fieldId),
      nextSelectedFieldId: pasted[0]?.fieldId || "",
    })
    toast.success(`${pasted.length} field(s) pasted.`)
  }

  function handleFieldContextMenu(event, field) {
    event.preventDefault()
    event.stopPropagation()
    const alreadySelected = selectedFieldIds.includes(field.fieldId)
    if (!alreadySelected) {
      setSelection([field.fieldId], field.fieldId)
    }
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      page: field.page,
      x: field.x,
      y: field.y,
    })
  }

  function handlePageMouseDown(event) {
    if (!isEditMode) return
    if (event.nativeEvent.button !== 0) return
    const wrapper = event.nativeEvent.target?.closest?.("[data-page]")
    const pageRect = wrapper?.getBoundingClientRect?.()
    if (!pageRect?.width || !pageRect?.height) return

    event.nativeEvent.preventDefault()

    function toNormalized(clientX, clientY) {
      const x = clamp01((clientX - pageRect.left) / pageRect.width)
      const y = clamp01((clientY - pageRect.top) / pageRect.height)
      return { x, y }
    }

    selectionStateRef.current = {
      active: true,
      page: event.page,
      startX: event.x,
      startY: event.y,
      append: event.nativeEvent.ctrlKey || event.nativeEvent.metaKey,
      rect: pageRect,
    }
    setSelectionBox({
      page: event.page,
      startX: event.x,
      startY: event.y,
      endX: event.x,
      endY: event.y,
    })
    setContextMenu(null)

    function onWindowMouseMove(moveEvent) {
      if (!selectionStateRef.current.active) return
      const point = toNormalized(moveEvent.clientX, moveEvent.clientY)
      setSelectionBox((previous) => {
        if (!previous) return previous
        return { ...previous, endX: point.x, endY: point.y }
      })
    }

    function onWindowMouseUp(upEvent) {
      const state = selectionStateRef.current
      selectionStateRef.current = {
        active: false,
        page: 1,
        startX: 0,
        startY: 0,
        append: false,
        rect: null,
      }

      const point = toNormalized(upEvent.clientX, upEvent.clientY)
      const rect = getRectFromPoints(state.startX, state.startY, point.x, point.y)
      setSelectionBox(null)

      if (rect.width >= 0.003 || rect.height >= 0.003) {
        const idsInBox = fields
          .filter((entry) => entry.page === state.page && doesFieldIntersectRect(entry, rect))
          .map((entry) => entry.fieldId)

        const nextIds = state.append ? Array.from(new Set([...selectedFieldIds, ...idsInBox])) : idsInBox
        setSelection(nextIds, nextIds[0] || "")
        setSuppressNextAddClick(true)
      }

      window.removeEventListener("mousemove", onWindowMouseMove)
      window.removeEventListener("mouseup", onWindowMouseUp)
    }

    window.addEventListener("mousemove", onWindowMouseMove)
    window.addEventListener("mouseup", onWindowMouseUp)
  }

  function handlePageMouseMove() {}

  function handlePageMouseUp() {}

  function handlePageContextMenu(event) {
    if (!isEditMode) return
    event.nativeEvent.preventDefault()
    setContextMenu({
      clientX: event.nativeEvent.clientX,
      clientY: event.nativeEvent.clientY,
      page: event.page,
      x: event.x,
      y: event.y,
    })
  }

  function startTableLineDrag(event, field, axis, index) {
    if (!isEditMode) return
    if (field.locked) return
    event.preventDefault()
    event.stopPropagation()
    const parentField = event.currentTarget.closest?.("[data-field-id]")
    const parentRect = parentField?.getBoundingClientRect?.()
    if (!parentRect?.width || !parentRect?.height) return

    const { rowRatios, colRatios } = getTableRatios(field)
    tableLineDragRef.current = {
      active: true,
      fieldId: field.fieldId,
      axis,
      index,
      startClientX: event.clientX,
      startClientY: event.clientY,
      parentRect,
      ratios: axis === "col" ? colRatios : rowRatios,
    }
    pushUndoSnapshot(fields, selectedFieldId, selectedFieldIds)
    setRedoStack([])
    setContextMenu(null)
  }

  useEffect(() => {
    function onWindowMouseMove(event) {
      const drag = tableLineDragRef.current
      if (!drag.active) return

      const movement =
        drag.axis === "col"
          ? (event.clientX - drag.startClientX) / Math.max(1, drag.parentRect.width)
          : (event.clientY - drag.startClientY) / Math.max(1, drag.parentRect.height)

      const base = [...drag.ratios]
      const total = base[drag.index] + base[drag.index + 1]
      if (!Number.isFinite(total) || total <= 0) return
      const minShare = 0.02
      const nextLead = Math.max(minShare, Math.min(total - minShare, base[drag.index] + movement))
      const nextTrail = total - nextLead
      const nextRatios = [...base]
      nextRatios[drag.index] = nextLead
      nextRatios[drag.index + 1] = nextTrail

      setFields((previous) =>
        previous.map((entry) => {
          if (entry.fieldId !== drag.fieldId) return entry
          if (drag.axis === "col") {
            return { ...entry, tableColRatios: normalizeTableRatios(nextRatios, nextRatios.length) }
          }
          return { ...entry, tableRowRatios: normalizeTableRatios(nextRatios, nextRatios.length) }
        }),
      )
    }

    function onWindowMouseUp() {
      if (!tableLineDragRef.current.active) return
      tableLineDragRef.current = {
        active: false,
        fieldId: "",
        axis: "col",
        index: 0,
        startClientX: 0,
        startClientY: 0,
        parentRect: null,
        ratios: [],
      }
    }

    window.addEventListener("mousemove", onWindowMouseMove)
    window.addEventListener("mouseup", onWindowMouseUp)
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove)
      window.removeEventListener("mouseup", onWindowMouseUp)
    }
  }, [])

  async function handleSaveConfiguration() {
    if (!selectedFormId) return
    const missingNameField = fields.find((entry) => !String(entry.name || "").trim())
    if (missingNameField) {
      setSelection([missingNameField.fieldId], missingNameField.fieldId)
      toast.error("Some components have no field key. Add a field key before saving.")
      return
    }
    if (duplicateFieldNameKeys.length > 0) {
      toast.error(`Duplicate field keys found: ${duplicateFieldNameKeys.slice(0, 3).join(", ")}`)
      return
    }
    setSaving(true)
    try {
      const currentIds = new Set(fields.map((entry) => entry.fieldId))
      const deletedIds = persistedIds.filter((fieldId) => !currentIds.has(fieldId))

      await Promise.all(
        fields.map(async (entry) => {
          const payload = {
            ...entry,
            name: String(entry.name || "").trim(),
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
      {isMobileViewport ? (
        <div className="p-3 md:p-4">
          <div className="flex min-h-[55vh] items-center justify-center rounded-xl border border-border bg-card p-5 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-sm font-semibold text-foreground">PDF Builder is desktop-only.</p>
              <p className="text-xs text-muted-foreground">
                Open this page on tablet/desktop (at least 768px width) to create or edit PDF form fields.
              </p>
              <Link href="/admin" className="inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium">
                Back to Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : (
      <>
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
                      disabled={selectedFieldIds.length === 0}
                      className="rounded-md border border-slate-500 bg-slate-600 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      title="Duplicate selected field"
                    >
                      <Copy className="inline h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={removeSelectedField}
                      disabled={selectedFieldIds.length === 0}
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
            {unnamedFields.length > 0 ? (
              <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {unnamedFields.length} component(s) missing Field Key
              </div>
            ) : null}
            {duplicateFieldNameKeys.length > 0 ? (
              <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                Duplicate Field Key found: {duplicateFieldNameKeys.slice(0, 3).join(", ")}
              </div>
            ) : null}
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
                  {selectedFieldIds.length > 1 ? (
                    <p className="text-[11px] font-medium text-primary">{selectedFieldIds.length} components selected</p>
                  ) : null}
                  {selectedField ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={selectedField.name || ""}
                        onChange={(event) => {
                          const rawValue = event.target.value
                          if (!rawValue.trim()) {
                            updateSelectedField({ name: "" })
                            return
                          }
                          const usedNames = fields
                            .filter((entry) => entry.fieldId !== selectedField.fieldId)
                            .map((entry) => entry.name)
                          const unique = ensureUniqueFieldName(rawValue, usedNames)
                          updateSelectedField({ name: unique })
                        }}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        placeholder="Field Key (Firestore)"
                      />
                      {!String(selectedField.name || "").trim() ? (
                        <p className="text-[11px] font-medium text-red-600">Field Key is required.</p>
                      ) : null}
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
                      <label className="flex items-center gap-2 rounded-md border border-input px-2 py-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedField.borderless)}
                          onChange={(event) => updateSelectedField({ borderless: event.target.checked })}
                        />
                        Borderless
                      </label>
                      <div className="rounded-md border border-input px-2 py-2 text-xs">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Background</span>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={!selectedField.backgroundColor || selectedField.backgroundColor === "transparent"}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  updateSelectedField({ backgroundColor: "transparent" })
                                  return
                                }
                                updateSelectedField({
                                  backgroundColor: getColorInputValue(selectedField.backgroundColor, "#ffffff"),
                                })
                              }}
                            />
                            Transparent
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {COLOR_SWATCHES.map((color) => {
                            const isActive = resolveBackgroundColor(selectedField.backgroundColor) === color
                            return (
                              <button
                                key={`bg-${color}`}
                                type="button"
                                onClick={() => updateSelectedField({ backgroundColor: color })}
                                className={`h-5 w-5 rounded border ${isActive ? "ring-2 ring-primary" : "border-input"}`}
                                style={{ backgroundColor: color }}
                                title={`Background ${color}`}
                              />
                            )
                          })}
                          <input
                            type="color"
                            value={getColorInputValue(selectedField.backgroundColor, "#ffffff")}
                            onChange={(event) => updateSelectedField({ backgroundColor: event.target.value })}
                            className="h-5 w-5 cursor-pointer rounded border border-input bg-background p-0"
                            title="Custom background color"
                          />
                        </div>
                      </div>
                      {selectedField.type === "table" ? (
                        <div className="space-y-2 rounded-md border border-input p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              min={1}
                              max={MAX_TABLE_DIMENSION}
                              value={selectedField.tableRows || 3}
                              onChange={(event) => {
                                const nextRows = Math.max(1, Math.min(MAX_TABLE_DIMENSION, Number(event.target.value || 3)))
                                updateSelectedField({
                                  tableRows: nextRows,
                                  tableRowRatios: createEqualRatios(nextRows),
                                })
                              }}
                              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                              placeholder="Rows"
                            />
                            <input
                              type="number"
                              min={1}
                              max={MAX_TABLE_DIMENSION}
                              value={selectedField.tableCols || 3}
                              onChange={(event) => {
                                const nextCols = Math.max(1, Math.min(MAX_TABLE_DIMENSION, Number(event.target.value || 3)))
                                updateSelectedField({
                                  tableCols: nextCols,
                                  tableColRatios: createEqualRatios(nextCols),
                                })
                              }}
                              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                              placeholder="Cols"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedField({
                                tableRowRatios: createEqualRatios(selectedField.tableRows || 3),
                                tableColRatios: createEqualRatios(selectedField.tableCols || 3),
                              })
                            }
                            className="w-full rounded-md border border-input px-2 py-1.5 text-xs"
                            title="Make all row and column sizes equal"
                          >
                            Equalize cell size
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              min={0}
                              max={6}
                              value={Number(selectedField.tableLineWidth ?? 1)}
                              onChange={(event) =>
                                updateSelectedField({
                                  tableLineWidth: Math.max(0, Math.min(6, Number(event.target.value || 1))),
                                })
                              }
                              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                              placeholder="Line width"
                            />
                            <input
                              type="color"
                              value={getColorInputValue(selectedField.tableLineColor, "#94a3b8")}
                              onChange={(event) => updateSelectedField({ tableLineColor: event.target.value })}
                              className="h-8 rounded-md border border-input bg-background px-1 py-1"
                              title="Table Line Color"
                            />
                          </div>
                          <label className="flex items-center gap-2 rounded-md border border-input px-2 py-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={isTransparentLineColor(selectedField.tableLineColor)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  updateSelectedField({ tableLineColor: "transparent" })
                                  return
                                }
                                updateSelectedField({ tableLineColor: getColorInputValue(selectedField.tableLineColor, "#94a3b8") })
                              }}
                            />
                            Transparent inner lines
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {COLOR_SWATCHES.map((color) => {
                              const isActive =
                                !isTransparentLineColor(selectedField.tableLineColor) &&
                                getColorInputValue(selectedField.tableLineColor, "#94a3b8").toLowerCase() === color.toLowerCase()
                              return (
                                <button
                                  key={`table-line-${color}`}
                                  type="button"
                                  onClick={() => updateSelectedField({ tableLineColor: color })}
                                  className={`h-5 w-5 rounded border ${isActive ? "ring-2 ring-primary" : "border-input"}`}
                                  style={{ backgroundColor: color }}
                                  title={`Table line ${color}`}
                                />
                              )
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Tip: select table, then drag inner lines on canvas to adjust row/column widths.
                          </p>
                        </div>
                      ) : null}
                      {selectedField.type === "textbox" || selectedField.type === "date" || selectedField.type === "table" ? (
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
                          <div className="space-y-1.5 rounded-md border border-input px-2 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground">Text Color</span>
                              <input
                                type="color"
                                value={selectedField.textColor || "#111827"}
                                onChange={(event) => updateSelectedField({ textColor: event.target.value })}
                                className="h-5 w-5 cursor-pointer rounded border border-input bg-background p-0"
                                title="Custom text color"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {COLOR_SWATCHES.map((color) => {
                                const isActive = (selectedField.textColor || "#111827").toLowerCase() === color.toLowerCase()
                                return (
                                  <button
                                    key={`text-${color}`}
                                    type="button"
                                    onClick={() => updateSelectedField({ textColor: color })}
                                    className={`h-5 w-5 rounded border ${isActive ? "ring-2 ring-primary" : "border-input"}`}
                                    style={{ backgroundColor: color }}
                                    title={`Text ${color}`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
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
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">Submissions</p>
                    {selectedForm?.originalFileName ? (
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground/90">PDF file:</span> {selectedForm.originalFileName}
                      </p>
                    ) : null}
                  </div>
                  {submissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No submissions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="max-h-72 overflow-auto rounded-md border border-border">
                        <table className="w-full text-left text-[11px]">
                          <thead className="sticky top-0 bg-muted/40">
                            <tr>
                              <th className="px-2 py-1.5 font-semibold">Submission</th>
                              <th className="px-2 py-1.5 font-semibold">Student</th>
                              <th className="px-2 py-1.5 font-semibold">Answers</th>
                            </tr>
                          </thead>
                          <tbody>
                            {submissions.map((entry) => {
                              const answerCount = Object.keys(entry.valuesByFieldName || {}).length
                              const displayName = pickStudentDisplayName(entry._studentProfile)
                              return (
                                <tr key={entry.id} className="border-t border-border">
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewSubmission(entry)}
                                        className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-primary hover:bg-accent"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View
                                      </button>
                                      <Link
                                        href={`/admin/pdf-forms/${selectedFormId}/submissions/${entry.id}`}
                                        className="inline-flex items-center gap-1 text-primary/80 hover:underline"
                                      >
                                        <FileText className="h-3 w-3" />
                                        {String(entry.id || "").slice(0, 8)}
                                      </Link>
                                    </div>
                                  </td>
                                  <td className="max-w-[200px] px-2 py-1.5 align-top">
                                    <div className="text-[11px] font-medium leading-snug text-foreground">
                                      {displayName || "—"}
                                    </div>
                                    {entry._studentProfile?.studentNumber ? (
                                      <div className="text-[10px] text-muted-foreground">
                                        No. {entry._studentProfile.studentNumber}
                                      </div>
                                    ) : null}
                                    <div
                                      className="truncate font-mono text-[9px] text-muted-foreground/80"
                                      title={entry.studentId || ""}
                                    >
                                      {entry.studentId ? `ID: ${entry.studentId}` : "—"}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">{answerCount}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
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
                    onPageMouseDown={isEditMode ? handlePageMouseDown : undefined}
                    onPageMouseMove={isEditMode ? handlePageMouseMove : undefined}
                    onPageMouseUp={isEditMode ? handlePageMouseUp : undefined}
                    onPageContextMenu={isEditMode ? handlePageContextMenu : undefined}
                    renderOverlay={(page) => (
                      <>
                        {fields
                          .filter((field) => field.page === page.page)
                          .map((field) => (
                            (() => {
                              const isMissingName = !String(field.name || "").trim()
                              const fieldBackgroundColor = resolveBackgroundColor(field.backgroundColor)
                              const isPrimarySelected = selectedFieldId === field.fieldId
                              const isMultiSelected = selectedFieldIds.includes(field.fieldId)
                              const borderToneClass =
                                isPrimarySelected
                                  ? isMissingName
                                    ? "border-red-500"
                                    : "border-amber-500"
                                  : isMultiSelected
                                    ? "border-violet-500"
                                  : isMissingName
                                    ? "border-red-400"
                                    : "border-blue-500"
                              return (
                                <button
                                  key={field.fieldId}
                                  type="button"
                                  data-field-id={field.fieldId}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    if (event.ctrlKey || event.metaKey) {
                                      const nextIds = selectedFieldIds.includes(field.fieldId)
                                        ? selectedFieldIds.filter((id) => id !== field.fieldId)
                                        : [...selectedFieldIds, field.fieldId]
                                      setSelection(nextIds, nextIds[0] || "")
                                      return
                                    }
                                    setSelection([field.fieldId], field.fieldId)
                                  }}
                                  onMouseDown={(event) => {
                                    event.stopPropagation()
                                  }}
                                  onContextMenu={(event) => handleFieldContextMenu(event, field)}
                                  data-locked={field.locked ? "true" : "false"}
                                  className={`builder-field pointer-events-auto absolute rounded ${borderToneClass}`}
                                  style={{
                                    left: `${field.x * 100}%`,
                                    top: `${field.y * 100}%`,
                                    width: `${field.width * 100}%`,
                                    height: `${field.height * 100}%`,
                                    cursor: isEditMode ? "move" : "default",
                                    backgroundColor: fieldBackgroundColor,
                                    fontFamily: getCssFontFamily(field.fontFamily),
                                    fontSize: `${field.fontSize || 12}px`,
                                    fontWeight: field.fontWeight || "normal",
                                    fontStyle: field.fontStyle || "normal",
                                    color: field.textColor || "#111827",
                                    textAlign: field.textAlign || "left",
                                    opacity: field.locked ? 0.65 : 1,
                                    borderStyle: field.borderless ? "dashed" : "solid",
                                    borderWidth: field.borderless && !isEditMode ? 0 : 1,
                                  }}
                                >
                                  <span className="pointer-events-none block truncate px-1 py-0.5">
                                    <Move className="mr-1 inline h-3 w-3" />
                                    {field.type} - {field.name || "MISSING_NAME"}
                                  </span>
                                  {field.type === "table" ? (
                                    (() => {
                                      const { rowRatios, colRatios } = getTableRatios(field)
                                      const lineWidth = Math.max(0, Math.min(6, Number(field.tableLineWidth ?? 1)))
                                      const lineColor = resolveLineColor(field.tableLineColor, "#94a3b8")
                                      const showInnerLines = lineWidth > 0 && lineColor !== "transparent"
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
                                        <>
                                          {showInnerLines
                                            ? colBoundaries.map((boundary) => (
                                                <div
                                                  key={`table-col-line-${field.fieldId}-${boundary.index}`}
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
                                                  key={`table-row-line-${field.fieldId}-${boundary.index}`}
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
                                          {isEditMode && isPrimarySelected
                                            ? colBoundaries.map((boundary) => (
                                                <span
                                                  key={`table-col-handle-${field.fieldId}-${boundary.index}`}
                                                  data-line-handle="true"
                                                  onMouseDown={(event) => startTableLineDrag(event, field, "col", boundary.index)}
                                                  onClick={(event) => event.stopPropagation()}
                                                  className="absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize bg-transparent"
                                                  style={{ left: `${boundary.at * 100}%` }}
                                                  title="Drag to move column line"
                                                />
                                              ))
                                            : null}
                                          {isEditMode && isPrimarySelected
                                            ? rowBoundaries.map((boundary) => (
                                                <span
                                                  key={`table-row-handle-${field.fieldId}-${boundary.index}`}
                                                  data-line-handle="true"
                                                  onMouseDown={(event) => startTableLineDrag(event, field, "row", boundary.index)}
                                                  onClick={(event) => event.stopPropagation()}
                                                  className="absolute inset-x-0 z-10 h-3 -translate-y-1/2 cursor-ns-resize bg-transparent"
                                                  style={{ top: `${boundary.at * 100}%` }}
                                                  title="Drag to move row line"
                                                />
                                              ))
                                            : null}
                                        </>
                                      )
                                    })()
                                  ) : null}
                                  {isMultiSelected && !isPrimarySelected ? (
                                    <span className="absolute left-0 top-0 rounded-br bg-violet-600 px-1 text-[9px] font-semibold text-white">
                                      +
                                    </span>
                                  ) : null}
                                  {isMissingName ? (
                                    <span className="absolute right-0 top-0 rounded-bl bg-red-600 px-1 text-[9px] font-semibold text-white">
                                      !
                                    </span>
                                  ) : null}
                                  <span className={`absolute bottom-0 right-0 h-2 w-2 ${isMissingName ? "bg-red-600" : "bg-blue-700"}`} />
                                </button>
                              )
                            })()
                          ))}
                        {selectionBox && selectionBox.page === page.page ? (
                          <div
                            className="pointer-events-none absolute border border-dashed border-primary bg-primary/10"
                            style={{
                              left: `${Math.min(selectionBox.startX, selectionBox.endX) * 100}%`,
                              top: `${Math.min(selectionBox.startY, selectionBox.endY) * 100}%`,
                              width: `${Math.abs(selectionBox.endX - selectionBox.startX) * 100}%`,
                              height: `${Math.abs(selectionBox.endY - selectionBox.startY) * 100}%`,
                            }}
                          />
                        ) : null}
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
                  {contextMenu ? (
                    <div
                      className="fixed z-[80] min-w-[180px] rounded-md border border-border bg-card p-1 shadow-xl"
                      style={{ left: contextMenu.clientX + 4, top: contextMenu.clientY + 4 }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          copySelectedFields()
                          setContextMenu(null)
                        }}
                        className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      >
                        Copy (Ctrl+C)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          cutSelectedFields()
                          setContextMenu(null)
                        }}
                        className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      >
                        Cut (Ctrl+X)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          pasteClipboardFields({ page: contextMenu.page, x: contextMenu.x, y: contextMenu.y })
                          setContextMenu(null)
                        }}
                        className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      >
                        Paste (Ctrl+V)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          duplicateSelectedField()
                          setContextMenu(null)
                        }}
                        className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeSelectedField()
                          setContextMenu(null)
                        }}
                        className="block w-full rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-accent"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      {previewSubmission ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-5">
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            onClick={() => setPreviewSubmission(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[111] flex h-[92vh] w-[min(1200px,96vw)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Submission Preview</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {pickStudentDisplayName(previewSubmission._studentProfile) || previewSubmission.studentId || "Student"} -{" "}
                  {String(previewSubmission.id || "").slice(0, 12)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/pdf-forms/${selectedFormId}/submissions/${previewSubmission.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                >
                  Open full page
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewSubmission(null)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              title={`Submission ${previewSubmission.id}`}
              src={`/admin/pdf-forms/${selectedFormId}/submissions/${previewSubmission.id}?embedded=1&view=live`}
              className="h-full w-full bg-white"
            />
          </div>
        </div>
      ) : null}
      </>
      )}
    </AdminLayoutWrapper>
  )
}
