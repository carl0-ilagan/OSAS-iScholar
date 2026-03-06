"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/common/header"

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentNumber: "",
    course: "",
    yearLevel: "",
    campus: "",
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
    if (step === 1) {
      setStep(2)
    } else {
      setLoading(true)
      console.log("Registration:", formData)
      setTimeout(() => setLoading(false), 1000)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Create Your Account</h1>
          <p className="text-muted-foreground mb-8">Join iScholar in {step === 1 ? "Step 1" : "Step 2"} of 2</p>

          {/* Progress Bar */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`}></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Juan Dela Cruz"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  />
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

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Student Number */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Student Number</label>
                  <input
                    type="text"
                    name="studentNumber"
                    value={formData.studentNumber}
                    onChange={handleChange}
                    placeholder="202412345"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Course</label>
                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    placeholder="BS Computer Science"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Year Level */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Year Level</label>
                  <select
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Year Level</option>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                </div>

                {/* Campus */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Campus</label>
                  <input
                    type="text"
                    name="campus"
                    value={formData.campus}
                    onChange={handleChange}
                    placeholder="Diliman"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : step === 1 ? "Next" : "Create Account"}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
