/**
 * ProgramTimelineItem - Item de timeline verticale pour mobile
 * Heures à gauche, titres à droite, badges statuts broadcast
 */

import React from 'react'
import { Radio } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ProgramTimelineItemProps {
  startTime: string
  endTime?: string
  title: string
  category?: string
  type?: string
  status?: string
  isOnAir?: boolean
  isNext?: boolean
  onClick?: () => void
}

// Configuration des statuts broadcast
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PLANNED: { label: 'Planifié', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.1)' },
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

const ProgramTimelineItem: React.FC<ProgramTimelineItemProps> = ({
  startTime,
  endTime,
  title,
  category,
  type,
  status,
  isOnAir = false,
  isNext = false,
  onClick,
}) => {
  const statusBadge = status ? (STATUS_CONFIG[status] || STATUS_CONFIG.PLANNED) : null

  return (
    <div
      className={cn(
        'flex items-start gap-4 py-3 px-4 rounded-lg transition-colors border-l-4',
        isOnAir
          ? 'bg-[#C1121F]/15 border-[#C1121F]'
          : isNext
          ? 'bg-amber-500/10 border-amber-500'
          : 'bg-[#111827] border-[#1F2A44]',
        onClick && 'cursor-pointer active:opacity-80'
      )}
      onClick={onClick}
    >
      {/* Heure à gauche - Monospace */}
      <div className="flex-shrink-0 w-16">
        <div className="font-mono text-sm font-bold text-white">
          {startTime}
        </div>
        {endTime && (
          <div className="font-mono text-xs text-[#94A3B8] mt-0.5">
            {endTime}
          </div>
        )}
      </div>

      {/* Contenu à droite */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={cn(
            'font-semibold',
            isOnAir ? 'text-white text-base' : 'text-[#F1F5F9] text-sm'
          )}>
            {title}
          </h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {category && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#1F2A44] text-[#94A3B8]">
              {category}
            </span>
          )}
          {type && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#1F2A44] text-[#94A3B8]">
              {type}
            </span>
          )}
          {statusBadge && status !== 'PLANNED' && (
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

      {/* Badge ON AIR ou Next */}
      {isOnAir && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#C1121F] text-white text-xs font-bold">
            <Radio className="w-3 h-3" />
            ON
          </span>
        </div>
      )}
      {isNext && !isOnAir && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500 text-white text-xs font-bold">
            ⏭
          </span>
        </div>
      )}
    </div>
  )
}

export default ProgramTimelineItem
