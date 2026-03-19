"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, AlertTriangle, Bell, KeyRound, Loader2, Save, Settings, ShieldCheck, User } from "lucide-react"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { toast } from "sonner"
import AdminLayoutWrapper from "../admin-layout"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export default function AdminSettingsPage() {
  const { user, resetPassword } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [runningDiagnostics, setRunningDiagnostics] = useState(false)
  const [realtimeEnabled, setRealtimeEnabled] = useState(true)
  const [performanceSeries, setPerformanceSeries] = useState([])
  const [diagnostics, setDiagnostics] = useState({
    lastRunAt: null,
    firestoreLatencyMs: null,
    browserOnline: true,
    hasAnomalies: false,
    anomalies: [],
  })

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    displayName: "",
    secondaryEmail: "",
    contactNumber: "",
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    reviewDigest: true,
    systemAlerts: true,
  })

  const userDocRef = useMemo(() => {
    if (!user?.uid) return null
    return doc(db, "users", user.uid)
  }, [user?.uid])

  useEffect(() => {
    const loadSettings = async () => {
      if (!userDocRef) {
        setLoading(false)
        return
      }

      try {
        const snapshot = await getDoc(userDocRef)
        if (!snapshot.exists()) {
          setLoading(false)
          return
        }

        const data = snapshot.data()
        setProfileForm({
          fullName: data?.fullName || "",
          displayName: data?.displayName || "",
          secondaryEmail: data?.secondaryEmail || "",
          contactNumber: data?.contactNumber || "",
        })

        setPreferences({
          emailNotifications: data?.settings?.emailNotifications ?? true,
          reviewDigest: data?.settings?.reviewDigest ?? true,
          systemAlerts: data?.settings?.systemAlerts ?? true,
        })
      } catch (error) {
        console.error("Failed to load admin settings:", error)
        toast.error("Failed to load settings.")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [userDocRef])

  const collectPerformanceSample = async () => {
    const now = new Date()
    let firestoreLatencyMs = null
    const anomalies = []
    const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true

    if (!browserOnline) {
      anomalies.push("Browser is offline.")
    }

    if (userDocRef) {
      const start = performance.now()
      await getDoc(userDocRef)
      firestoreLatencyMs = Math.round(performance.now() - start)
      if (firestoreLatencyMs > 1400) {
        anomalies.push(`Firestore response is slow (${firestoreLatencyMs}ms).`)
      }
    } else {
      anomalies.push("Admin user document is not ready.")
    }

    setDiagnostics({
      lastRunAt: now.toISOString(),
      firestoreLatencyMs,
      browserOnline,
      hasAnomalies: anomalies.length > 0,
      anomalies,
    })

    setPerformanceSeries((prev) => {
      const next = [
        ...prev,
        {
          ts: now.toISOString(),
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          latency: firestoreLatencyMs ?? 0,
          threshold: 1400,
        },
      ]
      return next.slice(-20)
    })

    return {
      hasAnomalies: anomalies.length > 0,
    }
  }

  useEffect(() => {
    if (!realtimeEnabled || activeTab !== "system" || loading || !userDocRef) return

    let cancelled = false
    const run = async () => {
      try {
        if (!cancelled) await collectPerformanceSample()
      } catch (error) {
        console.error("Realtime performance sampling failed:", error)
      }
    }

    run()
    const timer = setInterval(run, 6000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [realtimeEnabled, activeTab, loading, userDocRef])

  const handleSaveProfile = async () => {
    if (!userDocRef) return

    try {
      setSavingProfile(true)
      await setDoc(
        userDocRef,
        {
          fullName: profileForm.fullName.trim(),
          displayName: profileForm.displayName.trim(),
          secondaryEmail: profileForm.secondaryEmail.trim(),
          contactNumber: profileForm.contactNumber.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      toast.success("Profile settings saved.")
    } catch (error) {
      console.error("Failed to save profile settings:", error)
      toast.error("Failed to save profile settings.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!userDocRef) return

    try {
      setSavingPrefs(true)
      await updateDoc(userDocRef, {
        settings: {
          emailNotifications: preferences.emailNotifications,
          reviewDigest: preferences.reviewDigest,
          systemAlerts: preferences.systemAlerts,
        },
        updatedAt: new Date().toISOString(),
      })
      toast.success("Admin preferences updated.")
    } catch (error) {
      console.error("Failed to save admin preferences:", error)
      toast.error("Failed to update admin preferences.")
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email) return

    try {
      setSendingReset(true)
      await resetPassword(user.email)
      toast.success("Password reset email sent.")
    } catch (error) {
      console.error("Failed to send password reset email:", error)
      toast.error("Failed to send password reset email.")
    } finally {
      setSendingReset(false)
    }
  }

  const runSystemDiagnostics = async () => {
    setRunningDiagnostics(true)
    try {
      const result = await collectPerformanceSample()
      if (result?.hasAnomalies) {
        toast.warning("Diagnostics completed with anomalies.")
      } else {
        toast.success("Diagnostics completed. System looks healthy.")
      }
    } catch (error) {
      console.error("System diagnostics failed:", error)
      toast.error("Failed to run diagnostics.")
      setDiagnostics((prev) => ({
        ...prev,
        lastRunAt: new Date().toISOString(),
        hasAnomalies: true,
        anomalies: ["Diagnostics failed unexpectedly."],
      }))
    } finally {
      setRunningDiagnostics(false)
    }
  }

  return (
    <AdminLayoutWrapper>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="rounded-xl border border-border bg-card p-2">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <TabButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={User} label="Profile" />
              <TabButton active={activeTab === "preferences"} onClick={() => setActiveTab("preferences")} icon={Bell} label="Preferences" />
              <TabButton active={activeTab === "security"} onClick={() => setActiveTab("security")} icon={ShieldCheck} label="Security" />
              <TabButton active={activeTab === "system"} onClick={() => setActiveTab("system")} icon={Activity} label="System" />
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
          ) : (
            <>
              {activeTab === "profile" ? (
                <section className="rounded-xl border border-border bg-card p-4 md:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Profile Settings</h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Full Name</span>
                    <input
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Enter full name"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Display Name</span>
                    <input
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Enter display name"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Secondary Email</span>
                    <input
                      type="email"
                      value={profileForm.secondaryEmail}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, secondaryEmail: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Contact Number</span>
                    <input
                      value={profileForm.contactNumber}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="+63..."
                    />
                  </label>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Profile
                  </button>
                </div>
                </section>
              ) : null}

              {activeTab === "preferences" ? (
                <section className="rounded-xl border border-border bg-card p-4 md:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Admin Preferences</h2>
                  </div>
                  <div className="space-y-3">
                    <ToggleRow
                      label="Email Notifications"
                      description="Receive account and user updates."
                      checked={preferences.emailNotifications}
                      onChange={(value) => setPreferences((prev) => ({ ...prev, emailNotifications: value }))}
                    />
                    <ToggleRow
                      label="Review Digest"
                      description="Daily summary of pending applications."
                      checked={preferences.reviewDigest}
                      onChange={(value) => setPreferences((prev) => ({ ...prev, reviewDigest: value }))}
                    />
                    <ToggleRow
                      label="System Alerts"
                      description="Important admin/system notices."
                      checked={preferences.systemAlerts}
                      onChange={(value) => setPreferences((prev) => ({ ...prev, systemAlerts: value }))}
                    />
                  </div>
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPrefs}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                  >
                    {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Preferences
                  </button>
                </section>
              ) : null}

              {activeTab === "security" ? (
                <section className="rounded-xl border border-border bg-card p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Security</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Send yourself a secure password reset email.</p>
                  <button
                    onClick={handleResetPassword}
                    disabled={sendingReset || !user?.email}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                  >
                    {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Send Password Reset
                  </button>
                </section>
              ) : null}

              {activeTab === "system" ? (
                <section className="rounded-xl border border-border bg-card p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">System Health & Anomalies</h2>
                    </div>
                    <button
                      onClick={() => setRealtimeEnabled((prev) => !prev)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        realtimeEnabled
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {realtimeEnabled ? "Realtime On" : "Realtime Off"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Network Status</p>
                      <p className={`mt-1 text-sm font-semibold ${diagnostics.browserOnline ? "text-emerald-700" : "text-red-600"}`}>
                        {diagnostics.browserOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Firestore Latency</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {diagnostics.firestoreLatencyMs != null ? `${diagnostics.firestoreLatencyMs}ms` : "Not tested"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Anomaly Status</p>
                      <p className={`mt-1 text-sm font-semibold ${diagnostics.hasAnomalies ? "text-amber-700" : "text-emerald-700"}`}>
                        {diagnostics.hasAnomalies ? "Needs attention" : "Healthy"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Performance Trend (Realtime)</p>
                      <p className="text-xs text-muted-foreground">Sampling every 6s, last 20 points</p>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                          <Tooltip
                            formatter={(value, name) => [`${value} ms`, name === "latency" ? "Latency" : "Threshold"]}
                            labelFormatter={(label) => `Time: ${label}`}
                          />
                          <Line type="monotone" dataKey="latency" name="latency" stroke="#059669" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="threshold" name="threshold" stroke="#f59e0b" strokeDasharray="6 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-semibold text-foreground">Detected Anomalies</p>
                    </div>
                    {diagnostics.anomalies.length > 0 ? (
                      <ul className="space-y-1 text-sm text-foreground">
                        {diagnostics.anomalies.map((item, index) => (
                          <li key={`${item}-${index}`} className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No anomalies detected yet.</p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Last run: {diagnostics.lastRunAt ? new Date(diagnostics.lastRunAt).toLocaleString() : "Never"}
                    </p>
                    <button
                      onClick={runSystemDiagnostics}
                      disabled={runningDiagnostics}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {runningDiagnostics ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                      Run Diagnostics
                    </button>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}
