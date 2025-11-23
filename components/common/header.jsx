"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useBranding } from "@/contexts/BrandingContext"
import LoginModal from "@/components/auth/LoginModal"
import SignupModal from "@/components/auth/SignupModal"

export default function Header() {
  const { branding } = useBranding()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "Scholarships", href: "#scholarships" },
    { label: "About OSAS", href: "#about" },
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {branding?.logo ? (
              <img 
                key={branding.logo} 
                src={branding.logo} 
                alt={branding.name || "Logo"} 
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  console.error("Error loading logo:", branding.logo)
                  e.target.style.display = 'none'
                }}
              />
            ) : (
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
              iS
            </div>
            )}
            <span className="font-bold text-primary text-base sm:text-lg">
              {branding?.name || "iScholar"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="text-foreground hover:text-primary transition-all duration-200 font-medium text-sm cursor-pointer relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setLoginOpen(true)}
              className="px-4 py-2 text-primary border-2 border-primary font-medium hover:bg-primary hover:text-white transition-all duration-200 rounded-lg"
            >
              Login
            </button>
            <button
              onClick={() => setSignupOpen(true)}
              className="px-6 py-2 bg-accent text-accent-foreground font-medium rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Apply Now
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 transition-transform duration-300 hover:scale-110" 
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
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? "max-h-[600px] opacity-100 pb-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-2 pt-2">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={`block px-4 py-3 text-foreground hover:text-primary hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-all duration-200 cursor-pointer transform relative group ${
                  mobileOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0"
                }`}
                style={{
                  transitionDelay: mobileOpen ? `${index * 50}ms` : "0ms",
                }}
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute left-0 top-0 h-full w-0 bg-primary/10 group-hover:w-full transition-all duration-300 rounded-lg"></span>
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
                className="px-4 py-2 bg-accent text-accent-foreground font-medium rounded-lg hover:bg-yellow-500 transition-colors text-center"
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
