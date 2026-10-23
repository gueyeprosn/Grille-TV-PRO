/**
 * Sélecteur de mode UI pour GrilleTV Pro V4
 * Permet de basculer entre STANDARD, REGIE et DIRECTION
 */

import React from 'react'
import { useUIModeStore, type UIMode } from '../lib/uiModeStore'
import { Button } from './ui'
import { Monitor, Radio, BarChart3 } from 'lucide-react'
import { cn } from '../lib/utils'

const UIModeSelector: React.FC = () => {
  const { mode, setMode } = useUIModeStore()

  const modes: Array<{ value: UIMode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
    {
      value: 'STANDARD',
      label: 'Standard',
      icon: Monitor,
      description: 'Interface standard pour production/coordination',
    },
    {
      value: 'REGIE',
      label: 'Régie ON AIR',
      icon: Radio,
      description: 'Mode optimisé pour régie live (lisibilité maximale)',
    },
    {
      value: 'DIRECTION',
      label: 'Direction',
      icon: BarChart3,
      description: 'Vue globale avec statistiques pour direction des programmes',
    },
  ]

  return (
    <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/60 flex-shrink-0 shadow-inner">
      {modes.map((m) => {
        const Icon = m.icon
        const isActive = mode === m.value
        
        let activeClass = 'bg-blue-600 text-white shadow-sm'
        if (m.value === 'REGIE') {
          activeClass = 'bg-red-600 text-white shadow-sm shadow-red-500/30'
        } else if (m.value === 'DIRECTION') {
          activeClass = 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
        }

        return (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150',
              isActive
                ? activeClass
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            )}
            title={m.description}
          >
            <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-slate-400')} />
            <span className="hidden lg:inline">{m.label}</span>
            <span className="lg:hidden">{m.label.split(' ')[0]}</span>
            {m.value === 'REGIE' && isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default UIModeSelector


