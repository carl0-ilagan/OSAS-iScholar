"use client"

import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { useBranding } from "@/contexts/BrandingContext"
import LoginModal from "@/components/auth/LoginModal"
import SignupModal from "@/components/auth/SignupModal"

export default function Hero() {
  const { branding } = useBranding()
  const brandName = branding?.name || "MOCAS"
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)

  return (
    <section
      id="home"
      className="relative overflow-hidden pb-20 pt-32 md:pb-24 md:pt-28"
      style={{
        backgroundImage: "url('/BG.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left Content */}
          <div className="space-y-7 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 shadow-lg backdrop-blur-sm">
              <Check className="h-4 w-4 text-emerald-200" />
              <span className="text-sm font-medium text-emerald-100">Trusted by MinSU Students</span>
            </div>

            <h1 className="max-w-2xl text-balance text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              Welcome to {brandName} Portal
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-emerald-50/95">
              Your complete scholarship application and student support system. Apply, track, and manage your academic
              journey with ease.
            </p>

            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <button
                onClick={() => setSignupOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-emerald-800 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Apply for Scholarship
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLoginOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-8 py-3 font-semibold text-white shadow-lg shadow-black/10 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20"
              >
                Student Login
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-3 pt-6 text-sm text-emerald-50/90">
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 shadow-md backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">500+</p>
                <p>Scholars Supported</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 shadow-md backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">95%</p>
                <p>Approval Rate</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 shadow-md backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">24/7</p>
                <p>Support Available</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative hidden md:block">
            <div className="space-y-4 rounded-3xl border border-white/25 bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <Check className="h-5 w-5 text-emerald-100" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Online Application</p>
                    <p className="text-sm text-emerald-50/90">Apply anytime, anywhere</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <Check className="h-5 w-5 text-emerald-100" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Real-time Tracking</p>
                    <p className="text-sm text-emerald-50/90">Monitor application status</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <Check className="h-5 w-5 text-emerald-100" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Secure Documents</p>
                    <p className="text-sm text-emerald-50/90">Protected data and privacy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      <SignupModal 
        open={signupOpen} 
        onOpenChange={setSignupOpen}
        onSwitchToLogin={() => {
          setSignupOpen(false)
          setLoginOpen(true)
        }}
      />
    </section>
  )
}
