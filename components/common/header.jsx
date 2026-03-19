"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useBranding } from "@/contexts/BrandingContext"
import LoginModal from "@/components/auth/LoginModal"
import SignupModal from "@/components/auth/SignupModal"

export default function Header() {
  const { branding } = useBranding()
  const rawBrandName = String(branding?.name || "").trim()
  const isLegacyBrand = !rawBrandName || rawBrandName.toLowerCase() === "ischolar"
  const brandName = isLegacyBrand ? "MOCAS" : rawBrandName
  const brandLogo = branding?.logo || "/MOCAS-removebg-preview.png"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const showFloatingShell = hasScrolled || mobileOpen

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "About MOCAS", href: "#about" },
    { label: "Testimonials", href: "#testimonials" },
  ]

  const handleSmoothScroll = (e, href) => {
    // Only handle hash links
    if (href.startsWith("#")) {
      e.preventDefault()
      const targetId = href.substring(1)
      const targetElement = document.getElementById(targetId)
      
      if (targetElement) {
        // Get header height for offset
        const headerHeight = 64 // h-16 = 64px
        const elementPosition = targetElement.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        })
        
        // Close mobile menu if open
        setMobileOpen(false)
      }
    }
  }

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        showFloatingShell ? "bg-transparent px-2 pt-2 sm:px-4" : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto max-w-7xl transition-all duration-300 ${
          showFloatingShell
            ? "rounded-2xl border border-white/25 bg-emerald-950/55 px-4 shadow-xl shadow-emerald-900/20 backdrop-blur-xl sm:px-6 lg:px-8"
            : "px-4 sm:px-6 lg:px-8"
        }`}
      >
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {brandLogo ? (
              <div
                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-white shadow-sm transition-all duration-300"
              >
                <img
                  key={brandLogo}
                  src={brandLogo}
                  alt={brandName || "Logo"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error("Error loading logo:", brandLogo)
                    e.target.style.display = "none"
                  }}
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-white text-base font-bold text-emerald-700 shadow-sm">
                M
              </div>
            )}
            <span className={`text-base font-bold sm:text-lg ${showFloatingShell ? "text-white" : "text-emerald-50"}`}>
              {brandName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className={`hidden items-center gap-6 transition-all duration-300 md:flex ${
              showFloatingShell ? "rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm" : ""
            }`}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={`group relative cursor-pointer px-1 py-0.5 text-sm font-medium transition-all duration-200 ${
                  showFloatingShell ? "text-emerald-50/90 hover:text-white" : "text-emerald-50/90 hover:text-white"
                }`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-emerald-200 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => setLoginOpen(true)}
              className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
                showFloatingShell
                  ? "border border-white/35 text-emerald-50 hover:bg-white/10"
                  : "border border-emerald-100/35 text-emerald-50 hover:bg-white/10"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setSignupOpen(true)}
              className={`rounded-lg px-5 py-2 font-medium shadow-sm transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md ${
                showFloatingShell
                  ? "bg-white text-emerald-800 hover:bg-emerald-50"
                  : "bg-white text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              Apply Now
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className={`p-2 transition-transform duration-300 hover:scale-110 md:hidden ${showFloatingShell ? "text-white" : "text-emerald-50"}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6">
              <Menu 
                className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
                  mobileOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                }`}
              />
              <X 
                className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${
                  mobileOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
            mobileOpen ? "max-h-[600px] opacity-100 pb-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mt-2 space-y-2 rounded-xl border border-white/20 bg-emerald-950/75 p-2 pt-2 shadow-lg backdrop-blur-xl">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={`block px-4 py-3 text-emerald-50 hover:text-white hover:bg-white/10 active:bg-white/15 rounded-lg transition-all duration-200 cursor-pointer transform relative group ${
                  mobileOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0"
                }`}
                style={{
                  transitionDelay: mobileOpen ? `${index * 50}ms` : "0ms",
                }}
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute left-0 top-0 h-full w-0 bg-white/10 group-hover:w-full transition-all duration-300 rounded-lg"></span>
              </a>
            ))}
            <div
              className={`pt-4 flex flex-col gap-2 transform ${
                mobileOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-4 opacity-0"
              }`}
              style={{
                transitionDelay: mobileOpen ? `${navLinks.length * 50}ms` : "0ms",
              }}
            >
              <button
                onClick={() => {
                  setLoginOpen(true)
                  setMobileOpen(false)
                }}
                className="px-4 py-2 text-primary border-2 border-primary font-medium hover:bg-primary hover:text-white active:bg-primary/90 rounded-lg transition-all duration-200 text-center"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setSignupOpen(true)
                  setMobileOpen(false)
                }}
                className="px-4 py-2 rounded-lg bg-white text-emerald-800 font-semibold shadow-sm transition-colors hover:bg-emerald-50 text-center"
              >
                Apply Now
              </button>
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
    </header>
  )
}
