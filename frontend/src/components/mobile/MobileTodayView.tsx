/**
 * MobileTodayView - Écran "Aujourd'hui" mobile (CRITIQUE)
 * Équivalent fonctionnel de la vue semaine desktop
 * ON AIR prioritaire, timeline complète, badges statuts broadcast
 */

import React, { useMemo, useEffect, useState, useRef } from 'react'
import { Clock, Radio } from 'lucide-react'
import type { Program } from '../AppModernV3'
import { isProgramToday } from '../../lib/broadcastDay'
import MobileOnAirCard from './MobileOnAirCard'
import ProgramTimelineItem from './ProgramTimelineItem'
import apiClient from '../../lib/api'

interface MobileTodayViewProps {
  programs: Program[]
  /** Jour sélectionné dans la vue semaine. Conservé pour les appelants ;
   *  il ne sert pas à déterminer « aujourd'hui » (voir lib/broadcastDay). */
  currentDay?: string
  onProgramTap?: (program: Program) => void
}

// Configuration des statuts broadcast (identique au desktop)
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PLANNED: { label: 'Planifié', color: 'var(--text-secondary)', bgColor: 'rgba(148, 163, 184, 0.1)' },
  CONFIRMED: { label: 'Confirmé', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  IN_PRODUCTION: { label: 'En prod', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
  READY: { label: 'Prêt', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  ON_AIR: { label: 'ON AIR', color: '#C1121F', bgColor: 'rgba(193, 18, 31, 0.15)' },
  DONE: { label: 'Terminé', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
  CANCELED: { label: 'Annulé', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)' },
  DELAYED: { label: 'En retard', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
  OVERRUN: { label: 'Dépassement', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  SKIPPED: { label: 'Sauté', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
  MANUAL_OVERRIDE: { label: 'Override', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
}

// Fonction helper pour calculer si un programme est ON AIR
const isProgramOnAir = (program: Program, currentTime: Date): boolean => {
  // Vérifier d'abord le statut opStatus
  if (program.opStatus === 'ON_AIR') {
    return true
  }

  // Sinon, calculer basé sur l'heure
  if (!isProgramToday(program, currentTime)) return false

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
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()

  const todayPrograms = programs
    .filter(p => isProgramToday(p, currentTime))
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

const MobileTodayView: React.FC<MobileTodayViewProps> = ({
  programs,
  onProgramTap,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [onAirProgram, setOnAirProgram] = useState<Program | null>(null)
  const [nextProgram, setNextProgram] = useState<Program | null>(null)
  const [todayPrograms, setTodayPrograms] = useState<Program[]>([])
  
  // Calculer le jour actuel à partir de currentTime pour synchronisation
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const actualCurrentDay = days[currentTime.getDay()]
  
  // Références pour éviter les requêtes multiples
  const loadingRef = useRef(false)
  const lastLoadTimeRef = useRef(0)
  const rateLimitBlockedRef = useRef(false)
  const rateLimitUntilRef = useRef(0)
  const apiNextProgramRef = useRef<Program | null>(null)

  // Mise à jour de l'heure chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculer les programmes du jour et ON AIR depuis les programmes locaux
  const calculateFromLocalPrograms = React.useCallback((currentTimeValue: Date) => {
    // Le jour retenu est celui de l'horloge. Le jour sélectionné dans la vue
    // semaine n'intervient pas : l'accepter ici affichait des programmes d'un
    // autre jour dans la liste « Aujourd'hui ».
    const filtered = programs.filter(p => isProgramToday(p, currentTimeValue))

    // Conserver la référence précédente quand la liste n'a pas changé.
    // Un effet plus bas rappelle ce calcul tant que la liste est vide ; renvoyer
    // un nouveau tableau à chaque fois y provoquait une boucle de rendu infinie
    // les jours sans programme.
    setTodayPrograms(prev => {
      if (prev.length === filtered.length && prev.every((p, i) => p.id === filtered[i]?.id)) {
        return prev
      }
      return filtered
    })

    // Trouver le programme ON AIR
    const onAir = filtered.find(p => isProgramOnAir(p, currentTimeValue)) || null
    setOnAirProgram(onAir)

    // Trouver le programme suivant
    const next = findNextProgram(filtered, currentTimeValue)
    if (!apiNextProgramRef.current) setNextProgram(next)
  }, [programs])

  // Charger les données broadcast avec gestion du rate limiting
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
        let nowProgramFromApi: Program | null = null
        let nextProgramFromApi: Program | null = null
        apiNextProgramRef.current = null
        
        // Charger programme ON AIR
        try {
          const nowResponse = await apiClient.get('/v3/broadcast/now')
          if (nowResponse.data?.program) {
            nowProgramFromApi = nowResponse.data.program
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
            nextProgramFromApi = nextResponse.data.program
            apiNextProgramRef.current = nextResponse.data.program
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

        // Charger programmes du jour
        try {
          const todayResponse = await apiClient.get('/v3/broadcast/today')
          if (todayResponse.data?.programs && Array.isArray(todayResponse.data.programs)) {
            setTodayPrograms(todayResponse.data.programs)
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
        } else {
          // Même si l'API a fonctionné, s'assurer que les programmes du jour sont définis
          if (todayPrograms.length === 0) {
            calculateFromLocalPrograms(currentTime)
            // La solution locale complète la timeline, sans remplacer les réponses broadcast déjà reçues.
            if (nowProgramFromApi) setOnAirProgram(nowProgramFromApi)
            if (nextProgramFromApi) setNextProgram(nextProgramFromApi)
          }
        }
      } catch (error) {
        console.error('Erreur chargement broadcast:', error)
        // Fallback sur les programmes locaux
        calculateFromLocalPrograms(currentTime)
      } finally {
        loadingRef.current = false
      }
    }

    // Charger immédiatement
    loadBroadcastData()
    
    // Rafraîchir toutes les minutes (seulement si pas bloqué par rate limit)
    const interval = setInterval(() => {
      const now = Date.now()
      if (!rateLimitBlockedRef.current || now >= rateLimitUntilRef.current) {
        rateLimitBlockedRef.current = false
        loadBroadcastData()
      }
    }, 60000)
    
    return () => clearInterval(interval)
  }, [programs, calculateFromLocalPrograms]) // Retirer currentTime des dépendances

  // Recalculer ON AIR et suivant quand l'heure change (seulement pour les programmes locaux)
  useEffect(() => {
    // Ne recalculer que si on utilise les programmes locaux (pas l'API)
    if (todayPrograms.length > 0 && !rateLimitBlockedRef.current) {
      const onAir = todayPrograms.find(p => isProgramOnAir(p, currentTime)) || null
      setOnAirProgram(onAir)

      const next = findNextProgram(todayPrograms, currentTime)
      if (!apiNextProgramRef.current) setNextProgram(next)
    } else if (programs.length > 0 && todayPrograms.length === 0) {
      // Si todayPrograms est vide mais qu'on a des programmes, recalculer
      calculateFromLocalPrograms(currentTime)
    }
  }, [currentTime, todayPrograms, programs, calculateFromLocalPrograms])

  const formatTime = (time: string) => {
    const [h, m] = time.split(':')
    return `${h}:${m}`
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

  // Trier les programmes par heure
  const sortedPrograms = useMemo(() => {
    return [...todayPrograms].sort((a, b) => {
      const [aH, aM] = a.start.split(':').map(Number)
      const [bH, bM] = b.start.split(':').map(Number)
      return (aH * 60 + aM) - (bH * 60 + bM)
    })
  }, [todayPrograms])

  // Obtenir le statut d'un programme
  const getStatusBadge = (program: Program) => {
    const status = program.opStatus || 'PLANNED'
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PLANNED
    return config
  }

  return (
    <div 
      className="flex flex-col h-full pb-20 safe-area-bottom overflow-hidden"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Header fixe */}
      <div 
        className="sticky top-0 z-10 border-b px-4 py-3 safe-area-top"
        style={{ 
          backgroundColor: 'var(--card-bg-solid)',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Aujourd’hui</h1>
          <span className="font-mono text-base font-bold text-[var(--text-primary)]">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-[var(--text-secondary)]">
            {actualCurrentDay} – {currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* 1. BLOC ON AIR - Toujours visible en haut, fond rouge ON AIR */}
        {onAirProgram && (
          <div className="mb-6">
            <MobileOnAirCard
              title={onAirProgram.title}
              startTime={formatTime(onAirProgram.start)}
              endTime={onAirProgram.end ? formatTime(onAirProgram.end) : '?'}
              category={onAirProgram.category}
              type={getTypeLabel(onAirProgram.typeDiffusion || onAirProgram.type)}
            />
          </div>
        )}

        {/* 2. BLOC NEXT - Programme suivant */}
        {nextProgram && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">⏭ Prochain programme</h3>
            </div>
            <button
              type="button"
              className="w-full text-left p-4 rounded-lg cursor-pointer active:opacity-80 transition-opacity border-l-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              style={{ 
                backgroundColor: 'var(--card-bg-solid)',
                borderColor: '#F59E0B',
              }}
              onClick={() => onProgramTap?.(nextProgram)}
            >
              <div className="font-mono text-sm font-bold text-[var(--text-primary)] mb-1">
                {formatTime(nextProgram.start)} – {nextProgram.end ? formatTime(nextProgram.end) : '?'}
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{nextProgram.title}</h3>
              <div className="flex flex-wrap gap-2">
                {nextProgram.category && (
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                    {nextProgram.category}
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                  {getTypeLabel(nextProgram.typeDiffusion || nextProgram.type)}
                </span>
                {nextProgram.opStatus && (
                  <span 
                    className="text-xs px-2 py-1 rounded font-semibold"
                    style={{ 
                      backgroundColor: getStatusBadge(nextProgram).bgColor,
                      color: getStatusBadge(nextProgram).color,
                    }}
                  >
                    {getStatusBadge(nextProgram).label}
                  </span>
                )}
              </div>
            </button>
          </div>
        )}

        {/* 3. TIMELINE VERTICALE DU JOUR - Liste chronologique complète */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">📺 Timeline du jour</h3>
            <span className="text-xs text-[var(--text-secondary)]">({sortedPrograms.length})</span>
          </div>
          <div className="space-y-1">
            {sortedPrograms.length === 0 ? (
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--card-bg-solid)' }}>
                <p className="text-sm text-[var(--text-secondary)]">Aucun programme prévu pour aujourd'hui</p>
                <p className="text-xs text-[#64748B] mt-2">
                  {programs.length} programme{programs.length > 1 ? 's' : ''} au total dans la grille
                </p>
              </div>
            ) : (
              sortedPrograms.map((program) => {
                const isOnAir = onAirProgram?.id === program.id
                const isNext = nextProgram?.id === program.id && !isOnAir
                const statusBadge = getStatusBadge(program)
                
                // Déterminer l'icône de statut visuel
                let statusIcon = null
                if (isOnAir) {
                  statusIcon = '🔴'
                } else if (isNext) {
                  statusIcon = '⏳'
                } else if (program.opStatus === 'DELAYED' || program.opStatus === 'OVERRUN') {
                  statusIcon = '⚠️'
                } else if (program.opStatus === 'SKIPPED') {
                  statusIcon = '⛔'
                }
                
                return (
                  <button
                    type="button"
                    key={program.id}
                    aria-label={`Afficher les détails de ${program.title}, ${formatTime(program.start)}`}
                    className="w-full text-left flex items-start gap-4 py-3 px-4 rounded-lg transition-colors border-l-4 cursor-pointer active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    style={{
                      backgroundColor: isOnAir ? '#991B1B' : isNext ? 'rgba(245, 158, 11, 0.1)' : 'var(--card-bg-solid)',
                      borderColor: isOnAir ? '#C1121F' : isNext ? '#F59E0B' : 'var(--card-border)',
                    }}
                    onClick={() => onProgramTap?.(program)}
                  >
                    {/* Heure à gauche - Monospace */}
                    <div className="flex-shrink-0 w-16">
                      <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                        {formatTime(program.start)}
                      </div>
                      {program.end && (
                        <div className="font-mono text-xs text-[var(--text-secondary)] mt-0.5">
                          {formatTime(program.end)}
                        </div>
                      )}
                    </div>

                    {/* Contenu à droite */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statusIcon && (
                          <span className="text-base">{statusIcon}</span>
                        )}
                        <h3 className={`font-semibold ${isOnAir ? 'text-white text-base' : 'text-[var(--text-primary)] text-sm'}`}>
                          {program.title}
                        </h3>
                        {isOnAir && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#C1121F', color: '#FFFFFF' }}>
                            <Radio className="w-3 h-3" />
                            ON AIR
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {program.category && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                            {program.category}
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                          {getTypeLabel(program.typeDiffusion || program.type)}
                        </span>
                        {program.opStatus && program.opStatus !== 'PLANNED' && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded font-semibold"
                            style={{ 
                              backgroundColor: statusBadge.bgColor,
                              color: statusBadge.color,
                            }}
                          >
                            {statusBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileTodayView
