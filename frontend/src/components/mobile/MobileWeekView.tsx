/**
 * MobileWeekView - Vue semaine mobile
 * Équivalent fonctionnel de la vue semaine desktop
 * 1 jour = 1 écran, swipe horizontal, en-tête fixe, liste chronologique
 */

import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Program } from '../AppModernV3'

interface MobileWeekViewProps {
  programs: Program[]
  onProgramTap?: (program: Program) => void
  initialDay?: string
  onDayChange?: (day: string) => void
  mode?: 'day' | 'week'
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

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

const MobileWeekView: React.FC<MobileWeekViewProps> = ({
  programs,
  onProgramTap,
  initialDay,
  onDayChange,
  mode = 'week',
}) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(() => {
    if (initialDay) {
      const initialIndex = DAYS.indexOf(initialDay)
      if (initialIndex >= 0) return initialIndex
    }
    const today = new Date().getDay()
    return today
  })

  useEffect(() => {
    if (!initialDay) return
    const initialIndex = DAYS.indexOf(initialDay)
    if (initialIndex >= 0) setCurrentDayIndex(initialIndex)
  }, [initialDay])

  useEffect(() => {
    onDayChange?.(DAYS[currentDayIndex])
  }, [currentDayIndex, onDayChange])

  const currentDayName = DAYS[currentDayIndex]
  const currentDate = useMemo(() => {
    const today = new Date()
    const diff = currentDayIndex - today.getDay()
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + diff)
    return targetDate
  }, [currentDayIndex])

  // Programmes du jour sélectionné
  const dayPrograms = useMemo(() => {
    return programs
      .filter(p => {
        // Vérifier si le programme est programmé pour ce jour
        if (!p.days || !Array.isArray(p.days)) return false
        return p.days.includes(currentDayName)
      })
      .sort((a, b) => {
        const [aH, aM] = a.start.split(':').map(Number)
        const [bH, bM] = b.start.split(':').map(Number)
        return (aH * 60 + aM) - (bH * 60 + bM)
      })
  }, [programs, currentDayName])

  // Programme ON AIR du jour (basé sur opStatus)
  const onAirProgram = useMemo(() => {
    return dayPrograms.find(p => p.opStatus === 'ON_AIR') || null
  }, [dayPrograms])

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

  const getStatusBadge = (program: Program) => {
    const status = program.opStatus || 'PLANNED'
    return STATUS_CONFIG[status] || STATUS_CONFIG.PLANNED
  }

  const goToPreviousDay = () => {
    setCurrentDayIndex(prev => (prev === 0 ? 6 : prev - 1))
  }

  const goToNextDay = () => {
    setCurrentDayIndex(prev => (prev === 6 ? 0 : prev + 1))
  }

  // Swipe gesture (basique)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNextDay()
    }
    if (isRightSwipe) {
      goToPreviousDay()
    }
  }

  return (
    <div 
      className="flex flex-col h-full pb-20 safe-area-bottom overflow-hidden"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header avec navigation - FIXE */}
      <div 
        className="sticky top-0 z-10 border-b px-4 py-4 safe-area-top"
        style={{ 
          backgroundColor: 'var(--card-bg-solid)',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goToPreviousDay}
            className="p-3 rounded-lg active:opacity-70 transition-opacity"
            style={{ 
              color: 'var(--text-secondary)',
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{mode === 'week' ? 'Semaine' : 'Conducteur du jour'}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {currentDayName} · {' '}
              {currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {dayPrograms.length} programme{dayPrograms.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={goToNextDay}
            className="p-3 rounded-lg active:opacity-70 transition-opacity"
            style={{ 
              color: 'var(--text-secondary)',
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
        <div className="flex justify-center gap-1 overflow-x-auto pt-2" aria-label="Choisir un jour">
          {DAYS_SHORT.map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => setCurrentDayIndex(index)}
              aria-label={DAYS[index]}
              aria-current={currentDayIndex === index ? 'date' : undefined}
              className={cn(
                'min-h-11 min-w-11 rounded-lg px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                currentDayIndex === index
                  ? 'bg-red-700 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des programmes - Timeline verticale chronologique */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {dayPrograms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-base text-[var(--text-secondary)] text-center">
              Aucun programme prévu pour {currentDayName}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {dayPrograms.map((program) => {
              const isOnAir = onAirProgram?.id === program.id
              const statusBadge = getStatusBadge(program)

              return (
                <button
                  type="button"
                  key={program.id}
                  aria-label={`Afficher les détails de ${program.title}, ${formatTime(program.start)}`}
                  className={cn(
                    'w-full text-left flex items-start gap-4 py-4 px-4 rounded-lg transition-colors border-l-4 cursor-pointer active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                  )}
                  style={{
                    backgroundColor: isOnAir ? '#991B1B' : 'var(--card-bg-solid)',
                    borderColor: isOnAir ? '#C1121F' : 'var(--card-border)',
                  }}
                  onClick={() => onProgramTap?.(program)}
                >
                  {/* Heure à gauche - Monospace */}
                  <div className="flex-shrink-0 w-20">
                    <div className="font-mono text-base font-bold text-[var(--text-primary)]">
                      {formatTime(program.start)}
                    </div>
                    {program.end && (
                      <div className="font-mono text-sm text-[var(--text-secondary)] mt-0.5">
                        {formatTime(program.end)}
                      </div>
                    )}
                  </div>

                  {/* Contenu à droite */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={cn(
                        'font-semibold',
                        isOnAir ? 'text-white text-lg' : 'text-[var(--text-primary)] text-base'
                      )}>
                        {program.title}
                      </h3>
                      {isOnAir && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: '#C1121F', color: '#FFFFFF' }}>
                          <Radio className="w-3 h-3" />
                          ON
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {program.category && (
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                          {program.category}
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                        {getTypeLabel(program.typeDiffusion || program.type)}
                      </span>
                      {program.opStatus && program.opStatus !== 'PLANNED' && (
                        <span 
                          className="text-xs px-2 py-1 rounded font-semibold"
                          style={{ 
                            backgroundColor: statusBadge.bgColor,
                            color: statusBadge.color,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      )}
                    </div>
                    {program.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                        {program.description}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileWeekView
