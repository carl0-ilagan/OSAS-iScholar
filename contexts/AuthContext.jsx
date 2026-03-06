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
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setLoading(false)
      
      // Update user status to online when logged in
      if (user?.uid) {
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            await updateDoc(userDocRef, {
              status: "online",
              lastSeen: serverTimestamp(),
              updatedAt: new Date().toISOString(),
            })
          }
        } catch (error) {
          console.error("Error updating user status:", error)
        }
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

