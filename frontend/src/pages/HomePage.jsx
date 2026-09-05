import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.jsx'
import './HomePage.scss'

const HomePage = () => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/login')
  }

  return (
    <div className="home-page">
      {/* Glassmorphic Navbar */}
      <Navbar onGetStarted={handleGetStarted} />
    </div>
  )
}

export default HomePage
