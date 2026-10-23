import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getApiBaseURL } from '../lib/api'
import { DAYS, START_HOUR, END_HOUR } from '../legacy/config'
import { loadCategories, saveCategories, savePrograms } from '../legacy/lib/storage.js'
import { detectConflicts, computeFreeTime } from '../legacy/lib/schedule.js'
import { DEFAULT_CATEGORIES } from '../components/ProgramFormModern'

export interface GridProgram {
  id: string
  title: string
  category?: string
  categoryId?: string
  typeDiffusion?: string
  type?: "LIVE" | "REPLAY" | "PAD" | "ADS" | "SPECIAL"
  start: string
  end?: string
  duration: number
  description?: string
  days: string[]
  opStatus?: "PLANNED" | "CONFIRMED" | "IN_PRODUCTION" | "READY" | "ON_AIR" | "AIRED" | "DONE" | "CANCELED" | "DELAYED" | "OVERRUN" | "SKIPPED" | "MANUAL_OVERRIDE"
  occurrenceStatuses?: Record<string, "PLANNED" | "ON_AIR" | "AIRED" | "CANCELLED" | null>
  color?: string
  adsRequired?: boolean
  gridId?: string
}

interface ProgramOccurrenceResponse {
  programId: string
  serviceDate: string
  status: "PLANNED" | "ON_AIR" | "AIRED" | "CANCELLED" | null
}

function currentWeekDateRange(): { from: string; to: string } {
  const today = new Date()
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6)
  const toDateOnly = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return { from: toDateOnly(sunday), to: toDateOnly(saturday) }
}

type Conflicts = {
  total?: number
  ids?: Set<string>
  byDay: Record<string, { ids: Set<string>; pairs?: Array<{ a: string; b: string; window: string }> } | undefined>
}

type FreeInfo = Record<string, {
  scheduledMinutes: number
  freeMinutes: number
  freeSlots?: string[]
}> & {
  totalScheduledMinutes?: number
  totalFreeMinutes?: number
}

type LegendCategory = { id: string; name: string; color?: string }

interface UseGridProgramsProps {
  user: { role?: string } | null
  viewMode: string
  initialGridId: string | null
}

const dayToNumber: Record<string, number> = {
  'Dimanche': 0, 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3,
  'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6,
}

const normalizeCategoryId = (category: string): string => {
  if (!category) return 'other'
  return category.toLowerCase()
    .replace(/ & /g, '-')
    .replace(/ /g, '-')
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/[^a-z0-9-]/g, '')
}

const mapType = (typeDiffusion: string | undefined): string => {
  if (!typeDiffusion) return 'PAD'
  const upper = typeDiffusion.toUpperCase()
  if (upper === 'LIVE' || upper === 'DIRECT') return 'LIVE'
  if (upper === 'REPLAY' || upper === 'REDIF' || upper === 'REDIFFUSION') return 'REPLAY'
  if (upper === 'ADS' || upper === 'PUBLICITE' || upper === 'PUB') return 'ADS'
  if (upper === 'SPECIAL' || upper === 'SPÉCIAL') return 'SPECIAL'
  if (upper === 'PLATEAU COMMERCIAL' || upper === 'PLATEAU-COMMERCIAL') return 'ADS'
  return 'PAD'
}

export function useGridPrograms({ user, viewMode, initialGridId }: UseGridProgramsProps) {
  const [programs, setPrograms] = useState<GridProgram[]>([])
  const [currentGridId, setCurrentGridId] = useState<string | null>(initialGridId)
  const scheduleWindow = useMemo(
    () => currentGridId === 'grid-2026-2027-bon'
      ? { startHour: 5, endHour: 24 }
      : { startHour: START_HOUR, endHour: END_HOUR },
    [currentGridId]
  )
  const [categoryStyles, setCategoryStyles] = useState<Record<string, string>>(() => {
    const stored = loadCategories()
    return Array.isArray(stored) ? {} : stored || {}
  })
  const [deletedPrograms, setDeletedPrograms] = useState<Array<{ program: GridProgram; timestamp: number }>>([])

  const loadingProgramsRef = useRef<Set<string>>(new Set())
  const loadingDefaultGridRef = useRef(false)
  const defaultGridRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadedGridId = useRef<string | null>(null)
  const lastLoadTime = useRef<number>(0)

  // ----------------------------- Chargement des programmes -----------------------------
  const loadProgramsV3 = useCallback(async (gridId: string, showToast: boolean = false) => {
    if (loadingProgramsRef.current.has(gridId)) {
      console.log(`⏸️ Chargement déjà en cours pour la grille ${gridId}`)
      return
    }
    loadingProgramsRef.current.add(gridId)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('⚠️ Pas de token disponible pour charger les programmes')
        return
      }
      const apiBase = getApiBaseURL()
      const headers = { Authorization: `Bearer ${token}` }
      const range = currentWeekDateRange()
      const [response, occurrenceResponse] = await Promise.all([
        axios.get(`${apiBase}/v3/grids/${gridId}/programs`, {
          headers,
          params: { page: 1, limit: 1000 },
          timeout: 30000,
        }),
        axios.get<ProgramOccurrenceResponse[]>(`${apiBase}/v3/grids/${gridId}/occurrences`, {
          headers,
          params: range,
          timeout: 30000,
        }),
      ])
      const occurrenceMap: Record<string, Record<string, ProgramOccurrenceResponse['status']>> = {}
      const occurrenceRows: ProgramOccurrenceResponse[] = Array.isArray(occurrenceResponse.data) ? occurrenceResponse.data : []
      for (const occurrence of occurrenceRows) {
        const serviceDate = occurrence.serviceDate.slice(0, 10)
        occurrenceMap[occurrence.programId] = {
          ...occurrenceMap[occurrence.programId],
          [serviceDate]: occurrence.status,
        }
      }
      const programsData = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      const converted: GridProgram[] = programsData.map((p: any) => {
        let normalizedTypeDiffusion = p.typeDiffusion || p.type
        if (normalizedTypeDiffusion === 'Replay' || normalizedTypeDiffusion === 'REPLAY') normalizedTypeDiffusion = 'Rediffusion'
        if (normalizedTypeDiffusion === 'Autre' || normalizedTypeDiffusion === 'AUTRE') normalizedTypeDiffusion = 'PAD'
        return {
          id: p.id,
          title: p.title,
          category: p.category || p.categoryId || "Divers",
          categoryId: p.categoryId,
          type: p.type,
          typeDiffusion: normalizedTypeDiffusion,
          start: p.startTime,
          end: p.endTime,
          duration: p.durationMin,
          description: p.description || "",
          days: Array.isArray(p.days) ? p.days.map((d: number) => {
            const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
            return dayNames[d] || DAYS[d] || DAYS[0]
          }) : [],
          opStatus: p.opStatus,
          occurrenceStatuses: occurrenceMap[p.id] || {},
          color: p.color,
          adsRequired: p.adsRequired,
          gridId: p.gridId,
        }
      })
      if (converted.length !== programs.length || showToast) {
        console.log(`📥 ${converted.length} programme(s) chargé(s) depuis PostgreSQL`)
      }
      setPrograms(converted)
      if (showToast) toast.success(`${converted.length} programme(s) chargé(s)`)
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('localUser')
        toast.error('Session expirée, veuillez vous reconnecter')
        return
      }
      console.error('Erreur chargement programmes V3:', error)
      toast.error(error.response?.data?.error || 'Erreur lors du chargement des programmes')
    } finally {
      loadingProgramsRef.current.delete(gridId)
    }
  }, [programs.length])

  // ----------------------------- Grille par défaut -----------------------------
  useEffect(() => {
    if (!user || currentGridId || viewMode !== "grids") return
    const loadDefaultGrid = async () => {
      if (loadingDefaultGridRef.current) return
      loadingDefaultGridRef.current = true
      try {
        const token = localStorage.getItem('token')
        if (!token) { loadingDefaultGridRef.current = false; return }
        const apiBase = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/' ? `${import.meta.env.BASE_URL}api` : '/api'
        const response = await axios.get(`${apiBase}/v3/grids`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        })
        const defaultGrid = response.data.find((g: any) => g.isDefault === true || g.isDefault === 'true')
        const officialGrid = defaultGrid || response.data.find(
          (g: any) => g.type === 'weekly' && g.status === 'published' && g.name.includes('Officielle')
        ) || response.data.find(
          (g: any) => g.type === 'weekly' && g.status === 'published'
        ) || response.data[0]
        if (officialGrid) {
          setCurrentGridId(officialGrid.id)
        }
        loadingDefaultGridRef.current = false
      } catch (error: any) {
        loadingDefaultGridRef.current = false
        if (error.code === 'ECONNABORTED' || error.message === 'Request aborted' || error.name === 'CanceledError') return
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('localUser')
          return
        }
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after']
          const delaySeconds = retryAfter ? parseInt(retryAfter, 10) : 5
          if (delaySeconds > 60) return
          if (defaultGridRetryTimeoutRef.current) clearTimeout(defaultGridRetryTimeoutRef.current)
          defaultGridRetryTimeoutRef.current = setTimeout(() => {
            defaultGridRetryTimeoutRef.current = null
            loadDefaultGrid()
          }, delaySeconds * 1000)
          return
        }
        console.error('Erreur chargement grille par défaut:', error)
      }
    }
    loadDefaultGrid()
    return () => {
      if (defaultGridRetryTimeoutRef.current) clearTimeout(defaultGridRetryTimeoutRef.current)
      loadingDefaultGridRef.current = false
    }
  }, [user, currentGridId, viewMode])

  // ----------------------------- Rechargement automatique -----------------------------
  useEffect(() => {
    if (!currentGridId) return
    const now = Date.now()
    if (lastLoadedGridId.current === currentGridId && (now - lastLoadTime.current) < 2000) return
    lastLoadedGridId.current = currentGridId
    lastLoadTime.current = now
    loadProgramsV3(currentGridId, false)
  }, [currentGridId, viewMode, loadProgramsV3])

  useEffect(() => {
    if (!currentGridId || viewMode === "grids") return
    const interval = setInterval(() => {
      const now = Date.now()
      if (lastLoadedGridId.current === currentGridId && (now - lastLoadTime.current) < 5000) return
      lastLoadTime.current = now
      loadProgramsV3(currentGridId, false)
    }, 30000)
    return () => clearInterval(interval)
  }, [currentGridId, viewMode, loadProgramsV3])

  // ----------------------------- Persistance locale -----------------------------
  useEffect(() => {
    // eslint-disable-next-line no-unused-expressions
    ;(programs.length ? true : false) && savePrograms(programs)
  }, [programs])

  // ----------------------------- Catégories -----------------------------
  useEffect(() => {
    const refresh = () => {
      const stored = loadCategories()
      setCategoryStyles(Array.isArray(stored) ? {} : stored || {})
    }
    refresh()
    window.addEventListener("grille:categories-updated", refresh)
    return () => window.removeEventListener("grille:categories-updated", refresh)
  }, [])

  const availableCategories = useMemo(() => {
    const fromStyles = Object.keys(categoryStyles || {})
    const fromPrograms = programs.map((p) => p.category).filter((cat): cat is string => Boolean(cat))
    return Array.from(new Set([...fromStyles, ...fromPrograms])).sort((a, b) =>
      (a || '').localeCompare(b || '', "fr", { sensitivity: "base" })
    )
  }, [categoryStyles, programs])

  const legendCategories: LegendCategory[] = useMemo(
    () => availableCategories.map((name) => ({ id: name, name, color: categoryStyles?.[name] })),
    [availableCategories, categoryStyles]
  )

  // ----------------------------- Normalisation & calculs -----------------------------
  const normalizeProgramsForLegacy = useMemo(() => {
    return programs.map(p => ({
      ...p,
      category: p.category || 'Divers',
      end: p.end || (() => {
        const [h, m] = (p.start || '00:00').split(':').map(Number)
        const endDate = new Date()
        endDate.setHours(h, m + (p.duration || 60), 0, 0)
        return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
      })()
    }))
  }, [programs])

  const conflicts: Conflicts = useMemo(
    () => detectConflicts(normalizeProgramsForLegacy as any, scheduleWindow) as Conflicts,
    [normalizeProgramsForLegacy, scheduleWindow]
  )
  const freeInfo: FreeInfo = useMemo(
    () => computeFreeTime(normalizeProgramsForLegacy as any, scheduleWindow) as FreeInfo,
    [normalizeProgramsForLegacy, scheduleWindow]
  )

  // ----------------------------- CRUD -----------------------------
  const duplicateProgram = useCallback(async (id: string) => {
    const source = programs.find((p) => p.id === id)
    if (!source) return
    try {
      const clone: GridProgram = { ...source, id: crypto.randomUUID(), title: `${source.title || "Programme"} (copie)` }
      if (currentGridId) {
        const token = localStorage.getItem('token')
        if (token) {
          try {
            const apiBase = getApiBaseURL()
            const dayIndices = clone.days.map((d) => dayToNumber[d] ?? 1)
            const programData = {
              title: clone.title,
              category: clone.category || 'Divers',
              type: clone.typeDiffusion || 'Autre',
              startTime: clone.start,
              endTime: clone.end,
              durationMin: clone.duration || 60,
              dayIndices,
              description: clone.description || '',
              gridId: currentGridId,
            }
            const response = await axios.post(`${apiBase}/v3/grids/${currentGridId}/programs`, programData, {
              headers: { Authorization: `Bearer ${token}` },
            })
            clone.id = response.data.id
          } catch (apiError: any) {
            console.error('Erreur API lors de la duplication:', apiError)
            toast.error(apiError.response?.data?.error || 'Erreur lors de la duplication')
            return
          }
        }
      }
      setPrograms((prev) => { const next = [...prev, clone]; savePrograms(next); return next })
      toast.success("📄 Programme dupliqué")
    } catch (error: any) {
      console.error('Erreur lors de la duplication:', error)
      toast.error('Erreur lors de la duplication du programme')
    }
  }, [programs, currentGridId])

  const upsert = useCallback(async (p: GridProgram, onSaved?: () => void): Promise<void> => {
    const dayIndices = p.days
      .map((dayName) => {
        if (typeof dayName === 'number' && dayName >= 0 && dayName <= 6) return dayName
        return dayToNumber[dayName]
      })
      .filter((idx) => idx !== undefined && idx !== null) as number[]
    const normalizedDays = dayIndices.map(d => Number(d)).filter(d => !isNaN(d) && d >= 0 && d <= 6)
    if (normalizedDays.length === 0) { toast.error('Au moins un jour doit être sélectionné'); return }
    const uniqueDays = [...new Set(normalizedDays)].sort()

    if (!p.start || !p.end) { toast.error('Les heures de début et de fin sont requises'); return }
    // Un programme peut légitimement finir avant son heure de début (passage de minuit, ex: 23:00 → 01:00).
    // La durée réelle est gérée par durationMin et normalisée côté backend.

    const programData: any = {
      title: p.title || '', startTime: p.start, endTime: p.end, durationMin: p.duration || 60, days: uniqueDays,
    }
    if (p.category) programData.category = p.category
    if (p.categoryId || p.category) programData.categoryId = p.categoryId || normalizeCategoryId(p.category || '')
    // Le type technique chargé depuis Prisma peut être ancien (p.type). En
    // modification, la sélection du formulaire doit faire autorité.
    if (p.typeDiffusion) programData.type = mapType(p.typeDiffusion)
    else if (p.type) programData.type = p.type
    if (p.typeDiffusion) programData.typeDiffusion = p.typeDiffusion
    if (p.description) programData.description = p.description
    if (p.color) programData.color = p.color
    if (p.adsRequired !== undefined) programData.adsRequired = p.adsRequired

    const token = localStorage.getItem('token')
    let apiSuccess = false
    if (currentGridId && token) {
      const exists = p.id && programs.find((x) => x.id === p.id)
      if (exists) {
        try {
          const apiBase = getApiBaseURL()
          const allowedFields = ['title','startTime','endTime','durationMin','days','category','description','type','typeDiffusion','categoryId','color','adsRequired']
          const cleanProgramData: any = {}
          for (const key of allowedFields) {
            if (programData[key] !== undefined && programData[key] !== null && programData[key] !== '') cleanProgramData[key] = programData[key]
          }
          if (!cleanProgramData.title || !cleanProgramData.startTime || !cleanProgramData.endTime || !cleanProgramData.days || cleanProgramData.days.length === 0) {
            toast.error('Champs requis manquants : titre, heures de début/fin, et au moins un jour')
            throw new Error('Champs requis manquants')
          }
          const response = await axios.put(`${apiBase}/v3/programs/${p.id}`, cleanProgramData, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: (status: number) => status >= 200 && status < 600,
          })
          if (response.status < 200 || response.status >= 300) {
            const serverMessage = response.data?.error || response.data?.message || `Erreur HTTP ${response.status}`
            const details = Array.isArray(response.data?.details)
              ? response.data.details.map((item: any) => item.message || item.msg).filter(Boolean).join(' · ')
              : ''
            throw new Error(details ? `${serverMessage} : ${details}` : serverMessage)
          }
          p.id = response.data.id
          if (response.data.startTime) p.start = response.data.startTime
          if (response.data.endTime) p.end = response.data.endTime
          if (response.data.durationMin) p.duration = response.data.durationMin
          if (response.data.type) p.type = response.data.type
          // L’API renvoie le type enum Prisma (LIVE/REPLAY/…), pas toujours le
          // libellé choisi dans le formulaire (Direct/Rediffusion/…). Conserver
          // la valeur éditée pour l’interface après l’enregistrement.
          p.typeDiffusion = p.typeDiffusion || response.data.typeDiffusion || response.data.type || 'PAD'
          if (response.data.category) p.category = response.data.category
          if (response.data.categoryId) p.categoryId = response.data.categoryId
          if (response.data.description !== undefined) p.description = response.data.description
          if (response.data.opStatus) p.opStatus = response.data.opStatus
          if (response.data.color) p.color = response.data.color
          if (response.data.adsRequired !== undefined) p.adsRequired = response.data.adsRequired
          apiSuccess = true
        } catch (apiError: any) {
          console.error('Erreur API lors de la mise à jour:', {
            status: apiError.response?.status,
            data: apiError.response?.data,
            error: apiError,
          })
          const errorMessage = apiError.response?.data?.error || 'Erreur lors de la mise à jour du programme'
          const errorDetails = apiError.response?.data?.details
          if (errorDetails && Array.isArray(errorDetails)) {
            const detailsText = errorDetails.map((d: any) => `${d.field || d.path || 'champ'}: ${d.message || d.msg || 'erreur de validation'}`).join('\n')
            toast.error(`${errorMessage}\n${detailsText}`, { duration: 6000 })
          } else {
            toast.error(apiError.response?.data?.message || apiError.message || errorMessage)
          }
          throw apiError
        }
      } else {
        try {
          const apiBase = getApiBaseURL()
          const allowedFields = ['title','startTime','endTime','durationMin','days','category','description','type','typeDiffusion','categoryId','color','adsRequired']
          const cleanProgramData: any = {}
          for (const key of allowedFields) {
            const value = programData[key]
            if (Array.isArray(value)) { if (value.length > 0) cleanProgramData[key] = value }
            else if (value !== undefined && value !== null && value !== '') cleanProgramData[key] = value
          }
          if (cleanProgramData.days && Array.isArray(cleanProgramData.days)) {
            cleanProgramData.days = cleanProgramData.days.map((d: any) => Number(d)).filter((d: number) => !isNaN(d) && d >= 0 && d <= 6)
            cleanProgramData.days = [...new Set(cleanProgramData.days)].sort()
          }
          if (!cleanProgramData.title || !cleanProgramData.startTime || !cleanProgramData.endTime || !cleanProgramData.days || cleanProgramData.days.length === 0) {
            toast.error('Champs requis manquants : titre, heures de début/fin, et au moins un jour')
            throw new Error('Champs requis manquants')
          }
          const response = await axios.post(`${apiBase}/v3/grids/${currentGridId}/programs`, cleanProgramData, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: (status: number) => status >= 200 && status < 600,
          })
          if (response.status < 200 || response.status >= 300) throw new Error(`Erreur HTTP ${response.status}`)
          p.id = response.data.id
          if (response.data.startTime) p.start = response.data.startTime
          if (response.data.endTime) p.end = response.data.endTime
          if (response.data.durationMin) p.duration = response.data.durationMin
          if (response.data.type) p.type = response.data.type
          p.typeDiffusion = p.typeDiffusion || response.data.typeDiffusion || response.data.type || 'PAD'
          if (response.data.category) p.category = response.data.category
          if (response.data.categoryId) p.categoryId = response.data.categoryId
          if (response.data.description !== undefined) p.description = response.data.description
          if (response.data.opStatus) p.opStatus = response.data.opStatus
          if (response.data.color) p.color = response.data.color
          if (response.data.adsRequired !== undefined) p.adsRequired = response.data.adsRequired
          if (Array.isArray(response.data.days)) {
            const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
            p.days = response.data.days.map((d: number) => dayNames[d] || DAYS[d] || DAYS[0])
          }
          apiSuccess = true
        } catch (apiError: any) {
          console.error('Erreur API lors de la création:', apiError)
          const errorMessage = apiError.response?.data?.error || 'Erreur lors de la création du programme'
          const errorDetails = apiError.response?.data?.details
          if (errorDetails && Array.isArray(errorDetails)) {
            const detailsText = errorDetails.map((d: any) => `${d.field || d.path || 'champ'}: ${d.message || d.msg || 'erreur de validation'}`).join('\n')
            toast.error(`${errorMessage}\n${detailsText}`, { duration: 6000 })
          } else {
            toast.error(apiError.response?.data?.message || apiError.message || errorMessage)
          }
          throw apiError
        }
      }
    } else {
      console.warn('⚠️ Pas de grille active ou pas de token - sauvegarde locale uniquement')
      toast.error('⚠️ Sauvegarde locale uniquement - les modifications ne seront pas persistées après rechargement', { duration: 5000 })
    }

    // Couleur de catégorie
    if (p.category) {
      const categoryDef = DEFAULT_CATEGORIES.find((c: any) => c.name === p.category)
      if (categoryDef) {
        const newCategoryStyles = { ...categoryStyles, [p.category]: categoryDef.color }
        setCategoryStyles(newCategoryStyles)
        saveCategories(newCategoryStyles)
        window.dispatchEvent(new CustomEvent('grille:categories-updated'))
      }
    }

    let programDays = p.days || []
    if (programDays.length > 0 && typeof programDays[0] === 'number') {
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      programDays = programDays.map((d: number | string) => (typeof d === 'number' ? dayNames[d] || DAYS[d] || DAYS[0] : d))
    }
    const cleanedProgram: GridProgram = {
      id: p.id, title: p.title || '', start: p.start || '00:00', end: p.end || '00:00',
      duration: p.duration || 60, days: programDays,
      ...(p.category && { category: p.category }),
      ...(p.categoryId && { categoryId: p.categoryId }),
      ...(p.typeDiffusion && { typeDiffusion: p.typeDiffusion }),
      ...(p.type && { type: p.type }),
      ...(p.description && { description: p.description }),
      ...(p.opStatus && { opStatus: p.opStatus }),
      ...(p.color && { color: p.color }),
      ...(p.adsRequired !== undefined && { adsRequired: p.adsRequired }),
      ...(p.gridId && { gridId: p.gridId }),
    }
    setPrograms((prev) => {
      const next = [...prev]
      const i = next.findIndex((x) => x.id === cleanedProgram.id)
      if (i >= 0) next[i] = cleanedProgram
      else next.push(cleanedProgram)
      savePrograms(next)
      return next
    })
    if (currentGridId) {
      setTimeout(() => loadProgramsV3(currentGridId, false), 5000)
    }
    onSaved?.()
    toast.success(apiSuccess ? "✅ Programme sauvegardé dans PostgreSQL !" : "⚠️ Sauvegarde locale uniquement")
  }, [programs, currentGridId, categoryStyles, loadProgramsV3])

  const remove = useCallback(async (id: string) => {
    const programToDelete = programs.find((p) => p.id === id)
    if (!programToDelete) { console.warn(`Programme avec l'ID ${id} non trouvé`); return }
    const programsWithSameId = programs.filter((p) => p.id === id)
    if (programsWithSameId.length > 1) console.warn(`Attention: ${programsWithSameId.length} programmes avec le même ID ${id}`)

    let apiSuccess = false
    if (currentGridId) {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const apiBase = getApiBaseURL()
          await axios.delete(`${apiBase}/v3/programs/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          apiSuccess = true
        } catch (apiError: any) {
          console.error('Erreur API lors de la suppression:', apiError)
          toast.error(apiError.response?.data?.error || 'Erreur lors de la suppression')
          return
        }
      }
    } else {
      apiSuccess = true
    }
    const next = programs.filter((x) => x.id !== id)
    if (next.length === programs.length) {
      console.warn(`Aucun programme supprimé. ID recherché: ${id}`)
      toast.error("Erreur: le programme n'a pas pu être supprimé")
      return
    }
    setPrograms(next)
    savePrograms(next)
    const deletedProgram = { program: programToDelete, timestamp: Date.now() }
    setDeletedPrograms((prev) => [...prev, deletedProgram])
    toast(
      (t: any) => (
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">🗑️</span>
            <span className="text-sm font-medium text-[var(--card-text)]">Programme supprimé</span>
          </div>
          <button
            onClick={(e: any) => {
              e.stopPropagation()
              e.preventDefault()
              restoreProgram(deletedProgram.program)
              toast.dismiss(t.id)
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-bold text-sm whitespace-nowrap shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            Annuler
          </button>
        </div>
      ),
      { duration: 10000, id: `delete-${programToDelete.id}`, style: { minWidth: '320px', maxWidth: '400px' } }
    )
    setTimeout(() => setDeletedPrograms((prev) => prev.filter((d) => d.timestamp !== deletedProgram.timestamp)), 30000)
  }, [programs, currentGridId])

  const restoreProgram = useCallback(async (program: GridProgram) => {
    let apiSuccess = false
    if (currentGridId) {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const apiBase = getApiBaseURL()
          const dayIndices = (program.days || []).map((dayName) => {
            if (typeof dayName === 'number') return dayName
            return dayToNumber[dayName] ?? DAYS.indexOf(dayName)
          }).filter((idx) => idx !== undefined && idx !== null && idx >= 0 && idx <= 6) as number[]
          const programData: any = {
            title: program.title || '', startTime: program.start, endTime: program.end,
            durationMin: program.duration || 60, days: dayIndices.length > 0 ? dayIndices : [0],
            description: program.description || '', gridId: currentGridId,
          }
          if (program.category) programData.category = program.category
          if (program.categoryId || program.category) programData.categoryId = program.categoryId || normalizeCategoryId(program.category || '')
          if (program.typeDiffusion) programData.typeDiffusion = program.typeDiffusion
          if (program.color) programData.color = program.color
          if (program.adsRequired !== undefined) programData.adsRequired = program.adsRequired
          await axios.post(`${apiBase}/v3/grids/${currentGridId}/programs`, programData, {
            headers: { Authorization: `Bearer ${token}` },
          })
          apiSuccess = true
        } catch (apiError: any) {
          if (apiError.response?.status !== 404) {
            console.error('Erreur API lors de la restauration:', apiError)
            toast.error(apiError.response?.data?.error || apiError.response?.data?.message || apiError.message || 'Erreur lors de la restauration')
            return
          }
          apiSuccess = true
        }
      }
    } else {
      apiSuccess = true
    }
    setPrograms((prev) => {
      const exists = prev.find((p) => p.id === program.id)
      if (exists) { toast.error("Le programme existe déjà"); return prev }
      const next = [...prev, program]
      savePrograms(next)
      return next
    })
    toast.success("✅ Programme restauré")
  }, [programs, currentGridId])

  const handleMoveProgram = useCallback(async (programId: string, newDay: string, newStart?: string) => {
    const program = programs.find((p) => p.id === programId)
    if (!program) return
    const updatedProgram: GridProgram = { ...program, days: [newDay], start: newStart || program.start }
    let apiSuccess = false
    if (currentGridId) {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const apiBase = getApiBaseURL()
          await axios.put(`${apiBase}/v3/programs/${programId}`, {
            startTime: updatedProgram.start,
            endTime: updatedProgram.end,
            durationMin: updatedProgram.duration,
            days: updatedProgram.days.map((day) => dayToNumber[day]).filter((day) => day !== undefined),
          }, { headers: { Authorization: `Bearer ${token}` } })
          apiSuccess = true
        } catch (apiError: any) {
          console.error('Erreur API lors du déplacement:', apiError)
          toast.error(apiError.response?.data?.error || 'Erreur lors du déplacement')
          return
        }
      }
    } else {
      apiSuccess = true
    }
    setPrograms((prev) => { const next = prev.map((p) => (p.id === programId ? updatedProgram : p)); savePrograms(next); return next })
    toast.success(`✅ Programme déplacé vers ${newDay}${newStart ? ` à ${newStart}` : ''}`)
  }, [programs, currentGridId])

  const handleStatusChange = useCallback(async (
    programId: string,
    serviceDate: string,
    newStatus: "PLANNED" | "ON_AIR" | "AIRED" | "CANCELLED"
  ) => {
    const program = programs.find((p) => p.id === programId)
    if (!program) return
    if (currentGridId) {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Session absente. Reconnectez-vous pour modifier le statut.')
        return
      }
      try {
        const apiBase = getApiBaseURL()
        const response = await axios.post(
          `${apiBase}/v3/programs/${programId}/occurrences/${serviceDate}/status`,
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const returnedStatus = response.data.status as typeof newStatus
        setPrograms((previous) => previous.map((item) => item.id === programId
          ? { ...item, occurrenceStatuses: { ...item.occurrenceStatuses, [serviceDate]: returnedStatus } }
          : item))
        toast.success('Statut de cette diffusion mis à jour')
      } catch (apiError: unknown) {
        const message = axios.isAxiosError(apiError)
          ? apiError.response?.data?.error || 'Erreur lors du changement de statut'
          : 'Erreur lors du changement de statut'
        toast.error(message)
        throw apiError
      }
    }
  }, [programs, currentGridId])

  return {
    programs,
    setPrograms,
    currentGridId,
    setCurrentGridId,
    scheduleWindow,
    categoryStyles,
    setCategoryStyles,
    deletedPrograms,
    loadProgramsV3,
    duplicateProgram,
    upsert,
    remove,
    restoreProgram,
    handleMoveProgram,
    handleStatusChange,
    savePrograms,
    availableCategories,
    legendCategories,
    normalizeProgramsForLegacy,
    conflicts,
    freeInfo,
  }
}
