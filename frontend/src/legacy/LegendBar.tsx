import React from "react"
import "../styles.css"

// ----------------------
// 🎨 Types
// ----------------------

export interface LegendCategory {
  id: string
  name: string
  color?: string
}

export interface LegendBarProps {
  categories?: LegendCategory[]
  selectedDay?: string
  onSelectDay?: (day: string) => void
  viewMode: "day" | "week"
  onViewModeChange: (view: "day" | "week") => void
  filters: {
    search: string
    type: string
    category: string
  }
  onFiltersChange: (patch: Partial<{
    search: string
    type: string
    category: string
  }>) => void
}

// ----------------------
// 🧩 Composant principal
// ----------------------

const LegendBar: React.FC<LegendBarProps> = ({
  categories = [],
  selectedDay = "Lundi",
  onSelectDay,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
}) => {
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

  // 🟡 Sélection dynamique de catégorie
  const handleCategoryClick = (name: string) => {
    onFiltersChange({
      category: filters.category === name ? "ALL" : name,
    })
  }

  return (
    <div className="legend-bar border-b backdrop-blur-md sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80">
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 legend-bar__inner">
        {/* === Sélecteur de jours === */}
        <div className="flex items-center gap-2 md:gap-3">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => onSelectDay?.(d)}
              className={`day-pill transition-all duration-200 ${
                d === selectedDay
                  ? "bg-[var(--accent)] text-black font-semibold shadow-md scale-105"
                  : "hover:bg-[var(--accent)]/30 hover:text-black"
              }`}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* === Filtres rapides === */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher…"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="input w-36 sm:w-52"
          />

          <select
            value={filters.type}
            onChange={(e) => onFiltersChange({ type: e.target.value })}
            className="input text-sm"
          >
            <option value="ALL">Tous types</option>
            <option value="Direct">Direct</option>
            <option value="PAD">PAD</option>
            <option value="Rediffusion">Rediffusion</option>
            <option value="Replay">Replay</option>
            <option value="Spécial">Spécial</option>
          </select>
        </div>

        {/* === Légende interactive des catégories === */}
        <div className="flex flex-wrap items-center gap-3 max-w-[45%] overflow-x-auto">
          {categories.length > 0 ? (
            categories.map((c) => {
              const isActive = filters.category === c.name
              return (
                <button
                  key={c.id}
                  onClick={() => handleCategoryClick(c.name)}
                  className={`flex items-center gap-2 shrink-0 transition-all duration-200 rounded-full px-2 py-1 border ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-transparent hover:border-[var(--accent)]/40"
                  }`}
                >
                  <span
                    className="swatch w-4 h-4 rounded-full border border-neutral shadow-sm"
                    style={{
                      background: c.color || "#94a3b8",
                      opacity: isActive ? 1 : 0.6,
                    }}
                  />
                  <span
                    className={`text-sm whitespace-nowrap ${
                      isActive
                        ? "text-[var(--accent)] font-semibold"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {c.name}
                  </span>
                </button>
              )
            })
          ) : (
            <span className="text-sm text-muted italic">Aucune catégorie</span>
          )}
        </div>

        {/* === Vue jour/semaine === */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onViewModeChange(viewMode === "day" ? "week" : "day")
            }
            className="btn btn-outline btn-sm"
          >
            {viewMode === "day" ? "Vue Semaine" : "Vue Jour"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LegendBar