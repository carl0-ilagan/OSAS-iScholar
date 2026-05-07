"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { Clock3, Video, Plus, Filter, User, Calendar, Menu, X, LogOut, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useBranding } from "@/contexts/BrandingContext"
import { db } from "@/lib/firebase"
import { submitAdminAuditLog } from "@/lib/client/admin-audit-log"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ScheduledStartPicker from "@/components/consultations/scheduled-start-picker"
import { campusAdminNavItems } from "@/components/campus-admin/nav-items"
import { format } from "date-fns"
import { sendConsultationInviteEmail } from "@/lib/email-service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const INITIAL_FORM = {
  roomName: "",
  durationMinutes: 30,
  // When set, students can only join starting at this time.
  // The call timer will start only after both participants have joined.
  scheduledDate: "",
  scheduledTime: "",
  // Pre-reserve exactly 1 student per slot (optional).
  invitedStudentId: "",
  notes: "",
}

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return "No timer"
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return "Expired"
  const totalSeconds = Math.floor(diffMs / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, "0")} left`
}

function formatScheduledStart(scheduledStartAt) {
  if (!scheduledStartAt) return ""
  const dt = new Date(scheduledStartAt)
  if (Number.isNaN(dt.getTime())) return ""
  return format(dt, "MMM d, yyyy · hh:mm a")
}

function getDisplayInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return "S"
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase()
}

function isValidImageUrl(value) {
  return /^https?:\/\//i.test(String(value || "")) || /^data:image\//i.test(String(value || ""))
}

export default function CampusAdminConsultationsPage() {
  const PAGE_SIZE = 10
  const { user, signOut } = useAuth()
  const { branding } = useBranding()
  const router = useRouter()
  const dropdownRef = useRef(null)
  const studentPickerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingRoomId, setDeletingRoomId] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false)
  const [profileImageError, setProfileImageError] = useState(false)
  const [studentImageErrors, setStudentImageErrors] = useState({})
  const [deleteTargetRoom, setDeleteTargetRoom] = useState(null)
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [statusFilter, setStatusFilter] = useState("history")
  const [currentPage, setCurrentPage] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])
  const [studentOptions, setStudentOptions] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const brandName = branding?.name || "MOCAS"
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const validProfilePhoto = Boolean(
    user?.photoURL && (/^https?:\/\//i.test(user.photoURL) || /^data:image\//i.test(user.photoURL)) && !profileImageError
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
      if (studentPickerRef.current && !studentPickerRef.current.contains(event.target)) {
        setIsStudentPickerOpen(false)
      }
    }

    if (isProfileOpen || isStudentPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isProfileOpen, isStudentPickerOpen])

  useEffect(() => {
    setProfileImageError(false)
  }, [user?.photoURL])

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      router.push("/campus-admin/login")
    }
  }

  const fetchData = async () => {
    if (!activeCampus) {
      setRooms([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const roomsSnapshot = await getDocs(query(collection(db, "consultation_rooms"), where("campus", "==", activeCampus)))

      const roomRows = roomsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      setRooms(roomRows)
    } catch (error) {
      console.error("Error fetching consultation data:", error)
      toast.error("Failed to load consultation data.")
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeCampus])

  // Pre-scheduler participant dropdown: show online students only (aligned with room invite list).
  useEffect(() => {
    if (!activeCampus) {
      setStudentOptions([])
      return
    }

    let alive = true
    const fetchStudents = async () => {
      try {
        setStudentsLoading(true)
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("campus", "==", activeCampus),
            where("role", "==", "student"),
            where("status", "==", "online"),
          ),
        )

        if (!alive) return
        const rows = snap.docs.map((docSnap) => {
          const data = docSnap.data() || {}
          return {
            uid: docSnap.id,
            fullName: data.fullName || data.displayName || data.name || "",
            email: data.email || "",
            photoURL: data.photoURL || null,
          }
        })
        rows.sort((a, b) => String(a.fullName || a.email || "").localeCompare(String(b.fullName || b.email || "")))
        setStudentOptions(rows)
      } catch (error) {
        console.error("Failed to load student options:", error)
        if (alive) setStudentOptions([])
      } finally {
        if (alive) setStudentsLoading(false)
      }
    }

    fetchStudents()
    return () => {
      alive = false
    }
  }, [activeCampus])

  useEffect(() => {
    if (!activeCampus) return
    const roomsQuery = query(collection(db, "consultation_rooms"), where("campus", "==", activeCampus))
    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const roomRows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        setRooms(roomRows)
      },
      (error) => {
        console.error("Realtime consultation room sync error:", error)
      },
    )
    return () => unsubscribe()
  }, [activeCampus])

  useEffect(() => {
    if (!rooms.length) {
      setActiveRoomId(null)
      return
    }
    if (activeRoomId && rooms.some((row) => row.id === activeRoomId)) {
      return
    }
    const firstActive = rooms.find((row) => String(row.status || "active") === "active")
    setActiveRoomId(firstActive?.id || null)
  }, [rooms, activeRoomId])

  const filteredRooms = useMemo(() => {
    if (statusFilter === "history") {
      return rooms.filter((row) => String(row.status || "active") === "ended")
    }
    return rooms.filter((row) => String(row.status || "active") === "active")
  }, [rooms, statusFilter])
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE)),
    [filteredRooms.length, PAGE_SIZE],
  )
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRooms.slice(start, start + PAGE_SIZE)
  }, [filteredRooms, currentPage, PAGE_SIZE])
  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) || null,
    [rooms, activeRoomId],
  )
  const hasActiveRoom = useMemo(
    () => rooms.some((room) => String(room.status || "active") === "active"),
    [rooms],
  )
  const selectedInvitedStudent = useMemo(
    () => studentOptions.find((row) => row.uid === form.invitedStudentId) || null,
    [studentOptions, form.invitedStudentId],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleCreateRoom = async (event) => {
    if (event?.preventDefault) event.preventDefault()
    if (!form.roomName.trim()) {
      toast.error("Room name is required.")
      return
    }
    const duration = Number(form.durationMinutes)
    if (!Number.isFinite(duration) || duration < 5 || duration > 180) {
      toast.error("Duration must be between 5 and 180 minutes.")
      return
    }

    try {
      setSaving(true)
      const now = Date.now()
      const invitedStudent = form.invitedStudentId ? studentOptions.find((s) => s.uid === form.invitedStudentId) || null : null

      const invitedStudentId = invitedStudent?.uid || null
      const invitedStudentName = invitedStudent?.fullName || null
      const invitedStudentPhotoURL = invitedStudent?.photoURL || null

      const hasScheduledDate = Boolean(String(form.scheduledDate || "").trim())
      const hasScheduledTime = Boolean(String(form.scheduledTime || "").trim())
      let scheduledStartAtIso = new Date(now).toISOString()
      if (hasScheduledDate || hasScheduledTime) {
        if (!hasScheduledDate || !hasScheduledTime) {
          toast.error("Please select both date and time for scheduled start.")
          return
        }
        const scheduledLocal = new Date(`${form.scheduledDate}T${form.scheduledTime}`)
        if (Number.isNaN(scheduledLocal.getTime())) {
          toast.error("Invalid scheduled start date/time.")
          return
        }
        scheduledStartAtIso = scheduledLocal.toISOString()
      }

      const roomDoc = await addDoc(collection(db, "consultation_rooms"), {
        campus: activeCampus,
        roomName: form.roomName.trim(),
        durationMinutes: duration,
        // Timer starts only after both participants have joined.
        expiresAt: null,
        scheduledStartAt: scheduledStartAtIso,
        type: "webrtc",
        notes: form.notes.trim(),
        status: "active",
        callState: "waiting",
        joinedStudentId: null,
        joinedStudentName: null,
        // Pre-reserved participant (1 student per slot)
        invitedStudentId,
        invitedStudentName,
        invitedStudentPhotoURL,
        invitedAt: invitedStudentId ? new Date(now).toISOString() : null,
        createdBy: user?.uid || null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      })

      setForm(INITIAL_FORM)
      setActiveRoomId(roomDoc.id)
      setStatusFilter("active")
      toast.success("Consultation room created.")
      router.push(`/campus-admin/consultations/${roomDoc.id}`)
      fetchData()
      // Best-effort email notification (do not block room creation).
      try {
        if (invitedStudentId && invitedStudent?.email) {
          const roomNameForEmail = form.roomName.trim()
          const studentNameForEmail = invitedStudentName || invitedStudent.email
          await sendConsultationInviteEmail(invitedStudent.email, studentNameForEmail, roomNameForEmail, duration)
        }
      } catch (emailError) {
        console.error("Failed to send consultation invite email:", emailError)
      }
    } catch (error) {
      console.error("Error creating consultation room:", error)
      toast.error("Failed to create consultation room.")
    } finally {
      setSaving(false)
    }
  }

  const setRoomStatus = async (room, nextStatus) => {
    const currentStatus = String(room?.status || "active")
    if (currentStatus === "ended") {
      toast.info("This consultation is already ended and archived in history.")
      return
    }
    if (nextStatus !== "ended") {
      toast.error("Ended consultations cannot be reopened.")
      return
    }
    try {
      const endedAt = new Date().toISOString()
      await updateDoc(doc(db, "consultation_rooms", room.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        endedAt,
      })
      setRooms((prev) =>
        prev.map((item) => (item.id === room.id ? { ...item, status: nextStatus, endedAt } : item)),
      )
      void submitAdminAuditLog({
        action: "update",
        resourceType: "consultation_rooms",
        resourceId: room.id,
        detail: `Status: ${nextStatus} · ${room.roomName || ""}`,
      })
      toast.success(`Room marked as ${nextStatus}.`)
      setActiveRoomId((prevActiveId) => {
        if (prevActiveId !== room.id) return prevActiveId
        const nextActive = rooms.find((item) => item.id !== room.id && String(item.status || "active") === "active")
        return nextActive?.id || null
      })
    } catch (error) {
      console.error("Error updating consultation room:", error)
      toast.error("Failed to update room status.")
    }
  }

  const handleDeleteRoom = (room) => {
    if (!room?.id) return
    setDeleteTargetRoom(room)
  }

  const confirmDeleteRoom = async () => {
    const room = deleteTargetRoom
    if (!room?.id) return
    try {
      setDeletingRoomId(room.id)
      await deleteDoc(doc(db, "consultation_rooms", room.id))
      void submitAdminAuditLog({
        action: "delete",
        resourceType: "consultation_rooms",
        resourceId: room.id,
        detail: room.roomName || "",
      })
      setRooms((prev) => prev.filter((r) => r.id !== room.id))
      setActiveRoomId((prev) => (prev === room.id ? null : prev))
      toast.success("Consultation room deleted.")
    } catch (error) {
      console.error("Error deleting consultation room:", error)
      toast.error("Failed to delete consultation room.")
    } finally {
      setDeletingRoomId("")
      setDeleteTargetRoom(null)
    }
  }


  return (
    <CampusAdminLayoutWrapper>
      {/* Header Strip */}
      <div className="fixed inset-x-0 top-0 z-40 border-b border-emerald-200/70 bg-white shadow-sm backdrop-blur-sm dark:border-emerald-800/40 dark:bg-card/95">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200/50 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden rounded-lg border border-emerald-200/50 bg-emerald-50 px-3 py-1.5 sm:block dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Campus Admin Panel</p>
            </div>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-emerald-50 px-2.5 py-1.5 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              <div className="h-8 w-8 overflow-hidden rounded-full border border-emerald-300/60 bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-950/40">
                {validProfilePhoto ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            <div
              className={`absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-emerald-200/50 bg-white shadow-xl transition-all dark:border-emerald-800/40 dark:bg-card ${
                isProfileOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
              }`}
            >
              <div className="border-b border-emerald-200/50 px-3 py-2.5 dark:border-emerald-800/40">
                <p className="truncate text-sm font-semibold text-emerald-950 dark:text-emerald-50">{user?.displayName || user?.email || "Campus Admin"}</p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300/80">Campus Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 border-t border-emerald-200/50 px-3 py-2.5 text-sm text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800/40 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="animate-in fade-in zoom-in-95 border-t border-emerald-200/50 bg-white px-2 py-2 dark:border-emerald-800/40 dark:bg-card">
            <nav className="space-y-0.5">
              {campusAdminNavItems.map(({ icon: Icon, label, href }) => {
                const isActive = href === "/campus-admin/consultations"
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300/90 dark:hover:bg-emerald-950/30"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="pt-16">
        <div className="w-full space-y-4 px-3 pb-4 pt-2 md:space-y-5 md:px-4 md:pb-6 md:pt-3 lg:px-6 lg:pb-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 dark:from-emerald-950/50 dark:via-card dark:to-emerald-950/30 dark:border-emerald-800/40 dark:ring-emerald-500/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
                <Video className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              </span>
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                  <Video className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Consultation Management
                </span>
                <h1 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50 md:text-2xl">Consultation Rooms</h1>
                <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                  Create and manage one-on-one consultation sessions with students.
                </p>
              </div>
            </div>
            {activeRoom && (
              <Link
                href={`/campus-admin/consultations/${activeRoom.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/45 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-sm dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Join Active Call
              </Link>
            )}
          </div>
        </div>

        {/* Create Room Section */}
        <div className="rounded-2xl border border-emerald-200/70 bg-white p-6 shadow-sm ring-1 ring-emerald-500/10 dark:border-emerald-800/40 dark:bg-card">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <Plus className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-emerald-950 dark:text-emerald-50">Create New Room</h2>
              <p className="text-sm text-emerald-900/85 dark:text-emerald-200/85">Set up a consultation session with a student</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Row 1: Room name and duration */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Room Name</label>
                <input
                  value={form.roomName}
                  onChange={(event) => setForm((prev) => ({ ...prev, roomName: event.target.value }))}
                  placeholder="e.g. Scholarship Interview A"
                  className="w-full rounded-lg border border-emerald-200/60 bg-white px-4 py-2.5 text-sm text-emerald-950 placeholder:text-emerald-600/50 transition-all duration-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-50 dark:placeholder:text-emerald-400/40 dark:focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={form.durationMinutes}
                  onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                  placeholder="30"
                  className="w-full rounded-lg border border-emerald-200/60 bg-white px-4 py-2.5 text-sm text-emerald-950 placeholder:text-emerald-600/50 transition-all duration-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-50 dark:placeholder:text-emerald-400/40 dark:focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Row 2: Scheduled start and button */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_minmax(0,1fr)]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Scheduled Start (optional)</label>
                <ScheduledStartPicker
                  className="h-[42px]"
                  dateValue={form.scheduledDate}
                  timeValue={form.scheduledTime}
                  onChange={({ date, time }) => {
                    setForm((prev) => ({ ...prev, scheduledDate: date, scheduledTime: time }))
                  }}
                />
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={saving || hasActiveRoom}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:shadow-md hover:shadow-emerald-600/25 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? "Creating..." : "Create Room"}
                </button>
              </div>
            </div>

            {/* Participant selection */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <User className="h-3.5 w-3.5" />
                Pre-Schedule Participant (Optional)
              </label>
              <div className="relative" ref={studentPickerRef}>
                <button
                  type="button"
                  onClick={() => !studentsLoading && setIsStudentPickerOpen((prev) => !prev)}
                  disabled={studentsLoading}
                  className="flex w-full items-center justify-between rounded-lg border border-emerald-200/60 bg-white px-4 py-2.5 text-sm text-emerald-950 transition-all duration-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-50 dark:focus:border-emerald-600"
                  aria-expanded={isStudentPickerOpen}
                  aria-label="Select participant"
                >
                  {selectedInvitedStudent ? (
                    <span className="flex min-w-0 items-center gap-2">
                      {selectedInvitedStudent.photoURL && isValidImageUrl(selectedInvitedStudent.photoURL) && !studentImageErrors[selectedInvitedStudent.uid] ? (
                        <img
                          src={selectedInvitedStudent.photoURL}
                          alt={selectedInvitedStudent.fullName || selectedInvitedStudent.email || "Student"}
                          className="h-6 w-6 rounded-full border border-emerald-300/60 object-cover"
                          onError={() =>
                            setStudentImageErrors((prev) => ({
                              ...prev,
                              [selectedInvitedStudent.uid]: true,
                            }))
                          }
                        />
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/60 bg-emerald-100 text-[10px] font-semibold text-emerald-700">
                          {getDisplayInitials(selectedInvitedStudent.fullName || selectedInvitedStudent.email || "Student")}
                        </span>
                      )}
                      <span className="truncate">{selectedInvitedStudent.fullName || selectedInvitedStudent.email}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-800/80">Invite later in the room</span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-emerald-700/80 transition ${isStudentPickerOpen ? "rotate-180" : ""}`} />
                </button>

                {isStudentPickerOpen && (
                  <div className="absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-lg border border-emerald-200/70 bg-white p-1 shadow-lg dark:border-emerald-800/40 dark:bg-card">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, invitedStudentId: "" }))
                        setIsStudentPickerOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/60 bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                        -
                      </span>
                      <span className="truncate">Invite later in the room</span>
                    </button>

                    {studentsLoading ? (
                      <p className="px-3 py-2 text-sm text-emerald-800/80">Loading available students...</p>
                    ) : null}

                    {!studentsLoading && studentOptions.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-emerald-800/80">No online students found.</p>
                    ) : null}

                    {!studentsLoading &&
                      studentOptions.map((s) => {
                        const isActive = s.uid === form.invitedStudentId
                        const label = s.fullName || s.email || "Student"
                        const hasValidPhoto = s.photoURL && isValidImageUrl(s.photoURL) && !studentImageErrors[s.uid]

                        return (
                          <button
                            key={s.uid}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, invitedStudentId: s.uid }))
                              setIsStudentPickerOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                              isActive
                                ? "bg-emerald-100 text-emerald-900"
                                : "text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
                            }`}
                          >
                            {hasValidPhoto ? (
                              <img
                                src={s.photoURL}
                                alt={label}
                                className="h-7 w-7 rounded-full border border-emerald-300/60 object-cover"
                                onError={() =>
                                  setStudentImageErrors((prev) => ({
                                    ...prev,
                                    [s.uid]: true,
                                  }))
                                }
                              />
                            ) : (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/60 bg-emerald-100 text-[10px] font-semibold text-emerald-700">
                                {getDisplayInitials(label)}
                              </span>
                            )}
                            <span className="truncate">{label}</span>
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-emerald-800/90 dark:text-emerald-300/80">
                The selected student will be pre-reserved and can join at the <span className="font-semibold">scheduled start time</span>.
              </p>
            </div>

            {hasActiveRoom && (
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/80 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-950/20">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">Active Room Detected:</span> End the current room before creating a new one.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Filter and Count Section */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 rounded-lg border border-emerald-200/50 bg-white px-4 py-2.5 shadow-sm dark:border-emerald-800/40 dark:bg-card">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Filter className="h-3.5 w-3.5" />
              Filter Rooms
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-md border border-emerald-200/60 bg-white px-3 py-2 text-sm text-emerald-950 transition-all duration-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-50 dark:focus:border-emerald-600"
            >
              <option value="active">🟢 Active Rooms</option>
              <option value="history">📋 History</option>
            </select>
          </div>
          <div className="rounded-lg border border-emerald-200/50 bg-white px-4 py-2.5 text-center shadow-sm dark:border-emerald-800/40 dark:bg-card">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {filteredRooms.length}
              <span className="text-emerald-800/90 dark:text-emerald-300/80"> {statusFilter === "active" ? "active" : "archived"}</span>
            </p>
          </div>
        </div>

        {/* Rooms List */}
        {loading ? (
          <div className="rounded-2xl border border-emerald-200/50 bg-white p-8 text-center shadow-sm dark:border-emerald-800/40 dark:bg-card">
            <p className="text-sm text-emerald-800/85 dark:text-emerald-300/80">Loading consultation rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200/50 bg-white p-8 text-center shadow-sm dark:border-emerald-800/40 dark:bg-card">
            <p className="text-sm text-emerald-800/85 dark:text-emerald-300/80">
              {statusFilter === "active" ? "No active rooms. Create one to get started." : "No archived rooms yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-300">
            {paginatedRooms.map((row) => (
              <div
                key={row.id}
                className="group overflow-hidden rounded-xl border border-emerald-200/50 bg-white shadow-sm transition-all duration-200 hover:border-emerald-300/70 hover:shadow-md hover:shadow-emerald-900/5 dark:border-emerald-800/40 dark:bg-card dark:hover:border-emerald-700/60"
              >
                <div className="p-4 sm:p-5">
                  {/* Title and status */}
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold text-emerald-950 group-hover:text-emerald-700 transition dark:text-emerald-50 dark:group-hover:text-emerald-300">
                      {row.roomName || "Untitled Room"}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                        String(row.status || "active") === "active"
                          ? "border border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border border-gray-300/60 bg-gray-50 text-gray-700 dark:border-gray-700/60 dark:bg-gray-950/40 dark:text-gray-300"
                      }`}
                    >
                      {String(row.status || "active") === "active" ? "🟢 Active" : "✓ Ended"}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mb-4 space-y-2">
                    <p className="flex items-center gap-2 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                      <span className="inline-block h-1 w-1 rounded-full bg-emerald-400"></span>
                      {row.joinedStudentName
                        ? `Joined: ${row.joinedStudentName}`
                        : row.invitedStudentName
                          ? `Invited: ${row.invitedStudentName}`
                          : row.scheduledStartAt && !row.expiresAt
                            ? `Scheduled: ${formatScheduledStart(row.scheduledStartAt)}`
                            : "Waiting for student"}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                        <Clock3 className="h-3 w-3" />
                        {Number(row.durationMinutes || 0)} min
                      </span>
                      {row.createdAt && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(row.createdAt), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-emerald-200/30 pt-3 dark:border-emerald-800/20">
                    {String(row.status || "active") === "active" ? (
                      <>
                        <Link
                          href={`/campus-admin/consultations/${row.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Open
                        </Link>
                        <button
                          onClick={() => setRoomStatus(row, "ended")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-95 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/40"
                        >
                          End
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(row)}
                          disabled={deletingRoomId === row.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-600/40 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                        >
                          {deletingRoomId === row.id ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center rounded-lg border border-gray-300/60 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700/60 dark:bg-gray-950/30 dark:text-gray-300">
                          Archived
                        </span>
                        <button
                          onClick={() => handleDeleteRoom(row)}
                          disabled={deletingRoomId === row.id}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-600/40 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredRooms.length > 0 && (
          <div className="animate-in fade-in mt-6 duration-300">
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-emerald-200/50 pt-4 text-center md:justify-between md:text-left dark:border-emerald-800/40">
              <p className="w-full text-sm text-emerald-900/90 md:w-auto dark:text-emerald-200/90">
                Showing page <span className="font-semibold text-emerald-950 dark:text-emerald-50">{currentPage}</span> of{" "}
                <span className="font-semibold text-emerald-950 dark:text-emerald-50">{totalPages}</span>
              </p>
              <div className="flex w-full items-center justify-center gap-2 md:w-auto md:justify-end">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-emerald-300/50 bg-white px-4 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  Previous
                </button>
                <span className="px-2 text-sm font-medium text-emerald-950 dark:text-emerald-50">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-emerald-300/50 bg-white px-4 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <AlertDialog
        open={Boolean(deleteTargetRoom)}
        onOpenChange={(open) => {
          if (!open && !deletingRoomId) setDeleteTargetRoom(null)
        }}
      >
        <AlertDialogContent className="border border-emerald-200/70 bg-white text-emerald-950 shadow-xl dark:border-emerald-800/40 dark:bg-card dark:text-emerald-50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-950 dark:text-emerald-50">Delete Call History?</AlertDialogTitle>
            <AlertDialogDescription className="text-emerald-900/80 dark:text-emerald-200/80">
              This will permanently remove <span className="font-semibold">{deleteTargetRoom?.roomName || "this consultation room"}</span> from history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(deletingRoomId)}
              className="border-emerald-300/70 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:text-emerald-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRoom}
              disabled={Boolean(deletingRoomId)}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-2 focus:ring-rose-500/40"
            >
              {deletingRoomId ? "Deleting..." : "Delete History"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CampusAdminLayoutWrapper>
  )
}
