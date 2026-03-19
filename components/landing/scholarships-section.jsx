"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import LoginModal from "@/components/auth/LoginModal"

const scholarships = [
  {
    name: "Merit Scholarship",
    description: "For academically excellent students",
    amount: "Full Tuition + Allowance",
    tone: "bg-primary",
  },
  {
    name: "Needs-Based Grant",
    description: "For financially challenged students",
    amount: "Up to 50% Tuition",
    tone: "bg-emerald-500",
  },
  {
    name: "TES (Technical Education Scholarship)",
    description: "For technical program students",
    amount: "Partial Tuition Coverage",
    tone: "bg-amber-500",
  },
  {
    name: "TDP (Tunong Dunong Program)",
    description: "For future education professionals",
    amount: "Full Support + Internship",
    tone: "bg-violet-500",
  },
]

export default function ScholarshipsSection() {
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <>
      <section id="scholarships" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center rounded-full border border-emerald-700/20 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
              Scholarship Programs
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Find the right support for your studies
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Explore available grants and open the details to check requirements.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {scholarships.map((scholarship, index) => (
              <div
                key={index}
                className="group relative flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <span className={`absolute left-0 top-0 h-1.5 w-full rounded-t-xl ${scholarship.tone}`} />
                <div className="flex-1">
                  <h3 className="mb-2 text-base font-semibold text-foreground">{scholarship.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{scholarship.description}</p>
                  <p className="mb-6 text-sm font-medium text-foreground">{scholarship.amount}</p>
                </div>
                <button
                  onClick={() => setLoginOpen(true)}
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground"
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
