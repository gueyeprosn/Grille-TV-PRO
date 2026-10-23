import React, { useEffect, useState } from 'react'
import { Loader2, Sparkles, WandSparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Modal } from './ui'
import apiClient from '../lib/api'

interface ProgramDraft {
  title: string
  category?: string
  type: 'LIVE' | 'REPLAY' | 'PAD' | 'ADS' | 'SPECIAL'
  startTime: string
  endTime: string
  durationMin: number
  days: number[]
  description?: string
}

interface OpenCodeModel {
  source: 'opencode' | 'direct'
  providerID: string
  modelID: string
  name: string
  configured: boolean
  setupHint?: string[]
}

interface OpenCodeModelList {
  models: OpenCodeModel[]
  defaultModel: { source?: 'opencode' | 'direct'; providerID: string; modelID: string } | null
  warning?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (gridId: string) => void
}

const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const providerNames: Record<string, string> = {
  anthropic: 'Anthropic / Claude',
  deepseek: 'DeepSeek',
  google: 'Google Gemini',
  ollama: 'Ollama (local)',
  openai: 'OpenAI',
  opencode: 'OpenCode',
  openrouter: 'OpenRouter',
  mistral: 'Mistral',
  xai: 'xAI / Grok',
}

const AiGridTemplateModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('Nouveau modèle de grille')
  const [brief, setBrief] = useState('Créer une grille généraliste pour une chaîne de télévision, avec information le matin, magazines, divertissement, journal télévisé et soirée cinéma. Prévoir une journée type du lundi au vendredi.')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [programs, setPrograms] = useState<ProgramDraft[]>([])
  const [models, setModels] = useState<OpenCodeModel[]>([])
  const [modelSource, setModelSource] = useState<'opencode' | 'direct'>('opencode')
  const [providerID, setProviderID] = useState('')
  const [modelID, setModelID] = useState('')
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const [modelsRefresh, setModelsRefresh] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setModelsLoading(true)
    setModelsError('')
    setModels([])
    setProviderID('')
    setModelID('')
    apiClient.get<OpenCodeModelList>('/v3/templates/ai/models')
      .then(response => {
        if (!active) return
        const availableModels = response.data.models
        setModels(availableModels)
        setModelsError(response.data.warning ?? '')
        const preferred = response.data.defaultModel
        const selected = availableModels.find(model =>
          model.configured &&
          model.source === (preferred?.source ?? 'opencode') &&
          model.providerID === preferred?.providerID &&
          model.modelID === preferred?.modelID
        ) ?? availableModels[0]
        setModelSource(selected?.source ?? 'opencode')
        setProviderID(selected?.providerID ?? '')
        setModelID(selected?.modelID ?? '')
      })
      .catch(error => {
        if (active) setModelsError(error.response?.data?.error || 'Impossible de charger les modèles OpenCode.')
      })
      .finally(() => {
        if (active) setModelsLoading(false)
      })
    return () => { active = false }
  }, [isOpen, modelsRefresh])

  const providers = [...new Map(models.map(model => [`${model.source}:${model.providerID}`, model])).values()]
  const providerModels = models.filter(model => model.source === modelSource && model.providerID === providerID && model.configured)
  const providerSetupHint = models.find(model => model.source === modelSource && model.providerID === providerID && !model.configured)?.setupHint

  const generate = async () => {
    setGenerating(true)
    try {
      const response = await apiClient.post('/v3/templates/ai/generate', { brief, source: modelSource, providerID, modelID })
      setPrograms(response.data.programs)
      toast.success(`${response.data.programs.length} programmes proposés. Vérifiez-les avant de créer la grille.`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Impossible de générer le modèle. Vérifiez la configuration du fournisseur sélectionné.')
    } finally {
      setGenerating(false)
    }
  }

  const create = async () => {
    if (!name.trim() || !startDate || !endDate || programs.length === 0) {
      toast.error('Indiquez un nom, une période et générez d’abord les programmes.')
      return
    }
    setSaving(true)
    try {
      const response = await apiClient.post('/v3/templates/ai/create', {
        name: name.trim(),
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${endDate}T23:59:59`).toISOString(),
        programs,
      })
      toast.success(`Grille créée en brouillon avec ${response.data.programsCreated} programmes.`)
      setPrograms([])
      onCreated(response.data.grid.id)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'La création de la grille a échoué.')
    } finally {
      setSaving(false)
    }
  }

  const updateProgram = (index: number, update: Partial<ProgramDraft>) => {
    setPrograms(current => current.map((program, i) => {
      if (i !== index) return program
      const next = { ...program, ...update }
      if ((update.startTime || update.endTime) && /^\d{2}:\d{2}$/.test(next.startTime) && /^\d{2}:\d{2}$/.test(next.endTime)) {
        const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
        next.durationMin = Math.max(0, toMinutes(next.endTime) - toMinutes(next.startTime))
      }
      return next
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Créer un modèle avec l’IA">
      <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
        <p className="text-sm text-secondary">Décrivez le concept de la chaîne et son rythme. L’IA prépare une journée type que vous pourrez relire avant l’enregistrement.</p>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-secondary">Les clés API restent côté serveur (dans OpenCode ou backend/.env) et ne sont jamais envoyées au navigateur. La description sera transmise au modèle choisi : évitez les informations confidentielles.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-primary">Fournisseur IA
            <select
              onChange={event => {
                const [nextSource, nextProviderID] = event.target.value.split(':', 2) as ['opencode' | 'direct', string]
                const nextModel = models.find(model => model.source === nextSource && model.providerID === nextProviderID && model.configured)
                setModelSource(nextSource)
                setProviderID(nextProviderID)
                setModelID(nextModel?.modelID ?? '')
              }}
              value={`${modelSource}:${providerID}`}
              disabled={modelsLoading || providers.length === 0}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-3 py-2 text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              {providers.length === 0 && <option value="">Aucun fournisseur disponible</option>}
              {providers.map(provider => {
                const key = `${provider.source}:${provider.providerID}`
                const label = providerNames[provider.providerID] ?? provider.providerID
                const sourceLabel = provider.source === 'direct' ? ' · API directe' : ' · OpenCode'
                return <option key={key} value={key}>{label}{sourceLabel}{provider.configured ? '' : ' · à configurer'}</option>
              })}
            </select>
          </label>
          <label className="block text-sm font-medium text-primary">Modèle
            <select
              value={modelID}
              onChange={event => setModelID(event.target.value)}
              disabled={modelsLoading || providerModels.length === 0}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-3 py-2 text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              {providerModels.length === 0 && <option value="">À configurer</option>}
              {providerModels.map(model => <option key={model.modelID} value={model.modelID}>{model.name}</option>)}
            </select>
          </label>
        </div>
        {providerSetupHint && !modelsLoading && (
          <p className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-3 py-2 text-xs text-secondary">
            Pour activer ce fournisseur, renseignez {providerSetupHint.map((variable, index) => (
              <React.Fragment key={variable}>{index > 0 && ' et '}<code className="font-mono text-primary">{variable}</code></React.Fragment>
            ))} dans <code className="font-mono text-primary">backend/.env</code>, puis redémarrez le backend.
          </p>
        )}
        <div aria-live="polite" className="text-xs text-secondary">
          {modelsLoading && 'Chargement des fournisseurs et modèles disponibles…'}
          {!modelsLoading && modelsError && <span role="alert">{modelsError} Vous pouvez actualiser la liste.</span>}
          {!modelsLoading && !modelsError && models.length === 0 && 'Aucun modèle disponible. Configurez un fournisseur dans OpenCode ou backend/.env, puis actualisez la liste.'}
        </div>
        {!modelsLoading && (modelsError || models.length === 0) && (
          <div className="-mt-3 flex justify-end">
            <Button variant="outline" onClick={() => {
              setModelsRefresh(value => value + 1)
            }} disabled={modelsLoading}>Actualiser les modèles</Button>
          </div>
        )}
        <label className="block text-sm font-medium text-primary">Nom de la grille
          <input value={name} onChange={event => setName(event.target.value)} maxLength={120} className="mt-1.5 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-3 py-2 text-primary" />
        </label>
        <label className="block text-sm font-medium text-primary">Description du modèle
          <textarea value={brief} onChange={event => setBrief(event.target.value)} rows={4} maxLength={2000} className="mt-1.5 w-full resize-y rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-3 py-2 text-primary" placeholder="Ex. chaîne musicale, jeunesse, sport, actualité, fêtes…" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-primary">Début<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-3 py-2 text-primary" /></label>
          <label className="text-sm font-medium text-primary">Fin<input type="date" value={endDate} min={startDate} onChange={event => setEndDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-3 py-2 text-primary" /></label>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={generate} disabled={generating || modelsLoading || !providerID || !modelID || providerModels.length === 0 || brief.trim().length < 12} leftIcon={generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}>
            {generating ? 'Génération en cours…' : programs.length ? 'Régénérer la proposition' : 'Générer les programmes'}
          </Button>
        </div>
        {programs.length > 0 && <section aria-label="Programmes proposés" className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-primary">Proposition à vérifier</h3><span className="text-xs text-secondary">{programs.length} programmes</span></div>
          <div className="space-y-2">
            {programs.map((program, index) => <div key={`${index}-${program.startTime}`} className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 rounded-lg border border-[var(--card-border)] p-2 sm:grid-cols-[1fr_5.5rem_5.5rem_8rem]">
              <input aria-label={`Titre du programme ${index + 1}`} value={program.title} onChange={event => updateProgram(index, { title: event.target.value })} className="min-w-0 rounded border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-2 py-1.5 text-sm text-primary" />
              <input aria-label={`Début ${program.title}`} type="time" value={program.startTime} onChange={event => updateProgram(index, { startTime: event.target.value })} className="rounded border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-1.5 py-1.5 text-sm text-primary" />
              <input aria-label={`Fin ${program.title}`} type="time" value={program.endTime} onChange={event => updateProgram(index, { endTime: event.target.value })} className="rounded border border-[var(--card-border)] bg-[var(--card-bg-solid)] px-1.5 py-1.5 text-sm text-primary" />
              <div className="col-span-full flex flex-wrap gap-1 sm:col-span-1 sm:items-center">
                {days.map((day, dayIndex) => <button key={day} type="button" aria-pressed={program.days.includes(dayIndex)} onClick={() => updateProgram(index, { days: program.days.includes(dayIndex) ? program.days.filter(value => value !== dayIndex) : [...program.days, dayIndex].sort() })} className={`min-h-7 rounded px-1.5 text-xs ${program.days.includes(dayIndex) ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-secondary'}`}>{day}</button>)}
              </div>
            </div>)}
          </div>
        </section>}
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button variant="primary" onClick={create} disabled={saving || generating || programs.length === 0 || !startDate || !endDate} leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
            {saving ? 'Création…' : 'Créer la grille en brouillon'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default AiGridTemplateModal
