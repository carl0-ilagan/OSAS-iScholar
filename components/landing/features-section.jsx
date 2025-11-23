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
    <section id="features" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">System Features</h2>
          <p className="text-muted-foreground text-lg">Everything you need for a smooth scholarship journey</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-8 hover:shadow-lg transition-all hover:border-primary/50"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
