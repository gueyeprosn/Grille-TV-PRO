/**
 * RegieHeader - En-tête fixe pour le mode Régie ON AIR
 * 
 * Affiche :
 * - Badge ON AIR (rouge broadcast)
 * - Heure serveur (HH:mm:ss)
 * - Jour + date
 * - Indicateur de connexion au backend
 */

import React, { useEffect, useState } from 'react'
import { Radio, Wifi, WifiOff, AlertCircle, X, LogOut, Lock, Unlock, Maximize2 } from 'lucide-react'
import { getApiBaseURL } from '../../lib/api'
import { useUIModeStore } from '../../lib/uiModeStore'
import { BROADCAST_TIME_ZONE } from '../../lib/broadcastClock'

interface RegieHeaderProps {
  onConnectionStatusChange?: (status: 'online' | 'offline' | 'error') => void
  isLocked?: boolean
  onLockToggle?: () => void
}

const RegieHeader: React.FC<RegieHeaderProps> = ({ onConnectionStatusChange, isLocked = false, onLockToggle }) => {
  const { setMode } = useUIModeStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const token = localStorage.getItem('token')

  const handleQuitRegie = () => {
    setMode('STANDARD')
  }

  // Mise à jour de l'heure chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Vérification du statut backend
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiBase = getApiBaseURL()
        const response = await fetch(`${apiBase}/health`, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: AbortSignal.timeout(3000)
        })
        
        if (response.ok) {
          setBackendStatus('online')
          onConnectionStatusChange?.('online')
        } else {
          setBackendStatus('offline')
          onConnectionStatusChange?.('offline')
        }
      } catch (error) {
        setBackendStatus('offline')
        onConnectionStatusChange?.('offline')
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 10000) // Vérifier toutes les 10 secondes
    return () => clearInterval(interval)
  }, [token, onConnectionStatusChange])

  // Détection du plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        console.warn('Impossible d\'activer le plein écran')
      })
    } else {
      document.exitFullscreen().catch(() => {
        console.warn('Impossible de quitter le plein écran')
      })
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      timeZone: BROADCAST_TIME_ZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      timeZone: BROADCAST_TIME_ZONE,
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10B981' // green-500
      case 'offline': return '#EF4444' // red-500
      case 'checking': return '#F59E0B' // amber-500
      default: return '#6B7280' // gray-500
    }
  }

  return (
    <header 
      className="regie-header"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        backgroundColor: '#020617', // slate-950
        borderBottom: '3px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        zIndex: 1000,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Badge ON AIR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#DC2626', // red-600
            padding: '0.5rem 1.5rem',
            borderRadius: '4px',
            boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
            animation: 'regie-pulse 2s ease-in-out infinite'
          }}
        >
          <Radio size={28} style={{ color: '#FFFFFF' }} />
          <span
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              letterSpacing: '2px',
              fontFamily: 'Helvetica, Arial, sans-serif'
            }}
          >
            ON AIR
          </span>
        </div>
      </div>

      {/* Heure et Date */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            fontFamily: 'monospace',
            letterSpacing: '1px'
          }}
        >
          {formatTime(currentTime)}
        </div>
        <div
          style={{
            fontSize: '18px',
            color: '#CBD5E1',
            fontWeight: '500'
          }}
        >
          {formatDate(currentTime)}
        </div>
      </div>

      {/* Indicateurs de connexion et bouton Quitter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Backend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(backendStatus),
              boxShadow: `0 0 10px ${getStatusColor(backendStatus)}`
            }}
          />
          <span style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
            Backend
          </span>
        </div>

        {/* Séparateur */}
        <div style={{ width: '1px', height: '40px', backgroundColor: '#1E293B' }} />

        {/* Bouton Plein écran */}
        <button
          onClick={handleFullscreen}
          disabled={isLocked}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: isFullscreen ? '#2563EB' : '#1E293B',
            border: `2px solid ${isFullscreen ? '#3B82F6' : '#475569'}`,
            padding: '0.75rem 1.25rem',
            borderRadius: '4px',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            opacity: isLocked ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isLocked) {
              e.currentTarget.style.backgroundColor = '#334155'
              e.currentTarget.style.borderColor = '#64748B'
              e.currentTarget.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isFullscreen ? '#2563EB' : '#1E293B'
            e.currentTarget.style.borderColor = isFullscreen ? '#3B82F6' : '#475569'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title={isFullscreen ? "Quitter le plein écran (F11)" : "Activer le plein écran (F11)"}
        >
          <Maximize2 size={18} />
        </button>

        {/* Bouton Verrouiller (seulement en plein écran) */}
        {isFullscreen && (
          <button
            onClick={onLockToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: isLocked ? '#DC2626' : '#1E293B',
              border: `2px solid ${isLocked ? '#EF4444' : '#475569'}`,
              padding: '0.75rem 1.25rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              boxShadow: isLocked ? '0 0 20px rgba(220, 38, 38, 0.5)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isLocked ? '#B91C1C' : '#334155'
              e.currentTarget.style.borderColor = isLocked ? '#DC2626' : '#64748B'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isLocked ? '#DC2626' : '#1E293B'
              e.currentTarget.style.borderColor = isLocked ? '#EF4444' : '#475569'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title={isLocked ? "Déverrouiller (L)" : "Verrouiller (L)"}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
        )}

        {/* Bouton Quitter Mode Régie */}
        <button
          onClick={handleQuitRegie}
          disabled={isLocked}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#1E293B',
            border: '2px solid #475569',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            opacity: isLocked ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isLocked) {
              e.currentTarget.style.backgroundColor = '#334155'
              e.currentTarget.style.borderColor = '#64748B'
              e.currentTarget.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1E293B'
            e.currentTarget.style.borderColor = '#475569'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="Quitter le mode Régie (Esc)"
        >
          <LogOut size={20} />
          <span>Quitter Régie</span>
        </button>
      </div>
    </header>
  )
}

export default RegieHeader
