// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCoRgYOaHaCSy84M5S6pbXSoSBJrF5Zic0",
  authDomain: "osas-ischolar-cac4f.firebaseapp.com",
  projectId: "osas-ischolar-cac4f",
  storageBucket: "osas-ischolar-cac4f.firebasestorage.app",
  messagingSenderId: "164898332838",
  appId: "1:164898332838:web:d9a93195fc82851b6b5467",
  measurementId: "G-QH29BW3G4J"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics (only in browser)
let analytics = null
if (typeof window !== "undefined") {
  analytics = getAnalytics(app)
}

// Initialize Auth
export const auth = getAuth(app)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Storage
export const storage = getStorage(app)

export { app, analytics }
export default app

