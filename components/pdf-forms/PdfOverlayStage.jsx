"use client"

import { useEffect, useMemo, useRef, useState } from "react"

export default function PdfOverlayStage({
  pdfUrl,
  scale = 1.3,
  maxPageWidth = null,
  className = "",
  onPageClick,
  onPageMouseDown,
  onPageMouseMove,
  onPageMouseUp,
  onPageContextMenu,
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
          const baseViewport = page.getViewport({ scale: 1 })
          const fitScale =
            typeof maxPageWidth === "number" && maxPageWidth > 0
              ? Math.min(scale, maxPageWidth / Math.max(1, baseViewport.width))
              : scale
          const viewport = page.getViewport({ scale: fitScale })
          const cssWidth = Math.max(1, Math.round(viewport.width))
          const cssHeight = Math.max(1, Math.round(viewport.height))
          const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
          const renderViewport = page.getViewport({ scale: fitScale * pixelRatio })

          const pageWrapper = document.createElement("div")
          pageWrapper.className = "relative mx-auto mb-4 w-fit overflow-hidden rounded-lg bg-white shadow"
          pageWrapper.dataset.page = `${pageIndex}`
          pageWrapper.style.width = `${cssWidth}px`
          pageWrapper.style.height = `${cssHeight}px`
          pageWrapper.style.boxSizing = "content-box"

          const canvas = document.createElement("canvas")
          canvas.className = "block"
          canvas.width = Math.max(1, Math.round(renderViewport.width))
          canvas.height = Math.max(1, Math.round(renderViewport.height))
          canvas.style.width = `${cssWidth}px`
          canvas.style.height = `${cssHeight}px`

          pageWrapper.appendChild(canvas)
          parent.appendChild(pageWrapper)
          createdCanvases.push(canvas)

          const context = canvas.getContext("2d", { alpha: false })
          if (context) {
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
          }
          await page.render({ canvasContext: context, viewport }).promise

          nextPages.push({
            page: pageIndex,
            width: cssWidth,
            height: cssHeight,
            renderScale: fitScale,
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
  }, [pdfUrl, scale, maxPageWidth])

  const pagesByNumber = useMemo(() => {
    return pages.reduce((acc, current) => {
      acc[current.page] = current
      return acc
    }, {})
  }, [pages])

  function buildPagePointerPayload(event) {
    if (!event?.target) return null
    const wrapper = event.target.closest?.("[data-page]")
    if (!wrapper) return null

    const page = Number(wrapper.dataset.page)
    const metrics = pagesByNumber[page]
    if (!metrics) return null

    const rect = wrapper.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    return { page, x, y, width: rect.width, height: rect.height, nativeEvent: event }
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="relative"
        onClick={(event) => {
          if (!onPageClick) return
          const payload = buildPagePointerPayload(event)
          if (!payload) return
          onPageClick(payload)
        }}
        onMouseDown={(event) => {
          if (!onPageMouseDown) return
          const payload = buildPagePointerPayload(event)
          if (!payload) return
          onPageMouseDown(payload)
        }}
        onMouseMove={(event) => {
          if (!onPageMouseMove) return
          const payload = buildPagePointerPayload(event)
          if (!payload) return
          onPageMouseMove(payload)
        }}
        onMouseUp={(event) => {
          if (!onPageMouseUp) return
          const payload = buildPagePointerPayload(event)
          if (!payload) return
          onPageMouseUp(payload)
        }}
        onContextMenu={(event) => {
          if (!onPageContextMenu) return
          const payload = buildPagePointerPayload(event)
          if (!payload) return
          onPageContextMenu(payload)
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
