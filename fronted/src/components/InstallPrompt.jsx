import { useEffect, useState } from 'react'

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="install-prompt">
      <div className="prompt-content">
        <h3>📱 Install PSC Quiz App</h3>
        <p>Get the best experience with our app!</p>
        <div className="prompt-actions">
          <button onClick={installApp} className="install-btn">
            Install Now
          </button>
          <button 
            onClick={() => setShowPrompt(false)} 
            className="cancel-btn"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}