"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import LoginModal from "@/components/auth/LoginModal"

const scholarships = [
  {
    name: "Merit Scholarship",
    description: "For academically excellent students",
    amount: "Full Tuition + Allowance",
    color: "from-primary to-secondary",
  },
  {
    name: "Needs-Based Grant",
    description: "For financially challenged students",
    amount: "Up to 50% Tuition",
    color: "from-secondary to-primary",
  },
  {
    name: "TES (Technical Education Scholarship)",
    description: "For technical program students",
    amount: "Partial Tuition Coverage",
    color: "from-accent to-yellow-400",
  },
  {
    name: "TDP (Tunong Dunong Program)",
    description: "For future education professionals",
    amount: "Full Support + Internship",
    color: "from-primary to-accent",
  },
]

export default function ScholarshipsSection() {
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <>
      <section id="scholarships" className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Scholarships Offered</h2>
            <p className="text-muted-foreground text-lg">Choose the scholarship program that fits your profile</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scholarships.map((scholarship, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${scholarship.color} rounded-xl p-8 text-white shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 flex flex-col`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{scholarship.name}</h3>
                  <p className="text-white/90 text-sm mb-4">{scholarship.description}</p>
                  <p className="text-sm font-semibold mb-6 text-white/80">{scholarship.amount}</p>
                </div>
                <button
                  onClick={() => setLoginOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-white text-foreground font-semibold px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm mt-auto"
                >
                  View Full Requirements
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  )
}
