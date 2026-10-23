/**
 * TabletRegieView - Mode régie légère pour tablette
 * Alternative au desktop pour petites régies
 * ON AIR + Suivant + Grille du jour
 */

import React, { useMemo, useState, useEffect } from 'react'
import { Radio, Clock, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Program } from '../AppModernV3'
import { isProgramToday } from '../../lib/broadcastDay'
import axios from 'axios'
import { getApiBaseURL } from '../../lib/api'
import { BROADCAST_STATUS_COLORS } from '../../lib/broadcastTheme'
import { deriveCategoryColor, rgbArrayToCss } from '../../legacy/lib/colorPalette'

interface TabletRegieViewProps {
  programs: Program[]
  currentDay: string
  categoryStyles?: Record<string, string>
}

const TabletRegieView: React.FC<TabletRegieViewProps> = ({ programs, currentDay, categoryStyles = {} }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [onAirProgram, setOnAirProgram] = useState<Program | null>(null)
  const [nextProgram, setNextProgram] = useState<Program | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Charger depuis API broadcast
  useEffect(() => {
    const loadBroadcastData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const apiBase = getApiBaseURL()

        try {
          const nowResponse = await axios.get(`${apiBase}/v3/broadcast/now`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (nowResponse.data?.program) {
            setOnAirProgram(nowResponse.data.program)
          } else {
            setOnAirProgram(null)
          }
        } catch (e) {
          setOnAirProgram(null)
        }

        try {
          const nextResponse = await axios.get(`${apiBase}/v3/broadcast/next`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (nextResponse.data?.program) {
            setNextProgram(nextResponse.data.program)
          } else {
            setNextProgram(null)
          }
        } catch (e) {
          setNextProgram(null)
        }
      } catch (error) {
        console.error('Erreur chargement broadcast:', error)
      }
    }

    loadBroadcastData()
    const interval = setInterval(loadBroadcastData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculer progression
  useEffect(() => {
    if (!onAirProgram) {
      setProgress(0)
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
  }, [onAirProgram, currentTime])

  // Programmes du jour (hors ON AIR et suivant)
  const upcomingPrograms = useMemo(() => {
    // Jour de l'horloge uniquement, jamais le jour sélectionné ailleurs.
    const todayPrograms = programs.filter(p => isProgramToday(p))

    return todayPrograms
      .filter(p => {
        if (onAirProgram && p.id === onAirProgram.id) return false
        if (nextProgram && p.id === nextProgram.id) return false
        return true
      })
      .sort((a, b) => {
        const [aH, aM] = a.start.split(':').map(Number)
        const [bH, bM] = b.start.split(':').map(Number)
        return (aH * 60 + aM) - (bH * 60 + bM)
      })
  }, [programs, onAirProgram, nextProgram])

  const formatTime = (time: string) => {
    const [h, m] = time.split(':')
    return `${h}:${m}`
  }

  const onAirCategoryColor = onAirProgram
    ? deriveCategoryColor(onAirProgram.category, categoryStyles[onAirProgram.category || ''])
    : [153, 27, 27]
  const onAirBg = rgbArrayToCss(onAirCategoryColor, 0.14)
  const onAirBorder = BROADCAST_STATUS_COLORS.onair.bg // #E10600
  const categoryPill = (category?: string) => {
    const color = deriveCategoryColor(category, categoryStyles[category || ''])
    return {
      backgroundColor: rgbArrayToCss(color, 0.16),
      border: `1px solid ${rgbArrayToCss(color, 0.5)}`,
      color: rgbArrayToCss(color),
    }
  }

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      {/* ON AIR Section */}
      {onAirProgram ? (
        <div 
          className="p-6 rounded-xl border-2"
          style={{
            backgroundColor: onAirBg,
            borderColor: onAirBorder,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm uppercase"
              style={{ backgroundColor: onAirBorder, color: '#FFFFFF' }}
            >
              <Radio className="w-4 h-4" />
              ON AIR
            </span>
            <span className="tablet-time font-bold text-white">
              {formatTime(onAirProgram.start)} – {onAirProgram.end ? formatTime(onAirProgram.end) : '?'}
            </span>
          </div>
          <h1 className="tablet-title mb-3 text-white">{onAirProgram.title}</h1>
          {onAirProgram.description && (
            <p className="tablet-body text-white/90 mb-4">{onAirProgram.description}</p>
          )}
          <div 
            className="h-3 rounded-full overflow-hidden mb-2"
            style={{ backgroundColor: 'var(--surface-hover)' }}
          >
            <div
              className="h-full transition-all duration-1000"
              style={{ 
                width: `${progress}%`,
                backgroundColor: onAirBorder,
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="tablet-small text-[var(--text-secondary)]">
              {Math.round(progress)}% complété
            </span>
            {onAirProgram.category && (
              <span className="text-xs px-2 py-1 rounded" style={categoryPill(onAirProgram.category)}>
                {onAirProgram.category}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl text-center" style={{ backgroundColor: 'var(--card-bg-solid)' }}>
          <Radio className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
          <p className="tablet-small" style={{ color: 'var(--text-secondary)' }}>Aucun programme ON AIR</p>
        </div>
      )}

      {/* Programme suivant */}
      {nextProgram && (
        <div 
          className="p-4 rounded-lg border-l-4"
          style={{
            backgroundColor: rgbArrayToCss(deriveCategoryColor(nextProgram.category, categoryStyles[nextProgram.category || '']), 0.1),
            borderColor: rgbArrayToCss(deriveCategoryColor(nextProgram.category, categoryStyles[nextProgram.category || ''])),
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="tablet-body font-semibold" style={{ color: 'var(--text-secondary)' }}>⏭ À Suivre</span>
          </div>
          <div className="tablet-time mb-1 text-[var(--text-primary)]">
            {formatTime(nextProgram.start)} – {nextProgram.end ? formatTime(nextProgram.end) : '?'}
          </div>
          <h3 className="tablet-body font-medium text-[var(--text-primary)]">{nextProgram.title}</h3>
          {nextProgram.category && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 rounded" style={categoryPill(nextProgram.category)}>
                {nextProgram.category}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grille du jour */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="tablet-body font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Grille du Jour</h2>
        <div className="space-y-2">
          {upcomingPrograms.length === 0 ? (
            <p className="tablet-small text-center py-4" style={{ color: 'var(--text-secondary)' }}>
              Aucun autre programme prévu
            </p>
          ) : (
            upcomingPrograms.map((program) => (
              <div
                key={program.id} 
                className="p-3 rounded-lg border-l-4"
                style={{
                  backgroundColor: rgbArrayToCss(deriveCategoryColor(program.category, categoryStyles[program.category || '']), 0.1),
                  borderColor: rgbArrayToCss(deriveCategoryColor(program.category, categoryStyles[program.category || ''])),
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="tablet-time mb-1 text-[var(--text-primary)]">
                      {formatTime(program.start)}
                    </div>
                    <h4 className="tablet-body font-medium text-[var(--text-primary)]">{program.title}</h4>
                  </div>
                  {program.category && (
                    <span className="text-xs px-2 py-1 rounded" style={categoryPill(program.category)}>
                      {program.category}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default TabletRegieView