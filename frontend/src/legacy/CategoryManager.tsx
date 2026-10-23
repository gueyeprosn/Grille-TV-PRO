import React, { useEffect, useState } from 'react'
import { loadCategories, saveCategories } from './lib/storage.js'

// ----------------------
// 🎨 Types
// ----------------------

type CategoryMap = Record<string, string>

// ----------------------
// 🎨 Données
// ----------------------

const LEGACY_CLASS_MAP: Record<string, string> = {
  'bg-blue-600 border-blue-400':
    'bg-blue-100 border border-blue-200 text-slate-900 dark:bg-blue-900 dark:border-blue-700 dark:text-white',
  'bg-green-600 border-green-400':
    'bg-emerald-100 border border-emerald-200 text-slate-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-white',
  'bg-orange-500 border-orange-300':
    'bg-orange-100 border border-orange-200 text-slate-900 dark:bg-orange-900 dark:border-orange-700 dark:text-white',
  'bg-purple-600 border-purple-400':
    'bg-purple-100 border border-purple-200 text-slate-900 dark:bg-purple-900 dark:border-purple-700 dark:text-white',
  'bg-red-600 border-red-400':
    'bg-red-100 border border-red-200 text-slate-900 dark:bg-red-900 dark:border-red-700 dark:text-white',
  'bg-yellow-500 border-yellow-300':
    'bg-yellow-100 border border-yellow-200 text-slate-900 dark:bg-yellow-900 dark:border-yellow-700 dark:text-white',
  'bg-gray-800 border-gray-500':
    'bg-slate-100 border border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-white',
  'bg-slate-700 border-slate-500':
    'bg-sky-100 border border-sky-200 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white',
}

const DEFAULT_CATEGORIES: CategoryMap = {
  Information: LEGACY_CLASS_MAP['bg-blue-600 border-blue-400'],
  Société: LEGACY_CLASS_MAP['bg-green-600 border-green-400'],
  Culture: LEGACY_CLASS_MAP['bg-orange-500 border-orange-300'],
  Divertissement: LEGACY_CLASS_MAP['bg-purple-600 border-purple-400'],
  Sport: LEGACY_CLASS_MAP['bg-red-600 border-red-400'],
  Éducation: LEGACY_CLASS_MAP['bg-yellow-500 border-yellow-300'],
  Religion: LEGACY_CLASS_MAP['bg-gray-800 border-gray-500'],
  Autre: LEGACY_CLASS_MAP['bg-slate-700 border-slate-500'],
}

// ----------------------
// 🧩 Utils
// ----------------------

function normalizeCategoriesMap(map: CategoryMap = {}): CategoryMap {
  const result: CategoryMap = {}
  for (const [key, value] of Object.entries(map)) {
    result[key] = LEGACY_CLASS_MAP[value] || value
  }
  return result
}

// ----------------------
// 🧱 Composant principal
// ----------------------

const CategoryManager: React.FC = () => {
  const [cats, setCats] = useState<CategoryMap>(() => {
    const existing = normalizeCategoriesMap(loadCategories())
    if (Object.keys(existing).length === 0) {
      saveCategories(DEFAULT_CATEGORIES)
      return DEFAULT_CATEGORIES
    }
    const normalized = normalizeCategoriesMap(existing)
    saveCategories(normalized)
    return normalized
  })

  const [name, setName] = useState<string>('')
  const [cls, setCls] = useState<string>('bg-slate-100 border border-slate-300')

  useEffect(() => {
    const refresh = () => setCats(normalizeCategoriesMap(loadCategories()))
    window.addEventListener('grille:categories-updated', refresh)
    return () => window.removeEventListener('grille:categories-updated', refresh)
  }, [])

  const add = () => {
    if (!name.trim()) return
    const next = { ...cats, [name.trim()]: cls }
    setCats(next)
    saveCategories(next)
    setName('')
  }

  const remove = (k: string) => {
    const next = { ...cats }
    delete next[k]
    setCats(next)
    saveCategories(next)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-sky-500">Gestion des Catégories</h2>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input w-48"
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input w-80"
          placeholder="Classes Tailwind"
          value={cls}
          onChange={(e) => setCls(e.target.value)}
        />
        <button onClick={add} className="btn btn-sky">
          Ajouter
        </button>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Object.entries(cats).map(([k, v]) => (
          <div
            key={k}
            className={`flex justify-between items-center px-3 py-2 rounded shadow-sm ${
              v ? '' : 'bg-white border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`${
                  v || 'bg-slate-100 border border-slate-300 text-slate-900'
                } px-3 py-1 rounded-full inline-block text-sm font-semibold`}
                aria-hidden="true"
              >
                &nbsp;
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-100">{k}</span>
            </div>
            <button onClick={() => remove(k)} className="btn btn-sm btn-outline">
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CategoryManager