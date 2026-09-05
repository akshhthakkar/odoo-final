import React from 'react'
import Navbar from '../components/layout/Navbar.jsx'
import './HomePage.scss'

const HomePage = () => {
  const handleGetStarted = () => {
    // Handler for Get Started button
  }

  return (
    <div className="home-page">
      {/* Glassmorphic Navbar */}
      <Navbar onGetStarted={handleGetStarted} />
    </div>
  )
}

export default HomePage
