/**
 * MobileAlertsView - Vue alertes mobile
 * Supervision rapide, tous types d'alertes, badges couleurs broadcast
 */

import React, { useMemo } from 'react'
import { Bell, AlertTriangle, Radio, Clock } from 'lucide-react'
import AlertListItem, { type AlertType } from './AlertListItem'

interface Alert {
  id: string
  type: 'preparation' | 'on-air' | 'anomaly' | 'warning'
  title: string
  time: string
  message?: string
  programTitle?: string
}

interface MobileAlertsViewProps {
  alerts: Alert[]
  onAlertTap?: (alert: Alert) => void
}

const MobileAlertsView: React.FC<MobileAlertsViewProps> = ({ alerts, onAlertTap }) => {
  // Trier par priorité et temps (plus récent en premier)
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      // Priorité : on-air > anomaly > preparation > warning
      const typeOrder: Record<string, number> = { 
        'on-air': 0, 
        'anomaly': 1, 
        'preparation': 2, 
        'warning': 3 
      }
      const typeDiff = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99)
      if (typeDiff !== 0) return typeDiff
      // Plus récent en premier
      return b.time.localeCompare(a.time)
    })
  }, [alerts])

  // Compter par type
  const counts = useMemo(() => {
    return {
      critical: sortedAlerts.filter(a => a.type === 'on-air' || a.type === 'anomaly').length,
      warning: sortedAlerts.filter(a => a.type === 'preparation' || a.type === 'warning').length,
      total: sortedAlerts.length,
    }
  }, [sortedAlerts])

  return (
    <div 
      className="flex flex-col h-full pb-20 safe-area-bottom overflow-hidden"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Header fixe avec design amélioré */}
      <div 
        className="sticky top-0 z-10 border-b px-4 py-5 safe-area-top"
        style={{ 
          background: 'var(--card-bg-solid)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--card-border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(193, 18, 31, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)',
                border: '1px solid rgba(193, 18, 31, 0.3)',
              }}
            >
              <Bell className="w-5 h-5 text-[#C1121F]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Alertes</h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {counts.total} alerte{counts.total > 1 ? 's' : ''} active{counts.total > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {counts.critical > 0 && (
              <span 
                className="text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
                style={{ 
                  backgroundColor: '#C1121F',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(193, 18, 31, 0.4)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              >
                <span className="text-sm">🔴</span>
                {counts.critical}
              </span>
            )}
            {counts.warning > 0 && (
              <span 
                className="text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
                style={{ 
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                }}
              >
                <span className="text-sm">🟠</span>
                {counts.warning}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Liste des alertes - Scroll vertical */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {sortedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div 
              className="flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{
                background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.1) 100%)',
                border: '2px dashed rgba(148, 163, 184, 0.3)',
              }}
            >
              <Bell className="w-10 h-10 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 text-center">
              Aucune alerte
            </h3>
            <p className="text-sm text-[var(--text-secondary)] text-center max-w-xs">
              Toutes les alertes de diffusion seront affichées ici
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(193, 18, 31, 0.1)', color: '#C1121F' }}>
                🔴 ON AIR
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                ⏰ Préparation
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                ⚠️ Anomalie
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAlerts.map((alert, index) => (
              <div
                key={alert.id}
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                <AlertListItem
                  type={alert.type as AlertType}
                  time={alert.time}
                  title={alert.title}
                  message={alert.message}
                  programTitle={alert.programTitle}
                  onClick={() => onAlertTap?.(alert)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileAlertsView
