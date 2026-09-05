import React from 'react'
import { Link } from 'react-router-dom'
import {
  Send,
  Sparkles,
  Circle,
  Layers,
  Triangle,
  Hexagon,
  Aperture,
} from 'lucide-react'
import useReveal from '../hooks/useReveal.js'

const LOGOS = [
  { name: 'Arcle', Icon: Layers },
  { name: 'maro', Icon: Triangle },
  { name: 'orbix', Icon: Hexagon },
  { name: 'vela', Icon: Aperture },
  { name: 'nexo', Icon: Circle },
]

export default function Hero() {
  const ref = useReveal()

  return (
    <section className="lp-hero">
      <div className="lp-container">
        <div className="lp-hero-copy reveal" ref={ref}>
          <span className="lp-hero-badge">
            <Sparkles size={14} strokeWidth={2.4} />
            <em>Payroll, automated end to end</em>
          </span>
          <h1 className="lp-hero-title">
            Payroll That Does
            <br />
            The Heavy Lifting
          </h1>
          <p className="lp-hero-sub">
            Employees, contracts, attendance, leave, and salary rules — connected into
            validated payslips from day one.
          </p>
          <div className="lp-hero-ctas">
            <Link to="/login" className="lp-btn lp-btn--primary">
              <Send size={17} strokeWidth={2.2} />
              Launch Payroll
            </Link>
            <a href="#features" className="lp-btn lp-btn--soft">Learn more</a>
          </div>
        </div>

        <div className="lp-logo-strip" aria-hidden="true">
          <div className="lp-logo-track">
            {[...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS].map((logo, index) => (
              <span className="lp-logo-item" key={`${logo.name}-${index}`}>
                <logo.Icon size={22} strokeWidth={2.4} />
                <span>{logo.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
