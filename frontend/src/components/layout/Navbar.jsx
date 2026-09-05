import React, { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import './Navbar.scss'

const NAV_LINKS = [
  { label: 'Features', target: '#features' },
  { label: 'How It Works', target: '#process' },
  { label: 'Pricing', target: '#pricing' },
  { label: 'FAQ', target: '#faq' },
]

const Navbar = ({ onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const smoothScrollTo = (e, targetId) => {
    e.preventDefault()
    const target = document.querySelector(targetId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted()
    } else {
      navigate('/login')
    }
  }

  return (
    <header className={`navbar ${scrolled ? 'navbar--shrunk' : ''}`}>
      <div className="navbar-container">
        {/* Left: Brand Logo & Title */}
        <Link to="/" className="navbar-brand">
          <div className="brand-icon-wrapper">
            <img src={logo} alt="Pay365 Logo" className="brand-logo-img" />
          </div>
          <span className="brand-name">Pay365</span>
        </Link>

        {/* Center/Right: Navigation Links */}
        <nav className="navbar-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.target}
              href={link.target}
              className="nav-link"
              onClick={(e) => smoothScrollTo(e, link.target)}
            >
              {link.label}
            </a>
          ))}

          {/* Primary CTA: Get Started Button */}
          <button
            type="button"
            className="nav-btn-get-started"
            onClick={handleGetStarted}
          >
            <span>Get Started</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
