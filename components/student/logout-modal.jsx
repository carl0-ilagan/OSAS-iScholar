"use client"

import { useEffect, useState } from "react"
import { X, LogOut, AlertTriangle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebase"
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  const { signOut, user } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Prevent body scroll when modal is open
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

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Update status to offline before signing out
      if (user?.uid || auth.currentUser?.uid) {
        const userId = user?.uid || auth.currentUser?.uid
        try {
          const userDocRef = doc(db, "users", userId)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            await updateDoc(userDocRef, {
              status: "offline",
              lastSeen: serverTimestamp(),
              updatedAt: new Date().toISOString(),
            })
          }
        } catch (error) {
          console.error("Error updating user status:", error)
          // Continue with logout even if status update fails
        }
      }
      
      await signOut()
      onClose()
      // Small delay for smooth animation
      setTimeout(() => {
        router.push("/")
      }, 300)
    } catch (error) {
      console.error("Logout error:", error)
      onClose()
      // Still redirect even if signOut fails
      setTimeout(() => {
        router.push("/")
      }, 300)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Confirm Logout</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-muted-foreground mb-6">
              Are you sure you want to logout? You will need to sign in again to access your account.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

