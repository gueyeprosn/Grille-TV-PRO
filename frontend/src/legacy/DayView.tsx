import React, { useEffect, useMemo, useState } from 'react'
import { toMinutes, formatDuration } from './lib/time'
import { loadCategories } from './lib/storage'
import { buildCategoryTheme, deriveCategoryColor, rgbArrayToCss } from './lib/colorPalette'
import { DAYS } from './config'

// ----------------------
// Types
// ----------------------
interface Program {
  id: string
  title: string
  start: string
  end: string
  duration?: number
  category: string
  typeDiffusion?: string
  description?: string
  days: string[]
}

interface DisplayOccurrence {
  program: Program
  start: string
  end: string
  duration: number
  isSpillover: boolean
}

interface ThemeData {
  color?: number[]
  vars?: Record<string, string>
  chipStyle?: React.CSSProperties
}

interface FreeInfo {
  scheduledMinutes?: number
  freeMinutes?: number
  freeSlots?: string[]
}

interface ConflictInfo {
  ids?: Set<string> | string[]
}

interface CategoryStyles {
  [key: string]: any
}

interface DailyProgramCardProps {
  occurrence: DisplayOccurrence
  theme: ThemeData
  onEdit: (program: Program) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  isConflict: boolean
}

// ----------------------
// 🎬 Carte programme
// ----------------------
const DailyProgramCard: React.FC<DailyProgramCardProps> = ({
  occurrence,
  theme,
  onEdit,
  onDelete,
  onDuplicate,
  isConflict,
}) => {
  const { program, start, end, duration, isSpillover } = occurrence
  const categoryColor = theme.color || deriveCategoryColor(program.category)
  const normalizedType = (program.typeDiffusion || '').trim().toUpperCase()
  const isLiveType = normalizedType.includes('DIRECT') || normalizedType.includes('LIVE')
  const isReplayType = normalizedType.includes('REPLAY') || normalizedType.includes('REDIFFUSION')
  const cardColor = isLiveType ? [239, 68, 68] : isReplayType ? [168, 85, 247] : categoryColor
  const styleVars: Record<string, string> = { ...(theme.vars || {}) }
  styleVars['--program-border' as any] = rgbArrayToCss(cardColor, 0.9)
  styleVars['--program-accent' as any] = rgbArrayToCss(categoryColor)
  styleVars['--program-background' as any] = `linear-gradient(135deg, ${rgbArrayToCss(cardColor, 0.38)} 0%, ${rgbArrayToCss(cardColor, 0.28)} 100%)`
  styleVars.background = styleVars['--program-background' as any]
  styleVars.borderColor = rgbArrayToCss(cardColor, 0.75)
  styleVars.borderRadius = '6px'

  if (isConflict) {
    styleVars['--program-border' as any] = 'rgba(248,113,113,0.9)'
    styleVars['--program-background' as any] = 'linear-gradient(155deg, rgba(239,68,68,0.4), rgba(69,10,10,0.3))'
    styleVars.background = styleVars['--program-background' as any]
    styleVars.borderColor = 'rgba(248,113,113,0.9)'
    styleVars['--program-shadow' as any] = '0 0 0 1px rgba(248,113,113,0.18), 0 18px 36px -24px rgba(248,113,113,0.32)'
    styleVars['--program-accent' as any] = 'rgba(248,113,113,1)'
  }

  const typeChipStyle = {
    background: rgbArrayToCss(isLiveType ? [239, 68, 68] : isReplayType ? [168, 85, 247] : categoryColor, 0.24),
    borderColor: rgbArrayToCss(isLiveType ? [239, 68, 68] : isReplayType ? [168, 85, 247] : categoryColor, 0.7),
    color: rgbArrayToCss(isLiveType ? [239, 68, 68] : isReplayType ? [168, 85, 247] : categoryColor),
  }

  return (
    <div
      className={`program-card day-program-color-card flex flex-col gap-2 rounded-md border p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg cursor-pointer ${
        isConflict ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white dark:bg-slate-900/70'
      }`}
      style={styleVars}
      title={`${program.title} — double-cliquez pour modifier`}
      onDoubleClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('button, a, input, select, textarea')) return
        onEdit(program)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--program-accent)' }}>
              {program.title}
            </span>
            {isSpillover && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Suite veille
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            {program.description || '—'}
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col items-end font-mono">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] mt-2">
        <span className="chip font-medium rounded-sm" style={{ ...theme.chipStyle, background: rgbArrayToCss(categoryColor, 0.24), borderColor: rgbArrayToCss(categoryColor, 0.7), color: rgbArrayToCss(categoryColor) }}>
          {program.category || 'Sans catégorie'}
        </span>
        <span className="chip font-medium rounded-sm" style={{ ...typeChipStyle, borderRadius: '2px' }}>
          {program.typeDiffusion || 'Autre'}
        </span>
        <span className="chip font-medium rounded-sm" style={{ ...theme.chipStyle, borderRadius: '2px', background: rgbArrayToCss(categoryColor, 0.18), color: rgbArrayToCss(categoryColor), borderColor: rgbArrayToCss(categoryColor, 0.55) }}>
          {formatDuration(duration)}
        </span>
      </div>

      {isConflict && (
        <div className="text-xs text-red-500 mt-1">
          ⚠️ Chevauchement détecté — vérifie ce créneau.
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs w-full mt-3">
        <button className="btn btn-sm btn-outline" onClick={() => onEdit(program)}>
          Modifier
        </button>
        <button className="btn btn-sm btn-amber" onClick={() => onDuplicate(program.id)}>
          Dupliquer
        </button>
        <button className="btn btn-sm btn-danger" onClick={() => onDelete(program.id)}>
          Supprimer
        </button>
      </div>
    </div>
  )
}

// ----------------------
// 🌞 Composant principal
// ----------------------
const DayView: React.FC<{
  day: string
  programs: Program[]
  onEdit: (program: Program) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  visibleIds: Set<string> | string[]
  freeInfo?: FreeInfo
  conflicts?: ConflictInfo
  categoryStyles?: CategoryStyles
  startHour?: number
  endHour?: number
}> = ({ day, programs, onEdit, onDelete, onDuplicate, visibleIds, freeInfo, conflicts, categoryStyles, startHour = 0, endHour = 24 }) => {
  const visibleSet = visibleIds instanceof Set ? visibleIds : new Set(visibleIds || programs.map((p) => p.id))
  const [styles, setStyles] = useState<CategoryStyles>(() => categoryStyles || loadCategories())

  useEffect(() => {
    if (categoryStyles) {
      setStyles(categoryStyles)
      return
    }
    const refresh = () => setStyles(loadCategories())
    window.addEventListener('grille:categories-updated', refresh)
    return () => window.removeEventListener('grille:categories-updated', refresh)
  }, [categoryStyles])

  const list = useMemo(
    () => {
      const prevDayIndex = (DAYS.indexOf(day) + DAYS.length - 1) % DAYS.length
      const prevDay = DAYS[prevDayIndex]

      const dayStart = startHour * 60
      const dayEnd = endHour * 60
      const toLabel = (minutes: number) => {
        if (minutes === 24 * 60) return '00:00'
        const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60)
        return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
      }

      return programs
        .flatMap((p): DisplayOccurrence[] => {
          if (!Array.isArray(p.days) || !visibleSet.has(p.id)) return []
          const originalStart = toMinutes(p.start || '00:00')
          const explicitEnd = p.end ? toMinutes(p.end) : originalStart + (p.duration || 60)
          const absoluteEnd = explicitEnd <= originalStart ? explicitEnd + 24 * 60 : explicitEnd
          const occurrences: Array<{ start: number; end: number; isSpillover: boolean }> = []

          if (p.days.includes(day)) occurrences.push({ start: originalStart, end: absoluteEnd, isSpillover: false })
          if (p.days.includes(prevDay) && absoluteEnd > 24 * 60) {
            occurrences.push({ start: originalStart - 24 * 60, end: absoluteEnd - 24 * 60, isSpillover: true })
          }

          return occurrences.flatMap((item) => {
            const clippedStart = Math.max(dayStart, item.start)
            const clippedEnd = Math.min(dayEnd, item.end)
            if (clippedEnd <= clippedStart) return []
            return [{
              program: p,
              start: toLabel(clippedStart),
              end: toLabel(clippedEnd),
              duration: clippedEnd - clippedStart,
              isSpillover: item.isSpillover,
            }]
          })
        })
        .sort((a, b) => a.start.localeCompare(b.start))
    },
    [programs, day, visibleSet, startHour, endHour]
  )

  const summary = useMemo(() => ({
    scheduled: freeInfo?.scheduledMinutes || 0,
    free: freeInfo?.freeMinutes || 0,
    slots: freeInfo?.freeSlots || [],
  }), [freeInfo])

  const conflictSet = useMemo(() => {
    if (conflicts?.ids instanceof Set) return conflicts.ids
    if (Array.isArray(conflicts?.ids)) return new Set(conflicts.ids)
    return new Set<string>()
  }, [conflicts])

  return (
    <div className="space-y-4">
      {/* --- Résumé du jour --- */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{day}</h3>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {list.length} programme{list.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>Périmètre : {String(startHour).padStart(2, '0')}:00 → {endHour === 24 ? '00:00' : `${String(endHour).padStart(2, '0')}:00`}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mt-2 text-xs">
          <p className="text-slate-700 dark:text-slate-200">
            Temps programmé : <span className="font-bold text-blue-700 dark:text-blue-400">{formatDuration(summary.scheduled)} / {endHour - startHour}h</span>
          </p>
          <p className="text-slate-700 dark:text-slate-200">
            Temps libre : <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatDuration(summary.free)}</span>
          </p>
        </div>
        {summary.slots.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {summary.slots.map(slot => (
              <span 
                key={slot} 
                className="gap-chip"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  borderColor: 'rgba(34, 197, 94, 0.4)',
                  color: 'rgb(22, 163, 74)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid',
                }}
              >
                {slot}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-red-500 mt-1">Journée complète — aucun créneau libre</div>
        )}
      </div>

      {/* --- Liste programmes --- */}
      {list.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          Aucun programme pour cette journée.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(occurrence => {
            const theme = buildCategoryTheme(occurrence.program.category, styles?.[occurrence.program.category])
            return (
              <DailyProgramCard
                key={`${occurrence.program.id}-${occurrence.start}`}
                occurrence={occurrence}
                theme={theme}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                isConflict={conflictSet.has(occurrence.program.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DayView
