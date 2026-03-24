/**
 * Fills missing profile photo from Firebase Auth (via server API) when Firestore has no photoURL.
 */
export async function resolvePhotoUrlFromAuth(uid, existingPhotoURL) {
  const trimmed = String(uid || "").trim()
  if (!trimmed || existingPhotoURL) return existingPhotoURL || null
  try {
    const res = await fetch(`/api/public-user-photo?uid=${encodeURIComponent(trimmed)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.photoURL || null
  } catch {
    return null
  }
}
