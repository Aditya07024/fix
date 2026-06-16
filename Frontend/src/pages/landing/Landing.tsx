import React from "react";
import { LandingNav } from "./components/LandingNav";
import {
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  ServicesSection,
  TestimonialsSection,
  CTASection,
  FooterSection,
} from "./sections";
import { TeamSection } from "./sections/TeamSection";



export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <LandingNav />
      <main className="pt-16">
        <HeroSection />
        <ServicesSection />
        <FeaturesSection />
        <TeamSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <CTASection />
        <FooterSection />
      </main>
    </div>
  );
};

export default LandingPage;
