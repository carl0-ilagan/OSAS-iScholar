"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/common/header"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    userType: "student",
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Auth logic here
    console.log("Login attempt:", formData)
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground mb-8">Sign in to your iScholar account</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="userType"
                  value="student"
                  checked={formData.userType === "student"}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-foreground">Student</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="userType"
                  value="admin"
                  checked={formData.userType === "admin"}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-foreground">Admin</span>
              </label>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-primary font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
