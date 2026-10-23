/**
 * Utilitaire de debouncing pour optimiser les performances
 */

/**
 * Crée une fonction debounced qui attend un délai avant d'exécuter
 * @param func Fonction à debouncer
 * @param wait Délai en millisecondes
 * @returns Fonction debounced
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Crée une fonction throttled qui limite la fréquence d'exécution
 * @param func Fonction à throttler
 * @param limit Limite en millisecondes
 * @returns Fonction throttled
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

