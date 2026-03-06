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

  const appName = branding?.name || "iScholar"

  return (
    <footer id="contact" className="bg-primary text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-4">{appName}</h3>
            <p className="text-white/80 text-sm mb-4">
              {footer.description}
            </p>
            <PWAInstallButton />
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a href="#about" className="hover:text-accent transition-colors">
                  About OSAS
                </a>
              </li>
              <li>
                <a href="#scholarships" className="hover:text-accent transition-colors">
                  Scholarships
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
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
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              {footer.socialLinks?.facebook && (
                <a
                  href={footer.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
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
                  className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
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
                  className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8">
          <p className="text-center text-sm text-white/60">
            &copy; {currentYear} {appName} Portal. All rights reserved. | MinSU Office of Student Affairs and Services
          </p>
        </div>
      </div>
    </footer>
  )
}
