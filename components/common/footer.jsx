"use client"

import { Mail, MapPin, Phone, Facebook, Linkedin, Twitter } from "lucide-react"
import Link from "next/link"
import { useBranding } from "@/contexts/BrandingContext"
import PWAInstallButton from "@/components/pwa/install-button"

export default function Footer() {
  const { branding } = useBranding()
  const currentYear = new Date().getFullYear()

  const footer = branding?.footer || {
    description: "Making scholarship management simple and accessible for all MinSU students.",
    address: "Mariano Jhocson Street, Diliman, Quezon City",
    phone: "(+63) 2 8981-8500",
    email: "osas@minsu.ph",
    socialLinks: {
      facebook: "",
      linkedin: "",
      twitter: "",
    },
  }

  const appName = branding?.name || "MOCAS"

  return (
    <footer id="contact" className="bg-slate-950 py-16 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid gap-12 md:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-4 text-xl font-bold tracking-tight">{appName}</h3>
            <p className="mb-4 text-sm leading-6 text-white/75">
              {footer.description}
            </p>
            <PWAInstallButton />
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/85">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a href="#about" className="hover:text-accent transition-colors">
                  About MOCAS
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-accent transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a
                  href="https://xianhost.cloud/officials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  University Officials
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/85">Contact</h4>
            <div className="space-y-3 text-sm text-white/80">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p>{footer.address}</p>
              </div>
              <div className="flex gap-3">
                <Phone className="w-5 h-5 text-accent flex-shrink-0" />
                <a href={`tel:${footer.phone}`} className="hover:text-accent transition-colors">
                  {footer.phone}
                </a>
              </div>
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-accent flex-shrink-0" />
                <a href={`mailto:${footer.email}`} className="hover:text-accent transition-colors">
                  {footer.email}
                </a>
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/85">Follow Us</h4>
            <div className="flex gap-4">
              {footer.socialLinks?.facebook && (
                <a
                  href={footer.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {footer.socialLinks?.linkedin && (
                <a
                  href={footer.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {footer.socialLinks?.twitter && (
                <a
                  href={footer.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 pt-8">
          <p className="text-center text-sm text-white/60">
            &copy; {currentYear} {appName} Portal. All rights reserved. | MinSU Online Consultation for Admission and Scholarship
          </p>
        </div>
      </div>
    </footer>
  )
}
