import Header from "@/components/common/header"
import Hero from "@/components/landing/hero"
import ApplicationTrackerSection from "@/components/landing/application-tracker-section"
import AnnouncementsSection from "@/components/landing/announcements-section"
import FeaturesSection from "@/components/landing/features-section"
import BenefitsSection from "@/components/landing/benefits-section"
import TestimonialsSection from "@/components/landing/testimonials-section"
import Footer from "@/components/common/footer"
import ScrollTopFab from "@/components/common/scroll-top-fab"

export const metadata = {
  title: "MOCAS Portal",
  description:
    "MinSU Online Consultation for Admission and Scholarship",
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-transparent text-foreground">
      <div
        className="pointer-events-none fixed inset-0 z-0 landing-fixed-bg"
        style={{
          backgroundImage: "url('/BG.jpg')",
          backgroundSize: "cover",
        }}
      />
      <div className="relative z-10">
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
      <ScrollTopFab />
      </div>
    </div>
  )
}
