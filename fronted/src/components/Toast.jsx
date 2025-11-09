import React, { useEffect } from 'react'
import './Toast.css'

const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#10B981'
      case 'error':
        return '#EF4444'
      case 'warning':
        return '#F59E0B'
      case 'info':
      default:
        return '#667eea'
    }
  }

  return (
    <div 
      className="toast-notification"
      style={{ borderLeftColor: getBorderColor() }}
    >
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <span>{message}</span>
      </div>
      <button onClick={onClose} className="toast-close">×</button>
    </div>
  )
}

export default Toast

