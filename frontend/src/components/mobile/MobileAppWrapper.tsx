/**
 * Coque responsive mobile/tablette : navigation principale, thème et vues métier.
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import MobileBottomNav, { MobileView } from './MobileBottomNav'
import MobileTodayView from './MobileTodayView'
import MobileOnAirView from './MobileOnAirView'
import MobileWeekView from './MobileWeekView'
import MobileAlertsView from './MobileAlertsView'
import CoordinationHub from '../CoordinationHub'
import TabletSplitView from '../tablet/TabletSplitView'
import TabletRegieView from '../tablet/TabletRegieView'
import { useDeviceDetection } from '../../hooks/useDeviceDetection'
import { buildMobileAlerts } from '../../lib/mobileAlerts'
import { isProgramToday } from '../../lib/broadcastDay'
import { deriveCategoryColor, rgbArrayToCss } from '../../legacy/lib/colorPalette'
import type { Program } from '../AppModernV3'

const BroadcastReportView = lazy(() => import('../BroadcastReportView'))

export type MobileRouteView = 'week' | 'day' | 'coordination' | 'report'

interface MobileAppWrapperProps {
  programs: Program[]
  currentDay: string
  categoryStyles?: Record<string, string>
  currentGridId?: string
  onProgramTap?: (program: Program) => void
  viewMode?: string
  onViewModeChange?: (viewMode: MobileRouteView) => void
  selectedDay?: string
  onSelectDay?: (day: string) => void
  userRole?: string
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  alerts?: Array<{
    id: string
    type: 'preparation' | 'on-air' | 'anomaly' | 'warning'
    title: string
    time: string
    message?: string
    programTitle?: string
  }>
}

const getMobileView = (viewMode?: string): MobileView => {
  if (viewMode === 'week') return 'week'
  if (viewMode === 'coordination' || viewMode === 'report') return viewMode
  if (viewMode === 'day') return 'day'
  return 'today'
}

const MobileAppWrapper: React.FC<MobileAppWrapperProps> = ({
  programs,
  currentDay,
  categoryStyles = {},
  currentGridId,
  onProgramTap,
  viewMode,
  onViewModeChange,
  selectedDay,
  onSelectDay,
  userRole,
  theme,
  onThemeToggle,
  alerts = [],
}) => {
  const device = useDeviceDetection()
  const isTabletLandscape = device.isTablet && device.orientation === 'landscape'
  const [mobileView, setMobileView] = useState<MobileView>(() => getMobileView(viewMode))
  const visiblePrograms = useMemo(() => {
    if (currentGridId !== 'grid-2026-2027-bon') return programs
    return programs.filter((program) => {
      const [startHour, startMinute] = (program.start || '00:00').split(':').map(Number)
      const start = startHour * 60 + startMinute
      const [endHour, endMinute] = (program.end || '').split(':').map(Number)
      let end = program.end ? endHour * 60 + endMinute : start + (program.duration || 60)
      if (end <= start) end += 24 * 60
      return end > 5 * 60 && start < 24 * 60
    })
  }, [programs, currentGridId])

  useEffect(() => {
    setMobileView(getMobileView(viewMode))
  }, [viewMode])

  const computedAlerts = useMemo(() => buildMobileAlerts(visiblePrograms, currentDay), [visiblePrograms, currentDay])
  const allAlerts = alerts.length > 0 ? alerts : computedAlerts
  const onAirCount = useMemo(() => visiblePrograms.filter(p => p.opStatus === 'ON_AIR').length, [visiblePrograms])
  const tabletDayPrograms = useMemo(() => {
    // Jour de l'horloge uniquement : le jour sélectionné dans la vue semaine
    // ne doit pas s'ajouter à la grille « du jour ».
    return visiblePrograms
      .filter(program => isProgramToday(program))
      .sort((a, b) => {
        const [aHour, aMinute] = a.start.split(':').map(Number)
        const [bHour, bMinute] = b.start.split(':').map(Number)
        return aHour * 60 + aMinute - (bHour * 60 + bMinute)
      })
  }, [visiblePrograms])

  const handleViewChange = (nextView: MobileView) => {
    setMobileView(nextView)
    if (nextView === 'week' || nextView === 'day' || nextView === 'coordination' || nextView === 'report') {
      onViewModeChange?.(nextView)
    }
  }

  const themeLabel = theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'

  return (
    <div className="mobile-app-shell flex h-dvh flex-col overflow-hidden" data-theme={theme}>
      <header
        className="mobile-app-header flex min-h-12 shrink-0 items-center justify-between border-b px-4"
        style={{ minHeight: 'calc(3rem + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <span className="text-sm font-semibold">GrilleTV Pro</span>
        <button
          type="button"
          onClick={onThemeToggle}
          aria-label={themeLabel}
          title={themeLabel}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {theme === 'dark' ? <Sun aria-hidden="true" className="h-5 w-5" /> : <Moon aria-hidden="true" className="h-5 w-5" />}
        </button>
      </header>

      <main className="min-h-0 flex-1 pb-16">
        {mobileView === 'today' && (
          <MobileTodayView programs={visiblePrograms} currentDay={currentDay} onProgramTap={onProgramTap} />
        )}
        {mobileView === 'onair' && (
          isTabletLandscape ? (
            <TabletSplitView
              main={
                <div className="h-full overflow-y-auto p-6">
                  <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Grille du jour</h1>
                  <div className="space-y-3">
                    {tabletDayPrograms.map(program => {
                      const isOnAir = program.opStatus === 'ON_AIR'
                      const color = deriveCategoryColor(program.category, categoryStyles[program.category || ''])
                      const colorCss = rgbArrayToCss(color)
                      return (
                        <button
                          type="button"
                          key={program.id}
                          aria-label={`Afficher les détails de ${program.title}, ${program.start}`}
                          className="w-full rounded-lg border-l-4 p-4 text-left transition-opacity active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          style={{
                            backgroundColor: isOnAir ? 'rgba(193, 18, 31, 0.15)' : rgbArrayToCss(color, 0.1),
                            borderColor: isOnAir ? '#C1121F' : colorCss,
                          }}
                          onClick={() => onProgramTap?.(program)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 font-mono text-base font-bold text-[var(--text-primary)]">{program.start}</div>
                              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{program.title}</h2>
                              {program.category && (
                                <span className="mt-2 inline-block rounded border px-2 py-1 text-xs font-medium" style={{ backgroundColor: rgbArrayToCss(color, 0.16), borderColor: rgbArrayToCss(color, 0.5), color: colorCss }}>
                                  {program.category}
                                </span>
                              )}
                            </div>
                            {isOnAir && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: '#C1121F' }}>
                                ON AIR
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                    {tabletDayPrograms.length === 0 && (
                      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Aucun programme prévu pour cette journée.</p>
                    )}
                  </div>
                </div>
              }
              sidebar={<TabletRegieView programs={visiblePrograms} currentDay={currentDay} categoryStyles={categoryStyles} />}
            />
          ) : (
            <MobileOnAirView programs={visiblePrograms} currentDay={currentDay} />
          )
        )}
        {(mobileView === 'week' || mobileView === 'day') && (
          <MobileWeekView
            programs={visiblePrograms}
            onProgramTap={onProgramTap}
            initialDay={mobileView === 'day' ? (selectedDay || currentDay) : undefined}
            onDayChange={onSelectDay}
            mode={mobileView}
          />
        )}
        {mobileView === 'alerts' && (
          <MobileAlertsView
            alerts={allAlerts}
            onAlertTap={(alert) => {
              const program = visiblePrograms.find(p => p.title === alert.programTitle)
              if (program) onProgramTap?.(program)
            }}
          />
        )}
        {mobileView === 'coordination' && (
          currentGridId ? (
            <div className="h-full overflow-y-auto px-4 py-4">
              <CoordinationHub gridId={currentGridId} userRole={userRole} />
            </div>
          ) : (
            <MobileEmptyRoute title="Coordination" />
          )
        )}
        {mobileView === 'report' && (
          currentGridId ? (
            <div className="h-full overflow-y-auto px-4 py-4">
              <Suspense fallback={<p className="p-4 text-sm text-[var(--text-secondary)]">Chargement du rapport…</p>}>
                <BroadcastReportView gridId={currentGridId} />
              </Suspense>
            </div>
          ) : (
            <MobileEmptyRoute title="Rapport" />
          )
        )}
        {mobileView === 'more' && (
          <div className="h-full overflow-y-auto px-4 py-5">
            <h1 className="mb-4 text-xl font-semibold">Autres vues</h1>
            <div className="space-y-3">
              <MobileRouteButton label="Conducteur du jour" description="Consulter et parcourir les programmes d’un jour." onClick={() => handleViewChange('day')} />
              <MobileRouteButton label="Coordination" description="Messages, incidents, écarts et tâches de la grille." onClick={() => handleViewChange('coordination')} />
              <MobileRouteButton label="Rapport" description="Consulter les indicateurs et les exports de diffusion." onClick={() => handleViewChange('report')} />
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav
        currentView={mobileView}
        onViewChange={handleViewChange}
        onAirBadge={onAirCount}
        alertsBadge={allAlerts.length}
      />
    </div>
  )
}

const MobileRouteButton: React.FC<{ label: string; description: string; onClick: () => void }> = ({
  label,
  description,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="mobile-route-button w-full rounded-xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
  >
    <span className="block font-semibold">{label}</span>
    <span className="mt-1 block text-sm text-[var(--text-secondary)]">{description}</span>
  </button>
)

const MobileEmptyRoute: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
    <h1 className="text-xl font-semibold">{title}</h1>
    <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
      Sélectionnez une grille pour consulter cette vue.
    </p>
  </div>
)

export default MobileAppWrapper
