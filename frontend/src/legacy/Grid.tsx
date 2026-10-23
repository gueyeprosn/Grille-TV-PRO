import React from 'react'
import { buildCategoryTheme, deriveTypeColor, rgbArrayToCss } from './lib/colorPalette'

// ---- Types ---- //
export interface LegacyProgram {
  id: string
  title: string
  start: string
  duration: number
  type?: string
  producer?: string
  day: string
  categoryId: string
}

export interface Category {
  id: string
  name: string
  color: string
}

interface GridProps {
  programs: LegacyProgram[]
  categories?: Category[] // ✅ devient optionnel
  day: string
  onDropMove: (hour: number, minute: number, program: LegacyProgram) => void
}

interface CellProps {
  h: number
  onDrop: (minute: number, program: LegacyProgram) => void
}

// ---- Component ---- //
const Grid: React.FC<GridProps> = ({ programs, categories = [], day, onDropMove }) => {
  const START = 5
  const END = 24
  const hours = Array.from({ length: END - START }, (_, i) => START + i)
  const todayPrograms = programs.filter((p) => p.day === day)

  return (
    <div className="grid legacy-grid relative">
      {/* === En-tête des heures === */}
      <div />
      {hours.map((h) => (
        <div className="hour font-mono" key={h}>
          {String(h).padStart(2, '0')}:00
        </div>
      ))}

      {/* === Structure des cellules === */}
      {Array.from({ length: 7 }).map((_, row) => (
        <React.Fragment key={row}>
          <div className="hour" />
          {hours.map((h) => (
            <Cell key={`${h}-${row}`} h={h} onDrop={(m, prog) => onDropMove(h, m, prog)} />
          ))}
        </React.Fragment>
      ))}

      {/* === Aucune catégorie === */}
      {categories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm text-white text-sm font-medium rounded-xl">
          ⚠️ Aucune catégorie définie — ajoutez-en pour colorer vos programmes
        </div>
      )}

      {/* === Affichage des programmes === */}
      {todayPrograms.map((p) => {
        const [h, m] = p.start.split(':').map(Number)
        const col = h - START + 1
        const span = Math.max(1, Math.round(p.duration / 60))

        // 🎨 Thème et couleur
        const category = categories.find((c) => c.id === p.categoryId)
        const categoryName = category?.name || p.categoryId || 'Autre'
        const theme = buildCategoryTheme(categoryName, category?.color)
        const typeColor = deriveTypeColor(p.type || 'Autre')

        const typeChip = {
          background: rgbArrayToCss(typeColor, 0.12),
          borderColor: rgbArrayToCss(typeColor, 0.24),
          color: rgbArrayToCss(typeColor),
        }

        return (
          <div
            key={p.id}
            style={{
              gridColumn: `${col} / span ${span}`,
              gridRow: '2 / 3',
              position: 'relative',
            }}
          >
            <div
              className="program program-card transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{
                ...theme.vars,
                background: `var(--program-background)`,
                border: `1px solid var(--program-border)`,
                boxShadow: `var(--program-shadow)`,
                color: '#0f172a',
              }}
              draggable
              onDragStart={(e: React.DragEvent<HTMLDivElement>) =>
                e.dataTransfer.setData('application/json', JSON.stringify(p))
              }
            >
              <div className="flex items-center justify-between">
                <strong
                  className="truncate max-w-[70%]"
                  style={{ color: 'var(--program-accent)' }}
                >
                  {p.title}
                </strong>
                <span className="chip text-xs font-medium" style={theme.chipStyle}>
                  {p.start}
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex flex-wrap gap-2">
                  {p.type && (
                    <span className="chip text-xs font-medium" style={typeChip}>
                      {p.type}
                    </span>
                  )}
                  {p.producer && (
                    <span className="chip text-xs font-medium" style={theme.chipStyle}>
                      Prod: {p.producer}
                    </span>
                  )}
                </div>

                <div className="meta">
                  <span className="duration">{p.duration} min</span>
                  <span className="text-xs text-slate-500 truncate" style={{ maxWidth: 160 }}>{categoryName}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Cell Component ---- //
const Cell: React.FC<CellProps> = ({ h, onDrop }) => {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minute = y < rect.height / 2 ? 0 : 30

    try {
      const raw = e.dataTransfer.getData('application/json')
      const data = JSON.parse(raw) as LegacyProgram
      onDrop(minute, data)
    } catch (err) {
      console.error('Invalid drop data', err)
    }
  }

  return (
    <div
      className="cell hover:bg-accent/5 transition-colors duration-150"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    />
  )
}

export default Grid