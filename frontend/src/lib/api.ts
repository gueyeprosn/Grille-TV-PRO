/**
 * Configuration axios avec support du base path /grille/
 */
import axios from 'axios'

// Déterminer le baseURL en fonction de l'environnement
export const getApiBaseURL = () => {
  // En production avec base path /grille/, utiliser /grille/api
  if (import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/') {
    // Utiliser /grille/api pour la production
    return '/grille/api'
  }
  // En développement ou sans base path, utiliser /api
  return '/api'
}

const getBaseURL = getApiBaseURL

// Instance axios configurée
export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 secondes de timeout
})

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Fonction helper pour retry avec backoff exponentiel
const retryRequest = async (config: any, retries = 3, delay = 1000): Promise<any> => {
  try {
    return await axios(config)
  } catch (error: any) {
    if (error.response?.status === 429 && retries > 0) {
      // Attendre avec backoff exponentiel
      const retryDelay = delay * Math.pow(2, 3 - retries)
      console.log(`⏳ Rate limit atteint, retry dans ${retryDelay}ms...`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      return retryRequest(config, retries - 1, delay)
    }
    throw error
  }
}

// Compteur pour éviter les retries multiples simultanés
let retryInProgress = false

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token')
      localStorage.removeItem('localUser')
      window.location.reload()
    }
    
    // Gestion des erreurs 429 (Too Many Requests) avec retry intelligent
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      // Le header retry-after est en secondes
      const delaySeconds = retryAfter ? parseInt(retryAfter, 10) : 2
      const delayMs = delaySeconds * 1000
      
      // Ne pas retry automatiquement si le délai est trop long (> 60 secondes)
      // Dans ce cas, on laisse l'application gérer le retry manuellement
      if (delaySeconds > 60) {
        console.warn(`⏳ Rate limit atteint, délai trop long (${delaySeconds}s ≈ ${Math.round(delaySeconds / 60)}min). Pas de retry automatique. Veuillez réessayer plus tard.`)
        return Promise.reject(error)
      }
      
      // Éviter les retries multiples simultanés
      if (retryInProgress) {
        console.log('⏸️ Retry déjà en cours, abandon de cette requête')
        return Promise.reject(error)
      }
      
      retryInProgress = true
      console.log(`⏳ Rate limit atteint, attente de ${delaySeconds}s avant retry automatique...`)
      
      try {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        retryInProgress = false
        return await axios(error.config)
      } catch (retryError) {
        retryInProgress = false
        // Si le retry échoue aussi, on rejette l'erreur
        console.error('❌ Retry échoué après rate limit:', retryError)
        return Promise.reject(error)
      }
    }
    
    return Promise.reject(error)
  }
)

export default apiClient

