"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import { addDoc, collection, doc, getDoc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore"
import { ChevronRight, ChevronLeft, MessageCircle, Users } from "lucide-react"
import { toast } from "sonner"
import CampusAdminLayoutWrapper from "../../campus-admin-layout"
import WebRtcRoom from "@/components/consultations/webrtc-room"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { sendConsultationInviteEmail, sendConsultationJoinApprovedEmail, sendConsultationJoinRejectedEmail } from "@/lib/email-service"

function getDisplayInitials(value) {
  const text = String(value || "").trim()
  if (!text) return "ST"
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase() || "ST"
}

function hasSeenByOtherUser(message) {
  const seenBy = message?.seenBy || {}
  return Object.entries(seenBy).some(([uid, seen]) => uid !== message?.senderId && Boolean(seen))
}

export default function CampusAdminConsultationRoomPage({ params }) {
  const { user } = useAuth()
  const { roomId } = use(params)
  const [room, setRoom] = useState(null)
  const [sidebarTab, setSidebarTab] = useState("invite")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [onlineStudents, setOnlineStudents] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [studentSearch, setStudentSearch] = useState("")
  const [invitingStudentId, setInvitingStudentId] = useState("")
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeoutRef = useRef(null)
  const typingStateRef = useRef(false)

  const roomIsActive = useMemo(
    () => String(room?.status || "active") === "active",
    [room?.status],
  )
  const filteredOnlineStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase()
    if (!term) return onlineStudents
    return onlineStudents.filter((student) => {
      const fullName = String(student.fullName || student.name || "").toLowerCase()
      const email = String(student.email || "").toLowerCase()
      return fullName.includes(term) || email.includes(term)
    })
  }, [onlineStudents, studentSearch])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "consultation_rooms", roomId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setRoom(null)
          return
        }
        setRoom({ id: snapshot.id, ...snapshot.data() })
      },
      () => setRoom(null),
    )
    return () => unsubscribe()
  }, [roomId])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "consultation_rooms", roomId, "join_requests"),
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((entry) => String(entry.status || "") === "pending")
          .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        setJoinRequests(rows)
      },
      () => setJoinRequests([]),
    )
    return () => unsubscribe()
  }, [roomId])

  useEffect(() => {
    const campus = String(room?.campus || "").trim()
    if (!campus) {
      setOnlineStudents([])
      return
    }
    const studentsQuery = query(
      collection(db, "users"),
      where("campus", "==", campus),
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
      () => setOnlineStudents([]),
    )
    return () => unsubscribe()
  }, [room?.campus])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "consultation_rooms", roomId, "messages"),
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        setChatMessages(rows)
      },
      () => setChatMessages([]),
    )
    return () => unsubscribe()
  }, [roomId])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "consultation_rooms", roomId, "typing"),
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
      () => setTypingUsers([]),
    )
    return () => unsubscribe()
  }, [roomId, user?.uid])

  useEffect(() => {
    if (!roomId || !user?.uid || sidebarTab !== "chat" || chatMessages.length === 0) return
    const unseen = chatMessages.filter((msg) => msg.senderId && msg.senderId !== user.uid && !msg?.seenBy?.[user.uid])
    if (unseen.length === 0) return
    Promise.all(
      unseen.map((msg) =>
        updateDoc(doc(db, "consultation_rooms", roomId, "messages", msg.id), {
          [`seenBy.${user.uid}`]: true,
          [`seenAt.${user.uid}`]: new Date().toISOString(),
        }),
      ),
    ).catch(() => {})
  }, [roomId, chatMessages, sidebarTab, user?.uid])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [])

  const setTypingState = async (nextTyping) => {
    if (!roomId || !user?.uid) return
    if (typingStateRef.current === nextTyping) return
    typingStateRef.current = nextTyping
    try {
      await setDoc(
        doc(db, "consultation_rooms", roomId, "typing", user.uid),
        {
          userId: user.uid,
          userName: user?.fullName || user?.displayName || user?.email || "Campus Admin",
          userPhotoURL: user?.photoURL || null,
          userRole: "campus_admin",
          isTyping: Boolean(nextTyping),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
    } catch {}
  }

  const inviteOnlineStudent = async (student) => {
    if (!roomIsActive) {
      toast.error("Room is not active.")
      return
    }
    if (!student) return
    const studentId = student.uid || student.id
    if (!studentId) return
    try {
      setInvitingStudentId(studentId)
      const roomNameForEmail = room?.roomName || "Consultation Room"
      const durationMinutesForEmail = room?.durationMinutes ?? null
      const roomRef = doc(db, "consultation_rooms", roomId)
      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef)
        if (!roomSnap.exists()) throw new Error("Room not found.")
        const data = roomSnap.data() || {}
        if (String(data.status || "active") !== "active") throw new Error("Room is not active.")
        if (data.joinedStudentId && data.joinedStudentId !== studentId) throw new Error("May naka join na sa room.")
        tx.update(roomRef, {
          invitedStudentId: studentId,
          invitedStudentName: student.fullName || student.name || student.email || "Student",
          invitedStudentPhotoURL: student.photoURL || null,
          invitedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      })
      toast.success("Student invited.")

      // Best-effort email notification (do not block invite on email failures)
      try {
        const studentDoc = await getDoc(doc(db, "users", studentId))
        const studentData = studentDoc.exists() ? studentDoc.data() : {}
        const accountEmail = String(studentData.email || student?.email || "").trim()
        if (accountEmail) {
          await sendConsultationInviteEmail(
            accountEmail,
            student.fullName || student.name || studentData.email || accountEmail,
            roomNameForEmail,
            durationMinutesForEmail,
          )
        }
      } catch (emailError) {
        console.error("Failed to send consultation invite email:", emailError)
      }
    } catch (error) {
      toast.error(String(error?.message || "Failed to invite student."))
    } finally {
      setInvitingStudentId("")
    }
  }

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || !roomId) return
    try {
      setSendingChat(true)
      await addDoc(collection(db, "consultation_rooms", roomId, "messages"), {
        text,
        senderId: user?.uid || null,
        senderName: user?.fullName || user?.displayName || user?.email || "Campus Admin",
        senderPhotoURL: user?.photoURL || null,
        senderRole: "campus_admin",
        seenBy: user?.uid ? { [user.uid]: true } : {},
        seenAt: user?.uid ? { [user.uid]: new Date().toISOString() } : {},
        createdAt: new Date().toISOString(),
      })
      setChatInput("")
      await setTypingState(false)
    } catch {
      toast.error("Failed to send message.")
    } finally {
      setSendingChat(false)
    }
  }

  const reviewJoinRequest = async (requestUserId, decision) => {
    if (!requestUserId || (decision !== "approved" && decision !== "rejected")) return
    try {
      await updateDoc(doc(db, "consultation_rooms", roomId, "join_requests", requestUserId), {
        status: decision,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user?.uid || null,
        updatedAt: new Date().toISOString(),
      })

      // Best-effort email notification (do not block approve/reject on email failures)
      try {
        const [roomSnap, userSnap] = await Promise.all([
          getDoc(doc(db, "consultation_rooms", roomId)),
          getDoc(doc(db, "users", requestUserId)),
        ])

        const roomData = roomSnap.exists() ? roomSnap.data() : {}
        const userData = userSnap.exists() ? userSnap.data() : {}

        const roomNameForEmail = roomData.roomName || room?.roomName || "Consultation Room"
        const studentEmail = userData.email
        const studentName = userData.fullName || userData.displayName || userData.email || requestUserId

        if (studentEmail) {
          if (decision === "approved") {
            await sendConsultationJoinApprovedEmail(studentEmail, studentName, roomNameForEmail)
          } else {
            await sendConsultationJoinRejectedEmail(studentEmail, studentName, roomNameForEmail)
          }
        }
      } catch (emailError) {
        console.error("Failed to send join request email:", emailError)
      }

      toast.success(decision === "approved" ? "Join request approved." : "Join request rejected.")
    } catch (error) {
      console.error("Failed to review join request:", error)
      toast.error("Failed to update join request.")
    }
  }

  return (
    <CampusAdminLayoutWrapper>
      <div className="h-[100dvh] w-full bg-slate-950 p-1 md:p-2">
        <div className={`relative flex h-full min-h-0 ${isSidebarOpen ? "gap-2" : "gap-0"}`}>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
            <WebRtcRoom
              roomId={roomId}
              role="campus_admin"
              backHref="/campus-admin/consultations"
              showMeta={false}
              compact
            />
          </div>

          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`absolute top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900/95 text-slate-200 shadow-lg transition-all hover:bg-slate-800 ${
              isSidebarOpen
                ? "right-[320px] translate-x-1/2 lg:right-[340px]"
                : "right-2 translate-x-0"
            }`}
            aria-label={isSidebarOpen ? "Hide sidebar panels" : "Show sidebar panels"}
          >
            {isSidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>

          <aside
            className={`absolute inset-y-0 right-0 z-20 flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-slate-900/80 transition-all duration-300 lg:relative ${
              isSidebarOpen
                ? "w-[320px] translate-x-0 border border-slate-800 opacity-100 lg:w-[340px]"
                : "w-0 translate-x-full border-0 opacity-0 pointer-events-none lg:translate-x-0"
            }`}
          >
            <div className="flex items-center gap-1 border-b border-slate-800 p-2">
              <button
                onClick={() => setSidebarTab("invite")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                  sidebarTab === "invite" ? "bg-slate-700 text-slate-100" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Invite
              </button>
              <button
                onClick={() => setSidebarTab("chat")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                  sidebarTab === "chat" ? "bg-slate-700 text-slate-100" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
              </button>
            </div>

            {sidebarTab === "invite" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <div className="mb-2">
                  <input
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Search student name or email..."
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                {joinRequests.length > 0 ? (
                  <div className="mb-3 rounded-md border border-amber-400/40 bg-amber-500/10 p-2">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200">Join Requests</p>
                    {joinRequests.map((request) => (
                      <div key={request.id} className="mb-2 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-2">
                        <p className="truncate text-xs font-medium text-slate-100">{request.userName || "Student"}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => reviewJoinRequest(request.userId || request.id, "approved")}
                            className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/30"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => reviewJoinRequest(request.userId || request.id, "rejected")}
                            className="rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-1 text-[11px] text-rose-100 hover:bg-rose-500/30"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {!roomIsActive ? (
                  <p className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-400">
                    Room already ended. Invites are disabled.
                  </p>
                ) : null}
                {filteredOnlineStudents.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-slate-500">No online students.</p>
                ) : (
                  filteredOnlineStudents.map((student) => {
                    const studentId = student.uid || student.id
                    const label = student.fullName || student.name || student.email || "Student"
                    const photoURL = String(student.photoURL || "").trim()
                    const isInviting = invitingStudentId === studentId
                    return (
                      <div key={studentId} className="mb-2 flex items-center justify-between gap-2 rounded-md border border-slate-800 px-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {photoURL ? (
                            <img src={photoURL} alt={label} className="h-7 w-7 rounded-full border border-slate-700 object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[10px] font-semibold text-slate-200">
                              {getDisplayInitials(label)}
                            </div>
                          )}
                          <p className="truncate text-xs text-slate-200">{label}</p>
                        </div>
                        <button
                          onClick={() => inviteOnlineStudent(student)}
                          disabled={isInviting || !roomIsActive}
                          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-emerald-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isInviting ? "Inviting..." : "Invite"}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-slate-500">No messages yet.</p>
                  ) : (
                    chatMessages.map((msg) => {
                      const mine = msg.senderId === user?.uid
                      const displayName = msg.senderName || "User"
                      return (
                        <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${mine ? "bg-emerald-500/25 text-emerald-100" : "bg-slate-800 text-slate-100"}`}>
                            <p className="mb-0.5 text-[10px] text-slate-300">{displayName}</p>
                            <p className="break-words">{msg.text}</p>
                            {mine ? <p className="mt-1 text-[10px] text-slate-300/90">{hasSeenByOtherUser(msg) ? "Seen" : "Sent"}</p> : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="border-t border-slate-800 p-2">
                  {typingUsers.length > 0 ? (
                    <p className="mb-1 px-1 text-[11px] text-slate-400">{typingUsers[0].userName || "User"} is typing...</p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <input
                      value={chatInput}
                      onChange={(event) => {
                        const value = event.target.value
                        setChatInput(value)
                        if (value.trim()) {
                          setTypingState(true)
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                          typingTimeoutRef.current = setTimeout(() => setTypingState(false), 1200)
                        } else {
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                          setTypingState(false)
                        }
                      }}
                      onBlur={() => {
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
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
                      disabled={sendingChat || !chatInput.trim()}
                      className="h-9 rounded-md bg-emerald-500 px-3 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
