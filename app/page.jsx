import Header from "@/components/common/header"
import Hero from "@/components/landing/hero"
import ApplicationTrackerSection from "@/components/landing/application-tracker-section"
import AnnouncementsSection from "@/components/landing/announcements-section"
import FeaturesSection from "@/components/landing/features-section"
import BenefitsSection from "@/components/landing/benefits-section"
import TestimonialsSection from "@/components/landing/testimonials-section"
import Footer from "@/components/common/footer"

export const metadata = {
  title: "MOCAS Portal",
  description:
    "MinSU Online Consultation for Admission and Scholarship",
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#eef6f0] text-foreground">
      <Header />
      <Hero />
      <div className="relative">
        <ApplicationTrackerSection />
        <AnnouncementsSection />
        <FeaturesSection />
        <BenefitsSection />
        <TestimonialsSection />
      </div>
      <Footer />
    </div>
  )
}
