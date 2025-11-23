"use client"

import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { useBranding } from "@/contexts/BrandingContext"
import LoginModal from "@/components/auth/LoginModal"
import SignupModal from "@/components/auth/SignupModal"

export default function Hero() {
  const { branding } = useBranding()
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)

  return (
    <section id="home" className="relative bg-gradient-to-br from-primary via-primary to-secondary pt-20 pb-32 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Trusted by MinSU Students</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-pretty tracking-tight">
              Welcome to OSAS {branding?.name || "iScholar"} Portal
            </h1>

            <p className="text-lg text-white/90 font-light">
              Your complete scholarship application and student support system. Apply, track, and manage your academic
              journey with ease.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => setSignupOpen(true)}
                className="flex items-center justify-center gap-2 bg-accent text-accent-foreground font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition-all transform hover:scale-105"
              >
                Apply for Scholarship
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLoginOpen(true)}
                className="flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-all"
              >
                Student Login
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 grid grid-cols-3 gap-4 text-white/80 text-sm">
              <div>
                <p className="font-bold text-2xl text-accent">500+</p>
                <p>Scholars Supported</p>
              </div>
              <div>
                <p className="font-bold text-2xl text-accent">95%</p>
                <p>Approval Rate</p>
              </div>
              <div>
                <p className="font-bold text-2xl text-accent">24/7</p>
                <p>Support Available</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="hidden md:block relative">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Online Application</p>
                    <p className="text-white/70 text-sm">Apply anytime, anywhere</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Real-time Tracking</p>
                    <p className="text-white/70 text-sm">Monitor application status</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Secure Documents</p>
                    <p className="text-white/70 text-sm">Protected data & privacy</p>
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
