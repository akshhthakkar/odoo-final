import React from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'

const PLANS = [
  {
    name: 'Growth',
    desc: 'For teams that want the full HR & payroll flow out of the box.',
    price: 'Free',
    per: 'while in beta',
    cta: 'Start Free',
    to: '/login',
    featured: true,
    features: [
      'Employees, contracts & working schedules',
      'Attendance with corrections & audit trail',
      'Time off with allocations & auto-deduction',
      'Salary structures with sequenced rules',
      'Two-step payruns with warnings',
      'Payslip PDF & bulk email delivery',
      'Live payroll dashboard',
    ],
  },
  {
    name: 'Enterprise',
    desc: 'For organizations that need custom structures and controls.',
    price: 'Custom',
    per: 'pricing',
    cta: 'Book a Call',
    href: 'mailto:hello@pay365.dev',
    features: [
      'Custom salary structures & rule sets',
      'Advanced RBAC & audit requirements',
      'Multi-department analytics & exports',
      'Dedicated onboarding & support',
      'Integration with existing HRIS tools',
      'Continuous optimization',
    ],
  },
]

export default function PricingCards() {
  const ref = useReveal()

  return (
    <section id="pricing" className="lp-section">
      <div className="lp-container">
        <div className="reveal" ref={ref}>
          <span className="lp-eyebrow">Pricing</span>
          <h2 className="lp-heading">Built to Scale With Your Team</h2>
          <div className="lp-pricing-grid">
            {PLANS.map((plan) => (
              <article
                className={`lp-price-card${plan.featured ? ' lp-price-card--featured' : ''}`}
                key={plan.name}
              >
                {plan.featured && <span className="lp-price-flag">Most popular</span>}
                <h3 className="lp-price-name">{plan.name}</h3>
                <p className="lp-price-desc">{plan.desc}</p>
                <div className="lp-price-amount">
                  {plan.price}
                  <span className="per">{plan.per}</span>
                </div>
                {plan.to ? (
                  <Link to={plan.to} className="lp-btn lp-btn--primary lp-price-cta">
                    {plan.cta}
                  </Link>
                ) : (
                  <a href={plan.href} className="lp-btn lp-btn--ghost lp-price-cta">
                    {plan.cta}
                  </a>
                )}
                <ul className="lp-price-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={17} strokeWidth={2.6} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="lp-price-note">Pricing shown for demonstration — Pay365 is a hackathon build.</p>
        </div>
      </div>
    </section>
  )
}
