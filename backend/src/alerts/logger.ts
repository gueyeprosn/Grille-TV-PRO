/**
 * Système de logging pour les alertes
 * Centralise les logs avec formatage et niveaux
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
}

const logs: LogEntry[] = []
const MAX_LOGS = 1000 // Garder les 1000 derniers logs en mémoire

/**
 * Log une entrée
 */
function log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      ...(context && { context }),
      ...(error && { error }),
    }

  logs.push(entry)
  
  // Limiter la taille du tableau
  if (logs.length > MAX_LOGS) {
    logs.shift()
  }

  // Afficher dans la console selon le niveau
  const timestamp = entry.timestamp.toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  const errorStr = error ? ` Error: ${error.message}` : ''

  switch (level) {
    case LogLevel.DEBUG:
      console.log(`[${timestamp}] [DEBUG] ${message}${contextStr}${errorStr}`)
      break
    case LogLevel.INFO:
      console.log(`[${timestamp}] [INFO] ${message}${contextStr}`)
      break
    case LogLevel.WARN:
      console.warn(`[${timestamp}] [WARN] ${message}${contextStr}${errorStr}`)
      break
    case LogLevel.ERROR:
      console.error(`[${timestamp}] [ERROR] ${message}${contextStr}${errorStr}`)
      if (error?.stack) {
        console.error(error.stack)
      }
      break
  }
}

/**
 * Logs publics
 */
export const alertLogger = {
  debug: (message: string, context?: Record<string, any>) => {
    log(LogLevel.DEBUG, message, context)
  },
  
  info: (message: string, context?: Record<string, any>) => {
    log(LogLevel.INFO, message, context)
  },
  
  warn: (message: string, context?: Record<string, any>, error?: Error) => {
    log(LogLevel.WARN, message, context, error)
  },
  
  error: (message: string, context?: Record<string, any>, error?: Error) => {
    log(LogLevel.ERROR, message, context, error)
  },
  
  /**
   * Récupère les logs récents
   */
  getRecentLogs: (limit: number = 100): LogEntry[] => {
    return logs.slice(-limit)
  },
  
  /**
   * Récupère les logs par niveau
   */
  getLogsByLevel: (level: LogLevel, limit: number = 100): LogEntry[] => {
    return logs.filter(log => log.level === level).slice(-limit)
  },
  
  /**
   * Nettoie les logs
   */
  clear: () => {
    logs.length = 0
  },
}

