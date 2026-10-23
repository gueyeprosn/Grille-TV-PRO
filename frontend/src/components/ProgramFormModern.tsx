import React, { useEffect, useState, useMemo, useRef } from 'react'
import { DAYS } from '../legacy/config.js'
import { Input, Button, Modal } from './ui'
import { Clock, Calendar, Tag, Type, FileText, Zap, Plus, Trash2, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { loadCategories, saveCategories } from '../legacy/lib/storage.js'

interface Program {
  id: string
  title: string
  category: string
  typeDiffusion: string
  start: string
  end: string
  duration: number
  description: string
  days: string[]
  snap: number
}

interface ProgramFormModernProps {
  editing?: Program | null
  initialData?: Program | null
  onSave: (program: Program) => void | Promise<void>
  onCancel: () => void
}

// Utilitaires
function addMinutes(hhmm: string, minutes: number): string {
  if (!hhmm) return ''
  const [H, M] = hhmm.split(':').map(Number)
  let total = H * 60 + M + Number(minutes || 0)
  if (total < 0) total = 0
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

function minutesBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const [h1, m1] = start.split(':').map(Number)
  const [h2, m2] = end.split(':').map(Number)
  let a = h1 * 60 + m1
  let b = h2 * 60 + m2
  let diff = b - a
  if (diff <= 0) diff += 24 * 60
  return diff
}

function snapToNearest(hhmm: string, snap = 30): string {
  const [H, M] = hhmm.split(':').map(Number)
  const total = H * 60 + M
  const snapped = Math.round(total / snap) * snap
  const h = Math.floor(snapped / 60) % 24
  const m = snapped % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

// Catégories par défaut - Religieuses
export const RELIGIOUS_CATEGORIES = [
  { name: 'Coran', color: '#059669', description: 'Récitation et enseignement du Coran' },
  { name: 'Hadith', color: '#0284c7', description: 'Enseignement des Hadiths et Sunna' },
  { name: 'Fiqh', color: '#7c3aed', description: 'Jurisprudence islamique' },
  { name: 'Tafsir', color: '#dc2626', description: 'Exégèse et interprétation du Coran' },
  { name: 'Sira', color: '#ea580c', description: 'Biographie du Prophète (PSL)' },
  { name: 'Aqida', color: '#0891b2', description: 'Croyance et théologie islamique' },
  { name: 'Dhikr', color: '#16a34a', description: 'Invocation et rappel d\'Allah' },
  { name: 'Du\'a', color: '#ca8a04', description: 'Invocations et supplications' },
  { name: 'Fatwa', color: '#be123c', description: 'Avis juridiques et consultations' },
  { name: 'Éducation Islamique', color: '#0d9488', description: 'Enseignement religieux général' },
  { name: 'Histoire Islamique', color: '#9333ea', description: 'Histoire de l\'Islam et des musulmans' },
  { name: 'Langue Arabe', color: '#c2410c', description: 'Enseignement de la langue arabe' },
  { name: 'Conférence Religieuse', color: '#1e40af', description: 'Conférences et prêches' },
  { name: 'Émission Religieuse', color: '#7c2d12', description: 'Émissions religieuses générales' },
  { name: 'Jeunesse Musulmane', color: '#059669', description: 'Programmes pour la jeunesse' },
  { name: 'Famille Musulmane', color: '#0369a1', description: 'Programmes familiaux' },
  { name: 'Femme Musulmane', color: '#a855f7', description: 'Programmes pour les femmes' },
  { name: 'Actualités Islamiques', color: '#dc2626', description: 'Actualités du monde musulman' },
  { name: 'Charité et Bienfaisance', color: '#16a34a', description: 'Zakat, Sadaqa et actions caritatives' },
  { name: 'Pèlerinage (Hajj/Omra)', color: '#ea580c', description: 'Programmes sur le Hajj et l\'Omra' },
]

// Catégories généralistes par défaut
export const GENERAL_CATEGORIES = [
  { name: 'Information', color: '#2563eb', description: 'Actualités et informations générales' },
  { name: 'Divertissement', color: '#f59e0b', description: 'Programmes de divertissement' },
  { name: 'Culture', color: '#8b5cf6', description: 'Programmes culturels' },
  { name: 'Sport', color: '#16a34a', description: 'Programmes sportifs' },
  { name: 'Éducation', color: '#0ea5e9', description: 'Programmes éducatifs' },
  { name: 'Jeunesse', color: '#22d3ee', description: 'Programmes pour la jeunesse' },
  { name: 'Musique', color: '#e879f9', description: 'Programmes musicaux' },
  { name: 'Santé', color: '#84cc16', description: 'Programmes de santé' },
  { name: 'Société', color: '#f43f5e', description: 'Programmes de société' },
  { name: 'Économie', color: '#10b981', description: 'Programmes économiques' },
  { name: 'Documentaire', color: '#6366f1', description: 'Documentaires' },
  { name: 'Magazine', color: '#ec4899', description: 'Magazines' },
  { name: 'Débat', color: '#f97316', description: 'Débats et discussions' },
  { name: 'Interview', color: '#14b8a6', description: 'Interviews' },
  { name: 'Publicité', color: '#64748b', description: 'Publicités et spots' },
]

// Toutes les catégories par défaut
export const DEFAULT_CATEGORIES = [...RELIGIOUS_CATEGORIES, ...GENERAL_CATEGORIES]

interface CategoryItem {
  name: string
  color: string
  description?: string
  isCustom?: boolean
}

const ProgramFormModern: React.FC<ProgramFormModernProps> = ({
  editing,
  initialData,
  onSave,
  onCancel,
}) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<Program>(
    editing ||
      initialData || {
        id: crypto.randomUUID(),
        title: '',
        category: '',
        typeDiffusion: 'PAD',
        start: '08:00',
        duration: 60,
        end: '09:00',
        description: '',
        days: ['Lundi'],
        snap: 30,
      }
  )

  // Fonction pour extraire une couleur depuis une classe Tailwind (approximation)
  const extractColorFromClass = (cls: string): string | null => {
    // Mapping simple des couleurs Tailwind communes
    const colorMap: Record<string, string> = {
      'blue': '#3b82f6',
      'green': '#10b981',
      'red': '#ef4444',
      'yellow': '#eab308',
      'purple': '#a855f7',
      'pink': '#ec4899',
      'orange': '#f97316',
      'indigo': '#6366f1',
      'cyan': '#06b6d4',
      'emerald': '#10b981',
      'teal': '#14b8a6',
      'slate': '#64748b',
    }
    for (const [key, value] of Object.entries(colorMap)) {
      if (cls.includes(key)) return value
    }
    return null
  }

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')
const [overnightConfirm, setOvernightConfirm] = useState<Program | null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [customCategories, setCustomCategories] = useState<CategoryItem[]>(() => {
    // Charger les catégories personnalisées depuis le stockage
    const stored = loadCategories()
    if (typeof stored === 'object' && !Array.isArray(stored)) {
      // Convertir le format stocké (Record<string, string>) en CategoryItem[]
      return Object.entries(stored)
        .filter(([name]) => {
          // Exclure les catégories par défaut
          const defaultNames = DEFAULT_CATEGORIES.map(c => c.name)
          return !defaultNames.includes(name)
        })
        .map(([name, colorOrClass]) => {
          // Si c'est une couleur hex, l'utiliser directement
          // Sinon, extraire la couleur des classes Tailwind ou utiliser une couleur par défaut
          const color = typeof colorOrClass === 'string' && colorOrClass.startsWith('#')
            ? colorOrClass
            : extractColorFromClass(typeof colorOrClass === 'string' ? colorOrClass : '') || '#64748b'
          return { name, color, isCustom: true }
        })
    }
    return []
  })

  // Combiner toutes les catégories
  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories]
  }, [customCategories])

  // Ajouter une catégorie personnalisée
  const addCustomCategory = (name: string, color: string, description?: string) => {
    if (!name.trim() || allCategories.find(c => c.name === name.trim())) {
      return false
    }
    const newCategory: CategoryItem = {
      name: name.trim(),
      color,
      description,
      isCustom: true
    }
    const updated = [...customCategories, newCategory]
    setCustomCategories(updated)
    
    // Sauvegarder dans le stockage
    const stored = loadCategories()
    const categoriesMap: Record<string, string> = typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
    categoriesMap[newCategory.name] = newCategory.color
    saveCategories(categoriesMap)
    
    // Déclencher l'événement pour mettre à jour les autres composants
    window.dispatchEvent(new CustomEvent('grille:categories-updated'))
    return true
  }

  // Supprimer une catégorie personnalisée
  const removeCustomCategory = (name: string) => {
    const updated = customCategories.filter(c => c.name !== name)
    setCustomCategories(updated)
    
    // Mettre à jour le stockage
    const stored = loadCategories()
    const categoriesMap: Record<string, string> = typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
    delete categoriesMap[name]
    saveCategories(categoriesMap)
    
    // Si la catégorie supprimée était sélectionnée, la désélectionner
    if (form.category === name) {
      setForm(prev => ({ ...prev, category: '' }))
    }
    
    // Déclencher l'événement
    window.dispatchEvent(new CustomEvent('grille:categories-updated'))
  }

  useEffect(() => {
    setForm((f) => ({ ...f, end: addMinutes(f.start, f.duration) }))
  }, [form.start, form.duration])

  useEffect(() => {
    if (editing) {
      // Normaliser les types lors du chargement
      const normalizedForm = { ...editing }
      const savedType = (normalizedForm.typeDiffusion || normalizedForm.type || '').trim().toUpperCase()
      // Prisma expose son enum technique ; le formulaire utilise les libellés
      // français des options proposées.
      const typeLabels: Record<string, string> = {
        LIVE: 'Direct',
        DIRECT: 'Direct',
        REPLAY: 'Rediffusion',
        REDIFFUSION: 'Rediffusion',
        PAD: 'PAD',
        ADS: 'Pub',
        PUB: 'Pub',
        SPECIAL: 'Spécial',
        'SPÉCIAL': 'Spécial',
        AUTRE: 'PAD',
      }
      normalizedForm.typeDiffusion = typeLabels[savedType] || normalizedForm.typeDiffusion || 'PAD'
      setForm(normalizedForm)
    }
  }, [editing])

  const setField = (k: keyof Program, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }))
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[k]
        return next
      })
    }
  }

  const setEndValue = (v: string) => {
    setForm((prev) => {
      const dur = minutesBetween(prev.start, v)
      return { ...prev, end: v, duration: dur }
    })
  }

  const toggleDay = (day: string) => {
    setForm((prev) => {
      const set = new Set(prev.days)
      set.has(day) ? set.delete(day) : set.add(day)
      return { ...prev, days: Array.from(set) }
    })
  }

  const applySnap = () => {
    setForm((f) => ({ ...f, start: snapToNearest(f.start, f.snap) }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!form.title.trim()) {
      newErrors.title = 'Le titre est requis'
    }

    if (!form.category) {
      newErrors.category = 'La catégorie est requise'
    }

    if (form.days.length === 0) {
      newErrors.days = 'Au moins un jour doit être sélectionné'
    }

    if (!form.duration || form.duration <= 0) {
      newErrors.duration = 'La durée doit être supérieure à 0'
    }

    if (form.duration > 1440) {
      newErrors.duration = 'La durée ne peut pas dépasser 1440 minutes (24 heures)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('#program-error-summary')?.focus()
      })
      return
    }

    const [h1, m1] = (form.start || '00:00').split(':').map(Number)
    const [h2, m2] = (form.end || '00:00').split(':').map(Number)
    const startMin = h1 * 60 + m1
    const endMin = h2 * 60 + m2

    let finalForm = { ...form }

    if (endMin <= startMin) {
      const dur = minutesBetween(form.start, form.end)
      setOvernightConfirm({ ...form, duration: dur })
      return
    }

    setSaveError('')
    try {
      await onSave(finalForm)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Enregistrement impossible. Vérifiez les champs et réessayez.')
    }
  }

  return (
    <>
    <form ref={formRef} onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
      <div className="min-h-0 flex-1 overflow-y-auto space-y-6 px-4 py-5 sm:px-6">
      {saveError && (
        <div role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {saveError}
        </div>
      )}
      {Object.keys(errors).length > 0 && (
        <section
          id="program-error-summary"
          tabIndex={-1}
          role="alert"
          aria-labelledby="program-error-title"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
        >
          <h2 id="program-error-title" className="font-semibold">
            {Object.keys(errors).length} erreur{Object.keys(errors).length > 1 ? 's' : ''} à corriger
          </h2>
          <ul className="mt-2 list-disc pl-5">
            {errors.title && <li><a className="underline" href="#program-title">Titre du programme : {errors.title}</a></li>}
            {errors.category && <li><a className="underline" href="#program-category">Catégorie : {errors.category}</a></li>}
            {errors.duration && <li><a className="underline" href="#program-duration">Durée : {errors.duration}</a></li>}
            {errors.days && <li><a className="underline" href="#program-days">Jours : {errors.days}</a></li>}
          </ul>
        </section>
      )}

      {/* Informations */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Informations du programme</h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>Identifiez le programme et son format de diffusion. <span aria-hidden="true">*</span> Champs obligatoires.</p>
        </div>
        <Input
          id="program-title"
          label="Titre du programme *"
          placeholder="Ex: Journal de 20h, Coran du matin, Émission spéciale..."
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          required
          leftIcon={<FileText className="w-4 h-4" />}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0 items-start">
        {/* Catégorie - Menu déroulant */}
        <div className="space-y-1.5 min-w-0">
          <label htmlFor="program-category" className="block text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <Tag className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            Catégorie *
          </label>
          <div className="relative">
            <select
              id="program-category"
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'program-category-error' : undefined}
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              className={cn(
                'w-full px-3 py-2 pr-10 rounded-lg border-2 text-xs font-medium transition-all duration-200',
                'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
                'border-slate-300 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                'appearance-none cursor-pointer',
                form.category && 'border-2'
              )}
              style={{
                borderColor: form.category 
                  ? allCategories.find(c => c.name === form.category)?.color || undefined
                  : undefined,
                paddingRight: form.category ? '3.5rem' : '2.5rem',
              }}
            >
              <option value="">Sélectionner une catégorie</option>
              <optgroup label="Religieuses">
                {RELIGIOUS_CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Généralistes">
                {GENERAL_CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
              {customCategories.length > 0 && (
                <optgroup label="Personnalisées">
                  {customCategories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {/* Indicateur de couleur et flèche */}
            {form.category && (
              <div
                className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm pointer-events-none z-10"
                style={{
                  backgroundColor: allCategories.find(c => c.name === form.category)?.color || '#000',
                }}
              />
            )}
            {/* Flèche du menu déroulant */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-0">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          {/* Bouton pour gérer les catégories */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCategoryManager(true)}
            leftIcon={<Plus className="w-3 h-3" />}
            className="w-fit text-xs px-0 py-1"
          >
            Gérer catégories
          </Button>
          {errors.category && (
            <p id="program-category-error" className="text-sm text-red-600 dark:text-red-400">{errors.category}</p>
          )}
        </div>

        {/* Type de diffusion - Menu déroulant */}
        <div className="space-y-1.5 min-w-0">
          <label htmlFor="program-type" className="block text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <Type className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            Type de diffusion
          </label>
          <div className="relative">
            <select
              id="program-type"
              value={form.typeDiffusion === 'Replay' ? 'Rediffusion' : form.typeDiffusion}
              onChange={(e) => {
                    // Normaliser Replay vers Rediffusion
                const normalizedType = e.target.value === 'Rediffusion' ? 'Rediffusion' : e.target.value
                    setField('typeDiffusion', normalizedType)
                  }}
                  className={cn(
                'w-full px-3 py-2 pr-10 rounded-lg border-2 text-xs font-medium transition-all duration-200',
                'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
                'border-slate-300 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                'appearance-none cursor-pointer',
                form.typeDiffusion && 'border-2'
              )}
              style={{
                borderColor: form.typeDiffusion 
                  ? (() => {
                      const palettes: Record<string, string> = {
                        Direct: '#ef4444',
                        PAD: '#10b981',
                        Rediffusion: '#f59e0b',
                        Spécial: '#a855f7',
                        'Plateau commercial': '#3b82f6',
                        Pub: '#f97316',
                      }
                      return palettes[form.typeDiffusion] || undefined
                    })()
                  : undefined,
                paddingRight: form.typeDiffusion ? '3.5rem' : '2.5rem',
              }}
            >
              <option value="">Sélectionner un type</option>
              <option value="Direct">Direct</option>
              <option value="PAD">PAD</option>
              <option value="Rediffusion">Rediffusion</option>
              <option value="Spécial">Spécial</option>
              <option value="Plateau commercial">Plateau commercial</option>
              <option value="Pub">Pub</option>
            </select>
            {/* Indicateur de couleur et flèche */}
            {form.typeDiffusion && (
              <div
                className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm pointer-events-none z-10"
                style={{
                  backgroundColor: (() => {
                    const palettes: Record<string, string> = {
                      Direct: '#ef4444',
                      PAD: '#10b981',
                      Rediffusion: '#f59e0b',
                      Spécial: '#a855f7',
                      'Plateau commercial': '#3b82f6',
                      Pub: '#f97316',
                    }
                    return palettes[form.typeDiffusion] || '#000'
                  })(),
                }}
              />
            )}
            {/* Flèche du menu déroulant */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-0">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
          </div>
          </div>
          {form.typeDiffusion === 'Rediffusion' && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Rediffusion correspond au type Replay.</p>}
        </div>
        </div>
      </section>

      {/* Horaires */}
      <section className="space-y-3 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            Horaires de diffusion
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>La durée ajuste automatiquement l’heure de fin.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="program-start" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Début
            </label>
            <Input
              id="program-start"
              type="time"
              value={form.start}
              onChange={(e) => setField('start', e.target.value)}
              className="w-full font-semibold text-sm"
            />
          </div>
          <div>
            <label htmlFor="program-end" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Fin
            </label>
            <Input
              id="program-end"
              type="time"
              value={form.end}
              onChange={(e) => setEndValue(e.target.value)}
              className="w-full font-semibold text-sm"
              title="Si antérieure à la fin, on considère le jour suivant"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="program-duration" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Durée *
            </label>
            <div className="relative mb-1.5">
              <Input
                id="program-duration"
                type="number"
                min="1"
                max="1440"
                step="1"
                value={form.duration}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  if (value > 0 && value <= 1440) {
                    setField('duration', value)
                  }
                }}
                placeholder="60"
                className="w-full font-semibold pr-16 text-sm"
                title="Durée en minutes (1 à 1440)"
                error={errors.duration}
              />
              {form.duration && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" style={{ pointerEvents: 'none' }}>
                  {form.duration >= 60 ? `${Math.floor(form.duration / 60)}h${form.duration % 60 > 0 ? `${form.duration % 60}` : ''}` : `${form.duration}m`}
                </div>
              )}
            </div>
            {/* Durées rapides compactes - une seule ligne */}
            <div className="flex flex-wrap items-center gap-2">
              {[15, 30, 45, 60, 90, 120, 180, 240].map((val) => (
                <button
                  key={val}
                  type="button"
                  aria-pressed={form.duration === val}
                  onClick={() => setField('duration', val)}
                  className={cn(
                    'min-h-10 min-w-12 px-3 py-2 text-xs font-medium rounded-md border transition-colors duration-200',
                    form.duration === val
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                  )}
                  style={form.duration === val ? {} : {
                    borderColor: 'var(--border)',
                  }}
                  title={`${val} minutes${val >= 60 ? ` (${Math.floor(val / 60)}h${val % 60 > 0 ? `${val % 60}` : ''})` : ''}`}
                >
                  {val >= 60 ? `${Math.floor(val / 60)}h${val % 60 > 0 ? val % 60 : ''}` : `${val}m`}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applySnap}
              leftIcon={<Zap className="w-3 h-3" />}
              className="w-fit text-xs py-1.5"
              title="Aligner à l'intervalle choisi"
            >
              Snap {form.snap}m
            </Button>
            {errors.duration && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.duration}</p>
            )}
          </div>
        </div>
      </section>

      {/* Jours */}
      <section className="space-y-4 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
      <div>
        <label className="block text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          Jours de diffusion *
        </label>
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Sélectionnez un ou plusieurs jours pour la diffusion du programme
        </p>
        <div
          id="program-days"
          role="group"
          aria-label="Jours de diffusion"
          aria-invalid={Boolean(errors.days)}
          aria-describedby={errors.days ? 'program-days-error' : undefined}
          tabIndex={-1}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
        >
          {DAYS.map((d) => {
            const isSelected = form.days.includes(d)
            return (
              <button
                type="button"
                key={d}
                aria-pressed={isSelected}
                onClick={() => toggleDay(d)}
                className={cn(
                  'min-h-10 px-2 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors duration-200',
                  isSelected
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500'
                )}
              >
                {d}
              </button>
            )
          })}
        </div>
        {errors.days && (
          <p id="program-days-error" className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.days}</p>
        )}
      </div>

      <div>
        <label htmlFor="program-description" className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Description <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>(facultative)</span>
        </label>
        <textarea
          id="program-description"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-y min-h-[80px]"
          rows={3}
          placeholder="Ajoutez des détails utiles à l’équipe (facultatif)"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
        />
      </div>
      </section>

      </div>

      {/* Actions */}
      <div className="shrink-0 border-t px-4 py-3 sm:px-6" style={{
        backgroundColor: 'var(--card-bg-solid)',
        borderColor: 'var(--border)',
      }}>
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="w-full sm:w-auto font-medium"
              leftIcon={<X className="w-4 h-4" />}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full sm:w-auto font-semibold px-5 py-2.5"
              leftIcon={editing ? <FileText className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {editing ? 'Enregistrer les modifications' : 'Créer le programme'}
            </Button>
          </div>
        </div>
      </div>
    </form>
    {/* Modal de gestion des catégories */}
    <Modal
      isOpen={showCategoryManager}
      onClose={() => setShowCategoryManager(false)}
      title="Gestion des catégories"
      size="lg"
    >
      <CategoryManagerModal
        customCategories={customCategories}
        onAdd={addCustomCategory}
        onRemove={removeCustomCategory}
        onClose={() => setShowCategoryManager(false)}
      />
    </Modal>

    <Modal
      isOpen={!!overnightConfirm}
      onClose={() => setOvernightConfirm(null)}
      title="Franchissement de minuit"
      size="sm"
    >
      <p className="text-sm text-[var(--card-text)]">
        L'heure de fin est antérieure ou égale à l'heure de début.
        Voulez-vous considérer que le programme se termine le jour suivant ?
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => setOvernightConfirm(null)}>
          Annuler
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            if (overnightConfirm) onSave(overnightConfirm)
            setOvernightConfirm(null)
          }}
        >
          Confirmer
        </Button>
      </div>
    </Modal>
    </>
  )
}

// Composant modal pour gérer les catégories
interface CategoryManagerModalProps {
  customCategories: CategoryItem[]
  onAdd: (name: string, color: string, description?: string) => boolean
  onRemove: (name: string) => void
  onClose: () => void
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  customCategories,
  onAdd,
  onRemove,
  onClose,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#64748b')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [error, setError] = useState('')

  const predefinedColors = [
    '#2563eb', '#059669', '#dc2626', '#f59e0b', '#7c3aed',
    '#0ea5e9', '#e879f9', '#84cc16', '#f43f5e', '#10b981',
    '#6366f1', '#ec4899', '#f97316', '#14b8a6', '#64748b',
    '#0891b2', '#ca8a04', '#be123c', '#0d9488', '#9333ea'
  ]

  const handleAdd = () => {
    if (!newCategoryName.trim()) {
      setError('Le nom de la catégorie est requis')
      return
    }
    if (DEFAULT_CATEGORIES.find(c => c.name === newCategoryName.trim())) {
      setError('Cette catégorie existe déjà dans les catégories par défaut')
      return
    }
    if (customCategories.find(c => c.name === newCategoryName.trim())) {
      setError('Cette catégorie existe déjà')
      return
    }
    
    const success = onAdd(newCategoryName.trim(), newCategoryColor, newCategoryDescription.trim() || undefined)
    if (success) {
      setNewCategoryName('')
      setNewCategoryColor('#64748b')
      setNewCategoryDescription('')
      setError('')
    } else {
      setError('Impossible d\'ajouter cette catégorie')
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulaire d'ajout */}
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ajouter une catégorie personnalisée</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Nom de la catégorie
            </label>
            <Input
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value)
                setError('')
              }}
              placeholder="Ex: Météo, Bourse..."
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Couleur
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-12 h-10 rounded border border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <Input
                type="text"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                placeholder="#64748b"
                className="flex-1 font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategoryColor(color)}
                  className={cn(
                    "w-8 h-8 rounded border-2 transition-all",
                    newCategoryColor === color
                      ? "border-slate-900 dark:border-white scale-110 ring-2 ring-offset-1 ring-slate-400"
                      : "border-slate-300 dark:border-slate-600 hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Description (optionnel)
            </label>
            <Input
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              placeholder="Description de la catégorie..."
              className="w-full"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={handleAdd}
            leftIcon={<Plus className="w-4 h-4" />}
            className="w-full"
          >
            Ajouter la catégorie
          </Button>
        </div>
      </div>

      {/* Liste des catégories personnalisées */}
      {customCategories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Catégories personnalisées ({customCategories.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customCategories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 border border-slate-300 dark:border-slate-600"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {cat.name}
                  </div>
                  {cat.description && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {cat.description}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(cat.name)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Supprimer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {customCategories.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p className="text-sm">Aucune catégorie personnalisée</p>
          <p className="text-xs mt-1">Ajoutez votre première catégorie ci-dessus</p>
        </div>
      )}

      {/* Informations */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Note :</strong> Les catégories par défaut (religieuses et généralistes) ne peuvent pas être supprimées.
          Vous pouvez uniquement ajouter et supprimer vos catégories personnalisées.
        </p>
      </div>
    </div>
  )
}

export default ProgramFormModern

