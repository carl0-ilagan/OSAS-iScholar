"use client"

import { normalizeTableRatios } from "@/lib/pdf-form-utils"

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

/**
 * Same rendering as student “Print (values only)”: ✓ for checkboxes, no field borders,
 * transparent backgrounds — matches configured field positions on the PDF canvas.
 */
export default function PdfFormReadonlyOverlay({ page, fields, values, pdfMaxScale = 1.3 }) {
  return (
    <>
      {(fields || []).map((field) => {
        const pageScale = Number(page.renderScale || pdfMaxScale || 1)
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
          if (!isChecked) return null
          return (
            <button
              key={field.fieldId}
              type="button"
              aria-label={field.label || field.name || "checkbox"}
              title={field.label || field.name || "checkbox"}
              className="pointer-events-none absolute rounded border-0 bg-transparent shadow-none"
              style={{
                ...commonStyle,
                minWidth: "14px",
                minHeight: "14px",
                backgroundColor: "transparent",
              }}
              tabIndex={-1}
              disabled
            >
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
            </button>
          )
        }

        if (field.type === "image") {
          const hasPreview = typeof values[field.fieldId] === "string" && values[field.fieldId]
          if (!hasPreview) return null
          return (
            <div
              key={field.fieldId}
              className="pointer-events-none absolute flex items-center justify-center rounded border-0 bg-transparent"
              style={{
                ...commonStyle,
                backgroundColor: "transparent",
              }}
            >
              <img src={values[field.fieldId]} alt={field.label || ""} className="h-full w-full rounded object-fill" />
            </div>
          )
        }

        if (field.type === "signature") {
          const hasSignature = typeof values[field.fieldId] === "string" && values[field.fieldId]
          if (!hasSignature) return null
          return (
            <div
              key={field.fieldId}
              className="pointer-events-none absolute rounded border-0 bg-transparent shadow-none ring-0"
              style={{
                ...commonStyle,
                backgroundColor: fieldBackgroundColor === "transparent" ? "transparent" : fieldBackgroundColor,
              }}
            >
              <img
                src={values[field.fieldId]}
                alt={field.label || "Signature"}
                className="h-full w-full rounded object-contain"
              />
            </div>
          )
        }

        if (field.type === "date") {
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
              className="pointer-events-none absolute rounded border-0 bg-transparent"
              style={{
                ...commonStyle,
                backgroundColor: "transparent",
                display: "grid",
                gridTemplateColumns: colRatios.map((ratio) => `${ratio}fr`).join(" "),
                gridTemplateRows: rowRatios.map((ratio) => `${ratio}fr`).join(" "),
                gap: 0,
              }}
            >
              {tableValue.map((rowValue, rowIndex) =>
                rowValue.map((cellValue, colIndex) => (
                  <div
                    key={`${field.fieldId}-${rowIndex}-${colIndex}`}
                    className="pointer-events-none h-full w-full min-h-0 min-w-0 border-0 bg-transparent px-1 text-[11px] leading-tight"
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
                      whiteSpace: "pre-wrap",
                      overflow: "hidden",
                    }}
                  >
                    {cellValue}
                  </div>
                )),
              )}
              {showInnerLines
                ? colBoundaries.map((boundary) => (
                    <div
                      key={`table-col-line-ro-${field.fieldId}-${boundary.index}`}
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
                      key={`table-row-line-ro-${field.fieldId}-${boundary.index}`}
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
          <div
            key={field.fieldId}
            className="pointer-events-none absolute rounded border-0 bg-transparent px-1 text-[12px]"
            style={{
              ...commonStyle,
              fontFamily: getCssFontFamily(field.fontFamily),
              fontSize: `${getPageFontSize(field.fontSize || 12)}px`,
              fontWeight: field.fontWeight || "normal",
              fontStyle: field.fontStyle || "normal",
              textTransform: field.uppercaseOnly ? "uppercase" : "none",
              color: field.textColor || "#111827",
              textAlign: field.textAlign || "left",
              backgroundColor: "transparent",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
            }}
          >
            {String(values[field.fieldId] || "")}
          </div>
        )
      })}
    </>
  )
}
