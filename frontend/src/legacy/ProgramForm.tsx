import React, { useEffect, useState } from 'react'
import { DAYS } from './config.js'

// ----------------------
// 🧩 Types
// ----------------------

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

interface ProgramFormProps {
  editing?: Program | null
  initialData?: Program | null
  onSave: (program: Program) => void
  onCancel: () => void
}

// ----------------------
// 🧮 Utilitaires
// ----------------------

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
  if (diff <= 0) diff += 24 * 60 // assume next day when end <= start
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

// ----------------------
// 🎨 Catégories par défaut
// ----------------------

const DEFAULT_CATEGORIES = [
  { name: 'Info', color: '#2563eb' },
  { name: 'Divertissement', color: '#f59e0b' },
  { name: 'Culture', color: '#8b5cf6' },
  { name: 'Sport', color: '#16a34a' },
  { name: 'Éducation', color: '#0ea5e9' },
  { name: 'Religion', color: '#f87171' },
  { name: 'Jeunesse', color: '#22d3ee' },
  { name: 'Musique', color: '#e879f9' },
  { name: 'Santé', color: '#84cc16' },
  { name: 'Société', color: '#f43f5e' },
  { name: 'Économie', color: '#10b981' },
]

// ----------------------
// 🧱 Composant principal
// ----------------------

const ProgramForm: React.FC<ProgramFormProps> = ({
  editing,
  initialData,
  onSave,
  onCancel,
}) => {
  const [form, setForm] = useState<Program>(
    editing ||
      initialData || {
        id: crypto.randomUUID(),
        title: '',
        category: '',
        typeDiffusion: 'Direct',
        start: '08:00',
        duration: 60,
        end: '09:00',
        description: '',
        days: ['Lundi'],
        snap: 30,
      }
  )

  useEffect(() => {
    setForm((f) => ({ ...f, end: addMinutes(f.start, f.duration) }))
  }, [form.start, form.duration])

  useEffect(() => {
    if (editing) setForm(editing)
  }, [editing])

  const setField = (k: keyof Program, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }))
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const [h1, m1] = (form.start || '00:00').split(':').map(Number)
    const [h2, m2] = (form.end || '00:00').split(':').map(Number)
    const startMin = h1 * 60 + m1
    const endMin = h2 * 60 + m2

    if (endMin <= startMin) {
      const ok = window.confirm(
        "L'heure de fin est antérieure ou égale à l'heure de début. Voulez-vous considérer que le programme finit le jour suivant ?"
      )
      if (!ok) return
      const dur = minutesBetween(form.start, form.end)
      setForm((prev) => ({ ...prev, duration: dur }))
    }

    onSave(form)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* 🎬 Titre */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className="input w-full"
          placeholder="Titre de l'émission"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          required
        />

        {/* 🎨 Catégorie */}
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-600 dark:text-slate-200">
            Catégorie
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setField('category', cat.name)}
                className={`px-3 py-1.5 rounded text-sm font-semibold border transition ${
                  form.category === cat.name
                    ? 'border-sky-400 ring-2 ring-sky-300 text-white'
                    : 'border-slate-200 text-slate-700 hover:border-sky-200 dark:border-slate-600 dark:text-slate-200 dark:hover:border-sky-500'
                }`}
                style={{
                  backgroundColor: form.category === cat.name ? cat.color : '#ffffff',
                  color: form.category === cat.name ? '#fff' : undefined,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 📡 Type de diffusion */}
      <div>
        <label className="block mb-1 text-sm font-medium text-slate-600 dark:text-slate-200">
          Type de diffusion
        </label>
        <div className="flex flex-wrap gap-2">
          {['Direct', 'PAD', 'Rediffusion', 'Autre'].map((type) => {
            const palettes = {
              Direct: {
                active: 'bg-red-500 border-red-500 text-white',
                idle: 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-400/50 dark:text-red-300 dark:hover:bg-red-500/20',
              },
              PAD: {
                active: 'bg-emerald-500 border-emerald-500 text-white',
                idle: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400/50 dark:text-emerald-300 dark:hover:bg-emerald-500/20',
              },
              Rediffusion: {
                active: 'bg-amber-500 border-amber-500 text-white',
                idle: 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-400/50 dark:text-amber-200 dark:hover:bg-amber-500/20',
              },
              Autre: {
                active: 'bg-slate-600 border-slate-600 text-white',
                idle: 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40',
              },
            } as const

            const palette = palettes[type as keyof typeof palettes]
            const isActive = form.typeDiffusion === type
            return (
              <button
                key={type}
                type="button"
                className={`px-3 py-2 rounded text-sm font-semibold border transition ${
                  isActive ? `${palette.active} shadow` : palette.idle
                }`}
                onClick={() => setField('typeDiffusion', type)}
              >
                {type}
              </button>
            )
          })}
        </div>
      </div>

      {/* 🕒 Horaires */}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          type="time"
          value={form.start}
          onChange={(e) => setField('start', e.target.value)}
        />
        <input
          className="input w-36"
          type="time"
          value={form.end}
          onChange={(e) => setEndValue(e.target.value)}
          title="Heure de fin (si antérieure à la fin, on considère le jour suivant)"
        />
        <select
          className="input w-28"
          value={form.duration}
          onChange={(e) => setField('duration', Number(e.target.value))}
        >
          {[15, 30, 45, 60, 90, 120].map((val) => (
            <option key={val} value={val}>
              {val} min
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applySnap}
          className="btn btn-sm btn-sky"
          title="Aligner à l’intervalle choisi"
        >
          Snap {form.snap}m
        </button>
      </div>

      {/* 📝 Description */}
      <textarea
        className="input w-full resize-y min-h-[96px]"
        rows={3}
        placeholder="Description ou détails du programme"
        value={form.description}
        onChange={(e) => setField('description', e.target.value)}
      />

      {/* 📅 Jours */}
      <div>
        <label className="block mb-1 text-sm font-medium text-slate-600 dark:text-slate-200">
          Jours
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDay(d)}
              className={`px-3 py-2 rounded border text-sm transition ${
                form.days.includes(d)
                  ? 'bg-sky-100 border-sky-300 text-sky-700 shadow-sm dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-900/60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 🔘 Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Annuler
        </button>
        <button type="submit" className="btn btn-sky">
          Enregistrer
        </button>
      </div>
    </form>
  )
}

export default ProgramForm