import React from 'react'
import useReveal from '../hooks/useReveal.js'

const STEPS = [
  {
    num: '01',
    title: 'Build Your Org',
    body: 'Add employees, departments, contracts, and working schedules. Weekly hours compute themselves.',
  },
  {
    num: '02',
    title: 'Track Time & Leave',
    body: 'Attendance and time off capture the daily reality — with balances that update on approval.',
  },
  {
    num: '03',
    title: 'Configure Salary Rules',
    body: 'Set up your structure once: basic, allowances, deductions — fixed, percentage, or formula, in execution order.',
  },
  {
    num: '04',
    title: 'Run the Payrun',
    body: 'Select the period and your people. Compute, review warnings, validate, mark paid, send payslips.',
  },
]

export default function ProcessSteps() {
  const ref = useReveal()

  return (
    <section id="process" className="lp-section">
      <div className="lp-container">
        <div className="reveal" ref={ref}>
          <span className="lp-eyebrow">How It Works</span>
          <h2 className="lp-heading">From Setup to Payslip in 4 Steps</h2>
          <div className="lp-steps-grid">
            {STEPS.map((step) => (
              <article className="lp-step" key={step.num}>
                <div className="lp-step-num">{step.num}</div>
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-body">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
