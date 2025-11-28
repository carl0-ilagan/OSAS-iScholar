"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/contexts/AuthContext"
import StudentPageBanner from "@/components/student/page-banner"
import { User, Upload, Save, Mail, Loader2, CheckCircle, XCircle, GraduationCap, MapPin, Calendar, Hash, X } from "lucide-react"
import { toast } from "sonner"

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState({
    fullName: "",
    displayName: "",
    studentNumber: "",
    course: "",
    yearLevel: "",
    campus: "",
    email: "",
    secondaryEmail: "",
  })
  const [profilePicture, setProfilePicture] = useState(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState(null)
  const [userName, setUserName] = useState("")
  const [userStatus, setUserStatus] = useState("offline")

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData({
            fullName: data.fullName || "",
            displayName: data.displayName || "",
            studentNumber: data.studentNumber || "",
            course: data.course || "",
            yearLevel: data.yearLevel || "",
            campus: data.campus || "",
            email: user.email || "",
            secondaryEmail: data.secondaryEmail || "",
          })
          setUserName(data.fullName || data.displayName || "Student")
          setProfilePicturePreview(data.photoURL || user.photoURL || null)
          setUserStatus(data.status || "offline")
        } else {
          setUserName("Student")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Failed to load profile data", {
          icon: <XCircle className="w-4 h-4" />,
          duration: 3000,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
    
    // Real-time status listener
    if (user?.uid) {
      const userDocRef = doc(db, "users", user.uid)
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          setUserStatus(data.status || "offline")
        }
      })
      
      return () => unsubscribe()
    }
  }, [user])

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file", {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB", {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      })
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setProfilePicture(base64)
      setProfilePicturePreview(base64)
      toast.success("Profile picture selected", {
        icon: <CheckCircle className="w-4 h-4" />,
        duration: 2000,
      })
    } catch (error) {
      console.error("Error processing image:", error)
      toast.error("Failed to process image", {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      })
    }
  }

  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error("Please log in to update profile", {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      })
      return
    }

    try {
      setSaving(true)

      const updateData = {
        fullName: userData.fullName,
        displayName: userData.fullName || userData.displayName,
        studentNumber: userData.studentNumber,
        course: userData.course,
        yearLevel: userData.yearLevel,
        campus: userData.campus,
        secondaryEmail: userData.secondaryEmail,
        updatedAt: new Date().toISOString(),
      }

      // Add profile picture if changed
      if (profilePicture) {
        updateData.photoURL = profilePicture
      }

      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, updateData)

      // Update local state
      setUserName(userData.fullName || userData.displayName || "Student")
      if (profilePicture) {
        setProfilePicturePreview(profilePicture)
      }

      // Clear the profile picture state after saving
      setProfilePicture(null)

      toast.success("Profile updated successfully!", {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
        position: "top-right",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile", {
        icon: <XCircle className="w-5 h-5" />,
        description: error.message || "Please try again later.",
        duration: 4000,
        position: "top-right",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="relative">
        <StudentPageBanner
          icon={User}
          title="Profile"
          description="Manage your profile information"
          userName=""
        />
        <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-muted rounded-xl"></div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Floating Banner */}
      <StudentPageBanner
        icon={User}
        title="Profile"
        description="Manage your profile information"
        userName={userName}
      />

      {/* Content */}
      <div className="mt-36 md:mt-28 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
          {/* Profile Picture & Verification Status - Enhanced */}
          <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-2xl p-6 md:p-8 lg:p-10 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">Update your profile photo</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Picture */}
              <div className="lg:col-span-1 flex justify-center lg:justify-start">
                <div className="relative group">
                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden ring-4 ring-primary/20 shadow-2xl transition-transform duration-300 group-hover:scale-105">
                    {profilePicturePreview ? (
                      <img
                        src={profilePicturePreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-bold text-6xl">
                        {userData.fullName?.[0] || userData.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-3.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-all duration-200 shadow-xl hover:scale-110 z-10">
                    <Upload className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </label>
                  {profilePicturePreview && (
                    <button
                      onClick={() => {
                        setProfilePicturePreview(null)
                        setProfilePicture(null)
                      }}
                      className="absolute top-0 right-0 p-2.5 bg-destructive text-destructive-foreground rounded-full cursor-pointer hover:bg-destructive/90 transition-all duration-200 shadow-lg hover:scale-110 z-10"
                      title="Remove picture"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Info Section */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-xl p-5 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a profile picture to personalize your account. This will be visible in your sidebar and across the platform.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-background rounded-lg text-xs font-medium text-foreground border border-border">JPG, PNG, GIF</span>
                    <span className="px-3 py-1.5 bg-background rounded-lg text-xs font-medium text-foreground border border-border">Max 5MB</span>
                    <span className="px-3 py-1.5 bg-background rounded-lg text-xs font-medium text-foreground border border-border">Square recommended</span>
                  </div>
                </div>
                
                {/* Status Indicators - Minimalist Design */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Active Status - Minimalist */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      userStatus === "online" ? "bg-blue-500" : "bg-gray-400"
                    }`}></div>
                    <span className="text-sm font-medium text-foreground">
                      {userStatus === "online" ? "Active Now" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information & Email - Horizontal Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Personal Information */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 lg:p-10 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                  <GraduationCap className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">Update your academic details</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={userData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className="w-full px-4 py-3.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all hover:border-primary/50 shadow-sm"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    Student Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={userData.studentNumber}
                    onChange={(e) => handleInputChange("studentNumber", e.target.value)}
                    className="w-full px-4 py-3.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all hover:border-primary/50 shadow-sm"
                    placeholder="Enter your student number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    Course <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={userData.course}
                    onChange={(e) => handleInputChange("course", e.target.value)}
                    className="w-full px-4 py-3.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all hover:border-primary/50 shadow-sm"
                    placeholder="Enter your course"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Year Level <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={userData.yearLevel}
                    onChange={(e) => handleInputChange("yearLevel", e.target.value)}
                    className="w-full px-4 py-3.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all hover:border-primary/50 shadow-sm"
                  >
                    <option value="">Select year level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Campus <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={userData.campus}
                    onChange={(e) => handleInputChange("campus", e.target.value)}
                    className="w-full px-4 py-3.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all hover:border-primary/50 shadow-sm"
                    placeholder="Enter your campus"
                  />
                </div>
              </div>
            </div>

            {/* Email Settings */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 lg:p-10 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Email Information</h3>
                  <p className="text-sm text-muted-foreground">Manage your email addresses</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Primary Email
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    disabled
                    className="w-full px-4 py-3.5 border border-border rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed shadow-sm"
                  />
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Primary email cannot be changed. This is your account email.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Secondary Email
                  </label>
                  <input
                    type="email"
                    value={userData.secondaryEmail}
                    onChange={(e) => handleInputChange("secondaryEmail", e.target.value)}
                    className="w-full px-4 py-3.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all hover:border-primary/50 shadow-sm"
                    placeholder="Enter secondary email (optional)"
                  />
                  <div className="bg-gradient-to-r from-muted/40 to-muted/20 border border-border/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                      Optional: Add a secondary email for notifications and backup purposes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button - Enhanced */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground rounded-xl hover:from-primary/90 hover:via-primary/90 hover:to-secondary/90 transition-all duration-200 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

