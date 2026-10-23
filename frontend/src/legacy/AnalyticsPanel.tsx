import React, { useEffect, useMemo, useRef } from 'react'
import { aggregateWeeklyStats } from './lib/schedule.js'
import {
  deriveCategoryColor,
  deriveTypeColor,
  rgbArrayToCss,
} from './lib/colorPalette.js'
import { formatDuration } from './lib/time.js'

// ----------------------
// 🧩 Types
// ----------------------

interface Program {
  id: string
  title: string
  categoryId: string
  duration: number
  type?: string
  day?: string
}

interface CategoryStyle {
  [key: string]: string | undefined
}

interface ChartSummary {
  image: string | null
  summary: Record<string, string> | null
}

interface AnalyticsPanelProps {
  programs: Program[]
  categoryStyles?: CategoryStyle
  onChartChange?: (payload: ChartSummary) => void
}

interface LegendItemProps {
  label: string
  value: number
  percent: number
  color: string
}

// ----------------------
// 🎨 Légende
// ----------------------

const LegendItem: React.FC<LegendItemProps> = ({
  label,
  value,
  percent,
  color,
}) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
    <div className="flex items-center gap-3">
      <span
        className="inline-flex h-3 w-3 rounded-full"
        style={{ background: color }}
      />
      <span className="text-sm text-primary">{label}</span>
    </div>
    <div className="text-xs text-muted flex items-center gap-2 dark:text-slate-300">
      <span>{formatDuration(value)}</span>
      <span className="text-slate-400 dark:text-slate-500">
        ({percent.toFixed(1)}%)
      </span>
    </div>
  </div>
)

// ----------------------
// 📊 Composant principal
// ----------------------

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  programs,
  categoryStyles,
  onChartChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPayloadRef = useRef<{ image: string | null; summaryKey: string }>({
    image: null,
    summaryKey: '',
  })

  const stats = useMemo(() => aggregateWeeklyStats(programs), [programs])

  const categoryData = useMemo(() => {
    const raw = stats.categoryMinutes || {}
    const entries = Object.entries(raw)
      .map(([k, v]) => [k, Number(v || 0)] as [string, number])
      .filter(([, minutes]) => minutes > 0)
      .sort((a, b) => b[1] - a[1])

    if (!entries.length) return []

    return entries.map(([label, minutes]) => {
      const rgb = deriveCategoryColor(label, categoryStyles?.[label])
      return {
        label,
        minutes,
        colorArray: rgb,
        color: rgbArrayToCss(rgb),
      }
    })
  }, [stats.categoryMinutes, categoryStyles])

  const totalMinutes = stats.totalMinutes || 0

  // ----------------------
  // 🎨 Dessin du graphique
  // ----------------------

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 260
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    // Réinitialisation du contexte
    if ('reset' in ctx && typeof (ctx as any).reset === 'function') {
      ;(ctx as any).reset()
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    // Cas sans données
    if (!totalMinutes || !categoryData.length) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.25)'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2)
      ctx.fill()

      if (onChartChange) {
        const key = 'empty'
        if (lastPayloadRef.current.summaryKey !== key) {
          lastPayloadRef.current = { image: null, summaryKey: key }
          onChartChange({ image: null, summary: null })
        }
      }
      return
    }

    let startAngle = -Math.PI / 2
    const center = size / 2
    const radius = size / 2 - 12

    // Tranches du graphique
    categoryData.forEach(({ minutes, colorArray }) => {
      const slice = (minutes / totalMinutes) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, startAngle, startAngle + slice)
      ctx.closePath()
      ctx.fillStyle = rgbArrayToCss(colorArray)
      ctx.fill()
      startAngle += slice
    })

    // Cercle intérieur
    ctx.fillStyle = 'rgba(241, 245, 249, 0.96)'
    ctx.beginPath()
    ctx.arc(center, center, radius - 32, 0, Math.PI * 2)
    ctx.fill()

    // Texte central
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Total', center, center - 6)
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(formatDuration(totalMinutes), center, center + 18)

    // Mise à jour du résumé
    const dataUrl = canvas.toDataURL('image/png')
    if (onChartChange) {
      const summary = {
        'Temps total': formatDuration(totalMinutes),
        Direct: `${stats.typePercent.Direct}%`,
        PAD: `${stats.typePercent.PAD}%`,
        Autre: `${stats.typePercent.Autre}%`,
      }
      const summaryKey = JSON.stringify(summary)
      if (
        lastPayloadRef.current.summaryKey !== summaryKey ||
        lastPayloadRef.current.image !== dataUrl
      ) {
        lastPayloadRef.current = { image: dataUrl, summaryKey }
        onChartChange({ image: dataUrl, summary })
      }
    }
  }, [categoryData, totalMinutes, stats.typePercent, onChartChange])

  // ----------------------
  // 📈 Détails par type
  // ----------------------

  const typeBreakdown = useMemo(
    () => [
      {
        label: 'Direct',
        value: stats.typeMinutes.Direct || 0,
        percent: stats.typePercent.Direct || 0,
        color: rgbArrayToCss(deriveTypeColor('Direct')),
      },
      {
        label: 'PAD',
        value: stats.typeMinutes.PAD || 0,
        percent: stats.typePercent.PAD || 0,
        color: rgbArrayToCss(deriveTypeColor('PAD')),
      },
      {
        label: 'Autre',
        value: stats.typeMinutes.Autre || 0,
        percent: stats.typePercent.Autre || 0,
        color: rgbArrayToCss(deriveTypeColor('Autre')),
      },
    ],
    [stats.typeMinutes, stats.typePercent]
  )

  // ----------------------
  // 🖼️ Rendu final
  // ----------------------

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 text-primary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-primary">
          Analytics hebdomadaires
        </h2>
        <div className="text-xs text-muted dark:text-slate-300">
          Basé sur {programs.length} programme
          {programs.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px,1fr]">
        {/* Graphique */}
        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={canvasRef}
            className="rounded-xl bg-slate-100 border border-slate-200 p-2 dark:bg-slate-900/60 dark:border-slate-700"
          />
          <div className="text-xs text-muted text-center dark:text-slate-300">
            Répartition des catégories sur l'ensemble de la semaine.
          </div>
        </div>

        {/* Légende */}
        <div className="space-y-3">
          {categoryData.length ? (
            categoryData.map((item) => {
              const percent = totalMinutes
                ? (item.minutes / totalMinutes) * 100
                : 0
              return (
                <LegendItem
                  key={item.label}
                  label={item.label}
                  value={item.minutes}
                  percent={percent}
                  color={item.color}
                />
              )
            })
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              Ajoute des programmes pour visualiser la répartition
              hebdomadaire.
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Direct / PAD / Autre */}
      <div className="grid gap-3 sm:grid-cols-3">
        {typeBreakdown.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60"
          >
            <div className="flex items-center justify-between text-sm text-primary">
              <span>{item.label}</span>
              <span className="text-xs text-muted dark:text-slate-300">
                {item.percent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
              <div
                className="h-full"
                style={{
                  width: `${Math.min(item.percent, 100)}%`,
                  background: item.color,
                }}
              />
            </div>
            <div className="mt-1 text-xs text-muted dark:text-slate-300">
              {formatDuration(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AnalyticsPanel