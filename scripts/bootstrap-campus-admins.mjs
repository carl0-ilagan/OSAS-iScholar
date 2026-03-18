const firebaseConfig = {
  apiKey: "AIzaSyCoRgYOaHaCSy84M5S6pbXSoSBJrF5Zic0",
  projectId: "osas-ischolar-cac4f",
}

const apiKey = firebaseConfig.apiKey
const projectId = firebaseConfig.projectId
const accounts = [
  {
    email: "main.campus.admin@minsu.edu.ph",
    password: "MainCampus@2026!",
    campus: "Main Campus",
    label: "Main Campus Admin",
  },
  {
    email: "bongabong.campus.admin@minsu.edu.ph",
    password: "Bongabong@2026!",
    campus: "Bongabong Campus",
    label: "Bongabong Campus Admin",
  },
  {
    email: "calapan.campus.admin@minsu.edu.ph",
    password: "CalapanCity@2026!",
    campus: "Calapan City Campus",
    label: "Calapan Campus Admin",
  },
]

async function createOrGetUid(email, password) {
  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  )
  const signUpPayload = await signUpRes.json()

  if (signUpRes.ok && signUpPayload.localId) {
    return { uid: signUpPayload.localId, idToken: signUpPayload.idToken, created: true }
  }

  if (signUpPayload?.error?.message === "EMAIL_EXISTS") {
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    )
    const signInPayload = await signInRes.json()
    if (signInRes.ok && signInPayload.localId) {
      return { uid: signInPayload.localId, idToken: signInPayload.idToken, created: false }
    }
    throw new Error(
      `Email exists but password mismatch for ${email}. Reset password manually before rerun.`,
    )
  }

  throw new Error(`Failed creating ${email}: ${signUpPayload?.error?.message || "Unknown error"}`)
}

function firestoreString(value) {
  return { stringValue: String(value ?? "") }
}

async function upsertUserDocument({ uid, idToken, email, label, campus }) {
  const documentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`
  const payload = {
    fields: {
      uid: firestoreString(uid),
      email: firestoreString(email),
      displayName: firestoreString(label),
      fullName: firestoreString(label),
      role: firestoreString("campus_admin"),
      campus: firestoreString(campus),
      status: firestoreString("offline"),
      updatedAt: firestoreString(new Date().toISOString()),
      createdAt: firestoreString(new Date().toISOString()),
    },
  }

  const response = await fetch(documentUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    throw new Error(
      `Failed writing Firestore user doc for ${email}: ${errorPayload?.error?.message || response.statusText}`,
    )
  }
}

async function run() {
  console.log("Bootstrapping campus admin accounts...\n")

  for (const account of accounts) {
    const { uid, idToken, created } = await createOrGetUid(account.email, account.password)
    await upsertUserDocument({
      uid,
      idToken,
      email: account.email,
      label: account.label,
      campus: account.campus,
    })

    console.log(`${created ? "CREATED" : "UPDATED"}: ${account.email}`)
  }

  console.log("\nDone.\nCredentials:")
  for (const account of accounts) {
    console.log(`- ${account.email} | ${account.password}`)
  }
}

run().catch((error) => {
  console.error("Bootstrap failed:", error.message)
  process.exit(1)
})
