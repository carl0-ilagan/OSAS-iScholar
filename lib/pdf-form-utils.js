import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function fileToDataUrl(file) {
  if (!file) {
    throw new Error("Missing file.")
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Failed to read file."))
    reader.readAsDataURL(file)
  })
}

export function splitIntoChunks(value, chunkSize = 700000) {
  const text = String(value || "")
  const chunks = []
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize))
  }
  return chunks
}

export function normalizeFieldName(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return raw || "field"
}

export function ensureUniqueFieldName(candidate, usedNames = []) {
  const base = normalizeFieldName(candidate)
  const used = new Set(usedNames.map((entry) => normalizeFieldName(entry)))
  if (!used.has(base)) {
    return base
  }

  let index = 2
  while (used.has(`${base}_${index}`)) {
    index += 1
  }
  return `${base}_${index}`
}

export async function loadProtectedPdfObjectUrl(formId) {
  if (!formId) {
    throw new Error("Missing form ID.")
  }

  const chunksSnapshot = await getDocs(query(collection(db, "form_pdf_chunks"), where("formId", "==", formId)))
  const chunks = chunksSnapshot.docs
    .map((entry) => entry.data())
    .sort((a, b) => Number(a.index || 0) - Number(b.index || 0))
    .map((entry) => entry.chunk || "")
    .join("")

  if (!chunks) {
    throw new Error("PDF chunk data not found.")
  }

  const blob = await fetch(chunks).then((response) => response.blob())
  return URL.createObjectURL(blob)
}

export function clamp01(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return Math.min(1, Math.max(0, parsed))
}

function normalizeFieldType(value) {
  const raw = String(value || "textbox").trim().toLowerCase()
  if (raw.includes("check")) return "checkbox"
  if (raw.includes("date")) return "date"
  if ((raw.includes("signature") || raw.includes("sign")) && !raw.includes("image")) return "signature"
  if (raw.includes("image") || raw.includes("photo")) return "image"
  if (raw.includes("table")) return "table"
  return "textbox"
}

function normalizeBackgroundColor(value) {
  const raw = String(value || "").trim()
  if (!raw || raw.toLowerCase() === "transparent") {
    return "transparent"
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw
  }
  return "transparent"
}

function normalizeHexColor(value, fallback = "#94a3b8") {
  const raw = String(value || "").trim()
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw
  }
  return fallback
}

function normalizeLineColor(value, fallback = "#94a3b8") {
  const raw = String(value || "").trim().toLowerCase()
  if (raw === "transparent") {
    return "transparent"
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw
  }
  return fallback
}

export function normalizeTableRatios(values, count) {
  const safeCount = Math.max(1, Number(count || 1))
  const source = Array.isArray(values) ? values : []
  const normalized = Array.from({ length: safeCount }, (_, index) => {
    const parsed = Number(source[index])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  })
  const total = normalized.reduce((sum, value) => sum + value, 0) || 1
  return normalized.map((value) => value / total)
}

export function withFieldDefaults(field) {
  const normalizedType = normalizeFieldType(field?.type)
  const defaultWidth =
    normalizedType === "checkbox"
      ? 0.0045
      : normalizedType === "table"
        ? 0.36
        : normalizedType === "signature"
          ? 0.28
          : 0.22
  const defaultHeight = normalizedType === "checkbox" ? 0.007 : normalizedType === "signature" ? 0.09 : 0.05
  const resolvedWidth = normalizedType === "date" ? 0.18 : normalizedType === "table" ? 0.36 : defaultWidth
  const resolvedHeight = normalizedType === "table" ? 0.16 : defaultHeight
  const rawName = field?.name ?? field?.fieldName ?? ""

  return {
    fieldId: field?.fieldId || createId("field"),
    formId: field?.formId || "",
    type: normalizedType,
    // Keep explicit empties so the builder can warn admins.
    name: String(rawName).trim(),
    label: field?.label || "Untitled Field",
    page: Number(field?.page || 1),
    x: clamp01(field?.x ?? 0.1),
    y: clamp01(field?.y ?? 0.1),
    width: clamp01(field?.width ?? resolvedWidth),
    height: clamp01(field?.height ?? resolvedHeight),
    fontFamily: field?.fontFamily || "helvetica",
    fontSize: Number(field?.fontSize || 12),
    fontWeight: field?.fontWeight || "normal",
    fontStyle: field?.fontStyle || "normal",
    uppercaseOnly: Boolean(field?.uppercaseOnly),
    textColor: field?.textColor || "#111827",
    textAlign: field?.textAlign || "left",
    borderless: Boolean(field?.borderless),
    backgroundColor: normalizeBackgroundColor(field?.backgroundColor),
    tableRows: Math.max(1, Number(field?.tableRows || 3)),
    tableCols: Math.max(1, Number(field?.tableCols || 3)),
    tableLineColor: normalizeLineColor(field?.tableLineColor, "#94a3b8"),
    tableLineWidth: Math.max(0, Math.min(6, Number(field?.tableLineWidth ?? 1))),
    tableRowRatios: normalizeTableRatios(field?.tableRowRatios, Math.max(1, Number(field?.tableRows || 3))),
    tableColRatios: normalizeTableRatios(field?.tableColRatios, Math.max(1, Number(field?.tableCols || 3))),
  }
}
