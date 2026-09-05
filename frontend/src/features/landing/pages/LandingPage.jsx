import React from 'react'
import Navbar from '../../../components/layout/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import PainSection from '../components/PainSection.jsx'
import FeatureBlocks from '../components/FeatureBlocks.jsx'
import ProcessSteps from '../components/ProcessSteps.jsx'
import StatsBand from '../components/StatsBand.jsx'
import PricingCards from '../components/PricingCards.jsx'
import FaqAccordion from '../components/FaqAccordion.jsx'
import CtaBand from '../components/CtaBand.jsx'
import LandingFooter from '../components/LandingFooter.jsx'
import '../styles/landing.scss'

export default function LandingPage() {
  return (
    <div className="landing">
      <Navbar />
      <main>
        <Hero />
        <PainSection />
        <FeatureBlocks />
        <ProcessSteps />
        <StatsBand />
        <PricingCards />
        <FaqAccordion />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  )
}
