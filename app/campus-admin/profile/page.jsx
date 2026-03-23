"use client"

import { useEffect, useMemo, useState } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { AlertCircle, CheckCircle, KeyRound, Mail, Save, Shield, Upload, User } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { auth, db } from "@/lib/firebase"
import { normalizeCampus } from "@/lib/campus-admin-config"
import CampusAdminLayoutWrapper from "../campus-admin-layout"

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

export default function CampusAdminProfilePage() {
  const { user, resetPassword } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingResetEmail, setSendingResetEmail] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    displayName: "",
    secondaryEmail: "",
    campus: "",
    email: "",
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [newPhotoBase64, setNewPhotoBase64] = useState(null)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const normalizedCampus = useMemo(() => normalizeCampus(formData.campus || user?.campus || null), [formData.campus, user?.campus])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid))
        const data = snap.exists() ? snap.data() : {}
        setFormData({
          fullName: data.fullName || user.displayName || "",
          displayName: data.displayName || user.displayName || "",
          secondaryEmail: data.secondaryEmail || "",
          campus: data.campus || user.campus || "",
          email: user.email || "",
        })
        setPhotoPreview(data.photoURL || user.photoURL || null)
      } catch (error) {
        console.error("Error fetching campus admin profile:", error)
        toast.error("Failed to load profile.")
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  const onPickPhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or less.")
      return
    }
    try {
      const base64 = await fileToBase64(file)
      setNewPhotoBase64(base64)
      setPhotoPreview(base64)
    } catch (error) {
      console.error("Error converting image:", error)
      toast.error("Failed to process image.")
    }
  }

  const saveProfile = async () => {
    if (!user?.uid) return
    if (!formData.fullName.trim()) {
      toast.error("Full name is required.")
      return
    }

    try {
      setSavingProfile(true)

      const payload = {
        fullName: formData.fullName.trim(),
        displayName: formData.displayName.trim() || formData.fullName.trim(),
        secondaryEmail: formData.secondaryEmail.trim(),
        updatedAt: new Date().toISOString(),
      }
      if (newPhotoBase64) {
        payload.photoURL = newPhotoBase64
      }

      await updateDoc(doc(db, "users", user.uid), payload)

      setNewPhotoBase64(null)
      toast.success("Profile updated successfully.", { icon: <CheckCircle className="h-4 w-4" /> })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async () => {
    if (!auth.currentUser?.email) {
      toast.error("No authenticated email account found.")
      return
    }
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please complete all password fields.")
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match.")
      return
    }

    try {
      setSavingPassword(true)
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordForm.currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, passwordForm.newPassword)

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      toast.success("Password updated successfully.", { icon: <CheckCircle className="h-4 w-4" /> })
    } catch (error) {
      console.error("Error updating password:", error)
      if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential") {
        toast.error("Current password is incorrect.")
      } else {
        toast.error("Failed to update password.")
      }
    } finally {
      setSavingPassword(false)
    }
  }

  const sendResetEmail = async () => {
    if (!formData.email) {
      toast.error("No email found for this account.")
      return
    }
    try {
      setSendingResetEmail(true)
      await resetPassword(formData.email)
      toast.success("Password reset email sent.")
    } catch (error) {
      console.error("Error sending reset email:", error)
      toast.error("Failed to send password reset email.")
    } finally {
      setSendingResetEmail(false)
    }
  }

  if (loading) {
    return (
      <CampusAdminLayoutWrapper>
        <div className="w-full space-y-4 px-3 pb-4 pt-2 md:space-y-5 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
          <div className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </CampusAdminLayoutWrapper>
    )
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="w-full space-y-4 px-3 pb-4 pt-2 md:space-y-5 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10 md:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <User className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 md:text-2xl">Campus Admin Profile</h1>
              <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-200/85">
                Update your account details, profile photo, and security settings.
              </p>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                Campus: <span className="font-semibold">{normalizedCampus || "N/A"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Profile Information</h2>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted">
                <Upload className="h-4 w-4" />
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
              </label>
            </div>

            <div className="space-y-3">
              <input
                value={formData.fullName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Full name"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={formData.displayName}
                onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="Display name"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={formData.email}
                disabled
                className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
              />
              <input
                value={formData.secondaryEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, secondaryEmail: e.target.value }))}
                placeholder="Secondary email (optional)"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={normalizedCampus || ""}
                disabled
                className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Security</h2>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Current password"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="New password (min 8 chars)"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={sendResetEmail}
                disabled={sendingResetEmail}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {sendingResetEmail ? "Sending..." : "Send Reset Email"}
              </button>
              <button
                onClick={changePassword}
                disabled={savingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Shield className="h-4 w-4" />
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  For security, password updates require your current password. If your account uses Google login only, use
                  &nbsp;<span className="font-semibold">Send Reset Email</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}

