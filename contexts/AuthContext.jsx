"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, updateDoc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { ROLE_ADMIN, ROLE_CAMPUS_ADMIN, ROLE_STUDENT, isAdminEmail } from "@/lib/role-check"
import { getCampusAdminProfileByEmail, normalizeCampus } from "@/lib/campus-admin-config"

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

function normalizePhotoURL(value) {
  const url = String(value || "").trim()
  if (!url) return null
  return url.startsWith("http://") || url.startsWith("https://") ? url : null
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        const profile = userDoc.exists() ? userDoc.data() : {}
        const resolvedPhotoURL =
          normalizePhotoURL(user.photoURL) ||
          normalizePhotoURL(user.providerData?.[0]?.photoURL) ||
          normalizePhotoURL(profile?.photoURL) ||
          null
        const campusAdminProfile = getCampusAdminProfileByEmail(user.email)
        const normalizedRole = String(profile?.role || "").trim().toLowerCase()
        const appRole =
          normalizedRole ||
          (isAdminEmail(user.email)
            ? ROLE_ADMIN
            : campusAdminProfile
              ? ROLE_CAMPUS_ADMIN
              : ROLE_STUDENT)
        const resolvedCampus = normalizeCampus(profile?.campus || campusAdminProfile?.campus || null)

        setUser({
          ...user,
          photoURL: resolvedPhotoURL,
          appRole,
          role: appRole,
          campus: resolvedCampus,
          fullName: profile?.fullName || user.displayName || "",
        })

        const basePayload = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || profile?.displayName || "",
          fullName: profile?.fullName || user.displayName || "",
          photoURL: resolvedPhotoURL,
          role: appRole,
          ...(resolvedCampus ? { campus: resolvedCampus } : {}),
          status: "online",
          lastSeen: serverTimestamp(),
          updatedAt: new Date().toISOString(),
        }

        if (userDoc.exists()) {
          await updateDoc(userDocRef, {
            status: "online",
            lastSeen: serverTimestamp(),
            updatedAt: new Date().toISOString(),
            photoURL: resolvedPhotoURL,
            role: appRole,
            ...(resolvedCampus ? { campus: resolvedCampus } : {}),
          })
        } else {
          await setDoc(userDocRef, {
            ...basePayload,
            createdAt: new Date().toISOString(),
          }, { merge: true })
        }
      } catch (error) {
        console.error("Error updating user status:", error)
        const campusAdminProfile = getCampusAdminProfileByEmail(user.email)
        const fallbackRole =
          isAdminEmail(user.email) ? ROLE_ADMIN : campusAdminProfile ? ROLE_CAMPUS_ADMIN : ROLE_STUDENT
        setUser({
          ...user,
          photoURL: normalizePhotoURL(user.photoURL) || normalizePhotoURL(user.providerData?.[0]?.photoURL) || null,
          appRole: fallbackRole,
          role: fallbackRole,
          campus: normalizeCampus(campusAdminProfile?.campus || null),
        })
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      console.log("User info:", result.user)
      return result.user
    } catch (error) {
      console.error("Google login error:", error)
      throw error
    }
  }

  const signUpWithEmail = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      return result.user
    } catch (error) {
      console.error("Email signup error:", error)
      throw error
    }
  }

  const signInWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result.user
    } catch (error) {
      console.error("Email login error:", error)
      throw error
    }
  }

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return true
    } catch (error) {
      console.error("Password reset error:", error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Update user status to offline before signing out
      if (auth.currentUser?.uid) {
        try {
          const userDocRef = doc(db, "users", auth.currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            await updateDoc(userDocRef, {
              status: "offline",
              lastSeen: serverTimestamp(),
              updatedAt: new Date().toISOString(),
            })
          }
        } catch (error) {
          console.error("Error updating user status on logout:", error)
          // Continue with logout even if status update fails
        }
      }
      
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Sign out error:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

