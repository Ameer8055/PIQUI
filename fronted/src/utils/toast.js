// Toast utility for managing multiple toasts
let toastContainer = null
let toastId = 0
const toasts = []

export const showToast = (message, type = 'info', duration = 4000) => {
  if (!toastContainer) {
    // Create toast container if it doesn't exist
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    toastContainer.style.cssText = `
      position: fixed;
      top: 90px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `
    document.body.appendChild(toastContainer)
  }

  const id = toastId++
  const toast = document.createElement('div')
  toast.className = 'toast-notification'
  toast.dataset.toastId = id

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': default: return 'ℹ️'
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case 'success': return '#10B981'
      case 'error': return '#EF4444'
      case 'warning': return '#F59E0B'
      case 'info': default: return '#667eea'
    }
  }

  toast.style.cssText = `
    position: relative;
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 12px;
    border-left: 4px solid ${getBorderColor()};
    max-width: 400px;
    min-width: 300px;
    pointer-events: auto;
    animation: slideInRight 0.3s ease;
  `

  toast.innerHTML = `
    <div class="toast-icon" style="font-size: 1.5rem; flex-shrink: 0;">${getIcon()}</div>
    <div class="toast-content" style="flex: 1;">
      <span style="color: #1f2937; font-size: 0.95rem; line-height: 1.4;">${message}</span>
    </div>
    <button class="toast-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af; padding: 4px; border-radius: 4px; line-height: 1; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">×</button>
  `

  const closeToast = () => {
    toast.style.animation = 'slideOutRight 0.3s ease'
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
      const index = toasts.findIndex(t => t.id === id)
      if (index > -1) {
        toasts.splice(index, 1)
      }
    }, 300)
  }

  toast.querySelector('.toast-close').addEventListener('click', closeToast)

  toastContainer.appendChild(toast)
  toasts.push({ id, toast, closeToast })

  if (duration > 0) {
    setTimeout(closeToast, duration)
  }

  return { id, close: closeToast }
}

// Convenience methods
export const toast = {
  success: (message, duration) => showToast(message, 'success', duration),
  error: (message, duration) => showToast(message, 'error', duration),
  warning: (message, duration) => showToast(message, 'warning', duration),
  info: (message, duration) => showToast(message, 'info', duration),
}

