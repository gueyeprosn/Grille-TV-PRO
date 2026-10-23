import React, { useState, useRef, useEffect } from 'react'
import { Input, Button } from './ui'
import { Search, X, Filter, Clock, Tag, Calendar } from 'lucide-react'
import { cn } from '../lib/utils'

export interface LegendCategory {
  id: string
  name: string
  color?: string
}

export interface LegendBarProps {
  categories?: LegendCategory[]
  selectedDay?: string
  onSelectDay?: (day: string) => void
  viewMode: 'day' | 'week' | 'dashboard'
  onViewModeChange: (view: 'day' | 'week' | 'dashboard') => void
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

const LegendBar: React.FC<LegendBarProps> = ({
  filters,
  onFiltersChange,
  categories,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Charger l'historique de recherche depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('grille-search-history')
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved).slice(0, 5))
      } catch {
        // Ignorer les erreurs de parsing
      }
    }
  }, [])

  // Sauvegarder l'historique
  const saveToHistory = (term: string) => {
    if (!term.trim()) return
    const updated = [term, ...searchHistory.filter(h => h !== term)].slice(0, 5)
    setSearchHistory(updated)
    localStorage.setItem('grille-search-history', JSON.stringify(updated))
  }

  // Suggestions basées sur les catégories et types
  useEffect(() => {
    if (filters.search.length > 0) {
      const term = filters.search.toLowerCase()
      const suggestions: string[] = []
      
      // Suggestions depuis les catégories
      categories?.forEach(cat => {
        if (cat.name.toLowerCase().includes(term) && !suggestions.includes(cat.name)) {
          suggestions.push(cat.name)
        }
      })
      
      // Suggestions depuis l'historique
      searchHistory.forEach(h => {
        if (h.toLowerCase().includes(term) && !suggestions.includes(h)) {
          suggestions.push(h)
        }
      })
      
      setSearchSuggestions(suggestions.slice(0, 5))
    } else {
      setSearchSuggestions([])
    }
  }, [filters.search, categories, searchHistory])

  const handleSearchChange = (value: string) => {
    onFiltersChange({ search: value })
  }

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (filters.search.trim()) {
      saveToHistory(filters.search.trim())
      setSearchSuggestions([])
      searchInputRef.current?.blur()
    }
  }

  const clearSearch = () => {
    onFiltersChange({ search: '' })
    searchInputRef.current?.focus()
  }

  const applySuggestion = (suggestion: string) => {
    onFiltersChange({ search: suggestion })
    saveToHistory(suggestion)
    setSearchSuggestions([])
  }

  const hasActiveFilters = filters.search || filters.type !== 'ALL' || filters.category !== 'ALL'

  return (
    <div 
      className="sticky top-[5.6rem] sm:top-[5.75rem] z-30 flex-shrink-0 border-b shadow-sm transition-all"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--card-bg-solid)',
        opacity: 0.98,
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-2.5">
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Recherche améliorée */}
            <div className="flex-1 min-w-[200px] sm:min-w-[260px] max-w-xl relative">
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  placeholder="Rechercher titre, catégorie, horaire..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(e)
                    } else if (e.key === 'Escape') {
                      clearSearch()
                    }
                  }}
                  leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  rightIcon={filters.search ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                      title="Effacer la recherche"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : undefined}
                  className="w-full text-xs sm:text-sm py-1.5 pr-8 rounded-lg"
                />
                
                {/* Suggestions */}
                {searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-200 transition-colors flex items-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filtre type */}
            <select
              value={filters.type}
              onChange={(e) => onFiltersChange({ type: e.target.value })}
              className="px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all bg-slate-900 text-slate-200 border-slate-700 cursor-pointer shadow-sm"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Tous types</option>
              <option value="Direct" className="bg-slate-900 text-slate-200">Direct</option>
              <option value="PAD" className="bg-slate-900 text-slate-200">PAD</option>
              <option value="Rediffusion" className="bg-slate-900 text-slate-200">Rediffusion</option>
              <option value="Replay" className="bg-slate-900 text-slate-200">Replay</option>
              <option value="Spécial" className="bg-slate-900 text-slate-200">Spécial</option>
            </select>

            {/* Filtre catégorie */}
            {categories && categories.length > 0 && (
              <select
                value={filters.category}
                onChange={(e) => onFiltersChange({ category: e.target.value })}
                className="px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all bg-slate-900 text-slate-200 border-slate-700 cursor-pointer shadow-sm"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">Toutes catégories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-slate-900 text-slate-200">
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            {/* Bouton filtres avancés */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all",
                showAdvanced 
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtres</span>
            </button>

            {/* Réinitialiser les filtres */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onFiltersChange({ search: '', type: 'ALL', category: 'ALL' })
                  setShowAdvanced(false)
                }}
                leftIcon={<X className="w-4 h-4" />}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Réinitialiser tous les filtres"
              >
                <span className="hidden sm:inline">Réinitialiser</span>
                <span className="sm:hidden">Réinit</span>
              </Button>
            )}
          </div>

          {/* Filtres avancés */}
          {showAdvanced && (
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4" />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Filtres avancés
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Recherche par tags spéciaux */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Tags spéciaux
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const current = filters.search
                        const tag = 'ramadan'
                        onFiltersChange({ search: current.includes('🌙') ? current.replace(/🌙\s*/g, '').trim() : `${current} 🌙`.trim() })
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded border transition-colors",
                        filters.search.includes('🌙') || filters.search.toLowerCase().includes('ramadan')
                          ? "bg-purple-100 border-purple-500 text-purple-700"
                          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      🌙 Ramadan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = filters.search
                        onFiltersChange({ search: current.includes('🔴') ? current.replace(/🔴\s*/g, '').trim() : `${current} 🔴`.trim() })
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded border transition-colors",
                        filters.search.includes('🔴') || filters.search.toLowerCase().includes('critique')
                          ? "bg-red-100 border-red-500 text-red-700"
                          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      🔴 Critique
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = filters.search
                        onFiltersChange({ search: current.includes('⭐') ? current.replace(/⭐\s*/g, '').trim() : `${current} ⭐`.trim() })
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded border transition-colors",
                        filters.search.includes('⭐') || filters.search.toLowerCase().includes('événement')
                          ? "bg-amber-100 border-amber-500 text-amber-700"
                          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      ⭐ Événement
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = filters.search
                        onFiltersChange({ search: current.includes('💰') ? current.replace(/💰\s*/g, '').trim() : `${current} 💰`.trim() })
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded border transition-colors",
                        filters.search.includes('💰') || filters.search.toLowerCase().includes('commercial')
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      💰 Commercial
                    </button>
                  </div>
                </div>

                {/* Aide recherche */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <Tag className="w-3 h-3 inline mr-1" />
                    Astuces de recherche
                  </label>
                  <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <div>• Tapez un titre</div>
                    <div>• Utilisez ":" pour horaire</div>
                    <div>• Utilisez les tags ci-dessus</div>
                    <div>• Appuyez sur Entrée</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default LegendBar

