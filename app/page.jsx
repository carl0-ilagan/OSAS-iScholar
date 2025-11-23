import Header from "@/components/common/header"
import Hero from "@/components/landing/hero"
import FeaturesSection from "@/components/landing/features-section"
import ScholarshipsSection from "@/components/landing/scholarships-section"
import BenefitsSection from "@/components/landing/benefits-section"
import TestimonialsSection from "@/components/landing/testimonials-section"
import Footer from "@/components/common/footer"

export const metadata = {
  title: "iScholar Portal - OSAS MinSU Scholarship Management",
  description:
    "Apply for scholarships, track applications, and manage your student journey at MinSU with iScholar Portal.",
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <FeaturesSection />
      <ScholarshipsSection />
      <BenefitsSection />
      <TestimonialsSection />
      <Footer />
    </div>
  )
}
