import React, { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import './Navbar.scss'

const Navbar = ({ onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false)

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
          <a href="#features" className="nav-link" onClick={(e) => smoothScrollTo(e, '#features')}>
            Features
          </a>
          <a href="#about" className="nav-link" onClick={(e) => smoothScrollTo(e, '#about')}>
            About Us
          </a>
          <a href="#client" className="nav-link" onClick={(e) => smoothScrollTo(e, '#client')}>
            Client
          </a>
          <a href="#pricing" className="nav-link" onClick={(e) => smoothScrollTo(e, '#pricing')}>
            Pricing
          </a>
          <a href="#faq" className="nav-link" onClick={(e) => smoothScrollTo(e, '#faq')}>
            FAQ
          </a>

          {/* Primary CTA: Get Started Button */}
          <button
            type="button"
            className="nav-btn-get-started"
            onClick={onGetStarted}
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
