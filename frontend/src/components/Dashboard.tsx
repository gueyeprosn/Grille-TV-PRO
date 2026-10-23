import React, { useState } from 'react'
import { Card, Badge } from './ui'
import { Clock, Calendar, AlertTriangle, TrendingUp, BarChart3, CheckCircle2, CircleAlert, Radio } from 'lucide-react'
import { cn } from '../lib/utils'
import { toMinutes } from '../legacy/lib/time'

interface Program {
  id: string
  title: string
  category: string
  typeDiffusion?: string
  start: string
  end: string
  duration: number
  days: string[]
  opStatus?: string
}

interface DashboardProps {
  programs: Program[]
  conflicts: { ids?: Set<string>; byDay?: Record<string, { ids?: Set<string>; pairs?: Array<{ a: string; b: string; window: string }> } | undefined> }
  freeInfo: Record<string, { scheduledMinutes: number; freeMinutes: number; freeSlots?: string[] }>
  selectedDay: string
  onEditProgram?: (program: Program) => void
  startHour?: number
  endHour?: number
}

const Dashboard: React.FC<DashboardProps> = ({ programs, conflicts, freeInfo, selectedDay, onEditProgram, startHour = 0, endHour = 24 }) => {
  const dayStart = startHour * 60
  const dayEnd = endHour * 60
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const previousDay = dayNames[(dayNames.indexOf(selectedDay) + dayNames.length - 1) % dayNames.length]
  const intersectsWindow = (start: number, end: number) => end > dayStart && start < dayEnd
  const dayPrograms = programs
    .filter(program => {
      const start = toMinutes(program.start || '00:00')
      let end = program.end ? toMinutes(program.end) : start + (program.duration || 60)
      if (end <= start) end += 24 * 60
      const days = Array.isArray(program.days) ? program.days : []
      const onSelectedDay = days.includes(selectedDay) && intersectsWindow(start, end)
      const continuesFromPreviousDay = days.includes(previousDay) && end > 24 * 60
        && intersectsWindow(start - 24 * 60, end - 24 * 60)
      return onSelectedDay || continuesFromPreviousDay
    })
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
  const dayProgramById = new Map(dayPrograms.map(program => [program.id, program]))
  const dayConflicts = conflicts.byDay?.[selectedDay]?.pairs || []
  const unreadyPrograms = dayPrograms.filter(program => !program.opStatus || program.opStatus === 'DRAFT' || program.opStatus === 'PLANNED')
  const [expandedAlertSections, setExpandedAlertSections] = useState<Record<string, boolean>>({
    conflicts: dayConflicts.length > 0,
    unready: false, // Replié par défaut selon l'audit UX
    durations: false,
    titles: false,
    gaps: false,
  })
  const missingTitles = dayPrograms.filter(program => !program.title?.trim())
  const inconsistentDurations = dayPrograms.filter(program => {
    if (!program.start || !program.end || !Number.isFinite(program.duration) || program.duration <= 0) return false
    const [startHour, startMinute] = program.start.split(':').map(Number)
    const [endHour, endMinute] = program.end.split(':').map(Number)
    const start = startHour * 60 + startMinute
    let end = endHour * 60 + endMinute
    if (end <= start) end += 24 * 60
    return Math.abs((end - start) - program.duration) > 1
  })
  const freeSlots = freeInfo[selectedDay]?.freeSlots || []
  const readinessIssueCount = dayConflicts.length + unreadyPrograms.length + missingTitles.length + inconsistentDurations.length + freeSlots.length
  // Calculs statistiques
  const totalPrograms = programs.length
  const conflictCount = conflicts.ids?.size || 0
  const totalScheduledMinutes = (typeof (freeInfo as any)?.totalScheduledMinutes === 'number')
    ? (freeInfo as any).totalScheduledMinutes
    : Object.entries(freeInfo).reduce((sum, [k, day]) => {
        if (typeof day === 'object' && day && 'scheduledMinutes' in day) {
          return sum + (day.scheduledMinutes || 0)
        }
        return sum
      }, 0)

  const totalFreeMinutes = (typeof (freeInfo as any)?.totalFreeMinutes === 'number')
    ? (freeInfo as any).totalFreeMinutes
    : Object.entries(freeInfo).reduce((sum, [k, day]) => {
        if (typeof day === 'object' && day && 'freeMinutes' in day) {
          return sum + (day.freeMinutes || 0)
        }
        return sum
      }, 0)

  const weeklyWindowMinutes = totalScheduledMinutes + totalFreeMinutes
  const occupancyRate = weeklyWindowMinutes > 0 ? (totalScheduledMinutes / weeklyWindowMinutes) * 100 : 0

  // Statistiques par catégorie
  const categoryStats = programs.reduce((acc, program) => {
    const cat = program.category || 'Autre'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Statistiques par type
  const typeStats = programs.reduce((acc, program) => {
    const type = program.typeDiffusion || 'Autre'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Top catégories
  const topCategories = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Statistiques par jour
  const dayStats = programs.reduce((acc, program) => {
    const days = Array.isArray(program.days) ? program.days : []
    days.forEach((day) => {
      acc[day] = (acc[day] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h${mins > 0 ? mins : ''}`
    }
    return `${mins}min`
  }

  return (
    <div className="space-y-6 animate-fade-in" style={{ color: 'var(--card-text)' }}>
      {/* Contrôle opérationnel avant antenne */}
      <Card variant="elevated" className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-3">
              <Radio className="w-6 h-6 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Contrôle avant antenne</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{selectedDay} · {dayPrograms.length} élément(s) à l’antenne</p>
            </div>
          </div>
          <Badge variant={readinessIssueCount === 0 ? 'success' : dayConflicts.length ? 'error' : 'warning'} size="lg">
            {readinessIssueCount === 0 ? 'Prêt à vérifier' : `${readinessIssueCount} point(s) à vérifier`}
          </Badge>
        </div>

        {dayPrograms.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 text-sm text-red-800 dark:text-red-200">
            <CircleAlert className="w-5 h-5 shrink-0" />
            Aucun programme n’est planifié pour ce jour. Vérifiez la grille ou confirmez le contenu de la playlist antenne.
          </div>
        ) : null}

        {/* Synthèse des alertes par gravité */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">Synthèse des alertes</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
              {dayConflicts.length} critique{dayConflicts.length > 1 ? 's' : ''}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              {unreadyPrograms.length + inconsistentDurations.length + missingTitles.length} avertissement{unreadyPrograms.length + inconsistentDurations.length + missingTitles.length > 1 ? 's' : ''}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {freeSlots.length} info{freeSlots.length > 1 ? 's' : ''}
            </span>
          </div>
          {readinessIssueCount === 0 && (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Aucune alerte — contrôle avant antenne validé.
            </span>
          )}
        </div>

        {/* Détails regroupés par catégorie (repliables) */}
        <div className="space-y-2">
          {/* Conflits (critiques) */}
          {dayConflicts.length > 0 && (
            <AlertSection
              title={`Conflits d’horaire (${dayConflicts.length})`}
              severity="error"
              icon={<CircleAlert className="w-5 h-5 text-red-600" />}
              isExpanded={expandedAlertSections.conflicts}
              onToggle={() => setExpandedAlertSections((prev) => ({ ...prev, conflicts: !prev.conflicts }))}
            >
              {dayConflicts.map((conflict, index) => {
                const first = dayProgramById.get(conflict.a)
                const second = dayProgramById.get(conflict.b)
                return (
                  <div key={`conflict-${index}`} className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 text-sm">
                    <CircleAlert className="w-5 h-5 shrink-0 text-red-600" />
                    <span><strong>Conflit {conflict.window}</strong> — {first?.title || 'Programme sans titre'} / {second?.title || 'Programme sans titre'}</span>
                  </div>
                )
              })}
            </AlertSection>
          )}

          {/* Programmes en brouillon, durées incohérentes, titres manquants (avertissements) */}
          {(unreadyPrograms.length + inconsistentDurations.length + missingTitles.length) > 0 && (
            <AlertSection
              title={`À vérifier avant diffusion (${unreadyPrograms.length + inconsistentDurations.length + missingTitles.length})`}
              severity="warning"
              icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
              isExpanded={expandedAlertSections.unready}
              onToggle={() => setExpandedAlertSections((prev) => ({ ...prev, unready: !prev.unready }))}
            >
              {unreadyPrograms.map((program) => (
                <div key={`draft-${program.id}`} className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-sm">
                  <CircleAlert className="w-5 h-5 shrink-0 text-amber-600" />
                  <span><strong>{program.start} · {program.title || 'Programme sans titre'}</strong> — statut encore en brouillon, à confirmer avant diffusion.</span>
                </div>
              ))}
              {inconsistentDurations.map((program) => (
                <div key={`duration-${program.id}`} className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-sm">
                  <Clock className="w-5 h-5 shrink-0 text-amber-600" />
                  <span><strong>{program.title}</strong> — durée déclarée ({program.duration} min) différente de la plage {program.start}–{program.end}.</span>
                </div>
              ))}
              {missingTitles.map((program) => (
                <div key={`title-${program.id}`} className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-sm">
                  <CircleAlert className="w-5 h-5 shrink-0 text-amber-600" />
                  <span><strong>{program.start}</strong> — élément sans titre identifiable dans la conduite.</span>
                </div>
              ))}
            </AlertSection>
          )}

          {/* Plages libres (informations) */}
          {freeSlots.length > 0 && (
            <AlertSection
              title={`Plages sans programme (${freeSlots.length})`}
              severity="info"
              icon={<Clock className="w-5 h-5 text-slate-500" />}
              isExpanded={expandedAlertSections.gaps}
              onToggle={() => setExpandedAlertSections((prev) => ({ ...prev, gaps: !prev.gaps }))}
            >
              {freeSlots.map((slot, index) => (
                <div key={`gap-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-300 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-3 text-sm">
                  <Clock className="w-5 h-5 shrink-0 text-slate-500" />
                  <span><strong>Plage sans programme : {slot}</strong> — confirmer qu’elle correspond à une playlist, un écran ou un choix éditorial.</span>
                </div>
              ))}
            </AlertSection>
          )}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
          Contrôle calculé à partir de la grille enregistrée. La disponibilité des médias, des invités et des équipes reste à confirmer par la production.
        </p>
      </Card>

      {/* Cartes statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Total Programmes</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalPrograms}</p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Temps Programmé</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatDuration(totalScheduledMinutes)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }} title="Part du périmètre horaire affiché qui est occupée par la programmation">Taux d’occupation de la grille</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {occupancyRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(occupancyRate, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            sur {formatDuration(weeklyWindowMinutes)} affichées
          </p>
        </Card>

        <Card
          variant="elevated"
          className={cn(
            'p-6',
            conflictCount > 0 && 'ring-2 ring-red-500/20 bg-red-50/50 dark:bg-red-950/20'
          )}
          style={{ color: 'var(--card-text)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Conflits</p>
              <p
                className="text-3xl font-bold"
                style={{ 
                  color: conflictCount > 0 
                    ? '#dc2626' 
                    : 'var(--text-primary)' 
                }}
              >
                {conflictCount}
              </p>
            </div>
            <div
              className={cn(
                'p-3 rounded-xl',
                conflictCount > 0
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-slate-100 dark:bg-slate-800'
              )}
            >
              <AlertTriangle
                className={cn(
                  'w-6 h-6',
                  conflictCount > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Graphiques et détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top catégories */}
        <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Top Catégories
            </h3>
          </div>
          <div className="space-y-3">
            {topCategories.length > 0 ? (
              topCategories.map(([category, count]) => {
                const percentage = (count / totalPrograms) * 100
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {category}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucune catégorie</p>
            )}
          </div>
        </Card>

        {/* Répartition par type */}
        <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Types de Diffusion
            </h3>
          </div>
          <div className="space-y-2">
            {Object.entries(typeStats).length > 0 ? (
              Object.entries(typeStats)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    style={{ backgroundColor: 'var(--surface)' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {type}
                    </span>
                    <Badge variant="info" size="sm">
                      {count}
                    </Badge>
                  </div>
                ))
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun type</p>
            )}
          </div>
        </Card>
      </div>

      {/* Répartition par jour */}
      <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Répartition par Jour
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(
            (day) => {
              const count = dayStats[day] || 0
              return (
                <div
                  key={day}
                  className="p-4 rounded-xl border"
                  style={{ 
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--card-border)'
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{day}</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count}</p>
                </div>
              )
            }
          )}
        </div>
      </Card>
    </div>
  )
}

// Section d'alerte repliable avec gravité visuelle
const AlertSection: React.FC<{
  title: string
  severity: 'error' | 'warning' | 'info'
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ title, severity, icon, isExpanded, onToggle, children }) => {
  const severityConfig = {
    error: { bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-300 dark:border-red-900', text: 'text-red-800 dark:text-red-200' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-300 dark:border-amber-900', text: 'text-amber-800 dark:text-amber-200' },
    info: { bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300' },
  } as const
  const config = severityConfig[severity]

  return (
    <div className="rounded-lg border p-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-left transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`alert-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold text-sm ${config.text}`}>{title}</span>
        </div>
        <span className={`text-xs ${config.text}`}>
          {isExpanded ? 'Masquer' : 'Voir'}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-t-transparent px-3 pb-2 space-y-2">{children}</div>
      )}
    </div>
  )
}

export default Dashboard
