"use client"

import { useState, useEffect } from "react"
import { resolvePhotoUrlFromAuth } from "@/lib/resolve-user-photo-url"

/**
 * Student testimonial avatar: Auth + Firestore photo, no-referrer for Google URLs, one Auth retry on error.
 * Pass imgClassName / fallbackClassName per layout (landing vs dashboard cards).
 */
export function TestimonialAvatar({
  name,
  photoURL: initialPhoto,
  userId,
  imgClassName = "h-12 w-12 shrink-0 rounded-full object-cover",
  fallbackClassName = "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm text-muted-foreground",
  fallback,
}) {
  const [src, setSrc] = useState(initialPhoto || null)
  const [authRetryDone, setAuthRetryDone] = useState(false)

  useEffect(() => {
    setSrc(initialPhoto || null)
    setAuthRetryDone(false)
  }, [initialPhoto, userId])

  const handleError = async () => {
    if (userId && !authRetryDone) {
      setAuthRetryDone(true)
      const url = await resolvePhotoUrlFromAuth(userId, null)
      if (url && url !== src) {
        setSrc(url)
        return
      }
    }
    setSrc(null)
  }

  return (
    <>
      {src ? (
        <img
          src={src}
          alt={name || ""}
          referrerPolicy="no-referrer"
          className={imgClassName}
          onError={handleError}
        />
      ) : null}
      <div className={`${fallbackClassName} ${src ? "hidden" : "flex"}`}>
        {fallback != null ? fallback : (name?.[0]?.toUpperCase() || "A")}
      </div>
    </>
  )
}
