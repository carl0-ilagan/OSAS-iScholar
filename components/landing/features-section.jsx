import { FileText, Upload, BarChart3, Lock } from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "Online Application",
    description: "Simple and intuitive application process",
  },
  {
    icon: Upload,
    title: "Document Upload",
    description: "Secure upload of required documents",
  },
  {
    icon: BarChart3,
    title: "Real-Time Tracking",
    description: "Monitor your application status instantly",
  },
  {
    icon: Lock,
    title: "Verified Accounts",
    description: "Secure and verified student accounts",
  },
]

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden py-20"
      style={{
        backgroundImage: "url('/BG.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-emerald-900/65" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="text-sm font-semibold text-emerald-100">Core Features</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">System Features</h2>
          <p className="text-emerald-50/90 text-lg">Everything you need for a smooth scholarship journey</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="group rounded-2xl border border-white/20 bg-white/10 p-7 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white/35 hover:bg-white/15"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 transition-colors group-hover:bg-white/30">
                  <Icon className="w-6 h-6 text-emerald-100" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm leading-6 text-emerald-50/90">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
