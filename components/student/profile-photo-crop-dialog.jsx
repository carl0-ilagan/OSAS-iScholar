"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const VIEW = 280
const OUT = 512

/** Primary CTA — match student feedback / testimonials page */
export const STUDENT_GRADIENT_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-primary/90 hover:to-secondary/90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-3 md:transform md:hover:scale-105"

function clampPan(pan, imgW, imgH) {
  if (imgW <= VIEW && imgH <= VIEW) return { x: 0, y: 0 }
  const maxX = Math.max(0, (imgW - VIEW) / 2)
  const maxY = Math.max(0, (imgH - VIEW) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  }
}

/**
 * Export square viewport (inscribed in circle UI) to JPEG data URL.
 */
function exportCroppedJpeg(img, nw, nh, imgW, imgH, pan) {
  const left = VIEW / 2 - imgW / 2 + pan.x
  const top = VIEW / 2 - imgH / 2 + pan.y
  const sx = (-left / imgW) * nw
  const sy = (-top / imgH) * nh
  const sw = (VIEW / imgW) * nw
  const sh = (VIEW / imgH) * nh

  const canvas = document.createElement("canvas")
  canvas.width = OUT
  canvas.height = OUT
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, OUT, OUT)
  ctx.save()
  ctx.beginPath()
  ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2)
  ctx.clip()

  let safeSx = Math.max(0, sx)
  let safeSy = Math.max(0, sy)
  let safeSw = Math.min(sw, nw - safeSx)
  let safeSh = Math.min(sh, nh - safeSy)
  if (sx < 0) {
    safeSx = 0
    safeSw = Math.min(nw, sw + sx)
  }
  if (sy < 0) {
    safeSy = 0
    safeSh = Math.min(nh, sh + sy)
  }
  if (safeSw > 0 && safeSh > 0) {
    try {
      ctx.drawImage(img, safeSx, safeSy, safeSw, safeSh, 0, 0, OUT, OUT)
    } catch {
      ctx.drawImage(img, 0, 0, nw, nh, 0, 0, OUT, OUT)
    }
  }
  ctx.restore()
  return canvas.toDataURL("image/jpeg", 0.92)
}

export default function ProfilePhotoCropDialog({ open, onOpenChange, imageSrc, onComplete }) {
  const imgRef = useRef(null)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState([100])
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)

  const zoomVal = zoom[0] ?? 100

  const scale0 =
    natural.w && natural.h ? VIEW / Math.min(natural.w, natural.h) : 1
  const imgW = natural.w * scale0 * (zoomVal / 100)
  const imgH = natural.h * scale0 * (zoomVal / 100)

  const clampedPan = clampPan(pan, imgW, imgH)

  useEffect(() => {
    if (!open) return
    setZoom([100])
    setPan({ x: 0, y: 0 })
    setNatural({ w: 0, h: 0 })
  }, [open, imageSrc])

  useEffect(() => {
    setPan((p) => clampPan(p, imgW, imgH))
  }, [zoomVal, natural.w, natural.h, imgW, imgH])

  const onImgLoad = useCallback((e) => {
    const el = e.currentTarget
    setNatural({ w: el.naturalWidth, h: el.naturalHeight })
  }, [])

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, panX: clampedPan.x, panY: clampedPan.y }
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPan(
      clampPan(
        { x: dragRef.current.panX + dx, y: dragRef.current.panY + dy },
        imgW,
        imgH,
      ),
    )
  }

  const onPointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    dragRef.current = null
  }

  const handleApply = () => {
    const img = imgRef.current
    if (!img?.naturalWidth || !natural.w) return
    const dataUrl = exportCroppedJpeg(img, natural.w, natural.h, imgW, imgH, clampedPan)
    if (dataUrl) onComplete?.(dataUrl)
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Adjust profile photo</DialogTitle>
          <DialogDescription>
            Drag to reposition your face. Use zoom to get closer — like social profile photos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative touch-none select-none rounded-full bg-black ring-2 ring-border shadow-inner"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {imageSrc ? (
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageSrc}
                  draggable={false}
                  onLoad={onImgLoad}
                  className="pointer-events-none absolute max-w-none"
                  style={{
                    width: imgW,
                    height: imgH,
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${clampedPan.x}px), calc(-50% + ${clampedPan.y}px))`,
                  }}
                />
              ) : null}
            </div>
            <div
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/40 ring-inset"
              aria-hidden
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">Drag inside the circle to move the photo</p>

          <div className="w-full space-y-2 px-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Zoom</span>
              <span>{zoomVal}%</span>
            </div>
            <Slider value={zoom} onValueChange={setZoom} min={100} max={280} step={1} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </button>
          <button type="button" className={cn(STUDENT_GRADIENT_BTN, "px-6")} onClick={handleApply}>
            Save photo
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
