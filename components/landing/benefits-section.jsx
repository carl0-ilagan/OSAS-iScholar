import { Heart, Clock, Users, Zap } from "lucide-react"

const benefits = [
  {
    icon: Clock,
    title: "Fast Processing",
    description: "Get results within 30 days of submission",
  },
  {
    icon: Users,
    title: "Personal Support",
    description: "Dedicated support team for guidance",
  },
  {
    icon: Heart,
    title: "Student Welfare",
    description: "Complete student support services",
  },
  {
    icon: Zap,
    title: "Easy Management",
    description: "Simple dashboard for tracking",
  },
]

export default function BenefitsSection() {
  return (
    <section id="about" className="relative bg-transparent py-20">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="text-sm font-semibold text-emerald-100">Why MOCAS</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">About MOCAS</h2>
          <p className="text-emerald-50/90 text-lg">MinSU Online Consultation for Admission and Scholarship</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div
                key={index}
                className="group rounded-2xl border border-white/20 bg-white/10 p-6 text-center shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white/35 hover:bg-white/15"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30">
                  <Icon className="w-8 h-8 text-emerald-100" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm leading-6 text-emerald-50/90">{benefit.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
