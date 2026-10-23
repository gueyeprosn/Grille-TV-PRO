/**
 * MobileBottomNav - Navigation bottom bar pour mobile
 * Accessible au pouce, toujours visible
 */

import React from 'react'
import { Calendar, CalendarDays, Radio, Bell, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

export type MobileView = 'today' | 'onair' | 'week' | 'alerts' | 'day' | 'coordination' | 'report' | 'more'

interface MobileBottomNavProps {
  currentView: MobileView
  onViewChange: (view: MobileView) => void
  onAirBadge?: number // Nombre d'alertes ON AIR
  alertsBadge?: number // Nombre d'alertes
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onAirBadge,
  alertsBadge,
}) => {
  const navItems: Array<{
    id: MobileView
    label: string
    icon: React.ReactNode
    badge?: number
  }> = [
    {
      id: 'today',
      label: 'Aujourd\'hui',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'onair',
      label: 'ON AIR',
      icon: <Radio className="w-5 h-5" />,
      badge: onAirBadge,
    },
    {
      id: 'week',
      label: 'Semaine',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'alerts',
      label: 'Alertes',
      icon: <Bell className="w-5 h-5" />,
      badge: alertsBadge,
    },
    {
      id: 'more',
      label: 'Plus',
      icon: <MoreHorizontal className="w-5 h-5" />,
    },
  ]

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{
        backgroundColor: 'var(--mobile-nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--mobile-nav-border)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2" style={{ minHeight: '64px', height: '64px' }}>
        {navItems.map((item) => {
          const isActive = currentView === item.id || (item.id === 'more' && ['day', 'coordination', 'report'].includes(currentView))
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 flex-1 h-full rounded-xl transition-all duration-300 relative',
                'active:scale-95',
                isActive
                  ? 'text-[#C1121F]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
              style={{
                minHeight: '56px',
                minWidth: '56px',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Indicateur actif avec animation */}
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full"
                  style={{
                    backgroundColor: '#C1121F',
                    boxShadow: '0 0 10px rgba(193, 18, 31, 0.6)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              )}
              
              {/* Fond actif avec glow */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(193, 18, 31, 0.1)',
                    boxShadow: isActive ? '0 0 20px rgba(193, 18, 31, 0.3)' : 'none',
                  }}
                />
              )}
              
              <div className="relative z-10">
                <div
                  style={{
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  {item.icon}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white rounded-full shadow-lg"
                    style={{ 
                      backgroundColor: '#C1121F',
                      boxShadow: '0 2px 8px rgba(193, 18, 31, 0.5)',
                      animation: item.badge > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span 
                className={cn(
                  'text-xs font-semibold relative z-10 transition-all duration-300',
                  isActive ? 'font-bold' : 'font-medium'
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileBottomNav
