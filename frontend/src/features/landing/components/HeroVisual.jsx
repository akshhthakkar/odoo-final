import React from 'react'

const PAYRUN_ROWS = [
  {
    initials: 'RS',
    tone: 'fv-avatar--a',
    name: 'Rahul Sharma',
    role: 'Software Engineer',
    pill: 'Paid',
    pillClass: 'fv-pill--blue',
  },
  {
    initials: 'PN',
    tone: 'fv-avatar--b',
    name: 'Priya Nair',
    role: 'Product Designer',
    pill: 'Validated',
    pillClass: 'fv-pill--blue',
  },
]

const LEAVE_ROWS = [
  {
    initials: 'AM',
    tone: 'fv-avatar--c',
    name: 'Arjun Mehta',
    role: 'Account Executive',
    pill: 'Approved',
    pillClass: 'fv-pill--blue',
  },
  {
    initials: 'SI',
    tone: 'fv-avatar--d',
    name: 'Sneha Iyer',
    role: 'Sr. Product Manager',
    pill: 'Pending',
    pillClass: 'fv-pill--dark',
  },
]

const BARS = [42, 68, 55, 82, 48, 92, 60]

function PersonCard({ title, rows }) {
  return (
    <div className={`fv-card fv-card--${title.toLowerCase()}`}>
      <div className="fv-card-title">{title}</div>
      {rows.map((row) => (
        <div className="fv-row" key={row.name}>
          <span className={`fv-avatar ${row.tone}`}>{row.initials}</span>
          <div className="fv-person">
            <span className="fv-name">{row.name}</span>
            <span className="fv-role">{row.role}</span>
          </div>
          <span className={`fv-pill ${row.pillClass}`}>{row.pill}</span>
        </div>
      ))}
    </div>
  )
}

// Decorative floating composition for the hero (static, not live data).
export default function HeroVisual() {
  return (
    <div className="lp-hero-visual" aria-hidden="true">
      <PersonCard title="Payrun" rows={PAYRUN_ROWS} />
      <PersonCard title="Leave" rows={LEAVE_ROWS} />
      <div className="fv-chart">
        <span className="fv-chart-label">Payroll</span>
        <div className="fv-bars">
          {BARS.map((height, index) => (
            <span className="fv-bar" style={{ height: `${height}%` }} key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
