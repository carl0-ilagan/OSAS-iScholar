"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { StudentSection } from "@/components/student/student-section"
import {
  User,
  Upload,
  Save,
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  GraduationCap,
  MapPin,
  Calendar,
  Hash,
  X,
  Award,
  Plus,
  Trash2,
  Building2,
  Sparkles,
  Accessibility,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import ProfilePhotoCropDialog, {
  STUDENT_GRADIENT_BTN,
} from "@/components/student/profile-photo-crop-dialog"
import { coursesByCampus, getCampusNames, getMajorsForCourseAtCampus } from "@/lib/mocas-courses-catalog"

const fieldInputClass =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.02] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-60"

const YES_NO = [
  { value: "", label: "Select…" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
]

const INDIGENOUS_GROUP_TYPES = [
  "Hanunuo",
  "Bangon",
  "Iraya",
  "Alangan",
  "Tadyawan",
  "Tawbuid",
  "Buhid",
  "Ratagnon",
  "Others",
]

function formatApplicationDate(value) {
  if (!value) return null
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return null
    }
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function newExternalScholarshipRow() {
  return {
    localId: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    provider: "",
    notes: "",
  }
}

/** Stored on users/{uid}.externalScholarships — scholarships not tracked via portal applications. */
function normalizeExternalScholarshipsFromFirestore(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  raw.forEach((item, i) => {
    if (typeof item === "string") {
      const name = item.trim()
      if (!name) return
      out.push({ localId: `ext-${i}-s`, name, provider: "", notes: "" })
      return
    }
    const name = String(item?.name || "").trim()
    if (!name) return
    out.push({
      localId: `ext-${i}-${name.slice(0, 8)}`,
      name,
      provider: String(item?.provider || item?.organization || "").trim(),
      notes: String(item?.notes || "").trim(),
    })
  })
  return out
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState({
    fullName: "",
    displayName: "",
    studentNumber: "",
    course: "",
    yearLevel: "",
    campus: "",
    email: "",
    /** "Yes" | "No" | "" — aligns with student profile form / admin analytics */
    indigenousGroup: "",
    indigenousGroupType: "",
    pwd: "",
    pwdType: "",
  })
  const [profilePicture, setProfilePicture] = useState(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const profileFileInputRef = useRef(null)
  const [userStatus, setUserStatus] = useState("offline")
  /** Approved applications → one row per distinct scholarship name (newest first). */
  const [approvedScholarships, setApprovedScholarships] = useState([])
  /** Scholarships from agencies / schools / programs outside this portal (editable, saved on user doc). */
  const [externalScholarships, setExternalScholarships] = useState([])

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData({
            fullName: data.fullName || "",
            displayName: data.displayName || "",
            studentNumber: data.studentNumber || "",
            course: data.course || "",
            major:
              data.major && String(data.major).trim() && String(data.major).trim() !== "none"
                ? String(data.major).trim()
                : "",
            yearLevel: data.yearLevel || "",
            campus: data.campus || "",
            email: user.email || "",
            indigenousGroup: data.indigenousGroup === "Yes" || data.indigenousGroup === "No" ? data.indigenousGroup : "",
            indigenousGroupType: String(data.indigenousGroupType || "").trim(),
            pwd: data.pwd === "Yes" || data.pwd === "No" ? data.pwd : "",
            pwdType: String(data.pwdType || "").trim(),
          })
          setProfilePicturePreview(data.photoURL || user.photoURL || null)
          setUserStatus(data.status || "offline")
          setExternalScholarships(normalizeExternalScholarshipsFromFirestore(data.externalScholarships))
        }

        let applicationsSnapshot
        try {
          applicationsSnapshot = await getDocs(
            query(collection(db, "applications"), where("userId", "==", user.uid), orderBy("submittedAt", "desc")),
          )
        } catch {
          applicationsSnapshot = await getDocs(query(collection(db, "applications"), where("userId", "==", user.uid)))
        }

        const approvedRows = applicationsSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => String(a.status || "").toLowerCase() === "approved" && String(a.scholarshipName || "").trim())

        approvedRows.sort((a, b) => {
          const ta = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt || 0).getTime()
          const tb = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt || 0).getTime()
          return tb - ta
        })

        const seenNames = new Set()
        const uniqueByScholarship = []
        for (const row of approvedRows) {
          const name = String(row.scholarshipName || "").trim()
          if (seenNames.has(name)) continue
          seenNames.add(name)
          uniqueByScholarship.push({
            id: row.id,
            scholarshipName: name,
            submittedAt: row.submittedAt,
          })
        }
        setApprovedScholarships(uniqueByScholarship)
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Failed to load profile data", {
          icon: <XCircle className="w-4 h-4" />,
          duration: 3000,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()

    // Real-time status listener
    if (user?.uid) {
      const userDocRef = doc(db, "users", user.uid)
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          setUserStatus(data.status || "offline")
        }
      })
      
      return () => unsubscribe()
    }
  }, [user])

  const handleCropOpenChange = (open) => {
    setCropOpen(open)
    if (!open) {
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc)
        setCropSrc(null)
      }
      if (profileFileInputRef.current) profileFileInputRef.current.value = ""
    }
  }

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file", {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB", {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      })
      return
    }

    if (cropSrc) URL.revokeObjectURL(cropSrc)
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setCropOpen(true)
  }

  const handleCropComplete = (dataUrl) => {
    setProfilePicture(dataUrl)
    setProfilePicturePreview(dataUrl)
    toast.success("Profile picture updated — save to keep it", {
      icon: <CheckCircle className="w-4 h-4" />,
      duration: 2500,
    })
  }

  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateExternalRow = (localId, field, value) => {
    setExternalScholarships((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, [field]: value } : r)),
    )
  }

  const addExternalScholarship = () => {
    setExternalScholarships((prev) => [...prev, newExternalScholarshipRow()])
  }

  const removeExternalScholarship = (localId) => {
    setExternalScholarships((prev) => prev.filter((r) => r.localId !== localId))
  }

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error("Please log in to update profile", {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      })
      return
    }

    try {
      setSaving(true)

      const majorsForProgram = userData.campus
        ? getMajorsForCourseAtCampus(userData.course, userData.campus)
        : null
      if (majorsForProgram?.length) {
        const m = String(userData.major || "").trim()
        if (!m || m === "none") {
          toast.error("Please select your major for this program.", {
            icon: <XCircle className="w-4 h-4" />,
            duration: 3000,
          })
          setSaving(false)
          return
        }
      }

      const externalPayload = externalScholarships
        .map((row) => ({
          name: String(row.name || "").trim(),
          provider: String(row.provider || "").trim(),
          notes: String(row.notes || "").trim(),
        }))
        .filter((row) => row.name.length > 0)

      const indigenousGroup = userData.indigenousGroup === "Yes" || userData.indigenousGroup === "No" ? userData.indigenousGroup : ""
      const pwd = userData.pwd === "Yes" || userData.pwd === "No" ? userData.pwd : ""

      const updateData = {
        fullName: userData.fullName,
        displayName: userData.fullName || userData.displayName,
        studentNumber: userData.studentNumber,
        course: userData.course,
        major:
          majorsForProgram?.length && String(userData.major || "").trim() && userData.major !== "none"
            ? String(userData.major).trim()
            : null,
        yearLevel: userData.yearLevel,
        campus: userData.campus,
        indigenousGroup,
        indigenousGroupType: indigenousGroup === "Yes" ? String(userData.indigenousGroupType || "").trim() : "",
        pwd,
        pwdType: pwd === "Yes" ? String(userData.pwdType || "").trim() : "",
        externalScholarships: externalPayload,
        updatedAt: new Date().toISOString(),
      }

      // Add profile picture if changed
      if (profilePicture) {
        updateData.photoURL = profilePicture
      }

      const userDocRef = doc(db, "users", user.uid)
      await setDoc(userDocRef, updateData, { merge: true })
      if (profilePicture) {
        setProfilePicturePreview(profilePicture)
      }

      setExternalScholarships(
        externalPayload.map((row, i) => ({
          localId: `ext-saved-${i}-${row.name.slice(0, 6)}`,
          name: row.name,
          provider: row.provider,
          notes: row.notes,
        })),
      )

      // Clear the profile picture state after saving
      setProfilePicture(null)

      toast.success("Profile updated successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile", {
        icon: <XCircle className="w-5 h-5" />,
        description: error.message || "Please try again later.",
        duration: 4000,
        position: "top-right",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 py-2 md:py-3">
        <div className="animate-pulse space-y-4 rounded-2xl border border-emerald-200/30 bg-white/60 p-8 dark:border-emerald-900/40 dark:bg-card/40">
          <div className="h-4 w-28 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50" />
          <div className="h-9 max-w-md rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50" />
          <div className="h-4 max-w-sm rounded bg-muted" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-56 animate-pulse rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-card/50 lg:col-span-1" />
          <div className="h-56 animate-pulse rounded-2xl border border-emerald-200/30 bg-muted/40 lg:col-span-2" />
        </div>
        <div className="h-48 animate-pulse rounded-2xl border border-emerald-200/30 bg-muted/40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl border border-emerald-200/30 bg-muted/40" />
          <div className="h-80 animate-pulse rounded-2xl border border-emerald-200/30 bg-muted/40" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-8 py-2 md:py-3">
      {/* Hero — matches student dashboard welcome strip */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="relative">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Student profile
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl">
            My profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-900/75 dark:text-emerald-200/85 sm:text-base">
            Keep your photo, scholarships, and school details accurate — admins and your dashboard use this information.
          </p>
        </div>
      </div>

      <StudentSection
        title="Profile photo"
        subtitle="Shown in the header and across the portal when you add one"
        icon={User}
        accent="emerald"
        badge={
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              userStatus === "online"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-border bg-muted/50 text-muted-foreground",
            )}
          >
            <span
              className={cn("h-2 w-2 rounded-full", userStatus === "online" ? "bg-emerald-500" : "bg-muted-foreground/50")}
            />
            {userStatus === "online" ? "Active now" : "Offline"}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex justify-center lg:justify-start">
            <div className="group relative">
              <div className="h-44 w-44 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg ring-4 ring-emerald-500/15 transition-transform duration-300 group-hover:scale-[1.02] sm:h-48 sm:w-48">
                {profilePicturePreview ? (
                  <img src={profilePicturePreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-5xl font-bold text-white sm:text-6xl">
                    {userData.fullName?.[0] || userData.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <label
                className={cn(
                  "absolute bottom-1 right-1 z-10 cursor-pointer rounded-full p-3 shadow-lg md:transform md:hover:scale-105",
                  "bg-gradient-to-r from-primary to-secondary text-white transition-all duration-200 hover:from-primary/90 hover:to-secondary/90 hover:shadow-xl",
                )}
              >
                <Upload className="h-5 w-5" />
                <input
                  ref={profileFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </label>
              {profilePicturePreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfilePicturePreview(null)
                    setProfilePicture(null)
                  }}
                  className="absolute right-1 top-1 z-10 rounded-full bg-destructive p-2 text-destructive-foreground shadow-md transition hover:bg-destructive/90"
                  title="Remove picture"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <p className="text-sm text-muted-foreground">
                Use a clear face photo when possible. This helps campus staff recognize you during consultations and
                verification.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["JPG, PNG, GIF", "Max 5MB", "Square works best"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-md border border-border bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </StudentSection>

      <StudentSection
        title="Your scholarships"
        subtitle="From approved applications here, plus programs you list from outside MOCAS"
        icon={Award}
        accent="amber"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Through this portal</p>
        {approvedScholarships.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-300/50 bg-emerald-500/[0.03] px-4 py-8 text-center text-sm text-muted-foreground dark:border-emerald-800/40">
            <p className="mb-3">No approved scholarship on record yet.</p>
            <Link
              href="/student/apply"
              className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
            >
              Apply for a scholarship
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {approvedScholarships.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-950/30"
              >
                <span className="font-semibold leading-snug text-foreground">{s.scholarshipName}</span>
                {formatApplicationDate(s.submittedAt) ? (
                  <span className="text-xs text-muted-foreground">
                    Approved · {formatApplicationDate(s.submittedAt)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Status: approved</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          New grants from this portal appear after admin approval.{" "}
          <Link href="/student/apply" className="font-medium text-primary underline-offset-2 hover:underline">
            Apply Scholarship
          </Link>
        </p>

        <div
          id="existing-scholarships"
          className="scroll-mt-8 mt-8 border-t border-emerald-200/40 pt-8 dark:border-emerald-900/40"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 ring-1 ring-amber-500/20 dark:bg-amber-950/40">
                <Building2 className="h-5 w-5 text-amber-800 dark:text-amber-300" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">Outside this portal</h4>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  CHED, LGU, private foundations, other schools, employer grants — list anything not applied for here.
                  Saved with <span className="font-medium text-foreground">Save changes</span> at the bottom.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addExternalScholarship}
              className={cn(STUDENT_GRADIENT_BTN, "gap-1.5 shadow-md hover:shadow-lg")}
            >
              <Plus className="h-4 w-4" />
              Add scholarship
            </button>
          </div>

          {externalScholarships.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
              No external scholarships yet. Use <span className="font-medium text-foreground">Add scholarship</span> if
              you receive aid outside MOCAS.
            </p>
          ) : (
            <div className="space-y-4">
              {externalScholarships.map((row, index) => (
                <div
                  key={row.localId}
                  className="rounded-xl border border-border bg-gradient-to-br from-muted/30 to-transparent p-4 dark:from-muted/15"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Entry {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExternalScholarship(row.localId)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                      aria-label={`Remove scholarship ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-foreground">Scholarship / program name</label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateExternalRow(row.localId, "name", e.target.value)}
                        placeholder="e.g. CHED Tulong Dunong, LGU assistance"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Provider / sponsor (optional)</label>
                      <input
                        type="text"
                        value={row.provider}
                        onChange={(e) => updateExternalRow(row.localId, "provider", e.target.value)}
                        placeholder="Agency or organization"
                        className={fieldInputClass}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-foreground">Notes (optional)</label>
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateExternalRow(row.localId, "notes", e.target.value)}
                        placeholder="School year, reference, etc."
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </StudentSection>

      <StudentSection
        title="Indigenous Peoples (IP) & PWD"
        subtitle="Required for accurate campus records (same options as the extended student profile form)"
        icon={UsersRound}
        accent="teal"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4 dark:bg-muted/10">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UsersRound className="h-4 w-4 shrink-0 text-primary" />
              Are you a member of Indigenous Peoples (IP)?
            </label>
            <p className="text-xs text-muted-foreground">Select Yes or No.</p>
            <select
              value={userData.indigenousGroup}
              onChange={(e) => {
                const v = e.target.value
                setUserData((prev) => ({
                  ...prev,
                  indigenousGroup: v,
                  indigenousGroupType: v === "Yes" ? prev.indigenousGroupType : "",
                }))
              }}
              className={fieldInputClass}
            >
              {YES_NO.map((o) => (
                <option key={o.value || "unset"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {userData.indigenousGroup === "Yes" ? (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-muted-foreground">Indigenous group / tribe</label>
                <select
                  value={userData.indigenousGroupType}
                  onChange={(e) => handleInputChange("indigenousGroupType", e.target.value)}
                  className={fieldInputClass}
                >
                  <option value="">Select group…</option>
                  {INDIGENOUS_GROUP_TYPES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4 dark:bg-muted/10">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Accessibility className="h-4 w-4 shrink-0 text-primary" />
              Are you a Person with Disability (PWD)?
            </label>
            <p className="text-xs text-muted-foreground">Select Yes or No.</p>
            <select
              value={userData.pwd}
              onChange={(e) => {
                const v = e.target.value
                setUserData((prev) => ({
                  ...prev,
                  pwd: v,
                  pwdType: v === "Yes" ? prev.pwdType : "",
                }))
              }}
              className={fieldInputClass}
            >
              {YES_NO.map((o) => (
                <option key={`pwd-${o.value || "unset"}`} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {userData.pwd === "Yes" ? (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-foreground">Please specify</label>
                <p className="text-[11px] text-muted-foreground">
                  I-type ang PWD type o kaugnay na detalye (hindi lang dropdown).
                </p>
                <textarea
                  value={userData.pwdType}
                  onChange={(e) => handleInputChange("pwdType", e.target.value)}
                  rows={3}
                  placeholder="Halimbawa: visual impairment, mobility aid, learning disability, atbp."
                  className={cn(fieldInputClass, "min-h-[88px] resize-y")}
                />
              </div>
            ) : null}
          </div>
        </div>
      </StudentSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentSection
          title="Personal information"
          subtitle="Academic record on file"
          icon={GraduationCap}
          accent="emerald"
        >
          <div className="space-y-5">
            {[
              { field: "fullName", label: "Full name", icon: User, required: true, ph: "Your full name" },
              { field: "studentNumber", label: "Student number", icon: Hash, required: true, ph: "Student ID / number" },
            ].map(({ field, label, icon: Icon, required, ph }) => (
              <div key={field} className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                  {required ? <span className="text-destructive">*</span> : null}
                </label>
                <input
                  type="text"
                  value={userData[field]}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  className={fieldInputClass}
                  placeholder={ph}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Campus <span className="text-destructive">*</span>
              </label>
              <select
                value={getCampusNames().includes(userData.campus) ? userData.campus : userData.campus || ""}
                onChange={(e) => {
                  const v = e.target.value
                  setUserData((prev) => ({
                    ...prev,
                    campus: v,
                    course: "",
                    major: "",
                  }))
                }}
                className={fieldInputClass}
              >
                <option value="">Select campus</option>
                {getCampusNames().map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {userData.campus && !getCampusNames().includes(userData.campus) ? (
                  <option value={userData.campus}>{userData.campus} (update to catalog)</option>
                ) : null}
              </select>
              {userData.campus && !coursesByCampus[userData.campus] ? (
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  Your campus is not in the catalog — choose a campus above so course/major match scholarships.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <GraduationCap className="h-4 w-4 text-primary" />
                Course <span className="text-destructive">*</span>
              </label>
              {userData.campus && coursesByCampus[userData.campus] ? (
                <select
                  value={
                    coursesByCampus[userData.campus].some((r) => r.name === userData.course)
                      ? userData.course
                      : userData.course || ""
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    setUserData((prev) => ({ ...prev, course: v, major: "" }))
                  }}
                  className={fieldInputClass}
                >
                  <option value="">Select course</option>
                  {coursesByCampus[userData.campus].map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                  {userData.course &&
                  !coursesByCampus[userData.campus].some((r) => r.name === userData.course) ? (
                    <option value={userData.course}>{userData.course} (pick catalog course)</option>
                  ) : null}
                </select>
              ) : (
                <input
                  type="text"
                  value={userData.course}
                  onChange={(e) => handleInputChange("course", e.target.value)}
                  className={fieldInputClass}
                  placeholder="Program or course"
                />
              )}
            </div>
            {userData.campus && userData.course && getMajorsForCourseAtCampus(userData.course, userData.campus)?.length ? (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Major <span className="text-destructive">*</span>
                </label>
                <select
                  value={userData.major || ""}
                  onChange={(e) => handleInputChange("major", e.target.value)}
                  className={fieldInputClass}
                >
                  <option value="">Select major</option>
                  {getMajorsForCourseAtCampus(userData.course, userData.campus).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                Year level <span className="text-destructive">*</span>
              </label>
              <select
                value={userData.yearLevel}
                onChange={(e) => handleInputChange("yearLevel", e.target.value)}
                className={fieldInputClass}
              >
                <option value="">Select year level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
              </select>
            </div>
          </div>
        </StudentSection>

        <StudentSection title="Email" subtitle="Account sign-in address (read-only)" icon={Mail} accent="teal">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-primary" />
                Primary email
              </label>
              <input type="email" value={userData.email} disabled className={cn(fieldInputClass, "bg-muted/60")} />
            </div>
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 p-3.5 dark:border-sky-900/50 dark:bg-sky-950/25">
              <p className="text-xs leading-relaxed text-sky-900 dark:text-sky-200/90">
                This email is tied to your login and cannot be changed here. Notifications are sent to this address.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5 dark:border-emerald-800/40">
              <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200/85">
                Keep your personal information up to date so requirements and announcements match your campus record.
              </p>
            </div>
          </div>
        </StudentSection>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/50 p-4 shadow-sm ring-1 ring-emerald-500/10 dark:from-emerald-950/40 dark:via-card dark:to-emerald-950/20 dark:border-emerald-800/40 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Remember:</span> save after editing photo, scholarships, IP/PWD,
          or school details.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(STUDENT_GRADIENT_BTN, "px-8 text-sm font-bold")}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save changes
            </>
          )}
        </button>
      </div>

      <ProfilePhotoCropDialog
        open={cropOpen}
        onOpenChange={handleCropOpenChange}
        imageSrc={cropSrc}
        onComplete={handleCropComplete}
      />
    </div>
  )
}

