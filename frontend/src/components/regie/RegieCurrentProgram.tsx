/**
 * RegieCurrentProgram - Programme en cours (zone centrale)
 * 
 * Affiche :
 * - Horaire : HH:mm → HH:mm
 * - TITRE PROGRAMME (TRÈS GRAND)
 * - Type de diffusion (Direct / PAD / Replay)
 * - Catégorie
 * - Barre de progression
 */

import React from 'react'
import { Radio } from 'lucide-react'
import RegieTimeline from './RegieTimeline'
import { BROADCAST_STATUS_COLORS, DIFFUSION_TYPE_COLORS } from '../../lib/broadcastTheme'

interface Program {
  id: string
  title: string
  start: string // Format "HH:mm"
  end?: string // Format "HH:mm"
  typeDiffusion?: string
  category?: string
  type?: "LIVE" | "REPLAY" | "PAD" | "ADS" | "SPECIAL"
  duration?: number
}

interface RegieCurrentProgramProps {
  program: Program | null
  currentTime: Date
  sourceLabel?: string
}

const RegieCurrentProgram: React.FC<RegieCurrentProgramProps> = ({ program, currentTime, sourceLabel }) => {
  if (!program) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'clamp(280px, 45vh, 400px)',
          backgroundColor: '#0F172A',
          borderRadius: '6px',
          border: '3px solid #3B82F6',
          padding: 'clamp(1.5rem, 5vw, 3rem)',
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
        }}
      >
        <div
          style={{
            fontSize: '96px',
            marginBottom: '2rem',
            animation: 'regie-pulse 2s ease-in-out infinite'
          }}
        >
          <Radio aria-hidden="true" size={88} />
        </div>
        <div
          style={{
            fontSize: 'clamp(1.75rem, 5.5vw, 4rem)',
            color: '#3B82F6',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '1rem',
            letterSpacing: '2px',
            textShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
          }}
        >
          AUCUN PROGRAMME PLANIFIÉ
        </div>
        <div
          style={{
            fontSize: '24px',
            color: '#94A3B8',
            textAlign: 'center',
            fontStyle: 'italic'
          }}
        >
          Importez le XML InstaPlayout pour suivre la playlist.
        </div>
      </div>
    )
  }

  const typeDiffusion = program.typeDiffusion || program.type || 'PAD'
  const isDirect = typeDiffusion === 'Direct' || typeDiffusion === 'LIVE'
  const isPAD = typeDiffusion === 'PAD' || typeDiffusion === 'Autre'
  const isReplay = typeDiffusion === 'Replay' || typeDiffusion === 'REPLAY' || typeDiffusion === 'Rediffusion'

  // Couleurs selon le type (thème broadcast centralisé)
  const getBackgroundColor = () => {
    if (isDirect) return `rgba(225, 6, 0, 0.1)` // --onair-red avec opacité
    if (isPAD) return DIFFUSION_TYPE_COLORS.PAD.bg
    if (isReplay) return DIFFUSION_TYPE_COLORS.REPLAY.bg
    return 'rgba(30, 41, 59, 0.5)' // slate-800 par défaut
  }

  const getBorderColor = () => {
    if (isDirect) return BROADCAST_STATUS_COLORS.onair.bg // #E10600 standard broadcast
    if (isPAD) return DIFFUSION_TYPE_COLORS.PAD.border
    if (isReplay) return DIFFUSION_TYPE_COLORS.REPLAY.border
    return '#1E293B' // slate-800 par défaut
  }

  const getTypeLabel = () => {
    if (isDirect) return 'DIRECT'
    if (isPAD) return 'PAD'
    if (isReplay) return 'REPLAY'
    return typeDiffusion.toUpperCase()
  }

  const endTime = program.end || (() => {
    // Calculer l'heure de fin basée sur la durée si end n'est pas fourni
    const [startHour, startMin] = program.start.split(':').map(Number)
    const duration = program.duration || 60 // Durée par défaut : 60 minutes
    const endMinutes = (startHour * 60 + startMin + duration) % (24 * 60)
    return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
  })()

  return (
    <div
      style={{
        backgroundColor: getBackgroundColor(),
        border: `3px solid ${getBorderColor()}`,
        borderRadius: '4px',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxShadow: `0 0 30px ${getBorderColor()}40`
      }}
    >
      {sourceLabel && (
        <div
          style={{
            color: '#FBBF24',
            fontSize: '18px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            marginBottom: '1rem',
            textTransform: 'uppercase'
          }}
        >
          {sourceLabel}
        </div>
      )}

      {/* Horaire */}
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#CBD5E1',
          marginBottom: '0.75rem',
          fontFamily: 'monospace'
        }}
      >
        {program.start} → {endTime}
      </div>

      {/* Titre (GRAND & LISIBLE À DISTANCE) */}
      <div
        style={{
          fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
          fontWeight: 'bold',
          color: '#FFFFFF',
          marginBottom: '1.25rem',
          lineHeight: '1.15',
          fontFamily: 'Helvetica, Arial, sans-serif',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
        }}
      >
        {program.title}
      </div>

      {/* Type et Catégorie */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            backgroundColor: getBorderColor(),
            color: '#FFFFFF',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            fontSize: '20px',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}
        >
          {getTypeLabel()}
        </div>
        {program.category && (
          <div
            style={{
              backgroundColor: '#1E293B',
              color: '#CBD5E1',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              fontSize: '20px',
              fontWeight: '500'
            }}
          >
            {program.category}
          </div>
        )}
      </div>

      {/* Barre de progression */}
      <RegieTimeline startTime={program.start} endTime={endTime} currentTime={currentTime} />
    </div>
  )
}

export default RegieCurrentProgram
