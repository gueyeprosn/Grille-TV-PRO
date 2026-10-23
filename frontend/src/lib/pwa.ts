/**
 * PWA Utilities - Enregistrement et gestion du Service Worker
 * Note: Avec vite-plugin-pwa, le service worker est généré automatiquement
 */

// Fonction pour demander l'installation de la PWA
export async function promptInstall(): Promise<boolean> {
  // Vérifier si l'app peut être installée
  if (!window.deferredPrompt) {
    return false
  }

  // Afficher le prompt d'installation
  const promptEvent = window.deferredPrompt as any
  promptEvent.prompt()

  // Attendre la réponse de l'utilisateur
  const { outcome } = await promptEvent.userChoice

  // Nettoyer
  window.deferredPrompt = null

  return outcome === 'accepted'
}

// Vérifier si l'app est installée
export function isInstalled(): boolean {
  // Sur mobile, vérifier si l'app est en mode standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  // Sur desktop, vérifier si l'app est installée
  if ((window.navigator as any).standalone) {
    return true
  }

  return false
}

// Déclarer le type pour window.deferredPrompt
declare global {
  interface Window {
    deferredPrompt?: any
  }
}
