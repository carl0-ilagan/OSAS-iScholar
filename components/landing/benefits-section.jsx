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
    <section id="about" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">About OSAS iScholar</h2>
          <p className="text-muted-foreground text-lg">Streamlined scholarship management for all students</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
