"use client"

import { use } from "react"
import WebRtcRoom from "@/components/consultations/webrtc-room"

export default function StudentConsultationRoomPage({ params }) {
  const { roomId } = use(params)

  return (
    <div className="h-[100dvh] w-full bg-slate-950 p-2 md:p-3">
      <div className="w-full">
        <WebRtcRoom roomId={roomId} role="student" backHref="/student/consultations" />
      </div>
    </div>
  )
}
