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

export function withFieldDefaults(field) {
  const defaultWidth = field?.type === "checkbox" ? 0.0045 : 0.22
  const defaultHeight = field?.type === "checkbox" ? 0.007 : 0.05
  const resolvedWidth = field?.type === "date" ? 0.18 : defaultWidth

  return {
    fieldId: field?.fieldId || createId("field"),
    formId: field?.formId || "",
    type: field?.type || "textbox",
    name: normalizeFieldName(field?.name || field?.label || "field"),
    label: field?.label || "Untitled Field",
    page: Number(field?.page || 1),
    x: clamp01(field?.x ?? 0.1),
    y: clamp01(field?.y ?? 0.1),
    width: clamp01(field?.width ?? resolvedWidth),
    height: clamp01(field?.height ?? defaultHeight),
    fontFamily: field?.fontFamily || "helvetica",
    fontSize: Number(field?.fontSize || 12),
    fontWeight: field?.fontWeight || "normal",
    fontStyle: field?.fontStyle || "normal",
    uppercaseOnly: Boolean(field?.uppercaseOnly),
    textColor: field?.textColor || "#111827",
    textAlign: field?.textAlign || "left",
  }
}
