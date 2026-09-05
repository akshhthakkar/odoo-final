import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './features/landing/pages/LandingPage.jsx'
import LoginPage from './features/auth/pages/LoginPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  )
}

export default App
