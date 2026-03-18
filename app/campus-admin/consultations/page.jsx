"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { addDoc, collection, doc, getDocs, onSnapshot, query, runTransaction, updateDoc, where } from "firebase/firestore"
import { Clock3, MessageCircle, PanelRightClose, PanelRightOpen, Video } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import CampusAdminLayoutWrapper from "../campus-admin-layout"
import { normalizeCampus } from "@/lib/campus-admin-config"
import Link from "next/link"
import WebRtcRoom from "@/components/consultations/webrtc-room"

const INITIAL_FORM = {
  roomName: "",
  durationMinutes: 30,
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

export default function CampusAdminConsultationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [isRoomListOpen, setIsRoomListOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState("rooms")
  const [statusFilter, setStatusFilter] = useState("all")
  const [onlineStudents, setOnlineStudents] = useState([])
  const [invitingStudentId, setInvitingStudentId] = useState("")
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [previewError, setPreviewError] = useState("")
  const localPreviewRef = useRef(null)
  const previewStreamRef = useRef(null)
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

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
    if (!activeCampus) {
      setOnlineStudents([])
      return
    }
    const studentsQuery = query(
      collection(db, "users"),
      where("campus", "==", activeCampus),
      where("role", "==", "student"),
      where("status", "==", "online"),
    )

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => String(a.fullName || a.name || a.email || "").localeCompare(String(b.fullName || b.name || b.email || "")))
        setOnlineStudents(rows)
      },
      (error) => {
        console.error("Error fetching online students:", error)
        setOnlineStudents([])
      },
    )

    return () => unsubscribe()
  }, [activeCampus])

  useEffect(() => {
    let mounted = true
    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        previewStreamRef.current = stream
        setPreviewError("")
        if (localPreviewRef.current) {
          localPreviewRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Preview camera error:", error)
        if (mounted) {
          setPreviewError("Enable camera permission to show local POV.")
        }
      }
    }

    startPreview()

    return () => {
      mounted = false
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop())
        previewStreamRef.current = null
      }
      if (localPreviewRef.current) {
        localPreviewRef.current.srcObject = null
      }
    }
  }, [])

  useEffect(() => {
    if (!rooms.length) {
      setActiveRoomId(null)
      return
    }
    if (activeRoomId && rooms.some((row) => row.id === activeRoomId)) {
      return
    }
    const firstActive = rooms.find((row) => String(row.status || "active") === "active")
    setActiveRoomId(firstActive?.id || rooms[0]?.id || null)
  }, [rooms, activeRoomId])

  useEffect(() => {
    if (!activeRoomId) {
      setChatMessages([])
      return
    }
    const unsubscribe = onSnapshot(
      collection(db, "consultation_rooms", activeRoomId, "messages"),
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        setChatMessages(rows)
      },
      (error) => {
        console.error("Error loading consultation chat:", error)
        setChatMessages([])
      },
    )
    return () => unsubscribe()
  }, [activeRoomId])

  const filteredRooms = useMemo(() => {
    if (statusFilter === "all") return rooms
    return rooms.filter((row) => String(row.status || "active") === statusFilter)
  }, [rooms, statusFilter])
  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) || null,
    [rooms, activeRoomId],
  )

  const handleCreateRoom = async (event) => {
    event.preventDefault()
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
      const roomDoc = await addDoc(collection(db, "consultation_rooms"), {
        campus: activeCampus,
        roomName: form.roomName.trim(),
        durationMinutes: duration,
        expiresAt: new Date(now + duration * 60 * 1000).toISOString(),
        type: "webrtc",
        notes: form.notes.trim(),
        status: "active",
        callState: "waiting",
        joinedStudentId: null,
        joinedStudentName: null,
        createdBy: user?.uid || null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      })

      setForm(INITIAL_FORM)
      setActiveRoomId(roomDoc.id)
      toast.success("Consultation room created.")
      fetchData()
    } catch (error) {
      console.error("Error creating consultation room:", error)
      toast.error("Failed to create consultation room.")
    } finally {
      setSaving(false)
    }
  }

  const setRoomStatus = async (room, nextStatus) => {
    try {
      await updateDoc(doc(db, "consultation_rooms", room.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        endedAt: nextStatus === "ended" ? new Date().toISOString() : null,
      })
      setRooms((prev) =>
        prev.map((item) =>
          item.id === room.id ? { ...item, status: nextStatus, endedAt: nextStatus === "ended" ? new Date().toISOString() : null } : item,
        ),
      )
      toast.success(`Room marked as ${nextStatus}.`)
    } catch (error) {
      console.error("Error updating consultation room:", error)
      toast.error("Failed to update room status.")
    }
  }

  const inviteOnlineStudent = async (student) => {
    if (!activeRoomId) {
      toast.error("Create or open an active room first.")
      return
    }
    if (!activeRoom || String(activeRoom.status || "active") !== "active") {
      toast.error("Room is not active.")
      return
    }
    if (!student) return

    const studentId = student.uid || student.id
    if (!studentId) {
      toast.error("Invalid student account.")
      return
    }

    try {
      setInvitingStudentId(studentId)
      const roomRef = doc(db, "consultation_rooms", activeRoomId)
      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef)
        if (!roomSnap.exists()) throw new Error("Room not found.")
        const data = roomSnap.data() || {}
        if (String(data.status || "active") !== "active") {
          throw new Error("Room is not active.")
        }
        if (data.joinedStudentId && data.joinedStudentId !== studentId) {
          throw new Error("May naka join na sa room.")
        }
        tx.update(roomRef, {
          invitedStudentId: studentId,
          invitedStudentName: student.fullName || student.name || student.email || "Student",
          invitedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      })
      toast.success("Student invited.")
      fetchData()
    } catch (error) {
      const message = String(error?.message || "Failed to invite student.")
      const expectedValidation =
        message === "Room not found." || message === "Room is not active." || message === "May naka join na sa room."
      if (!expectedValidation) {
        console.error("Error inviting student:", error)
      }
      toast.error(message)
    } finally {
      setInvitingStudentId("")
    }
  }

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || !activeRoomId) return
    try {
      setSendingChat(true)
      await addDoc(collection(db, "consultation_rooms", activeRoomId, "messages"), {
        text,
        senderId: user?.uid || null,
        senderName: user?.fullName || user?.displayName || user?.email || "Campus Admin",
        senderRole: "campus_admin",
        createdAt: new Date().toISOString(),
      })
      setChatInput("")
    } catch (error) {
      console.error("Error sending chat message:", error)
      toast.error("Failed to send message.")
    } finally {
      setSendingChat(false)
    }
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="h-[100dvh] w-full bg-slate-950">
        <div className="h-full w-full">
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden border border-slate-800/80 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3">
              <div className="flex items-start gap-2">
                <Link
                  href="/campus-admin"
                  className="inline-flex h-9 items-center rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-medium text-slate-100 hover:bg-slate-700"
                >
                  Back
                </Link>
                <div>
                  <p className="flex items-center gap-2 text-xl font-semibold">
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
                <p className="text-sm font-semibold text-slate-100">
                  {activeRoom ? formatRemainingTime(activeRoom.expiresAt) : "No timer"}
                </p>
              </div>
            </div>

            {!activeRoom ? (
              <form onSubmit={handleCreateRoom} className="grid gap-3 border-b border-slate-800 px-4 py-3 md:grid-cols-12">
                <label className="space-y-1.5 md:col-span-7">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Roomname</span>
                  <input
                    value={form.roomName}
                    onChange={(event) => setForm((prev) => ({ ...prev, roomName: event.target.value }))}
                    placeholder="e.g. Scholarship Consultation A"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </label>
                <label className="space-y-1.5 md:col-span-3">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Duration (minutes)</span>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={form.durationMinutes}
                    onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </label>
                <div className="flex items-end md:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-[42px] w-full items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create Room"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
                Active room in progress. End current room first before creating a new one.
              </div>
            )}

            <div className="border-b border-slate-800 px-4 py-2">
              <p className="text-xs text-slate-400">Student View</p>
            </div>

            <div className="relative min-h-0 flex-1">
              <div className="h-full p-2 md:p-3">
                {activeRoomId ? (
                  <WebRtcRoom
                    roomId={activeRoomId}
                    role="campus_admin"
                    backHref="/campus-admin/consultations"
                    showHeader={false}
                    showBackButton={false}
                    showMeta={false}
                    compact
                  />
                ) : (
                  <div className="relative h-full overflow-hidden rounded-xl border border-slate-800 bg-black">
                    <div className="h-full min-h-[260px] w-full bg-black" />
                    <div className="absolute bottom-3 right-3 z-20 w-[120px] overflow-hidden rounded-lg border border-slate-700 bg-black shadow-xl sm:bottom-4 sm:right-4 sm:w-[150px] md:w-[170px]">
                      <p className="border-b border-slate-700 bg-black/70 px-2 py-1 text-[10px] text-slate-300">You</p>
                      <video
                        ref={localPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-[82px] w-full bg-black object-cover [transform:scaleX(-1)] sm:h-[95px] md:h-[110px]"
                      />
                    </div>
                    {previewError ? (
                      <div className="absolute bottom-3 left-3 z-20 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] text-amber-700">
                        {previewError}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {!isRoomListOpen ? (
              <button
                onClick={() => setIsRoomListOpen(true)}
                className="absolute right-3 top-14 z-30 inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 md:top-16"
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
                Room List
              </button>
            ) : null}

            <aside
              className={`absolute inset-y-0 right-0 z-20 w-[330px] border-l border-slate-800 bg-slate-900/95 backdrop-blur transition-transform duration-300 ${
                isRoomListOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
                  <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 p-1">
                    <button
                      onClick={() => setSidebarTab("rooms")}
                      className={`rounded px-2 py-1 text-[11px] ${
                        sidebarTab === "rooms" ? "bg-slate-700 text-slate-100" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      Rooms
                    </button>
                    <button
                      onClick={() => setSidebarTab("chat")}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${
                        sidebarTab === "chat" ? "bg-slate-700 text-slate-100" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {sidebarTab === "rooms" ? (
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="ended">Ended</option>
                      </select>
                    ) : null}
                    <button
                      onClick={() => setIsRoomListOpen(false)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      <PanelRightClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {sidebarTab === "rooms" ? (
                  <>
                    <div className="max-h-[220px] overflow-y-auto border-b border-slate-800">
                      {onlineStudents.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-slate-500">No online students.</p>
                      ) : (
                        onlineStudents.map((student) => {
                          const studentId = student.uid || student.id
                          const label = student.fullName || student.name || student.email || "Student"
                          const isInviting = invitingStudentId === studentId
                          return (
                            <div key={studentId} className="flex items-center justify-between gap-2 border-b border-slate-800/70 px-4 py-2">
                              <p className="truncate text-xs text-slate-200">{label}</p>
                              <button
                                onClick={() => inviteOnlineStudent(student)}
                                disabled={isInviting || !activeRoomId || !activeRoom || String(activeRoom.status || "active") !== "active"}
                                className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-emerald-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isInviting ? "Inviting..." : "Invite"}
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {loading ? (
                        <p className="px-4 py-3 text-sm text-slate-400">Loading consultation rooms...</p>
                      ) : filteredRooms.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400">No rooms found for this campus yet.</p>
                      ) : (
                        filteredRooms.map((row) => (
                          <div key={row.id} className="border-b border-slate-800 px-4 py-3 text-sm">
                            <p className="font-medium text-slate-100">{row.roomName || "Untitled Room"}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {row.joinedStudentName ? `Joined: ${row.joinedStudentName}` : "Waiting for student"}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-300">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {Number(row.durationMinutes || 0)} min
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 ${
                                  String(row.status || "active") === "active"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                              >
                                {String(row.status || "active")}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => setActiveRoomId(row.id)}
                                className="rounded-md border border-slate-600 px-2 py-1 text-xs text-emerald-300 hover:bg-slate-800"
                              >
                                Open
                              </button>
                              {String(row.status || "active") === "active" ? (
                                <button
                                  onClick={() => setRoomStatus(row, "ended")}
                                  className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                                >
                                  End
                                </button>
                              ) : (
                                <button
                                  onClick={() => setRoomStatus(row, "active")}
                                  className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                                >
                                  Reopen
                                </button>
                              )}
                              <Link
                                href={`/campus-admin/consultations/${row.id}`}
                                className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                              >
                                Standalone
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                      {!activeRoomId ? (
                        <p className="text-xs text-slate-500">Open a room first to chat.</p>
                      ) : chatMessages.length === 0 ? (
                        <p className="text-xs text-slate-500">No messages yet.</p>
                      ) : (
                        chatMessages.map((msg) => {
                          const mine = msg.senderId === user?.uid
                          return (
                            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
                                  mine ? "bg-emerald-500/25 text-emerald-100" : "bg-slate-800 text-slate-100"
                                }`}
                              >
                                <p className="mb-0.5 text-[10px] text-slate-300">{msg.senderName || "User"}</p>
                                <p className="break-words">{msg.text}</p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                    <div className="border-t border-slate-800 p-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={chatInput}
                          onChange={(event) => setChatInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              sendChatMessage()
                            }
                          }}
                          placeholder="Type a message..."
                          className="h-9 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        <button
                          onClick={sendChatMessage}
                          disabled={sendingChat || !chatInput.trim() || !activeRoomId}
                          className="h-9 rounded-md bg-emerald-500 px-3 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
