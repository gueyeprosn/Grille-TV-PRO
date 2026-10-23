import React, { useEffect, useMemo, useState } from "react"
import { toMinutes, formatDuration } from "./lib/time"
import { buildCategoryTheme, deriveTypeColor, rgbArrayToCss } from "./lib/colorPalette"
import { loadCategories } from "./lib/storage"

interface Program {
  id: string
  title: string
  start: string
  end?: string
  duration?: number
  category: string
  typeDiffusion?: string
  description?: string
  days: string[]
}

interface ConflictInfo {
  ids?: Set<string> | string[]
}

type CategoryStyles = Record<string, any>

interface WeekAgendaProps {
  programs: Program[]
  weekDays?: string[]
  startHour?: number
  endHour?: number
  visibleIds?: Set<string> | string[]
  conflicts?: ConflictInfo
  categoryStyles?: CategoryStyles
}

interface ProgramOccurrence {
  program: Program
  day: string
}

const DEFAULT_WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
const SLOT_MINUTES = 30

const minutesToLabel = (total: number) => {
  const sanitized = Math.max(0, Math.round(total))
  const hours = Math.floor(sanitized / 60) % 24
  const minutes = sanitized % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const ensureSet = (ids?: Set<string> | string[]) => {
  if (ids instanceof Set) return ids
  if (Array.isArray(ids)) return new Set(ids)
  return new Set<string>()
}

const WeekAgenda: React.FC<WeekAgendaProps> = ({
  programs,
  weekDays = DEFAULT_WEEK_DAYS,
  startHour = 5,
  endHour = 24,
  visibleIds,
  conflicts,
  categoryStyles,
}) => {
  const weekDaySet = useMemo(() => new Set(weekDays), [weekDays])
  const [styles, setStyles] = useState<CategoryStyles>(() => categoryStyles || loadCategories())

  useEffect(() => {
    if (categoryStyles) {
      setStyles(categoryStyles)
      return
    }
    const refresh = () => setStyles(loadCategories())
    window.addEventListener("grille:categories-updated", refresh)
    return () => window.removeEventListener("grille:categories-updated", refresh)
  }, [categoryStyles])

  const visibleSet = useMemo(() => {
    if (visibleIds instanceof Set) return visibleIds
    if (Array.isArray(visibleIds)) return new Set(visibleIds)
    return new Set(programs.map((p) => p.id))
  }, [visibleIds, programs])

  const conflictSet = useMemo(() => ensureSet(conflicts?.ids), [conflicts])
  const totalMinutes = Math.max(0, (endHour - startHour) * 60)
  const slotCount = Math.max(0, Math.ceil(totalMinutes / SLOT_MINUTES))
  const slots = useMemo(() => {
    return Array.from({ length: slotCount }, (_, index) => startHour * 60 + index * SLOT_MINUTES)
  }, [slotCount, startHour])

  const occurrences = useMemo<ProgramOccurrence[]>(() => {
    return programs.flatMap((program) => {
      if (!program?.id || !visibleSet.has(program.id)) return []
      const days = Array.isArray(program.days) ? program.days : []
      return days
        .filter((day) => weekDaySet.has(day))
        .map((day) => ({ program, day }))
    })
  }, [programs, visibleSet, weekDaySet])

  const programsByDay = useMemo(() => {
    const map = new Map<string, ProgramOccurrence[]>()
    for (const day of weekDays) {
      map.set(day, [])
    }
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.day)
      if (list) list.push(occurrence)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.program.start.localeCompare(b.program.start))
    }
    return map
  }, [occurrences, weekDays])

  const programNodes = useMemo(() => {
    const nodes: React.ReactNode[] = []

    occurrences.forEach(({ program, day }) => {
      const dayIndex = weekDays.indexOf(day)
      if (dayIndex === -1) return

      const startMinutes = toMinutes(program.start || "00:00")
      const computedEnd = program.end ? toMinutes(program.end) : startMinutes + (program.duration || 60)
      const endMinutes = Math.max(startMinutes, computedEnd)
      const duration = Math.max(SLOT_MINUTES, endMinutes - startMinutes)
      const relativeStart = Math.max(0, startMinutes - startHour * 60)
      const rowStart = Math.floor(relativeStart / SLOT_MINUTES)
      const rowSpan = Math.max(1, Math.ceil(duration / SLOT_MINUTES))
      if (rowStart >= slotCount) return

      const theme = buildCategoryTheme(program.category || "Divers", styles?.[program.category])
      const styleVars: Record<string, string> = { ...(theme.vars || {}) }
      const isConflict = conflictSet.has(program.id)

      if (isConflict) {
        styleVars["--program-border"] = "rgba(248,113,113,0.55)"
        styleVars["--program-background"] = "linear-gradient(155deg, rgba(254,226,226,0.95), rgba(255,255,255,0.9))"
        styleVars["--program-shadow"] = "0 16px 32px -18px rgba(248,113,113,0.35)"
        styleVars["--program-shadow-hover"] = "0 28px 48px -24px rgba(248,113,113,0.45)"
        styleVars["--program-accent"] = "rgba(248,113,113,1)"
      }

      const typeColor = deriveTypeColor(program.typeDiffusion || "Autre")
      const typeChipStyle = {
        background: rgbArrayToCss(typeColor, 0.14),
        borderColor: rgbArrayToCss(typeColor, 0.28),
        color: rgbArrayToCss(typeColor),
      }

      nodes.push(
        <div
          key={`${program.id}-${day}`}
          className={`week-program ${isConflict ? "week-program--conflict" : ""}`}
          style={{
            gridColumn: dayIndex + 2,
            gridRow: `${rowStart + 1} / span ${Math.min(rowSpan, slotCount - rowStart)}`,
            ...styleVars,
          }}
        >
          <div className="week-program__header">
            <span className="week-program__time">
              {program.start} – {program.end ? program.end : minutesToLabel(startMinutes + duration)}
            </span>
            <span className="week-program__duration">{formatDuration(duration)}</span>
          </div>
          <div className="week-program__title">{program.title}</div>
          <div className="week-program__chips">
            <span className="chip week-program__chip" style={theme.chipStyle}>
              {program.category || "Sans catégorie"}
            </span>
            {program.typeDiffusion && (
              <span className="chip week-program__chip" style={typeChipStyle}>
                {program.typeDiffusion}
              </span>
            )}
          </div>
          {program.description && (
            <p className="week-program__description">{program.description}</p>
          )}
        </div>
      )
    })

    return nodes
  }, [
    occurrences,
    weekDays,
    conflictSet,
    slotCount,
    startHour,
    styles,
  ])

  return (
    <div className="week-agenda">
      <div className="week-agenda__header" style={{ ["--week-days" as string]: weekDays.length }}>
        <div className="week-agenda__corner">
          <span className="week-agenda__corner-label">Vue semaine</span>
          <span className="week-agenda__corner-range">
            {String(startHour).padStart(2, "0")}h – {String(endHour).padStart(2, "0")}h
          </span>
        </div>
        {weekDays.map((day) => {
          const count = programsByDay.get(day)?.length ?? 0
          return (
            <div key={day} className="week-agenda__day">
              <span className="week-agenda__day-label">{day}</span>
              <span className="week-agenda__day-count">
                {count} programme{count > 1 ? "s" : ""}
              </span>
            </div>
          )
        })}
      </div>

      <div
        className="week-agenda__matrix"
        style={{ ["--week-days" as string]: weekDays.length }}
      >
        {slots.map((minuteValue) => {
          const hour = Math.floor(minuteValue / 60)
          const minutes = minuteValue % 60
          const showLabel = minutes === 0
          return (
            <React.Fragment key={`slot-${minuteValue}`}>
              <div className={`week-agenda__hour ${showLabel ? "week-agenda__hour--label" : ""}`}>
                {showLabel ? `${String(hour).padStart(2, "0")}:00` : ""}
              </div>
              {weekDays.map((day) => (
                <div
                  key={`${day}-${minuteValue}`}
                  className={`week-agenda__slot ${showLabel ? "week-agenda__slot--hour" : "week-agenda__slot--half"}`}
                />
              ))}
            </React.Fragment>
          )
        })}

        {programNodes}
      </div>
    </div>
  )
}

export default WeekAgenda
