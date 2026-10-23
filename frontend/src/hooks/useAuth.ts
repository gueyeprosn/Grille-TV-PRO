import { useState, useEffect } from 'react'

interface User {
  email?: string
  displayName?: string
  role?: 'ADMIN' | 'PROGRAMMER' | 'PRODUCTION' | 'COMMERCIAL' | 'DIRECTION' | 'VIEWER' | 'REGIE'
  id?: string
}

function decodeJwtPayload(token: string): any {
  const segment = token.split('.')[1]
  if (!segment) throw new Error('Jeton JWT invalide')
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=')
  const raw = atob(padded)
  const utf8 = Array.from(raw)
    .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
  return JSON.parse(decodeURIComponent(utf8))
}

// Fonction pour charger l'utilisateur local depuis localStorage
function loadLocalUser(): User | null {
  try {
    const localUserStr = localStorage.getItem('localUser')
    const token = localStorage.getItem('token')
    
    if (localUserStr && token) {
      const localUser = JSON.parse(localUserStr)
      // Décoder le JWT pour obtenir le rôle
      try {
        const payload = decodeJwtPayload(token)
        return {
          email: localUser.email,
          displayName: localUser.displayName,
          role: payload.role || localUser.role || 'PROGRAMMER',
          id: localUser.uid || localUser.id,
        }
      } catch {
        return {
          email: localUser.email,
          displayName: localUser.displayName,
          role: localUser.role || 'PROGRAMMER',
          id: localUser.uid || localUser.id,
        }
      }
    }
  } catch (error) {
    console.error('Erreur chargement utilisateur local:', error)
  }
  return null
}

// Déconnexion du compte local
function logoutUser() {
  console.log('🔴 Déconnexion en cours...')
  
  try {
    // Déconnexion locale
    localStorage.removeItem('localUser')
    localStorage.removeItem('token')
    console.log('✅ Token et utilisateur supprimés du localStorage')
    
    // Rediriger vers la page de connexion avec le base path
    const basePath = import.meta.env.BASE_URL || '/'
    console.log('📍 Base path:', basePath)
    
    // Utiliser window.location.href pour forcer le rechargement complet
    const redirectPath = basePath === '/' || basePath === '' ? '/' : basePath
    console.log('🔄 Redirection vers:', redirectPath)
    
    // Forcer le rechargement complet de la page immédiatement
    window.location.href = redirectPath
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion:', error)
    // Forcer la déconnexion même en cas d'erreur
    localStorage.removeItem('localUser')
    localStorage.removeItem('token')
    const basePath = import.meta.env.BASE_URL || '/'
    window.location.href = basePath === '/' ? '/' : basePath
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier d'abord l'utilisateur local
    const localUser = loadLocalUser()
    if (localUser) {
      setUser(localUser)
      setLoading(false)
      return
    }

    setUser(null)
    setLoading(false)

    const handleLocalAuth = (event: CustomEvent) => {
      const localUser = event.detail
      setUser({
        email: localUser.email,
        displayName: localUser.displayName,
        role: localUser.role || 'PROGRAMMER',
        id: localUser.uid || localUser.id,
      })
      setLoading(false)
    }

    window.addEventListener('localAuth', handleLocalAuth as EventListener)
    return () => window.removeEventListener('localAuth', handleLocalAuth as EventListener)
  }, [])

  const hasRole = (roles: string[]) => {
    if (!user) return false
    return roles.includes(user.role || '')
  }

  const isAdmin = () => hasRole(['ADMIN'])
  const canProgram = () => hasRole(['ADMIN', 'PROGRAMMER'])
  const canProduce = () => hasRole(['ADMIN', 'PRODUCTION'])
  const canCommercial = () => hasRole(['ADMIN', 'COMMERCIAL'])
  const canView = () => hasRole(['ADMIN', 'PROGRAMMER', 'PRODUCTION', 'COMMERCIAL', 'DIRECTION', 'VIEWER', 'REGIE'])

  return {
    user,
    loading,
    userRole: user?.role,
    hasRole,
    isAdmin,
    canProgram,
    canProduce,
    canCommercial,
    canView,
    logout: logoutUser,
  }
}

export { logoutUser }

