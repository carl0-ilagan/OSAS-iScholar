"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { addDoc, collection, doc, getDoc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore"
import { Camera, CameraOff, Clock3, Mic, MicOff, Phone, PhoneOff, Video } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { normalizeCampus } from "@/lib/campus-admin-config"

const RTC_CONFIG = { iceServers: [] }

function nowIso() {
  return new Date().toISOString()
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

function getMediaConstraints(lowBandwidth) {
  return {
    video: lowBandwidth
      ? {
          width: { ideal: 640, max: 960 },
          height: { ideal: 360, max: 540 },
          frameRate: { ideal: 15, max: 24 },
        }
      : {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 24, max: 30 },
        },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  }
}

export default function WebRtcRoom({
  roomId,
  role = "student",
  backHref = "/",
  showHeader = true,
  showBackButton = true,
  showMeta = true,
  compact = false,
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState(null)
  const [error, setError] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [callLive, setCallLive] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [mediaError, setMediaError] = useState("")
  const [remainingLabel, setRemainingLabel] = useState("No timer")
  const [lowBandwidth, setLowBandwidth] = useState(false)
  const [joinRequestStatus, setJoinRequestStatus] = useState("none")

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const pcRef = useRef(null)
  const roomUnsubRef = useRef(null)
  const answerUnsubRef = useRef(null)
  const offerUnsubRef = useRef(null)
  const callStateUnsubRef = useRef(null)
  const networkChangeHandlerRef = useRef(null)
  const slowInternetTimerRef = useRef(null)
  const stateUpdateRef = useRef({ last: "", at: 0 })
  const autoStartAttemptedRef = useRef(false)

  const roomRef = useMemo(() => doc(db, "consultation_rooms", roomId), [roomId])
  const joinRequestRef = useMemo(() => doc(db, "consultation_rooms", roomId, "join_requests", user?.uid || "unknown"), [roomId, user?.uid])

  const cleanupPeer = ({ keepLocalMedia = false } = {}) => {
    if (answerUnsubRef.current) {
      answerUnsubRef.current()
      answerUnsubRef.current = null
    }
    if (offerUnsubRef.current) {
      offerUnsubRef.current()
      offerUnsubRef.current = null
    }
    if (callStateUnsubRef.current) {
      callStateUnsubRef.current()
      callStateUnsubRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current && !keepLocalMedia) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop())
      remoteStreamRef.current = null
    }
    if (localVideoRef.current && !keepLocalMedia) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    if (slowInternetTimerRef.current) {
      clearTimeout(slowInternetTimerRef.current)
      slowInternetTimerRef.current = null
    }
    if (typeof window !== "undefined" && networkChangeHandlerRef.current && navigator?.connection?.removeEventListener) {
      navigator.connection.removeEventListener("change", networkChangeHandlerRef.current)
      networkChangeHandlerRef.current = null
    }
    setCallLive(false)
  }

  const updateRoomCallState = async (nextState, { force = false } = {}) => {
    const normalized = String(nextState || "").trim().toLowerCase()
    if (!normalized) return
    const now = Date.now()
    if (!force && stateUpdateRef.current.last === normalized && now - stateUpdateRef.current.at < 1500) {
      return
    }
    stateUpdateRef.current = { last: normalized, at: now }
    try {
      await updateDoc(roomRef, {
        callState: normalized,
        updatedAt: nowIso(),
      })
    } catch (stateError) {
      console.error("Error updating call state:", stateError)
    }
  }

  const setupLocalMedia = async (lowBandwidthMode = lowBandwidth) => {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(lowBandwidthMode))
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    localStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }
    setCameraOn(true)
    setMicOn(true)
    return stream
  }

  const ensureLocalMedia = async () => {
    const existingStream = localStreamRef.current
    if (existingStream) {
      const hasLiveTrack = existingStream.getTracks().some((track) => track.readyState === "live")
      if (hasLiveTrack) {
        if (localVideoRef.current && localVideoRef.current.srcObject !== existingStream) {
          localVideoRef.current.srcObject = existingStream
        }
        setMediaError("")
        return existingStream
      }
    }
    try {
      setMediaError("")
      return await setupLocalMedia()
    } catch (mediaSetupError) {
      console.error("Error preparing camera/mic:", mediaSetupError)
      setMediaError("Camera/microphone permission is required for consultation.")
      throw mediaSetupError
    }
  }

  const buildPeerConnection = async (activeSessionId, localStream) => {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    pcRef.current = pc

    const remoteStream = new MediaStream()
    remoteStreamRef.current = remoteStream
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track))
    }

    const markReconnecting = () => {
      setCallLive(false)
      updateRoomCallState("reconnecting")
      if (slowInternetTimerRef.current) {
        clearTimeout(slowInternetTimerRef.current)
      }
      slowInternetTimerRef.current = setTimeout(() => {
        updateRoomCallState("slow_internet")
      }, 4500)
    }

    const clearSlowInternetTimer = () => {
      if (slowInternetTimerRef.current) {
        clearTimeout(slowInternetTimerRef.current)
        slowInternetTimerRef.current = null
      }
    }

    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return
      const state = String(pc.connectionState || "").toLowerCase()
      if (state === "connected") {
        clearSlowInternetTimer()
        setCallLive(true)
        updateRoomCallState("in_call")
        return
      }
      if (state === "connecting" || state === "disconnected") {
        markReconnecting()
        return
      }
      if (state === "failed") {
        clearSlowInternetTimer()
        setCallLive(false)
        updateRoomCallState("slow_internet")
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pcRef.current !== pc) return
      const state = String(pc.iceConnectionState || "").toLowerCase()
      if (state === "connected" || state === "completed") {
        clearSlowInternetTimer()
        setCallLive(true)
        updateRoomCallState("in_call")
        return
      }
      if (state === "disconnected") {
        markReconnecting()
        return
      }
      if (state === "failed") {
        clearSlowInternetTimer()
        setCallLive(false)
        updateRoomCallState("slow_internet")
      }
    }

    if (typeof window !== "undefined" && navigator?.connection?.addEventListener) {
      networkChangeHandlerRef.current = () => {
        if (pcRef.current !== pc) return
        const downlink = Number(navigator.connection?.downlink || 0)
        const effectiveType = String(navigator.connection?.effectiveType || "").toLowerCase()
        if (downlink > 0 && downlink < 1) {
          updateRoomCallState("slow_internet")
          return
        }
        if (effectiveType.includes("2g")) {
          updateRoomCallState("slow_internet")
          return
        }
        if (String(pc.connectionState || "").toLowerCase() === "connected") {
          updateRoomCallState("in_call")
        }
      }
      navigator.connection.addEventListener("change", networkChangeHandlerRef.current)
    }

    const targetCollection = role === "campus_admin" ? "offerCandidates" : "answerCandidates"
    pc.onicecandidate = async (event) => {
      if (!event.candidate) return
      try {
        await addDoc(collection(roomRef, targetCollection), {
          sessionId: activeSessionId,
          candidate: event.candidate.toJSON(),
          createdAt: nowIso(),
        })
      } catch (candidateError) {
        console.error("Error saving ICE candidate:", candidateError)
      }
    }

    return pc
  }

  useEffect(() => {
    if (!roomId || !user?.uid) return

    roomUnsubRef.current = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setRoom(null)
          setError("Room not found.")
          setLoading(false)
          return
        }

        const data = { id: snapshot.id, ...snapshot.data() }
        const userCampus = normalizeCampus(user?.campus || null)
        const roomCampus = normalizeCampus(data.campus || null)

        if (role === "campus_admin" && userCampus && roomCampus && userCampus !== roomCampus) {
          setError("This room belongs to another campus.")
          setLoading(false)
          return
        }
        if (role === "student" && userCampus && roomCampus && userCampus !== roomCampus) {
          setError("This room belongs to another campus.")
          setLoading(false)
          return
        }

        setRoom(data)
        setError("")
        setLoading(false)
      },
      (err) => {
        console.error("Error subscribing room:", err)
        setError("Failed to load room.")
        setLoading(false)
      },
    )

    return () => {
      if (roomUnsubRef.current) {
        roomUnsubRef.current()
        roomUnsubRef.current = null
      }
      cleanupPeer()
    }
  }, [roomId, roomRef, role, user?.campus, user?.uid])

  useEffect(() => {
    if (!loading && !error && room) {
      ensureLocalMedia().catch(() => {})
    }
  }, [loading, error, room])

  useEffect(() => {
    if (!room?.expiresAt) {
      setRemainingLabel("No timer")
      return
    }
    const tick = () => setRemainingLabel(formatRemainingTime(room.expiresAt))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [room?.expiresAt])

  useEffect(() => {
    if (role !== "student" || !user?.uid || !roomId) {
      setJoinRequestStatus("none")
      return
    }
    const unsubscribe = onSnapshot(
      joinRequestRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setJoinRequestStatus("none")
          return
        }
        setJoinRequestStatus(String(snapshot.data()?.status || "none"))
      },
      () => setJoinRequestStatus("none"),
    )
    return () => unsubscribe()
  }, [role, user?.uid, roomId, joinRequestRef])

  const claimSeatForStudent = async () => {
    if (role !== "student") return true
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists()) {
          throw new Error("Room not found.")
        }
        const data = snap.data()
        if (String(data.status || "active") !== "active") {
          throw new Error("Room is not active.")
        }
        if (data.expiresAt && new Date(data.expiresAt).getTime() <= Date.now()) {
          throw new Error("Room already expired.")
        }
        if (data.invitedStudentId && data.invitedStudentId !== user.uid) {
          throw new Error("This room is reserved for another invited student.")
        }
        const invitedDirectly = data.invitedStudentId && data.invitedStudentId === user.uid
        if (!invitedDirectly) {
          const joinRequestSnap = await tx.get(doc(db, "consultation_rooms", roomId, "join_requests", user.uid))
          const requestStatus = joinRequestSnap.exists() ? String(joinRequestSnap.data()?.status || "") : ""
          if (requestStatus !== "approved") {
            throw new Error("Waiting for admin approval.")
          }
        }
        if (data.joinedStudentId && data.joinedStudentId !== user.uid) {
          throw new Error("This room is already joined by another student.")
        }
        tx.update(roomRef, {
          joinedStudentId: user.uid,
          joinedStudentName: user.fullName || user.displayName || user.email || "Student",
          updatedAt: nowIso(),
        })
      })
      return true
    } catch (seatError) {
      toast.error(seatError.message || "Unable to join this room.")
      return false
    }
  }

  const startCall = async () => {
    if (!room) return
    if (room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now()) {
      toast.error("Room duration already expired.")
      return
    }
    try {
      setConnecting(true)
      cleanupPeer({ keepLocalMedia: true })

      const activeSessionId = `${Date.now()}_${user.uid}`
      const stream = await ensureLocalMedia()
      const pc = await buildPeerConnection(activeSessionId, stream)

      const answerCandidatesQuery = query(
        collection(roomRef, "answerCandidates"),
        where("sessionId", "==", activeSessionId),
      )
      answerUnsubRef.current = onSnapshot(answerCandidatesQuery, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== "added") return
          const payload = change.doc.data()
          if (payload?.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } catch (candidateError) {
              console.error("Error applying answer candidate:", candidateError)
            }
          }
        })
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await updateDoc(roomRef, {
        offer: { type: offer.type, sdp: offer.sdp },
        answer: null,
        activeSessionId,
        callState: "calling",
        callStartedBy: user.uid,
        updatedAt: nowIso(),
      })

      const roomSnapshot = await getDoc(roomRef)
      const latestRoom = roomSnapshot.data()
      if (latestRoom?.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(latestRoom.answer))
        setCallLive(true)
        updateRoomCallState("in_call")
      }

      callStateUnsubRef.current = onSnapshot(roomRef, async (snap) => {
        const data = snap.data()
        if (!data || !data.answer || data.activeSessionId !== activeSessionId || pc.currentRemoteDescription) return
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
          setCallLive(true)
          updateRoomCallState("in_call")
        } catch (remoteError) {
          console.error("Error setting remote answer:", remoteError)
        }
      })
    } catch (startError) {
      console.error("Error starting call:", startError)
      toast.error("Unable to start call. Check camera and microphone permissions.")
      cleanupPeer()
    } finally {
      setConnecting(false)
    }
  }

  useEffect(() => {
    if (!roomId) return
    autoStartAttemptedRef.current = false
  }, [roomId])

  useEffect(() => {
    if (role !== "campus_admin") return
    if (loading || error || connecting || !room) return
    if (autoStartAttemptedRef.current) return
    if (String(room.status || "active") !== "active") return
    if (room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now()) return
    if (room.offer && room.activeSessionId) return

    autoStartAttemptedRef.current = true
    startCall()
  }, [role, loading, error, connecting, room, room?.offer, room?.activeSessionId])

  const joinCall = async () => {
    if (!room?.offer || !room?.activeSessionId) {
      toast.error("No active call offer yet.")
      return
    }
    if (room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now()) {
      toast.error("Room duration already expired.")
      return
    }
    const seatOk = await claimSeatForStudent()
    if (!seatOk) return
    try {
      setConnecting(true)
      cleanupPeer({ keepLocalMedia: true })

      const activeSessionId = room.activeSessionId
      const stream = await ensureLocalMedia()
      const pc = await buildPeerConnection(activeSessionId, stream)

      const offerCandidatesQuery = query(
        collection(roomRef, "offerCandidates"),
        where("sessionId", "==", activeSessionId),
      )
      offerUnsubRef.current = onSnapshot(offerCandidatesQuery, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== "added") return
          const payload = change.doc.data()
          if (payload?.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } catch (candidateError) {
              console.error("Error applying offer candidate:", candidateError)
            }
          }
        })
      })

      await pc.setRemoteDescription(new RTCSessionDescription(room.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await updateDoc(roomRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        callState: "in_call",
        answeredBy: user.uid,
        updatedAt: nowIso(),
      })
      setCallLive(true)
    } catch (joinError) {
      console.error("Error joining call:", joinError)
      toast.error("Unable to join call. Check camera and microphone permissions.")
      cleanupPeer()
    } finally {
      setConnecting(false)
    }
  }

  const leaveCall = async () => {
    cleanupPeer({ keepLocalMedia: true })
    if (!room) return
    try {
      if (role === "campus_admin") {
        await updateDoc(roomRef, {
          status: "ended",
          callState: "ended",
          endedAt: nowIso(),
          updatedAt: nowIso(),
        })
      } else {
        const nextCallState = room?.offer && room?.activeSessionId ? "calling" : "waiting"
        await updateDoc(roomRef, {
          callState: nextCallState,
          answer: null,
          joinedStudentId: null,
          joinedStudentName: null,
          leftByStudentAt: nowIso(),
          updatedAt: nowIso(),
        })
      }
    } catch (leaveError) {
      console.error("Error leaving call:", leaveError)
    }
  }

  const toggleMic = () => {
    const stream = localStreamRef.current
    if (!stream) return
    const next = !micOn
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next
    })
    setMicOn(next)
  }

  const toggleCamera = async () => {
    const stream = localStreamRef.current
    if (!stream) {
      try {
        await ensureLocalMedia()
      } catch {
        return
      }
    }
    const liveStream = localStreamRef.current
    if (!liveStream) return
    const next = !cameraOn
    liveStream.getVideoTracks().forEach((track) => {
      track.enabled = next
    })
    setCameraOn(next)
  }

  const toggleBandwidthMode = async () => {
    const next = !lowBandwidth
    setLowBandwidth(next)
    if (!localStreamRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(next))
      const previousStream = localStreamRef.current
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      if (pcRef.current) {
        const nextVideoTrack = stream.getVideoTracks()[0] || null
        const nextAudioTrack = stream.getAudioTracks()[0] || null
        const replaceTasks = pcRef.current.getSenders().map(async (sender) => {
          if (sender.track?.kind === "video") {
            await sender.replaceTrack(nextVideoTrack)
          }
          if (sender.track?.kind === "audio") {
            await sender.replaceTrack(nextAudioTrack)
          }
        })
        await Promise.all(replaceTasks)
      }
      previousStream?.getTracks().forEach((track) => track.stop())
      setCameraOn(Boolean(stream.getVideoTracks()[0]?.enabled))
      setMicOn(Boolean(stream.getAudioTracks()[0]?.enabled))
      toast.success(next ? "Low bandwidth mode enabled." : "HD mode enabled.")
    } catch (modeError) {
      console.error("Failed to switch bandwidth mode:", modeError)
      setLowBandwidth(!next)
      toast.error("Failed to switch bandwidth mode.")
    }
  }

  const isExpired = room?.expiresAt ? new Date(room.expiresAt).getTime() <= Date.now() : false
  const isInvitedStudent = role === "student" && room?.invitedStudentId && room.invitedStudentId === user?.uid
  const requiresApproval = role === "student" && room && !isInvitedStudent
  const hasApproval = isInvitedStudent || joinRequestStatus === "approved"
  const isPendingApproval = requiresApproval && joinRequestStatus === "pending"
  const isRejectedApproval = requiresApproval && joinRequestStatus === "rejected"
  const roomTakenByAnother =
    role === "student" &&
    room?.joinedStudentId &&
    room.joinedStudentId !== user?.uid &&
    String(room?.status || "active") === "active"

  const canJoin =
    role === "student" &&
    room &&
    String(room.status || "active") === "active" &&
    room.offer &&
    room.activeSessionId &&
    !isExpired &&
    hasApproval &&
    !roomTakenByAnother
  const submitJoinRequest = async () => {
    if (role !== "student" || !user?.uid || !roomId || isInvitedStudent) return
    try {
      await setDoc(
        joinRequestRef,
        {
          userId: user.uid,
          userName: user?.fullName || user?.displayName || user?.email || "Student",
          userPhotoURL: user?.photoURL || null,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      setJoinRequestStatus("pending")
      toast.success("Join request sent. Waiting for admin approval.")
    } catch (requestError) {
      console.error("Failed to submit join request:", requestError)
      toast.error("Failed to send join request.")
    }
  }
  const rawCallState = String(room?.callState || "").toLowerCase()
  const isConnectedState = callLive || rawCallState === "in_call"
  const stateLabelMap = {
    waiting: "Waiting",
    calling: "Calling",
    in_call: "Connected",
    reconnecting: "Reconnecting",
    slow_internet: "Slow internet",
    ended: "Ended",
  }
  const statusLabel = stateLabelMap[rawCallState] || (isConnectedState ? "Connected" : "Not connected")
  const canToggleLocalMedia = Boolean(localStreamRef.current)

  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading room...</div>
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        <Link href={backHref} className="inline-flex rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
          Back
        </Link>
      </div>
    )
  }

  if (String(room?.status || "active") === "ended") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200">
          This consultation has ended and is now available in history only.
        </div>
        {showBackButton ? (
          <Link href={backHref} className="inline-flex rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
            Back
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className={compact ? "h-full" : "space-y-4"}>
      <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-slate-950 text-slate-100 shadow-2xl ${compact ? "border-0 shadow-none" : ""}`}>
        {showHeader ? (
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/90 bg-slate-900/90 px-4 py-3">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold">
                <Video className="h-4 w-4 text-emerald-400" />
                {role === "campus_admin" ? "Campus Admin Consultation Room" : "Student Consultation Room"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {statusLabel} - {room?.roomName || "Consultation Room"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Remaining</p>
              <p className="text-sm font-semibold text-slate-100">{remainingLabel}</p>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 px-4 pb-4 pt-3">
          <div className="relative h-full overflow-hidden rounded-xl border border-slate-800 bg-black">
            <div className="absolute left-3 top-3 z-20 rounded-md bg-black/60 px-2 py-1 text-xs text-slate-200">
              {role === "campus_admin" ? "Student View" : "Room Creator View"}
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full min-h-[260px] w-full bg-black object-cover [transform:scaleX(-1)]"
            />

            <div className="absolute bottom-3 right-3 z-20 w-[120px] overflow-hidden rounded-lg border border-slate-700 bg-black shadow-xl sm:bottom-4 sm:right-4 sm:w-[150px] md:w-[170px]">
              <p className="border-b border-slate-700 bg-black/70 px-2 py-1 text-[10px] text-slate-300">You</p>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-[82px] w-full bg-black object-cover [transform:scaleX(-1)] sm:h-[95px] md:h-[110px]"
              />
            </div>

            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center">
              <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-black/70 px-3 py-2 backdrop-blur">
                <button
                  onClick={toggleMic}
                  disabled={!canToggleLocalMedia}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={micOn ? "Mute" : "Unmute"}
                >
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={toggleCamera}
                  disabled={!canToggleLocalMedia}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={cameraOn ? "Turn camera off" : "Turn camera on"}
                >
                  {cameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={toggleBandwidthMode}
                  disabled={!canToggleLocalMedia}
                  className="inline-flex h-9 items-center rounded-full border border-slate-600 bg-slate-800 px-3 text-[11px] font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={lowBandwidth ? "Switch to HD mode" : "Switch to low bandwidth mode"}
                >
                  {lowBandwidth ? "Low" : "HD"}
                </button>

                {role === "student" && requiresApproval && !hasApproval ? (
                  <button
                    onClick={submitJoinRequest}
                    disabled={connecting || isPendingApproval}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-400 px-3 text-xs font-semibold text-amber-950 hover:bg-amber-300 disabled:opacity-50"
                  >
                    {isPendingApproval ? "Waiting Approval" : isRejectedApproval ? "Request Again" : "Request to Join"}
                  </button>
                ) : null}

                {canJoin && (
                  <button
                    onClick={joinCall}
                    disabled={connecting}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-500 px-3 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {connecting ? "Joining..." : "Join"}
                  </button>
                )}

                {role === "campus_admin" ? (
                  <button
                    onClick={leaveCall}
                    disabled={connecting}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    <PhoneOff className="h-3.5 w-3.5" />
                    End Room
                  </button>
                ) : (
                  <button
                    onClick={leaveCall}
                    disabled={connecting}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    <PhoneOff className="h-3.5 w-3.5" />
                    Leave
                  </button>
                )}
              </div>
            </div>

            {role === "student" && requiresApproval && isPendingApproval ? (
              <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-100/95 px-3 py-1 text-xs font-medium text-amber-800">
                Waiting for campus admin approval...
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-800/90 bg-slate-900/60 px-4 py-2 text-xs text-slate-300">
          {rawCallState === "reconnecting"
            ? "Reconnecting..."
            : rawCallState === "slow_internet"
              ? "Slow internet detected."
              : room?.joinedStudentName
                ? `Student joined: ${room.joinedStudentName}`
                : "Waiting for student to join"}
        </div>
      </div>

      {showMeta ? (
        <div className="flex flex-wrap items-center gap-2">
        {role === "student" && !canJoin && String(room?.status || "active") === "active" && !isExpired && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            Waiting for room creator to start the call...
          </div>
        )}
        {roomTakenByAnother && (
          <div className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs text-amber-700">
            This room is already occupied by another student.
          </div>
        )}
        {rawCallState === "reconnecting" ? (
          <div className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs text-amber-700">
            Reconnecting...
          </div>
        ) : null}
        {rawCallState === "slow_internet" ? (
          <div className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs text-amber-700">
            Slow internet detected. Connection may lag.
          </div>
        ) : null}
        {mediaError ? (
          <div className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs text-amber-700">
            {mediaError}
          </div>
        ) : null}
        {role === "student" ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            Student POV: wait for creator to start, then join.
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            Room Creator POV: start call first so student can join.
          </div>
        )}
        {showBackButton ? (
          <Link href={backHref} className="inline-flex rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
            Back
          </Link>
        ) : null}
        </div>
      ) : null}
    </div>
  )
}
