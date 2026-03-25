"use client"

import { useEffect, useMemo, useState } from "react"
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { ArrowLeft, Clock3, Video } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { submitAdminAuditLog } from "@/lib/client/admin-audit-log"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ScheduledStartPicker from "@/components/consultations/scheduled-start-picker"
import { format } from "date-fns"
import { sendConsultationInviteEmail } from "@/lib/email-service"

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

export default function CampusAdminConsultationsPage() {
  const PAGE_SIZE = 10
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingRoomId, setDeletingRoomId] = useState("")
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [statusFilter, setStatusFilter] = useState("history")
  const [currentPage, setCurrentPage] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])
  const [studentOptions, setStudentOptions] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)

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

  const handleDeleteRoom = async (room) => {
    if (!room?.id) return
    if (!window.confirm(`Delete consultation room "${room.roomName || room.id}"? This cannot be undone.`)) return
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
    }
  }


  return (
    <CampusAdminLayoutWrapper>
      <div className="min-h-[100dvh] w-full bg-slate-950 px-2 pb-4 pt-2 sm:px-4">
        <div className="h-full w-full">
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="sticky top-0 z-20 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-3 py-3 backdrop-blur sm:px-4">
              <div className="flex items-start gap-2">
                <Link
                  href="/campus-admin"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 text-xs font-semibold text-slate-100 shadow-sm hover:bg-slate-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Link>
                <div>
                  <p className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
                    <Video className="h-4 w-4 text-emerald-400" />
                    Admin Consultation Room
                  </p>
                  <p className="text-sm text-slate-400">
                    {activeRoom ? String(activeRoom.callState || "waiting") : "Not connected"}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Remaining</p>
                <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                  {activeRoom
                    ? activeRoom.expiresAt
                      ? formatRemainingTime(activeRoom.expiresAt)
                      : activeRoom.scheduledStartAt
                        ? `Scheduled: ${formatScheduledStart(activeRoom.scheduledStartAt)}`
                        : "No timer"
                    : "No timer"}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-2 sm:p-3">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80">
                <div className="border-b border-slate-800 bg-slate-900/70 p-2.5 sm:p-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Create Room</p>
                    <div className="grid w-full grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_110px]">
                      <input
                        value={form.roomName}
                        onChange={(event) => setForm((prev) => ({ ...prev, roomName: event.target.value }))}
                        placeholder="Room name (e.g. Scholarship Interview A)"
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={form.durationMinutes}
                        onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                      <ScheduledStartPicker
                        className="h-10"
                        dateValue={form.scheduledDate}
                        timeValue={form.scheduledTime}
                        onChange={({ date, time }) => {
                          setForm((prev) => ({ ...prev, scheduledDate: date, scheduledTime: time }))
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateRoom}
                        disabled={saving || hasActiveRoom}
                        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-500 px-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Creating..." : "Create"}
                      </button>
                    </div>
                    <div className="mt-2">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Pre-schedule participant (1 student per slot, optional)
                      </label>
                      <select
                        value={form.invitedStudentId}
                        onChange={(e) => setForm((prev) => ({ ...prev, invitedStudentId: e.target.value }))}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        disabled={studentsLoading}
                      >
                        <option value="">Invite later in the room</option>
                        {studentsLoading ? <option value="">Loading...</option> : null}
                        {studentOptions.map((s) => (
                          <option key={s.uid} value={s.uid}>
                            {s.fullName || s.email}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Reserved student can join at <span className="text-slate-300">scheduled start</span>.
                      </p>
                    </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">List Filter</p>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <option value="active">Active Rooms</option>
                        <option value="history">History</option>
                      </select>
                    </div>
                  </div>
                  {hasActiveRoom ? (
                    <p className="mt-2 text-xs text-slate-400">End active room first before creating a new one.</p>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loading ? (
                    <p className="px-4 py-3 text-sm text-slate-400">Loading consultation rooms...</p>
                  ) : filteredRooms.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">No rooms found for this campus yet.</p>
                  ) : (
                    paginatedRooms.map((row) => (
                      <div key={row.id} className="mx-3 my-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3.5 text-sm shadow-sm transition hover:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p
                            title={row.roomName || "Untitled Room"}
                            className="max-w-[70%] truncate text-base font-semibold text-slate-100"
                          >
                            {row.roomName || "Untitled Room"}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs ${
                              String(row.status || "active") === "active"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {String(row.status || "active")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          {row.joinedStudentName
                            ? `Joined: ${row.joinedStudentName}`
                            : row.scheduledStartAt && !row.expiresAt
                              ? `Scheduled: ${formatScheduledStart(row.scheduledStartAt)}`
                              : "Waiting for student"}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {Number(row.durationMinutes || 0)} min
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {String(row.status || "active") === "active" ? (
                              <>
                                <Link
                                  href={`/campus-admin/consultations/${row.id}`}
                                  className="rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                                >
                                  Open
                                </Link>
                                <button
                                  onClick={() => setRoomStatus(row, "ended")}
                                  className="rounded-md border border-rose-700/70 bg-rose-950/40 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-900/50"
                                >
                                  End
                                </button>
                                <button
                                  onClick={() => handleDeleteRoom(row)}
                                  disabled={deletingRoomId === row.id}
                                  className="rounded-md border border-rose-700/70 bg-rose-950/20 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingRoomId === row.id ? "Deleting..." : "Delete"}
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">
                                  Archived
                                </span>
                                <button
                                  onClick={() => handleDeleteRoom(row)}
                                  disabled={deletingRoomId === row.id}
                                  className="rounded-md border border-rose-700/70 bg-rose-950/20 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingRoomId === row.id ? "Deleting..." : "Delete"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {!loading && filteredRooms.length > 0 ? (
                  <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/70 px-3 py-2">
                    <p className="text-xs text-slate-400">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                        className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                        className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
