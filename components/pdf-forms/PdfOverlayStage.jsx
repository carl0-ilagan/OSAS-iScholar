"use client"

import { useEffect, useMemo, useRef, useState } from "react"

export default function PdfOverlayStage({
  pdfUrl,
  scale = 1.3,
  className = "",
  onPageClick,
  renderOverlay,
}) {
  const containerRef = useRef(null)
  const [pages, setPages] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    let createdCanvases = []

    async function renderPdf() {
      if (!pdfUrl || !containerRef.current) {
        setPages([])
        return
      }

      setLoading(true)
      setError("")
      containerRef.current.innerHTML = ""

      try {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        const task = pdfjs.getDocument(pdfUrl)
        const pdf = await task.promise

        const nextPages = []
        const parent = containerRef.current

        for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
          if (cancelled) {
            return
          }

          const page = await pdf.getPage(pageIndex)
          const viewport = page.getViewport({ scale })

          const pageWrapper = document.createElement("div")
          pageWrapper.className = "relative mx-auto mb-4 w-fit overflow-hidden rounded-lg border border-border bg-white shadow"
          pageWrapper.dataset.page = `${pageIndex}`
          pageWrapper.style.width = `${viewport.width}px`
          pageWrapper.style.height = `${viewport.height}px`

          const canvas = document.createElement("canvas")
          canvas.className = "block"
          canvas.width = viewport.width
          canvas.height = viewport.height

          pageWrapper.appendChild(canvas)
          parent.appendChild(pageWrapper)
          createdCanvases.push(canvas)

          const context = canvas.getContext("2d", { alpha: false })
          await page.render({ canvasContext: context, viewport }).promise

          nextPages.push({
            page: pageIndex,
            width: viewport.width,
            height: viewport.height,
          })
        }

        if (!cancelled) {
          setPages(nextPages)
        }
      } catch (renderError) {
        console.error("Failed to render PDF:", renderError)
        if (!cancelled) {
          setError("Failed to render PDF preview.")
          setPages([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    renderPdf()

    return () => {
      cancelled = true
      createdCanvases.forEach((canvas) => {
        canvas.width = 0
        canvas.height = 0
      })
    }
  }, [pdfUrl, scale])

  const pagesByNumber = useMemo(() => {
    return pages.reduce((acc, current) => {
      acc[current.page] = current
      return acc
    }, {})
  }, [pages])

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="relative"
        onClick={(event) => {
          if (!onPageClick || !event.target) return
          const wrapper = event.target.closest?.("[data-page]")
          if (!wrapper) return

          const page = Number(wrapper.dataset.page)
          const metrics = pagesByNumber[page]
          if (!metrics) return

          const rect = wrapper.getBoundingClientRect()
          const x = (event.clientX - rect.left) / rect.width
          const y = (event.clientY - rect.top) / rect.height
          onPageClick({ page, x, y, width: rect.width, height: rect.height })
        }}
      />

      {pages.map((page) => (
        <div
          key={`overlay-${page.page}`}
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            top: pages
              .filter((entry) => entry.page < page.page)
              .reduce((sum, entry) => sum + entry.height + 16, 0),
            width: page.width,
            height: page.height,
          }}
        >
          {renderOverlay ? renderOverlay(page) : null}
        </div>
      ))}

      {loading ? <p className="text-sm text-muted-foreground">Rendering PDF...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
