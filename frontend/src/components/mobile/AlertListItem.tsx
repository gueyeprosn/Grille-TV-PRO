/**
 * AlertListItem - Item d'alerte pour mobile
 * Design broadcast avec codes couleur stricts
 */

import React from 'react'
import { AlertTriangle, Radio, Clock, Bell } from 'lucide-react'
import { cn } from '../../lib/utils'

export type AlertType = 'preparation' | 'on-air' | 'anomaly' | 'warning' | 'end-of-service'

interface AlertListItemProps {
  type: AlertType
  time: string
  title: string
  message?: string
  programTitle?: string
  onClick?: () => void
}

const AlertListItem: React.FC<AlertListItemProps> = ({
  type,
  time,
  title,
  message,
  programTitle,
  onClick,
}) => {
  const getAlertConfig = () => {
    switch (type) {
      case 'on-air':
        return {
          icon: '🔴', // ON AIR
          color: '#C1121F', // Rouge ON AIR
          bgColor: 'rgba(193, 18, 31, 0.15)',
          borderColor: '#C1121F',
          textColor: 'text-[#C1121F]',
          label: 'ON AIR',
        }
      case 'preparation':
        return {
          icon: '⏰', // Préparation
          color: '#F59E0B', // 🟠 Warning
          bgColor: 'rgba(245, 158, 11, 0.15)',
          borderColor: '#F59E0B',
          textColor: 'text-[#F59E0B]',
          label: 'Préparation',
        }
      case 'anomaly':
        return {
          icon: '⚠️', // Anomalie
          color: '#EF4444', // 🔴 Critical
          bgColor: 'rgba(239, 68, 68, 0.15)',
          borderColor: '#EF4444',
          textColor: 'text-[#EF4444]',
          label: 'Anomalie',
        }
      case 'warning':
        return {
          icon: '📅', // Journalier
          color: '#F59E0B', // 🟠 Warning
          bgColor: 'rgba(245, 158, 11, 0.15)',
          borderColor: '#F59E0B',
          textColor: 'text-[#F59E0B]',
          label: 'Journalier',
        }
      case 'end-of-service':
        return {
          icon: '✅', // Fin de service
          color: '#10B981', // Vert
          bgColor: 'rgba(16, 185, 129, 0.15)',
          borderColor: '#10B981',
          textColor: 'text-[#10B981]',
          label: 'Fin de service',
        }
      default:
        return {
          icon: '📅', // Par défaut : Journalier
          color: '#94A3B8',
          bgColor: 'rgba(148, 163, 184, 0.1)',
          borderColor: '#94A3B8',
          textColor: 'text-[var(--text-secondary)]',
          label: 'Info',
        }
    }
  }

  const config = getAlertConfig()

  return (
    <button
      type="button"
      aria-label={`Alerte ${config.label} à ${time} : ${title}`}
      className={cn(
        'flex w-full appearance-none items-start gap-4 p-5 text-left rounded-xl border-l-4 cursor-pointer transition-all duration-300',
        'active:scale-[0.98] active:opacity-90',
        'hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
      )}
      style={{
        background: `linear-gradient(135deg, ${config.bgColor} 0%, ${config.bgColor.replace('0.15', '0.08')} 100%)`,
        borderColor: config.borderColor,
        borderLeftWidth: '4px',
        boxShadow: `0 4px 12px ${config.color}15, 0 0 0 1px ${config.borderColor}20`,
      }}
      onClick={onClick}
    >
      {/* Icône avec fond animé */}
      <div 
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300',
        )}
        style={{
          backgroundColor: `${config.color}20`,
          border: `2px solid ${config.borderColor}40`,
          boxShadow: `0 0 20px ${config.color}20`,
        }}
      >
        <span className="text-2xl">{config.icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Header avec temps et badge */}
        <div className="flex items-center gap-2 mb-3">
          <span 
            className={cn('font-mono text-xs font-bold px-2 py-1 rounded', config.textColor)}
            style={{ 
              backgroundColor: `${config.color}15`,
              border: `1px solid ${config.borderColor}30`,
            }}
          >
            {time}
          </span>
          <span 
            className={cn('text-xs font-bold px-2.5 py-1 rounded-full', config.textColor)}
            style={{ 
              backgroundColor: `${config.color}25`,
              border: `1px solid ${config.borderColor}40`,
              boxShadow: `0 2px 8px ${config.color}20`,
            }}
          >
            {config.label}
          </span>
        </div>

        {/* Titre */}
        <h3 
          className={cn('font-bold text-base mb-2 leading-tight', config.textColor)}
          style={{
            textShadow: `0 1px 2px ${config.color}20`,
          }}
        >
          {title}
        </h3>

        {/* Programme associé */}
        {programTitle && (
          <div 
            className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--card-border)',
            }}
          >
            <span className="text-base">📺</span>
            <p className="text-sm text-[var(--text-primary)] font-medium">
              {programTitle}
            </p>
          </div>
        )}

        {/* Message */}
        {message && (
          <p 
            className="text-sm text-[var(--text-secondary)] leading-relaxed px-1"
            style={{
              lineHeight: '1.6',
            }}
          >
            {message}
          </p>
        )}
      </div>
      </button>
  )
}

export default AlertListItem
