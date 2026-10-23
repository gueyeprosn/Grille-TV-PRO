/**
 * RegieTimeline - Barre de progression temps réel
 * 
 * Affiche la progression du programme en cours avec :
 * - Calcul basé sur start / end / heure serveur
 * - Couleurs : Vert (> 2 min) / Orange (< 2 min) / Rouge (dépassement)
 */

import React, { useEffect, useState } from 'react'
import { getBroadcastClock } from '../../lib/broadcastClock'

interface RegieTimelineProps {
  startTime: string // Format "HH:mm"
  endTime: string // Format "HH:mm"
  currentTime?: Date // Optionnel, utilise new Date() par défaut
}

const RegieTimeline: React.FC<RegieTimelineProps> = ({ 
  startTime, 
  endTime, 
  currentTime,
}) => {
  const [now, setNow] = useState(currentTime || new Date())
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [timeElapsed, setTimeElapsed] = useState<string>('')
  const [status, setStatus] = useState<'normal' | 'warning' | 'critical' | 'over'>('normal')

  useEffect(() => {
    if (currentTime) {
      setNow(currentTime)
      return
    }
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [currentTime])

  useEffect(() => {
    const calculateProgress = () => {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      const startMinutes = startHour * 60 + startMin
      const rawEndMinutes = endHour * 60 + endMin
      const crossesMidnight = rawEndMinutes <= startMinutes
      const endMinutes = crossesMidnight ? rawEndMinutes + 24 * 60 : rawEndMinutes
      const clock = getBroadcastClock(now)
      const rawNowSeconds = clock.hour * 3600 + clock.minute * 60 + clock.second
      const nowSeconds = crossesMidnight && rawNowSeconds < rawEndMinutes * 60
        ? rawNowSeconds + 24 * 60 * 60
        : rawNowSeconds
      const startSeconds = startMinutes * 60
      const endSeconds = endMinutes * 60
      const totalDuration = (endMinutes - startMinutes) * 60 * 1000
      const elapsed = (nowSeconds - startSeconds) * 1000
      const remaining = (endSeconds - nowSeconds) * 1000

      // Calcul du pourcentage de progression
      let progressPercent = (elapsed / totalDuration) * 100
      progressPercent = Math.max(0, Math.min(100, progressPercent))

      // Calcul du temps restant
      const remainingMinutes = Math.floor(remaining / 60000)
      const remainingSeconds = Math.floor((remaining % 60000) / 1000)
      
      // Calcul du temps écoulé
      const elapsedMinutes = Math.floor(elapsed / 60000)
      const elapsedSeconds = Math.floor((elapsed % 60000) / 1000)

      let timeRemainingStr = ''
      let timeElapsedStr = ''
      
      if (remaining < 0) {
        // Programme terminé ou dépassé (dépassement d'antenne)
        const overdueMs = Math.abs(remaining)
        const overMinutes = Math.floor(overdueMs / 60000)
        const overSeconds = Math.floor((overdueMs % 60000) / 1000)
        timeRemainingStr = `+${overMinutes}:${String(overSeconds).padStart(2, '0')}`
        timeElapsedStr = `${elapsedMinutes}:${String(elapsedSeconds).padStart(2, '0')}`
        setStatus('over')
      } else {
        // Programme en cours : le temps restant est strictement positif
        const remainingMinutes = Math.floor(remaining / 60000)
        const remainingSeconds = Math.floor((remaining % 60000) / 1000)
        timeElapsedStr = `${elapsedMinutes}:${String(elapsedSeconds).padStart(2, '0')}`

        if (remainingMinutes === 0 && remainingSeconds <= 30) {
          // Moins de 30 secondes restantes - CRITIQUE
          timeRemainingStr = `${remainingSeconds}s`
          setStatus('critical')
        } else if (remainingMinutes < 2) {
          // Moins de 2 minutes restantes - ALERTE
          timeRemainingStr = `${remainingMinutes}:${String(remainingSeconds).padStart(2, '0')}`
          setStatus('warning')
        } else {
          // Plus de 2 minutes restantes - NORMAL
          timeRemainingStr = `${remainingMinutes}:${String(remainingSeconds).padStart(2, '0')}`
          setStatus('normal')
        }
      }

      setProgress(progressPercent)
      setTimeRemaining(timeRemainingStr)
      setTimeElapsed(timeElapsedStr)
    }

    calculateProgress()
  }, [startTime, endTime, now])

  const getStatusColor = () => {
    switch (status) {
      case 'normal': return '#10B981' // green-500 (succès)
      case 'warning': return '#FF9F1C' // Orange strict T-2 min (selon audit UX)
      case 'critical': return '#E10600' // Rouge strict ON AIR (selon audit UX)
      case 'over': return '#E10600' // Rouge strict ON AIR (selon audit UX)
      default: return '#6B7280' // gray-500
    }
  }

  // Générer les marqueurs d'heures pour la timeline
  const generateTimeMarkers = () => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const totalMinutes = endMinutes > startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60 - startMinutes) + endMinutes
    
    const markers: Array<{ time: string; position: number }> = []
    
    // Ajouter le marqueur de début
    markers.push({ time: startTime, position: 0 })
    
    // Ajouter des marqueurs toutes les heures ou toutes les 30 minutes si la durée est courte
    const interval = totalMinutes > 120 ? 60 : 30 // Toutes les heures si > 2h, sinon toutes les 30min
    
    let currentMinutes = startMinutes
    while (currentMinutes < startMinutes + totalMinutes) {
      currentMinutes += interval
      if (currentMinutes >= startMinutes + totalMinutes) break
      
      const hour = Math.floor((currentMinutes % (24 * 60)) / 60)
      const min = (currentMinutes % (24 * 60)) % 60
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      const position = ((currentMinutes - startMinutes) / totalMinutes) * 100
      
      markers.push({ time: timeStr, position })
    }
    
    // Ajouter le marqueur de fin
    markers.push({ time: endTime, position: 100 })
    
    return markers
  }

  const timeMarkers = generateTimeMarkers()

  return (
    <div style={{ width: '100%', marginTop: '1rem' }}>
      {/* Barre de progression avec marqueurs d'heures */}
      <div
        style={{
          width: '100%',
          position: 'relative',
          marginBottom: '0.5rem'
        }}
      >
        {/* Barre de progression */}
        <div
          style={{
            width: '100%',
            height: '16px',
            backgroundColor: '#1E293B',
            borderRadius: '4px',
            overflow: 'visible',
            position: 'relative'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: getStatusColor(),
              transition: 'width 0.5s ease, background-color 0.5s ease',
              boxShadow: `0 0 10px ${getStatusColor()}`,
              borderRadius: '4px'
            }}
          />
          
          {/* Marqueurs d'heures sur la barre */}
          {timeMarkers.map((marker, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${marker.position}%`,
                top: '100%',
                marginTop: '4px',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              {/* Ligne verticale */}
              <div
                style={{
                  width: '2px',
                  height: '8px',
                  backgroundColor: marker.position === 0 || marker.position === 100 
                    ? '#FFFFFF' 
                    : '#64748B',
                  marginBottom: '2px'
                }}
              />
              {/* Heure */}
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: marker.position === 0 || marker.position === 100 
                    ? '#FFFFFF' 
                    : '#94A3B8',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                }}
              >
                {marker.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informations de temps - Timer ON AIR amélioré */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          borderRadius: '6px',
          border: `2px solid ${getStatusColor()}40`
        }}
      >
        {/* Horaire début → fin */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div
            style={{
              fontSize: '18px',
              color: '#94A3B8',
              fontWeight: '500'
            }}
          >
            Horaire
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}
          >
            {startTime} → {endTime}
          </div>
        </div>

        {/* Timer : Temps écoulé / Temps restant */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '1rem'
          }}
        >
          {/* Temps écoulé */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '0.25rem'
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#64748B',
                fontWeight: '500'
              }}
            >
              Écoulé
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#94A3B8',
                fontFamily: 'monospace',
                letterSpacing: '1px'
              }}
            >
              {timeElapsed}
            </div>
          </div>
          
          {/* Temps restant */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '0.25rem'
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: status === 'over' ? '#EF4444' : '#94A3B8',
                fontWeight: status === 'over' ? '700' : '500',
                letterSpacing: status === 'over' ? '0.5px' : 'normal'
              }}
            >
              {status === 'over' ? '⚠️ DÉPASSEMENT ANTENNE' : 'Temps restant'}
            </div>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: getStatusColor(),
                fontFamily: 'monospace',
                letterSpacing: '2px',
                textShadow: `0 0 20px ${getStatusColor()}80`,
                animation: status === 'warning' || status === 'critical' || status === 'over' 
                  ? 'pulse 1s ease-in-out infinite' 
                  : 'none'
              }}
            >
              {timeRemaining}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegieTimeline
