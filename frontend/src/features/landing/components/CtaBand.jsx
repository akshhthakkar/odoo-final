import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'

export default function CtaBand() {
  const ref = useReveal()

  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-cta-inner reveal" ref={ref}>
          <h2 className="lp-cta-title">Every Payroll Team Is Different</h2>
          <p className="lp-cta-sub">
            Configure your own structures, rules, and flows — or explore the full platform
            with seeded demo data.
          </p>
          <div className="lp-cta-actions">
            <Link to="/login" className="lp-btn lp-btn--primary">
              Get Started
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
            <a href="mailto:hello@pay365.dev" className="lp-btn lp-btn--ghost">
              Request Custom Setup
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
