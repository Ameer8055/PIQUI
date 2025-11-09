import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../utils/toast'

const ProgressTrackerRedirect = ({ user }) => {
  const navigate = useNavigate()

  useEffect(() => {
    // Show toast and redirect back to dashboard
    toast.info('This page is under production. Coming soon!', 5000)
    
    // Redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      navigate('/dashboard')
    }, 500)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ 
        textAlign: 'center', 
        color: 'white',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚧</div>
        <h1 style={{ marginBottom: '1rem' }}>Under Production</h1>
        <p>This page is currently under development. Please check back soon!</p>
        <p style={{ marginTop: '1rem', opacity: 0.8 }}>Redirecting to dashboard...</p>
      </div>
    </div>
  )
}

export default ProgressTrackerRedirect

