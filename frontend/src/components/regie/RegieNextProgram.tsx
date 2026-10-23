/**
 * RegieNextProgram - Programme suivant
 * 
 * Affiche UNIQUEMENT :
 * - Horaire
 * - Titre
 * - Type
 * 
 * Pas plus de 2 lignes, pas de scroll
 */

import React from 'react'

interface Program {
  id: string
  title: string
  start: string // Format "HH:mm"
  end?: string // Format "HH:mm"
  duration?: number
  typeDiffusion?: string
  type?: "LIVE" | "REPLAY" | "PAD" | "ADS" | "SPECIAL"
}

interface RegieNextProgramProps {
  program: Program | null
}

const RegieNextProgram: React.FC<RegieNextProgramProps> = ({ program }) => {
  if (!program) {
    return (
      <div
        style={{
          backgroundColor: '#0F172A',
          border: '2px solid #1E293B',
          borderRadius: '6px',
          padding: '1.5rem',
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            fontSize: '24px',
            color: '#64748B',
            fontWeight: 'bold'
          }}
        >
          Aucun programme suivant
        </div>
      </div>
    )
  }

  const typeDiffusion = program.typeDiffusion || program.type || 'PAD'
  const isDirect = typeDiffusion === 'Direct' || typeDiffusion === 'LIVE'
  const isPAD = typeDiffusion === 'PAD' || typeDiffusion === 'Autre'
  const isReplay = typeDiffusion === 'Replay' || typeDiffusion === 'REPLAY' || typeDiffusion === 'Rediffusion'

  const getTypeColor = () => {
    if (isDirect) return '#EF4444' // red-500
    if (isPAD) return '#2563EB' // blue-600
    if (isReplay) return '#6B7280' // gray-500
    return '#1E293B' // slate-800
  }

  const getTypeLabel = () => {
    if (isDirect) return 'DIRECT'
    if (isPAD) return 'PAD'
    if (isReplay) return 'REPLAY'
    return typeDiffusion.toUpperCase()
  }

  const endTime = program.end || (() => {
    const [startHour, startMin] = program.start.split(':').map(Number)
    const duration = program.duration || 60
    const endDate = new Date()
    endDate.setHours(startHour, startMin + duration, 0, 0)
    return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  })()

  return (
    <div
      style={{
        backgroundColor: '#0F172A',
        border: `2px solid ${getTypeColor()}`,
        borderRadius: '6px',
        padding: '1.5rem',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '0.75rem'
      }}
    >
      {/* Horaire */}
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#F59E0B', // amber-500 pour "suivant"
          fontFamily: 'monospace'
        }}
      >
        {program.start} → {endTime}
      </div>

      {/* Titre et Type sur une ligne */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'Helvetica, Arial, sans-serif'
          }}
        >
          {program.title}
        </div>
        <div
          style={{
            backgroundColor: getTypeColor(),
            color: '#FFFFFF',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
          }}
        >
          {getTypeLabel()}
        </div>
      </div>
    </div>
  )
}

export default RegieNextProgram

