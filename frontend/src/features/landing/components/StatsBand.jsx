import React, { useEffect, useRef, useState } from 'react'
import useReveal from '../hooks/useReveal.js'

const STATS = [
  { value: 100, suffix: '%', label: 'of payslips computed by configurable salary rules — zero hardcoded amounts' },
  { value: 5, suffix: '', label: 'roles with enforced access control, from Employee to Admin' },
  { value: 0, suffix: '', label: 'static numbers on the dashboard — every metric is a live query' },
]

const COUNT_DURATION_MS = 1200

export default function StatsBand() {
  const sectionRef = useReveal()
  const statsRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [display, setDisplay] = useState(() => STATS.map(() => 0))

  useEffect(() => {
    const el = statsRef.current
    if (!el) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStarted(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(STATS.map((stat) => stat.value))
      return undefined
    }

    let frame
    const startTime = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - startTime) / COUNT_DURATION_MS, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(STATS.map((stat) => Math.round(stat.value * eased)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [started])

  return (
    <section id="results" className="lp-section lp-section--tint">
      <div className="lp-container">
        <div className="reveal" ref={sectionRef}>
          <span className="lp-eyebrow">Why Pay365</span>
          <h2 className="lp-heading">Built on Truth, Not Mockups</h2>
          <div className="lp-stat-grid" ref={statsRef}>
            {STATS.map((stat, index) => (
              <div className="lp-stat" key={stat.label}>
                <div className="lp-stat-value">
                  {display[index]}
                  {stat.suffix}
                </div>
                <p className="lp-stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
