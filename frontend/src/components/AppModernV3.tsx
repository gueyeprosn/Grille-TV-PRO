import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { Toaster } from 'react-hot-toast'
import { Modal, Loading, Button } from './ui'
import Header from './Header'
import LegendBar from './LegendBar'
import DayView from '../legacy/DayView'
import WeekAgendaModern from './WeekAgendaModern'
import ProgramFormModern from './ProgramFormModern'
import ProgramFormModal from './ProgramFormModal'
import ProgramDetailsModal from './ProgramDetailsModal'
import CreateGridModal from './CreateGridModal'
import Login from '../legacy/Login'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { exportToCSV, exportToJSON, importFromJSON } from '../lib/export'
import { DAYS } from '../legacy/config'
import { logoutUser } from '../hooks/useAuth'
import { exportWeekToPdf, exportDayToPdf } from '../legacy/lib/pdf.js'
import { useUIModeStore } from '../lib/uiModeStore'
import { useGridPrograms } from '../hooks/useGridPrograms'
import toast from 'react-hot-toast'

// Composants V3 - Imports statiques (utilisés fréquemment)
import GridSelector from './GridSelector'
import CoordinationHub from './CoordinationHub'
import ShiftLogForm from './ShiftLogForm'
import SettingsTelegram from './SettingsTelegram'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'
import { getApiBaseURL } from '../lib/api'
import { LayoutDashboard, Grid3x3, MessageSquare, FileText, Settings, LogOut, Calendar, ChevronLeft, ChevronRight, Plus, History, Moon, SlidersHorizontal, ChevronDown, HelpCircle, Clock } from 'lucide-react'
import RegieOnAirView from './regie/RegieOnAirView'
import RamadanTemplateSelector from './RamadanTemplateSelector'
import '../styles/regie.css'
import { cn } from '../lib/utils'
import { useDeviceDetection } from '../hooks/useDeviceDetection'
import MobileAppWrapper from './mobile/MobileAppWrapper'

// Lazy loading pour les vues moins fréquentes (Priorité 4 - Optimisation)
const Dashboard = lazy(() => import('./Dashboard'))
const BroadcastReportView = lazy(() => import('./BroadcastReportView'))
const AuditHistoryView = lazy(() => import('./AuditHistoryView'))

// Types
export interface Program {
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
  color?: string
  adsRequired?: boolean
  gridId?: string
  createdAt?: string
  updatedAt?: string
}

interface Filters {
  search: string
  type: string
  category: string
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

type ViewModeV3 = "grids" | "week" | "day" | "dashboard" | "coordination" | "shiftlog" | "report" | "settings" | "audit"

// Lecture de la route courante depuis le hash de l'URL (deep linking, historique navigateur).
function readRouteFromHash(): { gridId: string | null; viewMode: ViewModeV3 } {
  const validViews: ViewModeV3[] = ["grids", "week", "day", "dashboard", "coordination", "shiftlog", "report", "settings", "audit"]
  try {
    const raw = (window.location.hash || "").replace(/^#\/?/, "")
    const parts = raw.split("/").filter(Boolean)
    if (parts[0] === "grids" && parts[1]) {
      const wantedView = parts[2]
      return {
        gridId: decodeURIComponent(parts[1]),
        viewMode: validViews.includes(wantedView as ViewModeV3) ? (wantedView as ViewModeV3) : "week",
      }
    }
    if (parts[0] && validViews.includes(parts[0] as ViewModeV3)) {
      return { gridId: null, viewMode: parts[0] as ViewModeV3 }
    }
  } catch {
    // ignoré : conservation des valeurs par défaut
  }
  return { gridId: null, viewMode: "grids" }
}
const AppModernV3: React.FC = () => {
  const { user, loading: authLoading, userRole } = useAuth()
  const canEditPrograms = ["ADMIN", "PROGRAMMER", "PRODUCTION", "DIRECTION"].includes(userRole || "")
  const canCreatePrograms = ["ADMIN", "PROGRAMMER", "PRODUCTION", "DIRECTION"].includes(userRole || "")
  const canCreateGrids = ["ADMIN", "PROGRAMMER"].includes(userRole || "")
  const canDeletePrograms = ["ADMIN", "PROGRAMMER"].includes(userRole || "")
  const { mode: uiMode } = useUIModeStore()
  const device = useDeviceDetection()

  const [viewMode, setViewMode] = useState<ViewModeV3>(() => readRouteFromHash().viewMode)

  const {
    programs,
    setPrograms,
    savePrograms,
    currentGridId,
    setCurrentGridId,
    scheduleWindow,
    categoryStyles,
    loadProgramsV3,
    duplicateProgram,
    upsert,
    remove,
    restoreProgram,
    handleMoveProgram,
    handleStatusChange,
    availableCategories,
    legendCategories,
    normalizeProgramsForLegacy,
    conflicts,
    freeInfo,
  } = useGridPrograms({ user, viewMode, initialGridId: readRouteFromHash().gridId })

  const weeklyWindow = scheduleWindow

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("grille-theme") as "light" | "dark") || "dark"
    } catch {
      return "dark"
    }
  })
  const [booting, setBooting] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [programToInspect, setProgramToInspect] = useState<Program | null>(null)
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "ALL",
    category: "ALL",
  })
  const [selectedDay, setSelectedDay] = useState<string>(DAYS[0])
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showShiftLog, setShowShiftLog] = useState(false)
  const [showCreateGridModal, setShowCreateGridModal] = useState(false)
  const [showRamadanTemplateSelector, setShowRamadanTemplateSelector] = useState(false)
  const [newGridData, setNewGridData] = useState({
    name: '',
    type: 'weekly' as 'weekly' | 'special' | 'ramadan',
    startDate: '',
    endDate: '',
  })

  const [showSecondaryMenu, setShowSecondaryMenu] = useState(false)
  const secondaryMenuRef = React.useRef<HTMLDivElement>(null)
  const secondaryMenuButtonRef = React.useRef<HTMLButtonElement>(null)
  const secondaryMenuDropdownRef = React.useRef<HTMLDivElement>(null)
  const [secondaryMenuPosition, setSecondaryMenuPosition] = useState({ top: 0, left: 0 })

  const openSecondaryMenu = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect()
    const menuWidth = 256
    const estimatedMenuHeight = 286
    const edge = 8
    const left = Math.max(edge, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - edge))
    const belowTop = rect.bottom + 6
    const top = belowTop + estimatedMenuHeight <= window.innerHeight - edge
      ? belowTop
      : Math.max(edge, rect.top - estimatedMenuHeight - 6)

    setSecondaryMenuPosition({ top, left })
    setShowSecondaryMenu(true)
  }

  // Fermeture du menu secondaire en cliquant à l'extérieur
  useEffect(() => {
    if (!showSecondaryMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !secondaryMenuRef.current?.contains(target) &&
        !secondaryMenuDropdownRef.current?.contains(target)
      ) {
        setShowSecondaryMenu(false)
      }
    }
    const closeOnViewportChange = () => setShowSecondaryMenu(false)
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnViewportChange, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnViewportChange, true)
    }
  }, [showSecondaryMenu])

  // Synchronisation cohérente du mode Direction avec le tableau de bord exécutif (Statistiques)
  useEffect(() => {
    if (uiMode === 'DIRECTION' && viewMode !== 'dashboard') {
      setViewMode('dashboard')
    } else if (uiMode === 'STANDARD' && viewMode === 'dashboard') {
      setViewMode('week')
    }
  }, [uiMode])

  // Gestion et chargement du Journal de bord (Shiftlog)
  const [shiftLogs, setShiftLogs] = useState<any[]>([])
  const [loadingShiftLogs, setLoadingShiftLogs] = useState(false)

  const loadShiftLogs = useCallback(async () => {
    if (!currentGridId) return
    const token = localStorage.getItem('token')
    if (!token) return
    setLoadingShiftLogs(true)
    try {
      const apiBase = getApiBaseURL()
      const res = await axios.get(`${apiBase}/v3/grids/${currentGridId}/shiftlogs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShiftLogs(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Erreur chargement shiftlogs:', e)
      setShiftLogs([])
    } finally {
      setLoadingShiftLogs(false)
    }
  }, [currentGridId])

  useEffect(() => {
    if (viewMode === 'shiftlog' && currentGridId) {
      loadShiftLogs()
    }
  }, [viewMode, currentGridId, loadShiftLogs])

  useEffect(() => {
    if (authLoading) return
    if (!user) setPrograms([])
    setBooting(false)
  }, [authLoading, user])

  // Synchronisation bidirectionnelle avec l'URL (hash) pour la persistance et l'historique.
  useEffect(() => {
    if (authLoading || !user) return
    const path = currentGridId ? `/grids/${encodeURIComponent(currentGridId)}/${viewMode}` : `/${viewMode}`
    const nextHash = `#${path}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash)
    }
  }, [authLoading, user, viewMode, currentGridId])

  useEffect(() => {
    const handler = () => {
      const route = readRouteFromHash()
      setCurrentGridId(route.gridId)
      setViewMode(route.viewMode)
    }
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [])
  // Fonction pour charger les programmes V3
  // Éviter les chargements multiples simultanés
  // 🎨 Gestion du thème
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("dark", theme === "dark")
      localStorage.setItem("grille-theme", theme)
    } catch { /* noop */ }
  }, [theme])

  // 🔍 Filtres appliqués - Recherche améliorée
  const visibleIds = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return new Set(
      programs
        .filter((p) => {
          if (!p?.id) return false
          
          // Filtres type et catégorie
          const matchesType =
            filters.type === "ALL" || p.typeDiffusion === filters.type
          const matchesCategory =
            filters.category === "ALL" || p.category === filters.category
          if (!matchesType || !matchesCategory) return false
          
          // Recherche améliorée
          if (!searchTerm) return true
          
          // Recherche par tags spéciaux (Ramadan)
          const description = p.description || ''
          const flagsMatch = description.match(/\[RAMADAN_FLAGS\]([\s\S]*?)\[\/RAMADAN_FLAGS\]/)
          let flags: any = null
          if (flagsMatch) {
            try {
              flags = JSON.parse(flagsMatch[1])
            } catch {
              // Ignorer les erreurs de parsing
            }
          }
          
          if (searchTerm.includes('🌙') || searchTerm.includes('ramadan')) {
            if (!flags || !flags.isRamadan) {
              // Fallback: chercher dans le titre/description
              if (!p.title.toLowerCase().includes('ramadan') && 
                  !description.toLowerCase().includes('ramadan')) {
                return false
              }
            }
          }
          
          if (searchTerm.includes('🔴') || searchTerm.includes('critique')) {
            if (flags) {
              if (!flags.isCritical) return false
            } else {
              // Fallback: chercher dans le titre/description
              const criticalTerms = ['iftar', 'tarawih', 'suhur', 'fajr', 'critique']
              const hasCriticalTerm = criticalTerms.some(term =>
                p.title.toLowerCase().includes(term) || 
                description.toLowerCase().includes(term)
              )
              if (!hasCriticalTerm) return false
            }
          }
          
          if (searchTerm.includes('⭐') || searchTerm.includes('événement')) {
            if (flags) {
              if (!flags.isEvent) return false
            } else {
              // Fallback: chercher dans le titre/description
              const eventTerms = ['plateau', 'direct', 'événement', 'spécial']
              const hasEventTerm = eventTerms.some(term =>
                p.title.toLowerCase().includes(term) || 
                description.toLowerCase().includes(term)
              )
              if (!hasEventTerm) return false
            }
          }
          
          if (searchTerm.includes('💰') || searchTerm.includes('commercial')) {
            if (flags) {
              if (!flags.isCommercial) return false
            } else {
              // Fallback: chercher dans le titre/description
              const commercialTerms = ['commercial', 'sponsor', 'publicité', 'pub']
              const hasCommercialTerm = commercialTerms.some(term =>
                p.title.toLowerCase().includes(term) || 
                description.toLowerCase().includes(term)
              )
              if (!hasCommercialTerm) return false
            }
          }
          
          // Recherche par horaire (format "14:30" ou "14h30")
          if (searchTerm.match(/^\d{1,2}[h:]\d{2}$/)) {
            const timeStr = searchTerm.replace('h', ':')
            const [searchH, searchM] = timeStr.split(':').map(Number)
            const [progH, progM] = (p.start || '00:00').split(':').map(Number)
            const searchMinutes = searchH * 60 + searchM
            const progMinutes = progH * 60 + progM
            // Recherche dans une plage de ±30 minutes
            if (Math.abs(searchMinutes - progMinutes) > 30) return false
          }
          
          // Recherche normale dans les champs
          const cleanSearchTerm = searchTerm.replace(/[🌙🔴⭐💰]/g, '').trim()
          if (!cleanSearchTerm) return true
          
          const searchFields = [
            p.title,
            p.description,
            p.category,
            p.typeDiffusion,
            p.start,
            p.end,
          ]
          
          // Recherche par mots-clés (tous les mots doivent être présents)
          const searchWords = cleanSearchTerm.split(/\s+/).filter(Boolean)
          const allWordsMatch = searchWords.every(word =>
            searchFields.some(field =>
              field && (field as string).toLowerCase().includes(word)
            )
          )
          
          return allWordsMatch
        })
        .map((p) => p.id)
    )
  }, [programs, filters])

  // 🧭 Gestion filtres
  const handleFiltersChange = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const handleThemeToggle = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"))
  }

  const handleExportPDF = async () => {
    const exportMode = uiMode === 'REGIE' ? 'REGIE' : uiMode === 'DIRECTION' ? 'DIRECTION' : 'STANDARD'
    try {
      await exportWeekToPdf(programs, exportMode)
      toast.success(`Export PDF hebdomadaire (${exportMode}) généré`)
    } catch (error) {
      console.error('Erreur export PDF hebdomadaire:', error)
      toast.error(`Erreur lors de l'export PDF : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  const handleExportDayPDF = async () => {
    try {
      if (!selectedDay) {
        toast.error('❌ Aucun jour sélectionné')
        return
      }
      if (!programs || programs.length === 0) {
        toast.error('❌ Aucun programme disponible pour l\'export')
        return
      }
      // Déterminer le mode d'export basé sur le mode UI
      const exportMode = uiMode === 'REGIE' ? 'REGIE' : uiMode === 'DIRECTION' ? 'DIRECTION' : 'STANDARD'
      console.log(`Export PDF journalier - Jour: ${selectedDay}, Mode: ${exportMode}, Programmes: ${programs.length}`)
      await exportDayToPdf(programs, selectedDay, exportMode)
      toast.success(`📄 Export PDF du ${selectedDay} (${exportMode}) généré avec succès`)
    } catch (error) {
      console.error('Erreur export PDF journalier:', error)
      toast.error(`❌ Erreur lors de l'export PDF du ${selectedDay}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  const handleLogout = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    console.log('🔴 handleLogout appelé')
    
    // Afficher le toast rapidement
    toast.success("👋 Déconnexion réussie")
    
    // Exécuter la déconnexion immédiatement (sans async/await)
    console.log('🔴 Appel de logoutUser...')
    try {
      logoutUser()
      console.log('✅ logoutUser appelé avec succès')
    } catch (error) {
      console.error('❌ Erreur lors de l\'appel à logoutUser:', error)
      // Forcer la déconnexion même en cas d'erreur
      localStorage.removeItem('localUser')
      localStorage.removeItem('token')
      const basePath = import.meta.env.BASE_URL || '/'
      window.location.href = basePath === '/' ? '/' : basePath
    }
  }

  const handleExportCSV = () => {
    exportToCSV(normalizeProgramsForLegacy as any)
    toast.success("📊 Export CSV téléchargé")
  }

  const handleExportJSON = () => {
    exportToJSON(normalizeProgramsForLegacy as any)
    toast.success("📄 Export JSON téléchargé")
  }

  const handleExportEPG = async () => {
    if (!currentGridId) {
      toast.error("❌ Veuillez d'abord sélectionner une grille")
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error("❌ Authentification requise")
        return
      }

      const apiBase = getApiBaseURL()
      const response = await axios.get(`${apiBase}/v3/grids/${currentGridId}/epg/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Extraire le nom de fichier depuis les headers ou utiliser un nom par défaut
      const contentDisposition = response.headers['content-disposition']
      let filename = `epg-${currentGridId}-${new Date().toISOString().split('T')[0]}.json`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success("📺 EPG (vMix) téléchargé")
    } catch (error: any) {
      console.error('Erreur export EPG:', error)
      toast.error(`❌ Erreur export EPG: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleImportJSON = async () => {
    // Créer un input file caché
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.style.display = 'none'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const importedSchedule = await importFromJSON(file)
        const importedPrograms = importedSchedule.programs
        
        if (importedPrograms.length === 0) {
          toast.error("❌ Aucun programme trouvé dans le fichier")
          return
        }

        const token = localStorage.getItem('token')
        if (!token) {
          toast.error("❌ Vous devez être connecté pour importer des programmes")
          return
        }

        const apiBase = getApiBaseURL()

        // Un fichier de template complet peut créer sa propre grille et ses programmes.
        if (importedSchedule.grid) {
          const response = await axios.post(
            `${apiBase}/v3/grids/import`,
            { grid: importedSchedule.grid, programs: importedPrograms },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          const importedGridId = response.data.grid?.id
          if (!importedGridId) {
            throw new Error("La grille a été importée, mais son identifiant est absent de la réponse")
          }

          setCurrentGridId(importedGridId)
          setViewMode("week")
          await loadProgramsV3(importedGridId, false)
          toast.success(`✅ Grille « ${response.data.grid.name} » importée avec ${response.data.programs.imported} programme(s)`)
          return
        }

        if (!currentGridId) {
          toast.error("❌ Sélectionnez une grille pour importer un fichier de programmes")
          return
        }

        const savedPrograms: Program[] = []
        let successCount = 0
        let errorCount = 0

        // Fonction helper pour convertir les jours
        const convertDaysToIndices = (days: string[]): number[] => {
          const dayMap: Record<string, number> = {
            'Dimanche': 0, 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3,
            'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6,
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          }
          const indices = days
            .map(day => {
              // Si c'est déjà un nombre, le retourner
              if (typeof day === 'number') return day
              // Sinon, chercher dans le map
              return dayMap[day] ?? null
            })
            .filter((idx): idx is number => idx !== null && idx >= 0 && idx <= 6)
          // Supprimer les doublons
          return [...new Set(indices)]
        }

        // Fonction helper pour normaliser le format d'heure (HH:mm)
        const normalizeTime = (time: string): string | null => {
          if (!time) return null
          // Si c'est déjà au format HH:mm, le retourner
          if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
            return time
          }
          // Si c'est au format HH:mm:ss, enlever les secondes
          if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(time)) {
            return time.substring(0, 5)
          }
          // Si c'est un nombre (minutes depuis minuit), convertir
          const minutes = parseInt(time, 10)
          if (!isNaN(minutes) && minutes >= 0 && minutes < 1440) {
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
          }
          return null
        }

        // Fonction helper pour normaliser la catégorie
        const normalizeCategoryId = (category: string): string => {
          return category
            .toLowerCase()
            .replace(/ & /g, '-')
            .replace(/ /g, '-')
            .replace(/é/g, 'e')
            .replace(/è/g, 'e')
            .replace(/[^a-z0-9-]/g, '')
        }

        // Fonction helper pour mapper le type
        const mapType = (typeDiffusion: string | undefined): string => {
          if (!typeDiffusion) return 'PAD'
          const upper = typeDiffusion.toUpperCase()
          if (upper === 'LIVE' || upper === 'DIRECT') return 'LIVE'
          if (upper === 'REPLAY' || upper === 'REDIF' || upper === 'REDIFFUSION') return 'REPLAY'
          if (upper === 'ADS' || upper === 'PUBLICITE' || upper === 'PUB') return 'ADS'
          if (upper === 'SPECIAL' || upper === 'SPÉCIAL') return 'SPECIAL'
          if (upper === 'PLATEAU COMMERCIAL' || upper === 'PLATEAU-COMMERCIAL') return 'ADS' // Plateau commercial = ADS
          return 'PAD'
        }

        // Sauvegarder chaque programme via l'API avec délai pour éviter le rate limiting
        for (let i = 0; i < importedPrograms.length; i++) {
          const program = importedPrograms[i] as Program
          
          // Ajouter un délai entre les requêtes pour éviter le rate limiting (429)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100)) // 100ms entre chaque requête
          }
          
          try {
            // Validation des données requises
            const sourceStart = program.start || (program as any).startTime
            const sourceEnd = program.end || (program as any).endTime
            if (!program.title || !sourceStart || !sourceEnd) {
              console.warn(`Programme "${program.title || 'Sans titre'}" ignoré: données incomplètes (titre, start ou end manquant)`)
              errorCount++
              continue
            }
            
            // Normaliser les heures au format HH:mm
            const startTime = normalizeTime(sourceStart)
            const endTime = normalizeTime(sourceEnd)
            
            if (!startTime || !endTime) {
              console.warn(`Programme "${program.title}" ignoré: format d'heure invalide (start: ${program.start}, end: ${program.end})`)
              errorCount++
              continue
            }
            
            // Vérifier que endTime > startTime
            if (endTime <= startTime) {
              console.warn(`Programme "${program.title}" ignoré: endTime (${endTime}) doit être après startTime (${startTime})`)
              errorCount++
              continue
            }
            
            // Convertir les jours
            const dayIndices = convertDaysToIndices(program.days || [])
            if (dayIndices.length === 0) {
              console.warn(`Programme "${program.title}" ignoré: aucun jour valide`)
              errorCount++
              continue
            }
            
            // Calculer la durée en minutes
            const startParts = startTime.split(':').map(Number)
            const endParts = endTime.split(':').map(Number)
            const startMinutes = startParts[0] * 60 + startParts[1]
            const endMinutes = endParts[0] * 60 + endParts[1]
            const calculatedDuration = endMinutes - startMinutes
            
            if (calculatedDuration <= 0) {
              console.warn(`Programme "${program.title}" ignoré: durée calculée invalide (${calculatedDuration} minutes)`)
              errorCount++
              continue
            }
            
            const programData: any = {
              title: program.title.trim(),
              category: program.category || 'Divers',
              categoryId: normalizeCategoryId(program.category || 'Divers'),
              type: mapType(program.typeDiffusion),
              startTime: startTime,
              endTime: endTime,
              durationMin: calculatedDuration || program.duration || (program as any).durationMin,
              description: (program.description || '').trim(),
              days: dayIndices,
            }

            const response = await axios.post(`${apiBase}/v3/grids/${currentGridId}/programs`, programData, {
              headers: { Authorization: `Bearer ${token}` }
            })

            // Convertir la réponse en format Program
            const savedProgram: Program = {
              id: response.data.id,
              title: response.data.title || program.title,
              category: program.category,
              typeDiffusion: response.data.type || program.typeDiffusion,
              start: response.data.startTime || sourceStart,
              end: response.data.endTime || sourceEnd,
              duration: response.data.durationMin || program.duration || (program as any).durationMin,
              description: response.data.description || program.description || '',
              days: Array.isArray(response.data.days) 
                ? response.data.days.map((d: number) => {
                    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
                    return dayNames[d] || DAYS[d] || DAYS[0]
                  })
                : program.days || [],
              opStatus: response.data.opStatus || program.opStatus,
              gridId: currentGridId,
            }

            savedPrograms.push(savedProgram)
            successCount++
          } catch (error: any) {
            console.error(`Erreur lors de la sauvegarde du programme "${program.title}":`, error)
            errorCount++
          }
        }

        if (savedPrograms.length > 0) {
          // Ajouter les programmes sauvegardés à l'état local
          setPrograms((prev) => [...prev, ...savedPrograms])
          
          // Sauvegarder aussi localement
          const allPrograms = [...programs, ...savedPrograms]
          savePrograms(allPrograms)

        } else {
          toast.error(`❌ Aucun programme n'a pu être sauvegardé (${errorCount} erreur(s))`)
        }
      } catch (error: any) {
        console.error('Erreur import JSON:', error)
        toast.error(`❌ Erreur lors de l'import: ${error.response?.data?.error || error.message || 'Fichier invalide'}`)
      } finally {
        document.body.removeChild(input)
      }
    }

    document.body.appendChild(input)
    input.click()
  }

  const handleCreateGrid = async () => {
    if (!newGridData.name || !newGridData.startDate || !newGridData.endDate) {
      toast.error("❌ Veuillez remplir tous les champs")
      return
    }

    try {
      const apiBase = getApiBaseURL()
      const token = localStorage.getItem('token')
      
      const response = await axios.post(
        `${apiBase}/v3/grids`,
        {
          name: newGridData.name,
          type: newGridData.type.toUpperCase(),
          startDate: new Date(newGridData.startDate).toISOString(),
          endDate: new Date(newGridData.endDate).toISOString(),
          status: 'DRAFT',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      toast.success(`✅ Grille "${newGridData.name}" créée avec succès`)
      setShowCreateGridModal(false)
      setNewGridData({
        name: '',
        type: 'weekly',
        startDate: '',
        endDate: '',
      })
      
      // Recharger les grilles en changeant de vue
      setViewMode("grids")
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error: any) {
      console.error('Erreur création grille:', error)
      toast.error(`❌ Erreur: ${error.response?.data?.message || error.message || 'Impossible de créer la grille'}`)
    }
  }

  // Raccourcis clavier
  useKeyboardShortcuts({
    onAdd: () => {
      if (!canCreatePrograms) return
      setEditing(null)
      setShowForm(true)
    },
    onSearch: () => {
      const searchInput = document.querySelector('input[type="text"][placeholder*="Rechercher"]') as HTMLInputElement
      searchInput?.focus()
    },
    onExport: handleExportPDF,
    onToggleTheme: handleThemeToggle,
    onToggleView: () => {
      setViewMode((prev) => {
        if (prev === "grids") return "week"
        if (prev === "week") return "day"
        if (prev === "day") return "dashboard"
        return "grids"
      })
    },
    onClose: () => {
      if (showForm) {
        setShowForm(false)
        setEditing(null)
      }
    },
  })

  // Raccourci ? pour l'aide
  useEffect(() => {
    const handleHelp = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setShowShortcutsHelp(true)
        }
      }
    }
    window.addEventListener('keydown', handleHelp)
    return () => window.removeEventListener('keydown', handleHelp)
  }, [])

  // ------------------------- UI -------------------------

  if (booting || authLoading)
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loading size="lg" text="Chargement de l'application..." />
      </div>
    )

  if (!user) return <Login />

  // Mode Régie ON AIR - Vue dédiée en lecture seule
  if (uiMode === 'REGIE') {
    return (
      <RegieOnAirView 
        programs={programs} 
        currentDay={selectedDay || undefined}
      />
    )
  }

  // Mobile/Tablette portrait : consulter d'abord la fiche du programme,
  // puis ouvrir l'édition depuis cette fiche si nécessaire.
  if (device.isMobile || device.isTablet) {
    return (
      <>
        <MobileAppWrapper
          programs={programs}
          currentDay={selectedDay || DAYS[0]}
          categoryStyles={categoryStyles}
          currentGridId={currentGridId || undefined}
          onProgramTap={setProgramToInspect}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          userRole={userRole}
          theme={theme}
          onThemeToggle={handleThemeToggle}
        />
        <ProgramDetailsModal
          program={programToInspect}
          onClose={() => setProgramToInspect(null)}
          onEdit={() => {
            if (!canEditPrograms || !programToInspect) return
            setEditing(programToInspect)
            setProgramToInspect(null)
            setShowForm(true)
          }}
        />
        <ProgramFormModal
          isOpen={showForm}
          editing={editing}
          onSave={(p) => upsert(p, () => { setShowForm(false); setEditing(null) })}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      </>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Header
        user={user}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onAddProgram={() => {
          if (!canCreatePrograms) return
          setEditing(null)
          setShowForm(true)
        }}
        canCreatePrograms={canCreatePrograms}
        onExportPDF={handleExportPDF}
        onExportDayPDF={handleExportDayPDF}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onExportEPG={handleExportEPG}
        onImportJSON={handleImportJSON}
        selectedDay={selectedDay}
        viewMode={viewMode}
        onLogout={handleLogout}
        programsCount={programs.length}
      />

      {/* Navigation V3 - Broadcast Console Ribbon */}
      <nav aria-label="Navigation principale" className="flex-shrink-0 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-[3.25rem] sm:top-[3.5rem] z-40 shadow-sm">
        <div className="w-full px-2 sm:px-4">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1.5 sm:py-2 scrollbar-none">
            {canCreatePrograms && (
              <button
                type="button"
                aria-label="Nouveau programme"
                onClick={() => {
                  setEditing(null)
                  setShowForm(true)
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg shadow-sm border border-blue-500/40 flex items-center gap-1.5 transition-all flex-shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau</span>
              </button>
            )}

            <div className="hidden sm:block h-5 w-px bg-slate-800 mx-0.5 flex-shrink-0" />

            <div role="group" aria-label="Sélection de grille" className="flex-shrink-0 rounded-lg border border-slate-800 bg-slate-950/70 p-0.5">
              <button
                type="button"
                aria-current={viewMode === "grids" ? "page" : undefined}
                onClick={() => {
                  setViewMode("grids")
                  if (uiMode === "DIRECTION") useUIModeStore.getState().setMode("STANDARD")
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex-shrink-0",
                  viewMode === "grids"
                    ? "bg-slate-800 text-blue-400 border border-blue-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Grilles</span>
              </button>
            </div>

            {currentGridId && (
              <>
                <div role="group" aria-label="Vues de planning" className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-0.5 flex-shrink-0">
                  <button
                    type="button"
                    aria-current={viewMode === "week" ? "page" : undefined}
                    onClick={() => {
                      setViewMode("week")
                      if (uiMode === "DIRECTION") useUIModeStore.getState().setMode("STANDARD")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all",
                      viewMode === "week"
                        ? "bg-slate-800 text-blue-400 border border-blue-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Semaine</span>
                  </button>

                  <button
                    type="button"
                    aria-current={viewMode === "day" ? "page" : undefined}
                    onClick={() => {
                      setViewMode("day")
                      if (uiMode === "DIRECTION") useUIModeStore.getState().setMode("STANDARD")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all",
                      viewMode === "day"
                        ? "bg-slate-800 text-blue-400 border border-blue-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    )}
                    title={`Voir le conducteur du ${selectedDay}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Jour</span>
                    <span className="hidden xl:inline text-[10px] text-slate-400 font-mono">({selectedDay})</span>
                  </button>
                </div>

                <div role="group" aria-label="Coordination et analyse" className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-0.5 flex-shrink-0">
                  <button
                    type="button"
                    aria-current={viewMode === "coordination" ? "page" : undefined}
                    onClick={() => {
                      setViewMode("coordination")
                      if (uiMode === "DIRECTION") useUIModeStore.getState().setMode("STANDARD")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex-shrink-0",
                      viewMode === "coordination"
                        ? "bg-slate-800 text-blue-400 border border-blue-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <span>Coordination</span>
                  </button>

                  <button
                    type="button"
                    aria-current={viewMode === "report" ? "page" : undefined}
                    onClick={() => {
                      setViewMode("report")
                      if (uiMode === "DIRECTION") useUIModeStore.getState().setMode("STANDARD")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex-shrink-0",
                      viewMode === "report"
                        ? "bg-slate-800 text-blue-400 border border-blue-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                    <span>Rapport</span>
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              aria-current={viewMode === "dashboard" ? "page" : undefined}
              aria-label={`Tableau de bord statistiques (mode ${viewMode === 'dashboard' ? 'Direction' : 'Standard'})`}
              onClick={() => {
                setViewMode("dashboard")
                useUIModeStore.getState().setMode("DIRECTION")
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-shrink-0",
                viewMode === "dashboard"
                  ? "bg-slate-800 text-purple-400 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
              <span>Statistiques</span>
            </button>

            {/* 6. Fonctions secondaires regroupées selon les rôles (Dropdown Gestion) */}
            {currentGridId && (userRole === "ADMIN" || userRole === "PRODUCTION" || userRole === "DIRECTION") && (
              <div className="relative flex-shrink-0" ref={secondaryMenuRef}>
                <button
                  type="button"
                  id="gestion-menu-button"
                  ref={secondaryMenuButtonRef}
                  aria-label="Fonctions avancées et administration"
                  aria-expanded={showSecondaryMenu}
                  aria-controls="gestion-menu"
                  onClick={(event) => {
                    if (showSecondaryMenu) setShowSecondaryMenu(false)
                    else openSecondaryMenu(event.currentTarget)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-shrink-0",
                    (viewMode === "shiftlog" || viewMode === "audit" || viewMode === "settings")
                      ? "bg-slate-800 text-blue-400 border border-blue-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>
                    {viewMode === "shiftlog" ? "Journal" : viewMode === "audit" ? "Historique" : viewMode === "settings" ? "Paramètres" : "Gestion"}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showSecondaryMenu && "rotate-180")} />
                </button>

                {showSecondaryMenu && createPortal(
                  <div
                    id="gestion-menu"
                    ref={secondaryMenuDropdownRef}
                    aria-labelledby="gestion-menu-button"
                    className="fixed w-64 max-h-[calc(100vh-1rem)] overflow-y-auto rounded-xl shadow-2xl border border-slate-700 bg-slate-900/98 backdrop-blur-xl py-1.5 z-[120] animate-fade-in divide-y divide-slate-800"
                    style={{
                      top: secondaryMenuPosition.top,
                      left: secondaryMenuPosition.left,
                      maxHeight: `calc(100vh - ${secondaryMenuPosition.top + 8}px)`,
                    }}
                  >
                    <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Outils & Administration
                    </div>
                    <div className="py-1">
                      {(userRole === "ADMIN" || userRole === "PRODUCTION") && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode("shiftlog")
                            setShowSecondaryMenu(false)
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition-colors",
                            viewMode === "shiftlog" ? "text-blue-400 font-bold bg-slate-800/60" : "text-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-400" />
                            <span>Journal de bord</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">Régie</span>
                        </button>
                      )}

                      {(userRole === "ADMIN" || userRole === "DIRECTION") && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode("audit")
                            setShowSecondaryMenu(false)
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition-colors",
                            viewMode === "audit" ? "text-blue-400 font-bold bg-slate-800/60" : "text-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-cyan-400" />
                            <span>Historique & Audit</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">Sécurité</span>
                        </button>
                      )}

                      {(userRole === "ADMIN" || userRole === "PRODUCTION") && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowRamadanTemplateSelector(true)
                            setShowSecondaryMenu(false)
                          }}
                          className="w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition-colors text-slate-200"
                        >
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-indigo-400" />
                            <span>Modèles de grille</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">6 mod.</span>
                        </button>
                      )}

                      {userRole === "ADMIN" && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode("settings")
                            setShowSecondaryMenu(false)
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition-colors",
                            viewMode === "settings" ? "text-blue-400 font-bold bg-slate-800/60" : "text-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-emerald-400" />
                            <span>Paramètres système</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">Admin</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowShortcutsHelp(true)
                          setShowSecondaryMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                          <span>Raccourcis clavier</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 rounded border border-slate-700 text-slate-300">?</kbd>
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {viewMode !== "grids" && viewMode !== "coordination" && viewMode !== "shiftlog" && viewMode !== "report" && viewMode !== "settings" && (
        <LegendBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          categories={legendCategories}
          viewMode={viewMode === "week" ? "week" : viewMode === "day" ? "day" : "dashboard"}
          onViewModeChange={(mode) => {
            if (mode === "week") setViewMode("week")
            else if (mode === "day") setViewMode("day")
            else if (mode === "dashboard") setViewMode("dashboard")
          }}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      )}

      <main className={cn(
        "min-h-0 flex-1 overflow-x-hidden animate-fade-in",
        viewMode === "week"
          ? "w-full px-2 sm:px-4 py-2 overflow-hidden flex flex-col"
          : viewMode === "day"
          ? "container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col overflow-hidden"
            : "container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 overflow-y-auto"
      )}>
        {viewMode === "grids" ? (
          <GridSelector
            onSelectGrid={(gridId) => {
              setCurrentGridId(gridId)
              setViewMode("week")
              loadProgramsV3(gridId, true)
              toast.success("Grille chargée en vue semaine")
            }}
            onCreateGrid={canCreateGrids ? () => setShowCreateGridModal(true) : undefined}
          />
        ) : viewMode === "week" ? (
          <div className="animate-scale-in flex-1 min-h-0 flex flex-col">
            {showRamadanTemplateSelector && currentGridId && (
              <RamadanTemplateSelector
                gridId={currentGridId}
                onTemplateApplied={() => {
                  setShowRamadanTemplateSelector(false)
                  loadProgramsV3(currentGridId, true)
                }}
                onClose={() => setShowRamadanTemplateSelector(false)}
              />
            )}
            <WeekAgendaModern
              programs={normalizeProgramsForLegacy as any}
              weekDays={DAYS}
              startHour={weeklyWindow.startHour}
              endHour={weeklyWindow.endHour}
              visibleIds={visibleIds}
              conflicts={{ ids: conflicts.ids }}
              freeInfo={freeInfo}
              categoryStyles={categoryStyles}
              onStatusChange={handleStatusChange}
              userRole={userRole}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onOpenDayView={(day) => {
                setSelectedDay(day)
                setViewMode("day")
              }}
              onAddProgram={canCreatePrograms ? (day, start) => {
                setEditing({
                  id: '',
                  title: '',
                  days: day ? [day] : [selectedDay || 'Lundi'],
                  start: start || '08:00',
                  duration: 60,
                  category: 'Information',
                  typeDiffusion: 'Direct'
                } as any)
                setShowForm(true)
              } : undefined}
              onEdit={canEditPrograms ? (program) => {
                // S'assurer que le programme a toutes les propriétés requises
                const fullProgram: Program = {
                  ...program,
                  end: program.end || program.start, // Fallback si end est undefined
                  duration: program.duration || 0, // Fallback si duration est undefined
                }
                setEditing(fullProgram)
                setShowForm(true)
              } : undefined}
              onDelete={canDeletePrograms ? remove : undefined}
              onMoveProgram={canEditPrograms ? handleMoveProgram : undefined}
            />
          </div>
        ) : viewMode === "day" ? (
          <div className="animate-scale-in flex flex-col h-full min-h-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 flex-shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                  Grille du {selectedDay}
                </h2>
                
                {/* Chaque jour reste un bouton autonome, sans conteneur segmenté. */}
                <nav aria-label="Choisir le jour de la grille" className="flex max-w-full flex-wrap items-center gap-1.5">
                  {DAYS.map((day) => {
                    const isSelected = day === selectedDay
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "min-h-9 border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg-solid)]",
                          isSelected
                            ? "border-amber-500 bg-amber-500 text-slate-950 shadow-sm"
                            : "border-[var(--card-border)] bg-[var(--card-bg-solid)] text-[var(--card-text)] hover:border-amber-400 hover:text-amber-500"
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </nav>
              </div>
              
              <Button
                variant="primary"
                size="md"
                onClick={handleExportDayPDF}
                leftIcon={<FileText className="w-4 h-4" />}
                className="font-semibold flex-shrink-0"
              >
                <span className="hidden sm:inline">Exporter PDF {selectedDay}</span>
                <span className="sm:hidden">PDF {selectedDay}</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-2 overscroll-contain">
              <div className="space-y-4 pb-4">
                <DayView
                  day={selectedDay}
                  programs={normalizeProgramsForLegacy as any}
                  startHour={weeklyWindow.startHour}
                  endHour={weeklyWindow.endHour}
                  onEdit={canEditPrograms ? (p: any) => {
                    setEditing(p as Program)
                    setShowForm(true)
                  } : undefined}
                  onDelete={canDeletePrograms ? (id: string) => remove(id) : undefined}
                  onDuplicate={canCreatePrograms ? (id: string) => duplicateProgram(id) : undefined}
                  visibleIds={visibleIds}
                  freeInfo={freeInfo[selectedDay]}
                  conflicts={conflicts.byDay?.[selectedDay]}
                  categoryStyles={categoryStyles}
                />
              </div>
            </div>
          </div>
        ) : viewMode === "dashboard" ? (
          <Suspense fallback={<Loading size="md" text="Chargement du tableau de bord..." />}>
            <div className="animate-scale-in">
              <Dashboard
                programs={normalizeProgramsForLegacy as any}
                conflicts={conflicts}
                freeInfo={freeInfo}
                selectedDay={selectedDay}
                startHour={weeklyWindow.startHour}
                endHour={weeklyWindow.endHour}
                onEditProgram={canEditPrograms ? (p) => {
                  setEditing(p)
                  setShowForm(true)
                } : undefined}
              />
            </div>
          </Suspense>
        ) : viewMode === "coordination" && currentGridId ? (
          <CoordinationHub gridId={currentGridId} userRole={userRole} />
        ) : viewMode === "shiftlog" && currentGridId ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-amber-400" />
                  Journal de Bord & Continuité Antenne
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Continuité d'exploitation, consignes de diffusion et relèves d'équipes de régie
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowShiftLog(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="font-semibold shadow-md active:scale-95"
              >
                Rédiger un journal de bord
              </Button>
            </div>

            {loadingShiftLogs ? (
              <div className="flex items-center justify-center py-16">
                <Loading size="md" text="Chargement des journaux de bord..." />
              </div>
            ) : shiftLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 backdrop-blur-sm max-w-2xl mx-auto space-y-4 shadow-inner">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Aucun journal de bord consigné
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Le journal de bord consigne les prises de shift antenne, les consignes d'exploitation et les événements de régie lors des passages de relais entre équipes.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowShiftLog(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="font-bold shadow-lg shadow-blue-600/30 active:scale-95"
                  >
                    Rédiger un journal de bord
                  </Button>
                </div>
                <span className="text-[11px] font-mono text-slate-500 pt-1">
                  Accessible aux profils Régie, Production et Administration
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shiftLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {log.shiftType || 'DAY'}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {new Date(log.shiftDate || log.createdAt).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        Opérateur : <span className="text-slate-300">{log.operatorName || 'Non spécifié'}</span>
                      </p>
                      {log.handoverTo && (
                        <p className="text-xs text-slate-400">
                          Relève : <span className="text-slate-200">{log.handoverTo}</span>
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-xs text-slate-300 mt-2 p-2.5 rounded bg-slate-950/60 border border-slate-800 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ShiftLogForm
              gridId={currentGridId}
              isOpen={showShiftLog}
              onClose={() => setShowShiftLog(false)}
              onSave={() => {
                toast.success("Journal de bord enregistré")
                setShowShiftLog(false)
                loadShiftLogs()
              }}
            />
          </div>
        ) : viewMode === "report" && currentGridId ? (
          <Suspense fallback={<Loading size="md" text="Chargement des rapports..." />}>
            <BroadcastReportView gridId={currentGridId} />
          </Suspense>
        ) : viewMode === "settings" ? (
          <SettingsTelegram />
        ) : viewMode === "audit" && currentGridId ? (
          <Suspense fallback={<Loading size="md" text="Chargement de l'historique..." />}>
            <AuditHistoryView 
              currentGridId={currentGridId}
              programs={programs.map(p => ({ id: p.id, title: p.title }))}
            />
          </Suspense>
        ) : null}
      </main>

       <ProgramFormModal
         isOpen={showForm}
         editing={editing}
         onSave={(p) => upsert(p, () => { setShowForm(false); setEditing(null) })}
         onCancel={() => {
           setShowForm(false)
           setEditing(null)
         }}
       />

      {/* Bouton flottant pour ajouter un programme - Mobile uniquement */}
      {viewMode !== "grids" && canCreatePrograms && (
        <div className="fixed bottom-6 right-6 z-50 lg:hidden">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            leftIcon={<Plus className="w-6 h-6" />}
            className="rounded-full w-16 h-16 shadow-2xl hover:shadow-3xl hover:scale-110 transition-all font-bold text-xl"
            title="Ajouter un nouveau programme"
          >
            +
          </Button>
        </div>
      )}

      <footer className="flex-shrink-0 py-3 text-center text-xs text-[var(--muted)] border-t border-[var(--border)]">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} Broadcast SN+ — GrilleTV Pro V4.0.0</p>
          <div className="mt-2">
            <KeyboardShortcutsHelp />
          </div>
        </div>
      </footer>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#F2B705',
              secondary: '#000',
            },
          },
        }}
      />

      <CreateGridModal
        isOpen={showCreateGridModal}
        newGridData={newGridData}
        onNewGridDataChange={setNewGridData}
        onClose={() => {
          setShowCreateGridModal(false)
          setNewGridData({
            name: '',
            type: 'weekly',
            startDate: '',
            endDate: '',
          })
        }}
        onSubmit={handleCreateGrid}
      />
    </div>
  )
}

export default AppModernV3
