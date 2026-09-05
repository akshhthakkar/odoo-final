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
import hero1 from '../../../assets/hero1.png'
import hero2 from '../../../assets/hero2.png'
import hero3 from '../../../assets/hero3.png'
import hero4 from '../../../assets/hero4.png'

const LOGOS = [
  { name: 'Arcle', Icon: Layers },
  { name: 'maro', Icon: Triangle },
  { name: 'orbix', Icon: Hexagon },
  { name: 'vela', Icon: Aperture },
  { name: 'nexo', Icon: Circle },
]

// Ordered card list matching the asset images
const HERO_CARDS = [
  { id: 'h1', src: hero1, alt: 'Candidate Review Card', tilt: -6 },
  { id: 'h4', src: hero4, alt: 'Hiring & Offers Card', tilt: 4 },
  { id: 'h2', src: hero2, alt: 'Payroll Execution Card', tilt: -4 },
  { id: 'h3', src: hero3, alt: 'Salary Breakdown Card', tilt: 3 },
]

// 8 Symmetrical graph bars forming a valley / U-shape
const GRAPH_BARS = [
  { height: 88, delay: '0s' },
  { height: 82, delay: '0.2s' },
  { height: 56, delay: '0.4s' },
  { height: 32, delay: '0.6s' },
  { height: 32, delay: '0.8s' },
  { height: 56, delay: '1.0s' },
  { height: 82, delay: '1.2s' },
  { height: 88, delay: '1.4s' },
]

export default function Hero() {
  const ref = useReveal()

  return (
    <section className="lp-hero">
      <div className="lp-container">
        <div className="lp-hero-grid">
          {/* Left Column: Copy & CTAs */}
          <div className="lp-hero-copy">
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
              <a href="#features" className="lp-btn lp-btn--soft">
                Learn more
              </a>
            </div>
          </div>

          {/* Right Column: Valley Graph Lines & Vertical Looping Cards Stream */}
          <div className="lp-hero-visual-wrapper">
            <div className="lp-hero-visual-container">
              {/* Background Graph Lines / Bar Columns (U-Shape Valley) */}
              <div className="lp-graph-bars" aria-hidden="true">
                {GRAPH_BARS.map((bar, idx) => (
                  <div
                    key={`bar-${idx}`}
                    className="lp-graph-bar"
                    style={{
                      height: `${bar.height}%`,
                      animationDelay: bar.delay,
                    }}
                  />
                ))}
              </div>

              {/* Foreground Looping Cards Track (Top to Bottom Infinite Scroll) */}
              <div className="lp-cards-viewport">
                <div className="lp-cards-track">
                  {/* Duplicated 3 times for completely seamless infinite top-to-bottom looping */}
                  {[...HERO_CARDS, ...HERO_CARDS, ...HERO_CARDS].map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      className="lp-stream-card"
                      style={{
                        transform: `rotate(${card.tilt}deg)`,
                      }}
                    >
                      <img
                        src={card.src}
                        alt={card.alt}
                        className="lp-stream-card__img"
                        loading="eager"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Partner Logos Strip */}
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
