/**
 * Service Worker pour GrilleTV Pro PWA
 * Cache des assets pour fonctionnement offline
 */

const CACHE_NAME = 'grilletv-pro-v1.0.0'
const RUNTIME_CACHE = 'grilletv-runtime-v1.0.0'

// Assets à mettre en cache immédiatement
const PRECACHE_ASSETS = [
  '/grille/',
  '/grille/index.html',
  '/grille/manifest.json',
]

// Base path pour les assets
const BASE_PATH = '/grille'

// Install - Mise en cache des assets critiques
self.addEventListener('install', (event) => {
  console.log('[SW] Installation du service worker')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des assets critiques')
        // Ajouter les assets avec gestion d'erreur
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Impossible de mettre en cache ${url}:`, err)
            })
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})

// Activate - Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation du service worker')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Suppression de l\'ancien cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch - Stratégie Cache First pour assets, Network First pour API
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return
  }

  // Stratégie Network First pour les API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache les réponses API réussies
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          return response
        })
        .catch(() => {
          // Si réseau échoue, essayer le cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Retourner une réponse par défaut si pas de cache
            return new Response(
              JSON.stringify({ error: 'Offline - Données non disponibles' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          })
        })
    )
    return
  }

  // Stratégie Cache First pour les assets statiques
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        // Si pas en cache, fetch depuis le réseau
        return fetch(request)
          .then((response) => {
            // Ne mettre en cache que les réponses valides
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            const responseToCache = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })

            return response
          })
          .catch(() => {
            // Si offline et pas de cache, retourner une page offline pour HTML
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match(`${BASE_PATH}/index.html`) || caches.match('/grille/index.html')
            }
            return new Response('Offline', { status: 503 })
          })
      })
  )
})

// Message handler pour mise à jour du cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

