/** sessionStorage — cleared on logout so the strip can show again on the next login. */
export const PROFILE_SETUP_REMINDER_SESSION_KEY = "studentProfileReminderDismissed"

export function clearProfileSetupReminderSessionFlag() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(PROFILE_SETUP_REMINDER_SESSION_KEY)
  } catch {
    /* ignore */
  }
}
