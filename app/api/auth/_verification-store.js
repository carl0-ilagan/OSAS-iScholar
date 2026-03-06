import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

const otpStore = globalThis.__ischolarOtpStore || new Map()
const verificationTicketStore = globalThis.__ischolarVerificationTicketStore || new Map()

if (!globalThis.__ischolarOtpStore) globalThis.__ischolarOtpStore = otpStore
if (!globalThis.__ischolarVerificationTicketStore) {
  globalThis.__ischolarVerificationTicketStore = verificationTicketStore
}

const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 45 * 1000
const OTP_MAX_ATTEMPTS = 5
const OTP_MAX_SENDS_PER_WINDOW = 5
const OTP_SEND_WINDOW_MS = 30 * 60 * 1000
const TICKET_TTL_MS = 20 * 60 * 1000

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

function hashCode(code) {
  return createHash("sha256").update(String(code)).digest("hex")
}

function nowMs() {
  return Date.now()
}

function cleanupExpiredEntries() {
  const now = nowMs()
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt <= now) otpStore.delete(email)
  }
  for (const [ticket, record] of verificationTicketStore.entries()) {
    if (record.expiresAt <= now || record.consumed) verificationTicketStore.delete(ticket)
  }
}

export function saveOtp(email, code) {
  cleanupExpiredEntries()

  const key = normalizeEmail(email)
  const now = nowMs()
  const existing = otpStore.get(key)

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000)
    return { ok: false, reason: "cooldown", retryAfterSec }
  }

  const sendHistory = (existing?.sendHistory || []).filter((ts) => now - ts <= OTP_SEND_WINDOW_MS)
  if (sendHistory.length >= OTP_MAX_SENDS_PER_WINDOW) {
    return { ok: false, reason: "rate_limited" }
  }

  sendHistory.push(now)
  otpStore.set(key, {
    email: key,
    codeHash: hashCode(code),
    expiresAt: now + OTP_TTL_MS,
    remainingAttempts: OTP_MAX_ATTEMPTS,
    lastSentAt: now,
    sendHistory,
  })

  return { ok: true }
}

export function verifyOtp(email, code) {
  cleanupExpiredEntries()

  const key = normalizeEmail(email)
  const record = otpStore.get(key)
  if (!record) return { valid: false, reason: "not_found" }

  if (nowMs() > record.expiresAt) {
    otpStore.delete(key)
    return { valid: false, reason: "expired" }
  }

  if (record.remainingAttempts <= 0) {
    otpStore.delete(key)
    return { valid: false, reason: "too_many_attempts" }
  }

  const providedHash = hashCode(code)
  const isMatch = timingSafeEqual(Buffer.from(providedHash), Buffer.from(record.codeHash))
  if (!isMatch) {
    record.remainingAttempts -= 1
    otpStore.set(key, record)
    return {
      valid: false,
      reason: record.remainingAttempts <= 0 ? "too_many_attempts" : "invalid",
      attemptsLeft: Math.max(0, record.remainingAttempts),
    }
  }

  otpStore.delete(key)
  const verificationTicket = randomBytes(24).toString("hex")
  verificationTicketStore.set(verificationTicket, {
    email: key,
    expiresAt: nowMs() + TICKET_TTL_MS,
    consumed: false,
  })

  return { valid: true, verificationTicket }
}

export function consumeVerificationTicket(email, ticket) {
  cleanupExpiredEntries()

  const key = normalizeEmail(email)
  const ticketRecord = verificationTicketStore.get(String(ticket || ""))
  if (!ticketRecord) return { valid: false, reason: "invalid_ticket" }
  if (ticketRecord.consumed) return { valid: false, reason: "already_used" }
  if (ticketRecord.expiresAt <= nowMs()) {
    verificationTicketStore.delete(String(ticket))
    return { valid: false, reason: "expired_ticket" }
  }
  if (ticketRecord.email !== key) return { valid: false, reason: "email_mismatch" }

  ticketRecord.consumed = true
  verificationTicketStore.set(String(ticket), ticketRecord)
  return { valid: true }
}
