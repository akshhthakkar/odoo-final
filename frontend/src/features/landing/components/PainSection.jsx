import React from 'react'
import { FolderX, Calculator, CalendarX } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'

const PAINS = [
  {
    icon: FolderX,
    title: 'Disconnected Records',
    body: 'Employees, contracts, and attendance live in different files. Payroll spends its days stitching them together by hand.',
  },
  {
    icon: Calculator,
    title: 'Manual Salary Math',
    body: 'Every allowance, deduction, and formula recalculated by hand each month — and one wrong cell becomes a wrong payslip.',
  },
  {
    icon: CalendarX,
    title: 'Leave Balance Chaos',
    body: "Approvals in chat, balances in someone's head. Nobody knows who has how many days left until it's already gone.",
  },
]

export default function PainSection() {
  const ref = useReveal()

  return (
    <section id="pain" className="lp-section">
      <div className="lp-container">
        <div className="reveal" ref={ref}>
          <span className="lp-eyebrow">The Problem</span>
          <h2 className="lp-heading">Why HR Teams Still Live in Spreadsheets</h2>
          <div className="lp-pain-grid">
            {PAINS.map(({ icon: Icon, title, body }) => (
              <article className="lp-card" key={title}>
                <div className="lp-card-icon">
                  <Icon size={22} strokeWidth={2.2} />
                </div>
                <h3 className="lp-card-title">{title}</h3>
                <p className="lp-card-body">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
