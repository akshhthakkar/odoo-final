import React from 'react'
import useReveal from '../hooks/useReveal.js'

const inr = (n) => `\u20B9${n.toLocaleString('en-IN')}`

function EmployeeMini() {
  return (
    <div className="mini">
      <div className="mini-head">
        <div className="mini-avatar">RS</div>
        <div>
          <div className="mini-name">Rahul Sharma</div>
          <div className="mini-role">Software Engineer · Engineering</div>
        </div>
      </div>
      <div className="mini-rows">
        <div className="mini-row mini-row--end">
          <span className="code">Contracts</span>
          <span className="meta">2 records · 1 active</span>
        </div>
        <div className="mini-row mini-row--end">
          <span className="code">Attendance</span>
          <span className="meta">21 days this month</span>
        </div>
        <div className="mini-row mini-row--end">
          <span className="code">Leave balance</span>
          <span className="meta">8.5 days remaining</span>
        </div>
      </div>
    </div>
  )
}

const RULE_ROWS = [
  { code: 'BASIC', meta: 'wage', amount: 50000 },
  { code: 'HRA', meta: '20% of BASIC', amount: 10000 },
  { code: 'GROSS', meta: 'BASIC + HRA + TRANSPORT', amount: 63000 },
  { code: 'PF', meta: '12% of BASIC', amount: -6000 },
  { code: 'NET', meta: 'GROSS \u2212 PF \u2212 TAX', amount: 55000 },
]

function RulesMini() {
  return (
    <div className="mini">
      <div className="mini-caption">Regular Salary — rule sequence</div>
      <div className="mini-rows">
        {RULE_ROWS.map((rule) => (
          <div className="mini-row" key={rule.code}>
            <span className="code">{rule.code}</span>
            <span className="meta">{rule.meta}</span>
            <span className={`amt${rule.amount < 0 ? ' amt--neg' : ''}`}>{inr(rule.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PayrunMini() {
  return (
    <div className="mini">
      <div className="mini-caption">Regular Payroll — Sep 2026</div>
      <div className="mini-steps">
        <span className="mini-step mini-step--done">Compute</span>
        <span className="mini-step mini-step--done">Validate</span>
        <span className="mini-step mini-step--current">Mark Paid</span>
      </div>
      <div className="mini-warning">1 warning before validation — missing bank details (Sneha Iyer)</div>
    </div>
  )
}

const FEATURES = [
  {
    title: 'The Employee Hub',
    body: 'One record connects contracts, schedules, attendance, and leave. Smart buttons jump to everything that matters.',
    chips: ['Contracts', 'Attendance', 'Leave balances'],
    Mock: EmployeeMini,
  },
  {
    title: 'Rules That Do the Math',
    body: 'Define salary rules once — fixed, percentage, or formula. They execute in sequence and compute every payslip the same way, every time.',
    chips: ['Fixed', 'Percentage', 'Formula'],
    Mock: RulesMini,
  },
  {
    title: 'Payruns on Rails',
    body: 'Pick a structure and a period, select your team, and get rule-by-rule payslips with warnings surfaced before you validate.',
    chips: ['Compute', 'Validate', 'Mark Paid'],
    Mock: PayrunMini,
  },
]

export default function FeatureBlocks() {
  const ref = useReveal()

  return (
    <section id="features" className="lp-section lp-section--tint">
      <div className="lp-container">
        <div className="reveal" ref={ref}>
          <span className="lp-eyebrow">Features</span>
          <h2 className="lp-heading">Everything Connected. Nothing Manual.</h2>
        </div>
        <div className="lp-features">
          {FEATURES.map(({ title, body, chips, Mock }) => (
            <div className="lp-feature-row" key={title}>
              <div className="lp-feature-copy">
                <h3 className="lp-feature-title">{title}</h3>
                <p className="lp-feature-body">{body}</p>
                <div className="lp-chips">
                  {chips.map((chip) => (
                    <span className="lp-chip" key={chip}>{chip}</span>
                  ))}
                </div>
              </div>
              <div className="lp-feature-mock">
                <Mock />
              </div>
            </div>
          ))}
        </div>
        <div className="lp-proof-strip">
          <span className="lp-proof-pill">Rule-driven payslips · Live dashboard · 5-role access control</span>
        </div>
      </div>
    </section>
  )
}
