/**
 * MobileOnAirCard - Carte ON AIR pour mobile
 * Toujours visible, prioritaire, design broadcast strict
 * Avec timeline de progression selon audit UX
 */

import React, { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MobileOnAirCardProps {
  title: string
  startTime: string
  endTime: string
  category?: string
  type?: string
  className?: string
}

const MobileOnAirCard: React.FC<MobileOnAirCardProps> = ({
  title,
  startTime,
  endTime,
  category,
  type,
  className,
}) => {
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Calcul de la progression en temps réel
  useEffect(() => {
    const calculateProgress = () => {
      const now = new Date()
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      const startDate = new Date(now)
      startDate.setHours(startHour, startMin, 0, 0)
      
      const endDate = new Date(now)
      endDate.setHours(endHour, endMin, 0, 0)
      
      // Si l'heure de fin est avant l'heure de début, on suppose que c'est le lendemain
      if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1)
      }

      const totalDuration = endDate.getTime() - startDate.getTime()
      const elapsed = now.getTime() - startDate.getTime()
      const remaining = endDate.getTime() - now.getTime()

      // Calcul du pourcentage de progression
      let progressPercent = (elapsed / totalDuration) * 100
      progressPercent = Math.max(0, Math.min(100, progressPercent))
      setProgress(progressPercent)

      // Calcul du temps restant ou dépassement
      if (remaining < 0) {
        const overdueMs = Math.abs(remaining)
        const overMinutes = Math.floor(overdueMs / 60000)
        const overSeconds = Math.floor((overdueMs % 60000) / 1000)
        setTimeRemaining(`+${overMinutes}:${String(overSeconds).padStart(2, '0')}`)
      } else {
        const remainingMinutes = Math.floor(remaining / 60000)
        const remainingSeconds = Math.floor((remaining % 60000) / 1000)
        setTimeRemaining(`${remainingMinutes}:${String(remainingSeconds).padStart(2, '0')}`)
      }
    }

    calculateProgress()
    const interval = setInterval(calculateProgress, 1000)
    return () => clearInterval(interval)
  }, [startTime, endTime])

  // Couleur de la timeline selon le temps restant (optimisée pour fond rouge)
  const getTimelineColor = () => {
    if (timeRemaining.startsWith('+')) return '#FFFFFF' // Dépassement critique
    const [minutes, seconds] = timeRemaining.split(':').map(Number)
    const totalSeconds = (minutes || 0) * 60 + (seconds || 0)
    
    if (totalSeconds <= 30) return '#FFFFFF' // Blanc éclatant critique (T-30s)
    if (totalSeconds <= 120) return '#FBBF24' // Jaune/ambre warning (T-2 min)
    return '#34D399' // Vert émeraude haute lisibilité (normal)
  }

  return (
    <div
      className={cn(
        'text-white rounded-xl p-5 shadow-2xl border-4 border-white',
        className
      )}
      style={{
        backgroundColor: '#C1121F',
        boxShadow: '0 0 30px rgba(193, 18, 31, 0.6)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-5 h-5" />
        <span className="font-bold text-sm uppercase tracking-wider">🔴 ON AIR</span>
      </div>
      
      <div className="font-mono text-lg font-bold mb-3">
        {startTime} – {endTime}
      </div>
      
      <h2 className="text-xl font-bold mb-4 leading-tight">{title}</h2>
      
      {/* Timeline de progression - Selon audit UX */}
      <div className="mb-4">
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: getTimelineColor(),
              transition: 'width 1s linear, background-color 0.5s ease',
              boxShadow: `0 0 10px ${getTimelineColor()}`,
            }}
          />
        </div>
        <div className="flex justify-between items-center text-xs font-mono font-semibold">
          <span className={cn("text-white/90", timeRemaining.startsWith('+') && "text-amber-200 font-bold")}>
            {timeRemaining.startsWith('+') ? '⚠️ Dépassement' : 'Temps restant'}
          </span>
          <span className="text-white font-mono font-bold text-sm bg-black/40 px-2 py-0.5 rounded border border-white/20">
            {timeRemaining}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {category && (
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            {category}
          </span>
        )}
        {type && (
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            {type}
          </span>
        )}
      </div>
    </div>
  )
}

export default MobileOnAirCard
