/**
 * Module de cache Redis (optionnel)
 * 
 * Si Redis n'est pas configuré, le cache est désactivé automatiquement
 */

let redisClient: any = null

/**
 * Initialise le client Redis si disponible
 */
async function initRedis() {
  if (redisClient) return redisClient
  
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.log('⚠️  Redis non configuré - cache désactivé')
    return null
  }
  
  try {
    const Redis = require('ioredis')
    redisClient = new Redis(redisUrl)
    
    redisClient.on('error', (err: Error) => {
      console.warn('⚠️  Erreur Redis:', err.message)
      redisClient = null
    })
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connecté')
    })
    
    return redisClient
  } catch (error) {
    console.warn('⚠️  Redis non disponible - cache désactivé')
    return null
  }
}

/**
 * Récupère une valeur depuis le cache ou exécute la fonction
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const redis = await initRedis()
  
  if (!redis) {
    // Pas de cache - exécuter directement
    return fetcher()
  }
  
  try {
    const cached = await redis.get(key)
    if (cached) {
      console.log(`✅ Cache hit: ${key}`)
      return JSON.parse(cached)
    }
  } catch (error) {
    console.warn(`⚠️  Erreur cache (get): ${error}`)
  }
  
  console.log(`❌ Cache miss: ${key}`)
  const data = await fetcher()
  
  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (error) {
    console.warn(`⚠️  Erreur cache (set): ${error}`)
  }
  
  return data
}

/**
 * Invalide le cache selon un pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = await initRedis()
  
  if (!redis) {
    return
  }
  
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`🗑️  Cache invalidé: ${pattern} (${keys.length} clés)`)
    }
  } catch (error) {
    console.warn(`⚠️  Erreur cache (invalidate): ${error}`)
  }
}

/**
 * Vide tout le cache
 */
export async function clearCache(): Promise<void> {
  const redis = await initRedis()
  
  if (!redis) {
    return
  }
  
  try {
    await redis.flushdb()
    console.log('🗑️  Cache vidé')
  } catch (error) {
    console.warn(`⚠️  Erreur cache (clear): ${error}`)
  }
}

