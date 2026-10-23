/**
 * RegieProgramList - Liste complète des programmes du jour
 * 
 * Affiche tous les programmes de la journée dans une grille simplifiée
 * avec mise en évidence du programme en cours
 */

import React from 'react'
import { BROADCAST_STATUS_COLORS, DIFFUSION_TYPE_COLORS } from '../../lib/broadcastTheme'

interface Program {
  id: string
  title: string
  start: string // Format "HH:mm"
  end?: string // Format "HH:mm"
  duration?: number
  typeDiffusion?: string
  category?: string
  type?: "LIVE" | "REPLAY" | "PAD" | "ADS" | "SPECIAL"
}

interface RegieProgramListProps {
  programs: Program[]
  currentProgramId?: string | null
  nextProgramId?: string | null
}

const RegieProgramList: React.FC<RegieProgramListProps> = ({ 
  programs, 
  currentProgramId,
  nextProgramId 
}) => {
  // Trier les programmes par heure de début
  const sortedPrograms = [...programs].sort((a, b) => {
    const [aHour, aMin] = a.start.split(':').map(Number)
    const [bHour, bMin] = b.start.split(':').map(Number)
    return (aHour * 60 + aMin) - (bHour * 60 + bMin)
  })

  const getTypeColor = (program: Program) => {
    const typeDiffusion = program.typeDiffusion || program.type || 'PAD'
    const isDirect = typeDiffusion === 'Direct' || typeDiffusion === 'LIVE'
    const isPAD = typeDiffusion === 'PAD' || typeDiffusion === 'Autre'
    const isReplay = typeDiffusion === 'Replay' || typeDiffusion === 'REPLAY' || typeDiffusion === 'Rediffusion'

    if (isDirect) return BROADCAST_STATUS_COLORS.onair.bg // #E10600 standard broadcast
    if (isPAD) return DIFFUSION_TYPE_COLORS.PAD.border
    if (isReplay) return DIFFUSION_TYPE_COLORS.REPLAY.border
    return '#1E293B' // slate-800
  }

  const getTypeLabel = (program: Program) => {
    const typeDiffusion = program.typeDiffusion || program.type || 'PAD'
    const isDirect = typeDiffusion === 'Direct' || typeDiffusion === 'LIVE'
    const isPAD = typeDiffusion === 'PAD' || typeDiffusion === 'Autre'
    const isReplay = typeDiffusion === 'Replay' || typeDiffusion === 'REPLAY' || typeDiffusion === 'Rediffusion'

    if (isDirect) return 'DIRECT'
    if (isPAD) return 'PAD'
    if (isReplay) return 'REPLAY'
    return typeDiffusion.toUpperCase()
  }

  const getProgramStatus = (program: Program) => {
    if (program.id === currentProgramId) return 'onair'
    if (program.id === nextProgramId) return 'next'
    return 'scheduled'
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'onair':
        return {
          backgroundColor: `rgba(225, 6, 0, 0.2)`, // --onair-red avec opacité
          borderColor: BROADCAST_STATUS_COLORS.onair.bg, // #E10600
          borderWidth: '3px',
          boxShadow: `0 0 20px ${BROADCAST_STATUS_COLORS.onair.glow}`
        }
      case 'next':
        return {
          backgroundColor: `rgba(245, 158, 11, 0.15)`, // --warning-orange avec opacité
          borderColor: BROADCAST_STATUS_COLORS.next.bg, // #F59E0B
          borderWidth: '2px',
          boxShadow: `0 0 10px ${BROADCAST_STATUS_COLORS.next.glow}`
        }
      default:
        return {
          backgroundColor: '#0F172A', // slate-900
          borderColor: '#1E293B',
          borderWidth: '1px'
        }
    }
  }

  if (sortedPrograms.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#0F172A',
          border: '2px solid #1E293B',
          borderRadius: '6px',
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '24px', color: '#64748B', fontWeight: 'bold' }}>
          Aucun programme prévu aujourd'hui
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem',
        padding: '1rem 0'
      }}
    >
      {sortedPrograms.map((program) => {
        const status = getProgramStatus(program)
        const statusStyle = getStatusStyle(status)
        const typeColor = getTypeColor(program)
        const typeLabel = getTypeLabel(program)

        const endTime = program.end || (() => {
          const [startHour, startMin] = program.start.split(':').map(Number)
          const duration = program.duration || 60
          const endDate = new Date()
          endDate.setHours(startHour, startMin + duration, 0, 0)
          return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
        })()

        return (
          <div
            key={program.id}
            style={{
              ...statusStyle,
              borderRadius: '6px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
          >
            {/* Badge statut */}
            {status === 'onair' && (
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: BROADCAST_STATUS_COLORS.onair.bg, // #E10600
                  color: '#FFFFFF',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '0.75rem',
                  letterSpacing: '1px'
                }}
              >
                🔴 ON AIR
              </div>
            )}
            {status === 'next' && (
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: BROADCAST_STATUS_COLORS.next.bg, // #F59E0B
                  color: '#FFFFFF',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '0.75rem',
                  letterSpacing: '1px'
                }}
              >
                ⏭️ SUIVANT
              </div>
            )}

            {/* Horaire */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: status === 'onair' ? BROADCAST_STATUS_COLORS.onair.bg : status === 'next' ? BROADCAST_STATUS_COLORS.next.bg : '#CBD5E1',
                marginBottom: '0.5rem',
                fontFamily: 'monospace'
              }}
            >
              {program.start} → {endTime}
            </div>

            {/* Titre */}
            <div
              style={{
                fontSize: status === 'onair' ? '28px' : '24px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginBottom: '0.75rem',
                lineHeight: '1.3',
                fontFamily: 'Helvetica, Arial, sans-serif'
              }}
            >
              {program.title}
            </div>

            {/* Type et Catégorie */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  backgroundColor: typeColor,
                  color: '#FFFFFF',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px'
                }}
              >
                {typeLabel}
              </div>
              {program.category && (
                <div
                  style={{
                    backgroundColor: '#1E293B',
                    color: '#CBD5E1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {program.category}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default RegieProgramList

