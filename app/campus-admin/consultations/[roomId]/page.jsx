"use client"

import { use } from "react"
import CampusAdminLayoutWrapper from "../../campus-admin-layout"
import WebRtcRoom from "@/components/consultations/webrtc-room"

export default function CampusAdminConsultationRoomPage({ params }) {
  const { roomId } = use(params)

  return (
    <CampusAdminLayoutWrapper>
      <div className="h-full w-full bg-slate-950 p-2 md:p-3">
        <div className="w-full">
          <WebRtcRoom roomId={roomId} role="campus_admin" backHref="/campus-admin/consultations" />
        </div>
      </div>
    </CampusAdminLayoutWrapper>
  )
}
