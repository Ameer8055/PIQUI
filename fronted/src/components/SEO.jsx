import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SEO = ({ 
  title, 
  description, 
  keywords, 
  image, 
  type = 'website',
  noindex = false 
}) => {
  const location = useLocation()
  const siteUrl = 'https://piqui-iota.vercel.app'
  const currentUrl = `${siteUrl}${location.pathname}`
  const defaultImage = `${siteUrl}/pwa-512x512.png`

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title
    }

    // Update or create meta tags
    const updateMetaTag = (name, content, attribute = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // Basic meta tags
    if (description) {
      updateMetaTag('description', description)
      updateMetaTag('og:description', description, 'property')
      updateMetaTag('twitter:description', description, 'property')
    }

    if (keywords) {
      updateMetaTag('keywords', keywords)
    }

    // Open Graph tags
    updateMetaTag('og:title', title || 'PIQUI - Your Ultimate Quiz Destination', 'property')
    updateMetaTag('og:type', type, 'property')
    updateMetaTag('og:url', currentUrl, 'property')
    updateMetaTag('og:image', image || defaultImage, 'property')

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', 'property')
    updateMetaTag('twitter:title', title || 'PIQUI - Your Ultimate Quiz Destination', 'property')
    updateMetaTag('twitter:image', image || defaultImage, 'property')

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', currentUrl)

    // Robots meta
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow')
    } else {
      updateMetaTag('robots', 'index, follow')
    }
  }, [title, description, keywords, image, type, currentUrl, defaultImage, noindex])

  return null
}

export default SEO

