import React from 'react'
import ReactDOM from 'react-dom/client'
// Point d’entrée de l’interface GrilleTV Pro V4
import AppModernV3 from './components/AppModernV3'
import './styles.css'
import './styles-responsive.css'
import './styles/mobile-broadcast.css'

// Marquer le body comme chargé pour éviter le FOUC
document.body.classList.add('loaded')

// Écouter l'événement beforeinstallprompt pour l'installation
window.addEventListener('beforeinstallprompt', (e) => {
  // Empêcher le prompt automatique
  e.preventDefault()
  // Stocker l'événement pour l'utiliser plus tard
  window.deferredPrompt = e
  console.log('[PWA] Prompt d\'installation disponible')
})

// Déclarer le type pour window.deferredPrompt
declare global {
  interface Window {
    deferredPrompt?: any
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppModernV3 />
  </React.StrictMode>,
)
