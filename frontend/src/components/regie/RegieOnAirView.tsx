/**
 * RegieOnAirView - Vue principale du mode Régie ON AIR
 * 
 * Mode lecture seule, optimisé pour lisibilité à distance (3-5 mètres)
 * Aucune écriture en base, aucune modification de données
 */

import React, { useEffect, useState, useMemo } from 'react'
import RegieHeader from './RegieHeader'
import RegieCurrentProgram from './RegieCurrentProgram'
import InstaPlaylistFallback from './InstaPlaylistFallback'
import RegieNextProgram from './RegieNextProgram'
import RegieProgramList from './RegieProgramList'
import { Modal, Button } from '../ui'
import { AlertCircle, X } from 'lucide-react'
import { useUIModeStore } from '../../lib/uiModeStore'
import { getBroadcastClock } from '../../lib/broadcastClock'

interface Program {
  id: string
  title: string
  start: string // Format "HH:mm"
  end?: string // Format "HH:mm"
  duration?: number
  typeDiffusion?: string
  category?: string
  type?: "LIVE" | "REPLAY" | "PAD" | "ADS" | "SPECIAL"
  days: string[]
}

interface RegieOnAirViewProps {
  programs: Program[]
  currentDay?: string
}

function getProgramEndTime(program: Program): string {
  if (program.end) return program.end
  const [hour, minute] = program.start.split(':').map(Number)
  const endMinutes = (hour * 60 + minute + (program.duration || 60)) % (24 * 60)
  return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
}

const RegieOnAirView: React.FC<RegieOnAirViewProps> = ({ programs, currentDay }) => {
  const { setMode } = useUIModeStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [alert, setAlert] = useState<{
    type: 'no_program' | 'overlap' | 'missing_next'
    message: string
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [timeAlert, setTimeAlert] = useState<'none' | 'warning' | 'critical'>('none')

  // Mise à jour de l'heure chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // La grille suit l'heure de diffusion de la chaîne, quel que soit le poste.
  const today = useMemo(() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    return days[getBroadcastClock(currentTime).dayIndex]
  }, [currentTime])

  // Filtrer les programmes du jour actuel
  const todayPrograms = useMemo(() => {
    const yesterday = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][(getBroadcastClock(currentTime).dayIndex + 6) % 7]
    const clock = getBroadcastClock(currentTime)
    return programs.filter(p => {
      if (p.days.includes(today)) return true
      const start = p.start.split(':').map(Number)
      const end = getProgramEndTime(p).split(':').map(Number)
      const crossesMidnight = (end[0] * 60 + end[1]) <= (start[0] * 60 + start[1])
      return Boolean(crossesMidnight && clock.hour * 60 + clock.minute < end[0] * 60 + end[1] && p.days.includes(yesterday))
    })
  }, [programs, today, currentTime])

  // Trouver le programme en cours et le suivant (basé sur le jour et l'heure actuels)
  const { currentProgram, nextProgram } = useMemo(() => {
    // Toujours utiliser l'heure actuelle réelle (pas de pause pour la détection)
    const { hour: currentHour, minute: currentMin } = getBroadcastClock(currentTime)
    const currentTimeMinutes = currentHour * 60 + currentMin

    let current: Program | null = null
    let next: Program | null = null

    // Trier les programmes par heure de début
    const sortedPrograms = [...todayPrograms].sort((a, b) => {
      const [aHour, aMin] = a.start.split(':').map(Number)
      const [bHour, bMin] = b.start.split(':').map(Number)
      return (aHour * 60 + aMin) - (bHour * 60 + bMin)
    })

    // Parcourir tous les programmes pour trouver celui en cours
    for (let i = 0; i < sortedPrograms.length; i++) {
      const program = sortedPrograms[i]
      const [startHour, startMin] = program.start.split(':').map(Number)
      const startTimeMinutes = startHour * 60 + startMin

      // Calculer l'heure de fin
      const endTime = getProgramEndTime(program)
      
      const [endHour, endMin] = endTime.split(':').map(Number)
      const endTimeMinutes = endHour * 60 + endMin

      // Vérifier si le programme est en cours
      // Cas normal : start <= now < end
      // Cas passage minuit : start <= now OU now < end (si end < start)
      const isCurrentlyOn = (() => {
        if (endTimeMinutes <= startTimeMinutes) {
          // Programme qui passe minuit
          return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes
        } else {
          // Programme normal
          return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes
        }
      })()

      if (isCurrentlyOn) {
        current = program
        // Le suivant est le prochain programme après celui-ci
        if (i + 1 < sortedPrograms.length) {
          next = sortedPrograms[i + 1]
        }
        break
      }

      // Si on n'a pas encore trouvé de programme en cours, le prochain est le premier à venir
      if (!current && !next && currentTimeMinutes < startTimeMinutes) {
        next = program
      }
    }

    // Si aucun programme en cours, le prochain est le premier de la liste
    if (!current && !next && sortedPrograms.length > 0) {
      next = sortedPrograms[0]
    }

    return { currentProgram: current, nextProgram: next }
  }, [todayPrograms, currentTime])

  // Détection des alertes (seulement pour le programme suivant manquant, pas pour l'absence de programme)
  useEffect(() => {
    // Ne pas afficher d'alerte si aucun programme en cours (c'est normal, on affiche "PLAYLIST EN COURS")
    if (!nextProgram && todayPrograms.length > 0) {
      setAlert({
        type: 'missing_next',
        message: 'Aucun programme suivant prévu'
      })
    } else {
      setAlert(null)
    }
  }, [currentProgram, nextProgram, todayPrograms.length])

  // Détection des alertes temporelles (T-2 minutes, T-30 secondes)
  useEffect(() => {
    if (!currentProgram || isPaused) {
      setTimeAlert('none')
      return
    }

    const { hour: currentHour, minute: currentMin, second } = getBroadcastClock(currentTime)
    const currentTimeMinutes = currentHour * 60 + currentMin

    const [startHour, startMin] = currentProgram.start.split(':').map(Number)
    const startTimeMinutes = startHour * 60 + startMin

    const endTime = getProgramEndTime(currentProgram)
    
    const [endHour, endMin] = endTime.split(':').map(Number)
    const endTimeMinutes = endHour * 60 + endMin
    const crossesMidnight = endTimeMinutes <= startTimeMinutes
    const effectiveEndMinutes = crossesMidnight && currentTimeMinutes >= startTimeMinutes
      ? endTimeMinutes + 24 * 60
      : endTimeMinutes
    const effectiveNowMinutes = crossesMidnight && currentTimeMinutes < endTimeMinutes
      ? currentTimeMinutes + 24 * 60
      : currentTimeMinutes
    const remainingSeconds = (effectiveEndMinutes * 60) - (effectiveNowMinutes * 60 + second)
    const remainingMinutes = remainingSeconds / 60

    if (remainingSeconds <= 30 && remainingSeconds > 0) {
      // T-30 secondes : ALERTE CRITIQUE
      setTimeAlert('critical')
    } else if (remainingMinutes <= 2 && remainingMinutes > 0) {
      // T-2 minutes : ALERTE WARNING
      setTimeAlert('warning')
    } else {
      setTimeAlert('none')
    }
  }, [currentProgram, currentTime, isPaused])

  // Gestion du plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Raccourcis clavier pour le mode Régie
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input ou textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // F11 → Fullscreen
      if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
            console.warn('Impossible d\'activer le plein écran')
          })
        } else {
          document.exitFullscreen().catch(() => {
            console.warn('Impossible de quitter le plein écran')
          })
        }
        return
      }

      // Esc → Quitter Mode Régie
      if (e.key === 'Escape' && !alert) {
        setMode('STANDARD')
        return
      }

      // Ctrl + Shift + R → Toggle Mode Régie
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        setMode('STANDARD')
        return
      }

      // Space → Pause visuelle (freeze UI)
      if (e.key === ' ' && !alert && !isLocked) {
        e.preventDefault()
        setIsPaused(prev => !prev)
        return
      }

      // L → Verrouiller/déverrouiller le plein écran
      if (e.key.toLowerCase() === 'l' && !alert && isFullscreen) {
        e.preventDefault()
        setIsLocked(prev => !prev)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setMode, alert])

  // Si pause visuelle, ne pas mettre à jour l'heure
  return (
    <div
      className="regie-onair-view"
      style={{
        minHeight: '100vh',
        height: '100vh',
        backgroundColor: '#020617', // slate-950
        color: '#FFFFFF',
        paddingTop: '80px', // Hauteur du header fixe
        padding: '80px 2rem 2rem 2rem',
        opacity: isPaused ? 0.7 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: isLocked ? 'none' : 'auto', // Désactiver les interactions si verrouillé
        userSelect: isLocked ? 'none' : 'auto',
        overflowY: 'auto', // Permettre le scroll vertical
        overflowX: 'hidden' // Pas de scroll horizontal
      }}
    >
      {/* Badge FREEZE si pause visuelle */}
      {isPaused && (
        <div
          style={{
            position: 'fixed',
            top: '100px',
            right: '2rem',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '3px solid #F59E0B',
            padding: '1rem 2rem',
            borderRadius: '6px',
            zIndex: 2000,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#F59E0B',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.5)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        >
          ⏸ FREEZE
        </div>
      )}

      {/* Badge VERROUILLÉ si plein écran verrouillé */}
      {isLocked && (
        <div
          style={{
            position: 'fixed',
            top: '100px',
            left: '2rem',
            backgroundColor: 'rgba(220, 38, 38, 0.9)',
            border: '3px solid #DC2626',
            padding: '1rem 2rem',
            borderRadius: '6px',
            zIndex: 2000,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(220, 38, 38, 0.5)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        >
          🔒 VERROUILLÉ
        </div>
      )}

      {/* Overlay d'alerte temporelle T-2 minutes - Orange #FF9F1C strictement */}
      {timeAlert === 'warning' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 159, 28, 0.3)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            animation: 'pulse 1s ease-in-out infinite'
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 159, 28, 0.95)',
              border: '4px solid #FF9F1C',
              padding: '3rem 4rem',
              borderRadius: '4px',
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              textAlign: 'center',
              boxShadow: '0 0 50px rgba(255, 159, 28, 0.8)',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
            }}
          >
            ⚠️ ALERTE<br />
            <span style={{ fontSize: '48px', marginTop: '1rem', display: 'block' }}>
              T-2 MINUTES
            </span>
          </div>
        </div>
      )}

      {/* Overlay d'alerte temporelle T-30 secondes - Rouge #E10600 strictement */}
      {timeAlert === 'critical' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(225, 6, 0, 0.4)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            animation: 'pulse 0.5s ease-in-out infinite'
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(225, 6, 0, 0.95)',
              border: '6px solid #E10600',
              padding: '4rem 5rem',
              borderRadius: '6px',
              fontSize: '96px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              textAlign: 'center',
              boxShadow: '0 0 80px rgba(225, 6, 0, 1)',
              textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8)',
              animation: 'pulse 0.5s ease-in-out infinite'
            }}
          >
            🚨 CRITIQUE<br />
            <span style={{ fontSize: '72px', marginTop: '1rem', display: 'block' }}>
              T-30 SECONDES
            </span>
          </div>
        </div>
      )}
      <RegieHeader 
        isLocked={isLocked}
        onLockToggle={() => setIsLocked(prev => !prev)}
      />

      {/* Contenu principal */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          paddingBottom: '4rem' // Espace en bas pour permettre le scroll
        }}
      >
        {/* Programme en cours */}
        {currentProgram ? (
          <RegieCurrentProgram program={currentProgram} currentTime={currentTime} />
        ) : (
          <InstaPlaylistFallback currentTime={currentTime} />
        )}

        {/* Programme suivant */}
        <div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#F59E0B',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Programme suivant
          </div>
          <RegieNextProgram program={nextProgram} />
        </div>

        {/* Liste complète des programmes du jour */}
        <div style={{ marginTop: '3rem' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              marginBottom: '1.5rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderBottom: '2px solid #1E293B',
              paddingBottom: '0.75rem'
            }}
          >
            📺 Grille complète du jour
          </div>
          <RegieProgramList 
            programs={todayPrograms}
            currentProgramId={currentProgram?.id || null}
            nextProgramId={nextProgram?.id || null}
          />
        </div>
      </div>

      {/* Overlay d'alerte */}
      {alert && (
        <Modal
          isOpen={true}
          onClose={() => setAlert(null)}
          title=""
          size="xl"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              gap: '2rem',
              minHeight: '400px'
            }}
          >
            <AlertCircle size={80} color="#EF4444" />
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                textAlign: 'center'
              }}
            >
              {alert.message}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                marginTop: '2rem'
              }}
            >
              <Button
                variant="primary"
                size="lg"
                onClick={() => setAlert(null)}
                className="text-2xl px-8 py-6"
              >
                CONFIRMER
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setAlert(null)}
                className="text-2xl px-8 py-6"
              >
                IGNORER
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default RegieOnAirView
