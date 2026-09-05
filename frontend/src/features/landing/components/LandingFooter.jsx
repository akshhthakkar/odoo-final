import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../../../assets/logo.svg'

const PRODUCT_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#process' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">
                <img src={logo} alt="Pay365 logo" />
              </div>
              <span className="lp-footer-brandname">Pay365</span>
            </div>
            <p className="lp-footer-tagline">
              Modern HR &amp; Payroll Operations Platform — from employee master data to
              validated payslips.
            </p>
          </div>
          <div className="lp-footer-col">
            <h4>Product</h4>
            <ul>
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>Get Started</h4>
            <ul>
              <li>
                <Link to="/login">Launch App</Link>
              </li>
              <li>
                <Link to="/login">Demo Logins</Link>
              </li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>Contact</h4>
            <ul>
              <li>
                <a href="mailto:hello@pay365.dev">Support</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>All Rights Reserved &copy; 2026 Pay365</span>
          <span>Built for the PeoplePay365 HR &amp; Payroll hackathon brief.</span>
        </div>
      </div>
    </footer>
  )
}
