"use client"

import { useState, useEffect } from "react"
import { XCircle, Loader2, AlertCircle, X } from "lucide-react"
import { toast } from "sonner"

export default function DeclineReasonModal({ isOpen, onClose, onConfirm, isProcessing, verification }) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("Reason is required", {
        icon: <AlertCircle className="w-5 h-5" />,
        description: "Please provide a reason for declining this verification.",
        duration: 3000,
        position: "top-center",
      })
      return
    }
    onConfirm(reason.trim())
    setReason("")
  }

  const handleClose = () => {
    setReason("")
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      />

      {/* Modal - Minimal Design */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div
          className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Minimal */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Decline Verification</h2>
                <p className="text-xs text-muted-foreground">
                  {verification?.name || "Student"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for declining this verification..."
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive resize-none text-sm"
              rows={4}
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-2">
              This reason will be saved and visible to the student.
            </p>
          </div>

          {/* Footer - Minimal */}
          <div className="p-4 border-t border-border/50 flex gap-2 justify-end">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || !reason.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
