"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

export default function ImageZoomModal({ isOpen, onClose, imageSrc, alt }) {
  const modalRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Prevent closing main modal when clicking inside preview modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if clicking the backdrop, not if clicking inside the modal
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Check if the click is on the backdrop (not on any other modal)
        const target = event.target
        if (target && target.classList && (target.classList.contains('backdrop-blur-sm') || target.classList.contains('bg-black'))) {
          onClose()
        }
      }
    }

    if (isOpen) {
      // Use capture phase to prevent event bubbling to main modal
      document.addEventListener('mousedown', handleClickOutside, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [isOpen, onClose])

  if (!isOpen || !imageSrc) return null

  // Check if imageSrc is a valid image URL
  const isValidImage = imageSrc && (
    imageSrc.startsWith('data:image/') ||
    imageSrc.startsWith('http://') ||
    imageSrc.startsWith('https://') ||
    imageSrc.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
  )

  if (!isValidImage) {
    // If not a valid image, open in new tab
    if (imageSrc) {
      window.open(imageSrc, '_blank', 'noopener,noreferrer')
      onClose()
    }
    return null
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] animate-in fade-in duration-300"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      />
      <div 
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        onClick={(e) => {
          // Only close if clicking the backdrop area, not the image container
          if (e.target === e.currentTarget) {
            e.stopPropagation()
            onClose()
          }
        }}
      >
        <div 
          ref={modalRef}
          className="relative w-full h-full flex items-center justify-center max-w-[95vw] max-h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onClose()
            }}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={imageSrc}
            alt={alt || "Preview"}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              console.error("Error loading image:", imageSrc)
              e.target.style.display = 'none'
            }}
          />
        </div>
      </div>
    </>
  )
}


