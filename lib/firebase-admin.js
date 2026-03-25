import { readFileSync } from "fs"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { isAbsolute, resolve } from "path"

function loadServiceAccountFromPath(relativeOrAbsolute) {
  const trimmed = String(relativeOrAbsolute || "").trim()
  if (!trimmed) return null
  const absPath = isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed)
  const raw = readFileSync(absPath, "utf8")
  return JSON.parse(raw)
}

function parseServiceAccount() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (inlineJson) {
    return JSON.parse(inlineJson)
  }

  const pathFromEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (pathFromEnv) {
    try {
      const fromFile = loadServiceAccountFromPath(pathFromEnv)
      if (fromFile && typeof fromFile === "object") {
        return fromFile
      }
    } catch (e) {
      throw new Error(
        `Could not read Firebase service account file at "${pathFromEnv}": ${e?.message || e}`,
      )
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Use one of: FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH (or GOOGLE_APPLICATION_CREDENTIALS) pointing to your downloaded .json file, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
    )
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  }
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const serviceAccount = parseServiceAccount()
  return initializeApp({
    credential: cert(serviceAccount),
  })
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}
