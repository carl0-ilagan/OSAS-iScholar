"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { addDoc, collection, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore"
import { ChevronLeft, ChevronRight, Clock3, MessageCircle, Video } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { normalizeCampus } from "@/lib/campus-admin-config"
import WebRtcRoom from "@/components/consultations/webrtc-room"

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return "No timer"
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return "Expired"
  const totalSeconds = Math.floor(diffMs / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, "0")} left`
}

function getDisplayInitials(value) {
  const text = String(value || "").trim()
  if (!text) return "US"
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase() || "US"
}

function hasSeenByOtherUser(message) {
  const seenBy = message?.seenBy || {}
  return Object.entries(seenBy).some(([uid, seen]) => uid !== message?.senderId && Boolean(seen))
}

export default function StudentConsultationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState("rooms")
  const [statusFilter, setStatusFilter] = useState("active")
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [previewError, setPreviewError] = useState("")
  const localPreviewRef = useRef(null)
  const previewStreamRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const typingStateRef = useRef(false)
  const activeCampus = useMemo(() => normalizeCampus(user?.campus || null), [user?.campus])

  useEffect(() => {
      if (!user?.uid || !activeCampus) {
        setRooms([])
        setLoading(false)
        return
      }

        setLoading(true)
    const roomsQuery = query(collection(db, "consultation_rooms"), where("campus", "==", activeCampus))
    const unsub = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => {
            const aInvited = a.invitedStudentId && a.invitedStudentId === user.uid ? 1 : 0
            const bInvited = b.invitedStudentId && b.invitedStudentId === user.uid ? 1 : 0
            if (aInvited !== bInvited) return bInvited - aInvited
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          })
        setRooms(rows)
        setLoading(false)
      },
      (error) => {
        console.error("Error loading consultation rooms:", error)
        setRooms([])
        setLoading(false)
      },
    )

    return () => unsub()
  }, [activeCampus, user?.uid])

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
        console.error("Student preview camera error:", error)
        if (mounted) {
          setPreviewError("Enable camera permission to show your POV.")
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
    const activeRooms = rooms
      .filter((room) => String(room.status || "active") === "active")
      .filter((room) => !room.expiresAt || new Date(room.expiresAt).getTime() > Date.now())
    if (!activeRooms.length) {
      setActiveRoomId(null)
      return
    }
    if (activeRoomId && activeRooms.some((room) => room.id === activeRoomId)) {
      return
    }
    const invited = activeRooms.find((room) => room.invitedStudentId && room.invitedStudentId === user?.uid)
    setActiveRoomId(invited?.id || activeRooms[0]?.id || null)
  }, [rooms, activeRoomId, user?.uid])

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

  useEffect(() => {
    if (!activeRoomId) {
      setTypingUsers([])
      return
    }
    const unsubscribe = onSnapshot(
      collection(db, "consultation_rooms", activeRoomId, "typing"),
      (snapshot) => {
        const now = Date.now()
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((entry) => Boolean(entry.isTyping))
          .filter((entry) => entry.userId !== user?.uid)
          .filter((entry) => {
            const stamp = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0
            return stamp > 0 && now - stamp < 8000
          })
          .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        setTypingUsers(rows)
      },
      () => {
        setTypingUsers([])
      },
    )
    return () => unsubscribe()
  }, [activeRoomId, user?.uid])

  useEffect(() => {
    if (!activeRoomId || !user?.uid || sidebarTab !== "chat" || chatMessages.length === 0) return
    const unseen = chatMessages.filter((msg) => msg.senderId && msg.senderId !== user.uid && !msg?.seenBy?.[user.uid])
    if (unseen.length === 0) return
    Promise.all(
      unseen.map((msg) =>
        updateDoc(doc(db, "consultation_rooms", activeRoomId, "messages", msg.id), {
          [`seenBy.${user.uid}`]: true,
          [`seenAt.${user.uid}`]: new Date().toISOString(),
        }),
      ),
    ).catch((error) => {
      console.error("Failed to update seen status:", error)
    })
  }, [activeRoomId, chatMessages, sidebarTab, user?.uid])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [])

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) || null,
    [rooms, activeRoomId],
  )
  const filteredRooms = useMemo(() => {
    if (statusFilter === "history") {
      return rooms
        .filter((room) => String(room.status || "active") === "ended")
        .filter((room) => room.joinedStudentId === user?.uid)
    }
    return rooms
      .filter((room) => String(room.status || "active") === "active")
      .filter((room) => !room.expiresAt || new Date(room.expiresAt).getTime() > Date.now())
  }, [rooms, statusFilter, user?.uid])

  const setTypingState = async (nextTyping) => {
    if (!activeRoomId || !user?.uid) return
    if (typingStateRef.current === nextTyping) return
    typingStateRef.current = nextTyping
    try {
      await setDoc(
        doc(db, "consultation_rooms", activeRoomId, "typing", user.uid),
        {
          userId: user.uid,
          userName: user?.fullName || user?.displayName || user?.email || "Student",
          userPhotoURL: user?.photoURL || null,
          userRole: "student",
          isTyping: Boolean(nextTyping),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
    } catch (error) {
      console.error("Failed to update typing status:", error)
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
        senderName: user?.fullName || user?.displayName || user?.email || "Student",
        senderPhotoURL: user?.photoURL || null,
        senderRole: "student",
        seenBy: user?.uid ? { [user.uid]: true } : {},
        seenAt: user?.uid ? { [user.uid]: new Date().toISOString() } : {},
        createdAt: new Date().toISOString(),
      })
      setChatInput("")
      await setTypingState(false)
    } catch (error) {
      console.error("Error sending chat message:", error)
    } finally {
      setSendingChat(false)
    }
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-950 p-1 md:p-2">
      <div className="h-full w-full">
        <div className="relative flex h-full min-h-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950 text-slate-100 shadow-2xl">
          <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
            <div className="flex items-center gap-2">
              <Link
                href="/student"
                className="inline-flex h-8 items-center rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-medium text-slate-100 hover:bg-slate-700"
              >
                Back
              </Link>
              <div>
                <p className="flex items-center gap-1.5 text-base font-semibold sm:text-lg">
                  <Video className="h-3.5 w-3.5 text-emerald-400" />
                  Student Consultation Room
                </p>
                <p className="text-xs text-slate-400">
                  {activeRoom ? String(activeRoom.callState || "waiting") : "Not connected"}
                </p>
              </div>
          </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Remaining</p>
              <p className="text-xs font-semibold text-slate-100 sm:text-sm">
                {activeRoom ? formatRemainingTime(activeRoom.expiresAt) : "No timer"}
              </p>
            </div>
        </div>

          <div className="relative min-h-0 flex-1">
            <div className="h-full p-1.5 md:p-2">
              {activeRoomId ? (
                <WebRtcRoom
                  roomId={activeRoomId}
                  role="student"
                  backHref="/student/consultations"
                  showHeader={false}
                  showBackButton={false}
                  showMeta={false}
                  compact
                />
              ) : (
                <div className="relative h-full overflow-hidden rounded-xl border border-slate-800 bg-black">
                  <div className="h-full min-h-[260px] w-full bg-black" />
                  <div className="absolute right-2 top-2 z-20 w-[74px] overflow-hidden rounded-lg border border-slate-700 bg-black shadow-xl sm:right-3 sm:top-3 sm:w-[104px] md:bottom-4 md:right-4 md:top-auto md:w-[140px]">
                    <p className="border-b border-slate-700 bg-black/70 px-2 py-1 text-[10px] text-slate-300">You</p>
                    <video
                      ref={localPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-[52px] w-full bg-black object-cover [transform:scaleX(-1)] sm:h-[70px] md:h-[90px]"
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
          </div>

          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`absolute top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900/95 text-slate-200 shadow-lg transition-all hover:bg-slate-800 ${
              isSidebarOpen ? "right-[330px] translate-x-1/2" : "right-2"
            }`}
            aria-label={isSidebarOpen ? "Hide sidebar panels" : "Show sidebar panels"}
          >
            {isSidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>

          <aside
            className={`absolute inset-y-0 right-0 z-20 flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-800 bg-slate-900/95 backdrop-blur transition-all duration-300 ${
              isSidebarOpen ? "w-[330px] translate-x-0 opacity-100" : "w-0 translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex h-full min-h-0 flex-col">
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
                {sidebarTab === "rooms" ? (
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="active">Active</option>
                    <option value="history">History</option>
                  </select>
                ) : null}
              </div>

              {sidebarTab === "rooms" ? (
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <p className="px-4 py-3 text-sm text-slate-400">Loading consultation rooms...</p>
                  ) : filteredRooms.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">
                      {statusFilter === "history"
                        ? "No consultation history yet."
                        : "No active consultation room available right now."}
                    </p>
                  ) : (
                    filteredRooms.map((room) => (
                      <div key={room.id} className="border-b border-slate-800 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-100">{room.roomName || "Consultation Room"}</p>
                          {room.invitedStudentId === user?.uid ? (
                            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-300">Invited</span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-300">
                          <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {Number(room.durationMinutes || 0)} min
                  </span>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                            {String(room.status || "active")}
                          </span>
                        </div>
                        <div className="mt-2">
                          {statusFilter === "active" ? (
                            <button
                              onClick={() => setActiveRoomId(room.id)}
                              disabled={!!room.invitedStudentId && room.invitedStudentId !== user?.uid}
                              className="rounded-md border border-slate-600 px-2 py-1 text-xs text-emerald-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Join
                            </button>
                          ) : (
                            <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">Joined</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                        const avatarUrl = String(msg.senderPhotoURL || "").trim()
                        const displayName = msg.senderName || "User"
                        return (
                          <div key={msg.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                            {!mine ? (
                              avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full border border-slate-700 object-cover" />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[10px] font-semibold text-slate-200">
                                  {getDisplayInitials(displayName)}
                                </div>
                              )
                            ) : null}
                            <div
                              className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
                                mine ? "bg-emerald-500/25 text-emerald-100" : "bg-slate-800 text-slate-100"
                              }`}
                            >
                              <p className="mb-0.5 text-[10px] text-slate-300">{displayName}</p>
                              <p className="break-words">{msg.text}</p>
                              {mine ? (
                                <p className="mt-1 text-[10px] text-slate-300/90">{hasSeenByOtherUser(msg) ? "Seen" : "Sent"}</p>
                              ) : null}
                            </div>
                            {mine ? (
                              avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full border border-slate-700 object-cover" />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[10px] font-semibold text-slate-200">
                                  {getDisplayInitials(displayName)}
                                </div>
                              )
                            ) : null}
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="border-t border-slate-800 p-2">
                    {typingUsers.length > 0 ? (
                      <p className="mb-1 px-1 text-[11px] text-slate-400">
                        {typingUsers[0].userName || "User"} is typing...
                      </p>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <input
                        value={chatInput}
                        onChange={(event) => {
                          const value = event.target.value
                          setChatInput(value)
                          if (!activeRoomId) return
                          if (value.trim()) {
                            setTypingState(true)
                            if (typingTimeoutRef.current) {
                              clearTimeout(typingTimeoutRef.current)
                            }
                            typingTimeoutRef.current = setTimeout(() => {
                              setTypingState(false)
                            }, 1200)
                            return
                          }
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current)
                            typingTimeoutRef.current = null
                          }
                          setTypingState(false)
                        }}
                        onBlur={() => {
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current)
                            typingTimeoutRef.current = null
                          }
                          setTypingState(false)
                        }}
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
  )
}
