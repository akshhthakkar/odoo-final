import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'

const FAQS = [
  {
    q: 'How are payslips calculated?',
    a: 'By salary rules you configure — fixed amounts, percentages of any earlier rule, or formulas. Rules execute in sequence, and every payslip line shows exactly which rule produced it.',
  },
  {
    q: 'What happens if employee data is incomplete?',
    a: "Pay365 warns before it hurts: missing bank details, missing contracts, or duplicate payslips are surfaced as warnings on the payrun before you're allowed to validate.",
  },
  {
    q: 'Does payroll use the right contract?',
    a: 'Yes. Payslips always use the active contract valid for the pay period. If none or several match, the payrun raises an error instead of guessing.',
  },
  {
    q: 'Who can see what?',
    a: 'Five roles with enforced boundaries: employees see their own data, HR managers run people operations, payroll users run payruns, and payroll managers control salary config and finalization.',
  },
  {
    q: 'Is the dashboard real data?',
    a: 'Every KPI, chart, and alert is a live query over employees, attendance, leave, and payroll records — filtered by period, department, and employee type.',
  },
]

export default function FaqAccordion() {
  const ref = useReveal()
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="lp-section">
      <div className="lp-container">
        <div className="reveal" ref={ref}>
          <span className="lp-eyebrow">FAQ</span>
          <h2 className="lp-heading">Frequently Asked Questions</h2>
          <div className="lp-faq">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index
              return (
                <div className={`lp-faq-item${isOpen ? ' is-open' : ''}`} key={faq.q}>
                  <button
                    type="button"
                    className="lp-faq-q"
                    id={`faq-button-${index}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className="lp-faq-chevron" />
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-button-${index}`}
                    className="lp-faq-a"
                    hidden={!isOpen}
                  >
                    <p>{faq.a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
