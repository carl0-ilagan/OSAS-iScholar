"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  OAuthProvider,
  GoogleAuthProvider
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"

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
          } else {
            // Document doesn't exist, create it with status
            await setDoc(userDocRef, {
              status: "online",
              lastSeen: serverTimestamp(),
              updatedAt: new Date().toISOString(),
            }, { merge: true })
          }
        } catch (error) {
          console.error("Error updating user status:", error)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const signInWithMicrosoft = async () => {
    try {
      const provider = new OAuthProvider("microsoft.com")
      // For single-tenant apps, we need to use tenant-specific endpoint
      // Get your Tenant ID from Azure Portal > Azure Active Directory > Overview
      // Replace "YOUR-TENANT-ID" with your actual tenant ID (GUID format)
      // Example: "12345678-1234-1234-1234-123456789012"
      const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || null
      
      if (tenantId) {
        provider.setCustomParameters({
          tenant: tenantId, // Use tenant ID for single-tenant apps
          domain_hint: "minsu.edu.ph",
        })
      } else {
        // Fallback: use domain hint only
        provider.setCustomParameters({
          domain_hint: "minsu.edu.ph",
        })
      }
      
      const result = await signInWithPopup(auth, provider)
      console.log("User info:", result.user)
      return result.user
    } catch (error) {
      console.error("Login error:", error)
      // Provide more helpful error message
      if (error.code === "auth/invalid-credential" || error.message?.includes("AADSTS50194")) {
        const enhancedError = new Error(
          "Microsoft authentication failed. For single-tenant apps, you need to configure the Tenant ID. " +
          "Go to Azure Portal > Azure Active Directory > Overview to get your Tenant ID, " +
          "then add it as NEXT_PUBLIC_AZURE_TENANT_ID in your .env.local file."
        )
        enhancedError.code = error.code
        throw enhancedError
      }
      throw error
    }
  }

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
    signInWithMicrosoft,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

