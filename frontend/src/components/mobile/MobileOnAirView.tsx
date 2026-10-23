/**
 * MobileOnAirView - Vue dédiée ON AIR mobile (RÉGIE MOBILE)
 * Lisible à 1,5-2 mètres, aucun bouton dangereux, design broadcast
 */

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Radio, Clock } from 'lucide-react'
import type { Program } from '../AppModernV3'
import { isProgramToday } from '../../lib/broadcastDay'
import apiClient from '../../lib/api'

interface MobileOnAirViewProps {
  programs: Program[]
  currentDay: string
}

// Fonction helper pour calculer si un programme est ON AIR
const isProgramOnAir = (program: Program, currentTime: Date): boolean => {
  // Vérifier d'abord le statut opStatus
  if (program.opStatus === 'ON_AIR') {
    return true
  }

  // Sinon, calculer basé sur l'heure
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const todayIndex = currentTime.getDay()
  const todayName = days[todayIndex]
  
  // Vérifier si le programme est prévu aujourd'hui
  if (!program.days || !Array.isArray(program.days)) return false
  const isToday = program.days.includes(todayName) || program.days.includes(todayIndex.toString())
  if (!isToday) return false

  // Vérifier si l'heure actuelle est dans la plage du programme
  const [startH, startM] = program.start.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = program.end
    ? (() => {
        const [eH, eM] = program.end.split(':').map(Number)
        return eH * 60 + eM
      })()
    : startMinutes + 60

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

// Fonction helper pour trouver le programme suivant
const findNextProgram = (programs: Program[], currentTime: Date): Program | null => {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const todayIndex = currentTime.getDay()
  const todayName = days[todayIndex]
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()

  const todayPrograms = programs
    .filter(p => {
      if (!p.days || !Array.isArray(p.days)) return false
      return p.days.includes(todayName) || p.days.includes(todayIndex.toString())
    })
    .sort((a, b) => {
      const [aH, aM] = a.start.split(':').map(Number)
      const [bH, bM] = b.start.split(':').map(Number)
      return (aH * 60 + aM) - (bH * 60 + bM)
    })

  for (const prog of todayPrograms) {
    const [startH, startM] = prog.start.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    if (startMinutes > currentMinutes) {
      return prog
    }
  }

  return null
}

const MobileOnAirView: React.FC<MobileOnAirViewProps> = ({ programs, currentDay }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [onAirProgram, setOnAirProgram] = useState<Program | null>(null)
  const [nextProgram, setNextProgram] = useState<Program | null>(null)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState('')
  
  // Références pour éviter les requêtes multiples
  const loadingRef = useRef(false)
  const lastLoadTimeRef = useRef(0)
  const rateLimitBlockedRef = useRef(false)
  const rateLimitUntilRef = useRef(0)

  // Mise à jour de l'heure chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculer depuis les programmes locaux
  const calculateFromLocalPrograms = React.useCallback((currentTimeValue: Date) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const todayIndex = currentTimeValue.getDay()
    const todayName = days[todayIndex]

    // Jour de l'horloge uniquement : accepter ici le jour sélectionné dans la
    // vue semaine mettait à l'antenne des programmes d'un autre jour.
    const todayPrograms = programs.filter(p => isProgramToday(p, currentTimeValue))

    // Trouver le programme ON AIR
    const onAir = todayPrograms.find(p => isProgramOnAir(p, currentTimeValue)) || null
    setOnAirProgram(onAir)

    // Trouver le programme suivant
    const next = findNextProgram(todayPrograms, currentTimeValue)
    setNextProgram(next)
  }, [programs])

  // Charger les données depuis l'API broadcast ou calculer localement
  useEffect(() => {
    const loadBroadcastData = async () => {
      // Éviter les chargements multiples simultanés
      if (loadingRef.current) {
        return
      }

      // Vérifier si on est bloqué par le rate limiting
      const now = Date.now()
      if (rateLimitBlockedRef.current && now < rateLimitUntilRef.current) {
        // Utiliser le calcul local si on est bloqué
        calculateFromLocalPrograms(currentTime)
        return
      }

      // Debouncing : ne pas charger si déjà chargé il y a moins de 5 secondes
      if (now - lastLoadTimeRef.current < 5000) {
        return
      }

      loadingRef.current = true
      lastLoadTimeRef.current = now

      try {
        const token = localStorage.getItem('token')
        if (!token) {
          calculateFromLocalPrograms(currentTime)
          loadingRef.current = false
          return
        }

        let apiSuccess = false
        let has429Error = false
        let retryAfter = 0
        
        // Charger programme ON AIR
        try {
          const nowResponse = await apiClient.get('/v3/broadcast/now')
          if (nowResponse.data?.program) {
            setOnAirProgram(nowResponse.data.program)
            apiSuccess = true
          }
        } catch (e: any) {
          if (e.response?.status === 429) {
            has429Error = true
            const retryAfterHeader = e.response.headers['retry-after']
            if (retryAfterHeader) {
              retryAfter = Math.max(retryAfter, parseInt(retryAfterHeader, 10))
            }
          }
        }

        // Charger programme suivant
        try {
          const nextResponse = await apiClient.get('/v3/broadcast/next')
          if (nextResponse.data?.program) {
            setNextProgram(nextResponse.data.program)
            apiSuccess = true
          }
        } catch (e: any) {
          if (e.response?.status === 429) {
            has429Error = true
            const retryAfterHeader = e.response.headers['retry-after']
            if (retryAfterHeader) {
              retryAfter = Math.max(retryAfter, parseInt(retryAfterHeader, 10))
            }
          }
        }

        // Si erreur 429, bloquer les requêtes futures
        if (has429Error && retryAfter > 0) {
          rateLimitBlockedRef.current = true
          rateLimitUntilRef.current = now + (retryAfter * 1000)
          // Si le délai est > 60 secondes, ne plus essayer l'API
          if (retryAfter > 60) {
            console.warn(`⏳ Rate limit bloqué pour ${retryAfter}s, utilisation du fallback local uniquement`)
          }
        }

        // Si l'API n'a pas fonctionné, utiliser le calcul local
        if (!apiSuccess) {
          calculateFromLocalPrograms(currentTime)
        }
      } catch (error) {
        console.error('Erreur chargement broadcast:', error)
        // Fallback sur les programmes locaux
        calculateFromLocalPrograms(currentTime)
      } finally {
        loadingRef.current = false
      }
    }

    loadBroadcastData()
    // Rafraîchir toutes les 30 secondes (seulement si pas bloqué par rate limit)
    const interval = setInterval(() => {
      const now = Date.now()
      if (!rateLimitBlockedRef.current || now >= rateLimitUntilRef.current) {
        rateLimitBlockedRef.current = false
        loadBroadcastData()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [programs, currentDay, calculateFromLocalPrograms])

  // Recalculer ON AIR et suivant quand l'heure change (seulement pour les programmes locaux)
  useEffect(() => {
    if (programs.length > 0 && !rateLimitBlockedRef.current) {
      calculateFromLocalPrograms(currentTime)
    }
  }, [currentTime, programs, currentDay, calculateFromLocalPrograms])

  // Calculer la progression et le temps écoulé
  useEffect(() => {
    if (!onAirProgram) {
      setProgress(0)
      setElapsedTime('')
      return
    }

    const now = currentTime
    const [startH, startM] = onAirProgram.start.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = onAirProgram.end
      ? (() => {
          const [eH, eM] = onAirProgram.end!.split(':').map(Number)
          return eH * 60 + eM
        })()
      : startMinutes + 60

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const duration = endMinutes - startMinutes
    const elapsed = currentMinutes - startMinutes
    const progressValue = Math.min(100, Math.max(0, (elapsed / duration) * 100))
    setProgress(progressValue)

    // Calculer le temps écoulé
    if (elapsed >= 0) {
      const hours = Math.floor(elapsed / 60)
      const minutes = elapsed % 60
      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}min`)
      } else {
        setElapsedTime(`${minutes}min`)
      }
    } else {
      setElapsedTime('')
    }
  }, [onAirProgram, currentTime])

  const formatTime = (time: string) => {
    const [h, m] = time.split(':')
    return `${h}:${m}`
  }

  const getRemainingTime = () => {
    if (!onAirProgram) return null
    const now = currentTime
    const [startH, startM] = onAirProgram.start.split(':').map(Number)
    const endMinutes = onAirProgram.end
      ? (() => {
          const [eH, eM] = onAirProgram.end!.split(':').map(Number)
          return eH * 60 + eM
        })()
      : startH * 60 + startM + 60
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const remaining = endMinutes - currentMinutes
    if (remaining <= 0) return null
    const hours = Math.floor(remaining / 60)
    const minutes = remaining % 60
    if (hours > 0) return `${hours}h ${minutes}min`
    return `${minutes} min`
  }

  const getTypeLabel = (type?: string) => {
    if (!type) return 'PAD'
    const upper = type.toUpperCase()
    if (upper === 'LIVE' || upper === 'DIRECT') return 'Direct'
    if (upper === 'REPLAY' || upper === 'REDIFFUSION') return 'Replay'
    if (upper === 'ADS' || upper === 'COMMERCIAL') return 'Commercial'
    if (upper === 'SPECIAL') return 'Spécial'
    return type
  }

  // État vide : aucun programme ON AIR
  if (!onAirProgram) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-full pb-20 px-4"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
      >
        <Radio className="w-20 h-20 text-[var(--text-secondary)] mb-6" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-3">Aucun programme ON AIR</h2>
        <p className="text-base text-[var(--text-secondary)] text-center max-w-sm">
          Aucun programme n'est actuellement en diffusion
        </p>
        {nextProgram && (
          <div className="mt-8 p-4 rounded-lg max-w-sm" style={{ backgroundColor: 'var(--card-bg-solid)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">⏭ Prochain : {nextProgram.title}</span>
            </div>
            <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
              {formatTime(nextProgram.start)} – {nextProgram.end ? formatTime(nextProgram.end) : '?'}
            </div>
          </div>
        )}
        {programs.length > 0 && (
          <p className="text-xs text-[var(--text-secondary)] text-center mt-4">
            {programs.length} programme{programs.length > 1 ? 's' : ''} dans la grille
          </p>
        )}
      </div>
    )
  }

  return (
    <div 
      className="flex flex-col h-full pb-20 safe-area-bottom overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg)',
        minHeight: '100%',
      }}
    >
      {/* Header - EN DIRECT (fixe) */}
      <div 
        className="sticky top-0 z-10 border-b px-4 py-4 safe-area-top"
        style={{ 
          backgroundColor: 'var(--card-bg-solid)',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider"
              style={{ 
                backgroundColor: '#C1121F', 
                color: '#FFFFFF',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              <Radio className="w-5 h-5" />
              EN DIRECT
            </span>
          </div>
          <span className="font-mono text-xl font-bold text-[var(--text-primary)]">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
          {formatTime(onAirProgram.start)} – {onAirProgram.end ? formatTime(onAirProgram.end) : '?'}
        </div>
      </div>

      {/* Contenu principal - Scrollable, lisible à 1-2m */}
      <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Programme ON AIR - Design critique, très gros, full screen */}
        <div 
          className="mb-8 p-8 rounded-2xl border-4 border-white shadow-2xl"
          style={{
            backgroundColor: '#C1121F',
            color: '#FFFFFF',
            boxShadow: '0 0 40px rgba(193, 18, 31, 0.7)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          <h1 className="text-4xl font-bold mb-6 leading-tight" style={{ fontSize: 'clamp(28px, 8vw, 48px)' }}>
            {onAirProgram.title}
          </h1>
          
          {onAirProgram.category && (
            <div className="mb-4">
              <span className="inline-block px-4 py-2 rounded-lg text-lg font-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                {onAirProgram.category}
              </span>
            </div>
          )}
          
          <div className="text-2xl font-semibold">
            {getTypeLabel(onAirProgram.typeDiffusion || onAirProgram.type)}
          </div>
        </div>

        {/* Barre de progression temps réel - Plus visible */}
        <div className="mb-8">
          <div 
            className="h-8 rounded-full overflow-hidden mb-4"
            style={{ backgroundColor: 'var(--surface-hover)' }}
          >
            <div
              className="h-full transition-all duration-1000"
              style={{ 
                width: `${progress}%`,
                backgroundColor: '#C1121F',
                boxShadow: '0 0 20px rgba(193, 18, 31, 0.8)',
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                {Math.round(progress)}%
              </span>
              {elapsedTime && (
                <span className="font-mono text-base text-[var(--text-secondary)] mt-1">
                  Écoulé : {elapsedTime}
                </span>
              )}
            </div>
            {getRemainingTime() && (
              <div className="flex flex-col items-end">
                <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                  Restant : {getRemainingTime()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Programme suivant - Plus visible */}
        {nextProgram && (
          <div 
            className="p-6 rounded-xl border-2"
            style={{ 
              backgroundColor: 'var(--card-bg-solid)',
              borderColor: '#F59E0B',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-lg font-semibold text-[var(--text-primary)]">⏭ Programme suivant</span>
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">{nextProgram.title}</h3>
            <div className="font-mono text-xl font-bold text-[var(--text-primary)] mb-3">
              {formatTime(nextProgram.start)} – {nextProgram.end ? formatTime(nextProgram.end) : '?'}
            </div>
            {nextProgram.category && (
              <div className="mt-2">
                <span className="text-base px-3 py-1.5 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                  {nextProgram.category}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileOnAirView
