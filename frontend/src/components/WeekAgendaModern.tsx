import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { toMinutes, formatDuration } from "../legacy/lib/time"
import { deriveCategoryColor, rgbArrayToCss } from "../legacy/lib/colorPalette"
import { loadCategories } from "../legacy/lib/storage"
import { Card, Badge, Button, Modal } from "./ui"
import { 
  Clock, AlertCircle, CheckCircle2, Play, Radio, XCircle, ZoomIn, ZoomOut, Info, ChevronRight,
  Tv, Video, Film, Music, Mic, Settings, Power, Send, ChevronLeft, Calendar, Edit, Trash2, Move, ArrowRight, Lock, Unlock,
  Download, Filter, Eye, EyeOff, RefreshCw, Maximize2, Minimize2, FileText, Grid3x3, ChevronDown, ChevronUp, Plus
} from "lucide-react"
import { cn } from "../lib/utils"
import apiClient from "../lib/api"
import { useUIModeStore } from "../lib/uiModeStore"
import ProgramDetailsModal from './ProgramDetailsModal'
import { DAYS as CONFIG_DAYS, START_HOUR, END_HOUR } from '../legacy/config'

interface Program {
  id: string
  title: string
  start: string
  end?: string
  duration?: number
  category: string
  type?: string
  typeDiffusion?: string
  description?: string
  days: string[]
  categoryId?: string
  color?: string
  adsRequired?: boolean
  createdAt?: string
  updatedAt?: string
  opStatus?: "PLANNED" | "CONFIRMED" | "IN_PRODUCTION" | "READY" | "ON_AIR" | "DONE" | "CANCELED" | "DELAYED" | "OVERRUN" | "SKIPPED" | "MANUAL_OVERRIDE"
  occurrenceStatuses?: Record<string, "PLANNED" | "ON_AIR" | "AIRED" | "CANCELLED" | null>
  gridId?: string
  lastModifiedAt?: string
}

interface ConflictInfo {
  ids?: Set<string> | string[]
}

type CategoryStyles = Record<string, any>

interface WeekAgendaModernProps {
  programs: Program[]
  weekDays?: string[]
  startHour?: number
  endHour?: number
  visibleIds?: Set<string> | string[]
  conflicts?: ConflictInfo
  categoryStyles?: CategoryStyles
  freeInfo?: Record<string, { scheduledMinutes: number; freeMinutes: number; freeSlots?: string[] }> & {
    totalScheduledMinutes?: number
    totalFreeMinutes?: number
  }
  onStatusChange?: (programId: string, serviceDate: string, newStatus: "PLANNED" | "ON_AIR" | "AIRED" | "CANCELLED") => Promise<void> | void
  userRole?: string
  selectedDay?: string
  onSelectDay?: (day: string) => void
  onOpenDayView?: (day: string) => void
  onEdit?: (program: Program) => void
  onDelete?: (programId: string) => void
  onMoveProgram?: (programId: string, newDay: string, newStart?: string) => void
  onAddProgram?: (day?: string, start?: string) => void
}

interface ProgramOccurrence {
  program: Program
  day: string
}

const DEFAULT_WEEK_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
const SLOT_MINUTES = 15 // Slots toutes les 15 minutes pour affichage précis

const minutesToLabel = (total: number) => {
  const sanitized = Math.max(0, Math.round(total))
  const hours = Math.floor(sanitized / 60) % 24
  const minutes = sanitized % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const ensureSet = (ids?: Set<string> | string[]) => {
  if (ids instanceof Set) return ids
  if (Array.isArray(ids)) return new Set(ids)
  return new Set<string>()
}

/**
 * Extrait les flags Ramadan depuis la description
 */
function extractRamadanFlags(description?: string): any {
  if (!description || typeof description !== 'string') return null
  const match = description.match(/\[RAMADAN_FLAGS\]([\s\S]*?)\[\/RAMADAN_FLAGS\]/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/**
 * Vérifie si un programme est Ramadan
 */
function isRamadanProgram(program: Program): boolean {
  const flags = extractRamadanFlags(program.description)
  return flags?.isRamadan === true
}

// Configuration élégante des statuts avec style broadcast
const STATUS_CONFIG = {
  PLANNED: { 
    label: "Planifié", 
    color: "status-planned border border-slate-700",
    icon: Clock,
    broadcastColor: "#94a3b8"
  },
  CONFIRMED: { 
    label: "Confirmé", 
    color: "status-confirmed border border-blue-500/40",
    icon: CheckCircle2,
    broadcastColor: "#3b82f6"
  },
  IN_PRODUCTION: { 
    label: "En prod", 
    color: "status-production border border-amber-500/40",
    icon: Play,
    broadcastColor: "#f59e0b"
  },
  READY: { 
    label: "Prêt", 
    color: "status-ready border border-emerald-500/40",
    icon: CheckCircle2,
    broadcastColor: "#10b981"
  },
  ON_AIR: { 
    label: "ON AIR", 
    color: "status-onair border border-red-500/60 animate-pulse",
    icon: Radio,
    broadcastColor: "#ef4444"
  },
  AIRED: {
    label: "Diffusé",
    color: "status-done border border-slate-700",
    icon: CheckCircle2,
    broadcastColor: "#6b7280"
  },
  CANCELLED: {
    label: "Annulé",
    color: "status-canceled border border-red-800 line-through",
    icon: XCircle,
    broadcastColor: "#dc2626"
  },
  DONE: { 
    label: "Terminé", 
    color: "status-done border border-slate-700",
    icon: CheckCircle2,
    broadcastColor: "#6b7280"
  },
  CANCELED: { 
    label: "Annulé", 
    color: "status-canceled border border-red-800 line-through",
    icon: XCircle,
    broadcastColor: "#dc2626"
  },
  DELAYED: {
    label: "En retard",
    color: "status-delayed border border-amber-500/50",
    icon: AlertCircle,
    broadcastColor: "#f59e0b"
  },
  OVERRUN: {
    label: "Dépassement",
    color: "status-overrun border border-red-500/50",
    icon: AlertCircle,
    broadcastColor: "#ef4444"
  },
  SKIPPED: {
    label: "Sauté",
    color: "status-skipped border line-through",
    icon: XCircle,
    broadcastColor: "#6b7280"
  },
  MANUAL_OVERRIDE: {
    label: "Override",
    color: "status-override border border-purple-500/50",
    icon: Settings,
    broadcastColor: "#8b5cf6"
  },
} as const

// Détection intelligente du type de diffusion
function getBroadcastTypeInfo(typeDiffusion?: string) {
  const norm = (typeDiffusion || '').trim().toUpperCase()
  if (norm.includes('DIRECT') || norm.includes('LIVE')) {
    return {
      label: 'LIVE',
      icon: Radio,
      color: '#ef4444',
      rgb: [239, 68, 68],
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.45)',
      badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
      isLive: true
    }
  }
  if (norm.includes('REDIFFUSION') || norm.includes('REPLAY')) {
    return {
      label: 'REPLAY',
      icon: Film,
      color: '#a855f7',
      rgb: [168, 85, 247],
      bgColor: 'rgba(168, 85, 247, 0.1)',
      borderColor: 'rgba(168, 85, 247, 0.4)',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      isLive: false
    }
  }
  if (norm.includes('PUB') || norm.includes('ADS') || norm.includes('COMMERCIAL')) {
    return {
      label: 'PUB',
      icon: Tv,
      color: '#f59e0b',
      rgb: [245, 158, 11],
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      isLive: false
    }
  }
  return {
    label: 'PAD',
    icon: Video,
    color: '#3b82f6',
    rgb: [59, 130, 246],
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    isLive: false
  }
}

const WeekAgendaModern: React.FC<WeekAgendaModernProps> = ({
  programs,
  weekDays = DEFAULT_WEEK_DAYS,
  startHour = START_HOUR,
  endHour = END_HOUR,
  visibleIds,
  conflicts,
  categoryStyles,
  freeInfo,
  onStatusChange,
  userRole,
  selectedDay,
  onSelectDay,
  onOpenDayView,
  onEdit,
  onDelete,
  onMoveProgram,
  onAddProgram,
}) => {
  const canChangeStatus = ["ADMIN", "PRODUCTION", "DIRECTION"].includes(userRole || "")
  const { mode: uiMode, isRegieMode } = useUIModeStore()
  const onAirProgramRef = useRef<HTMLDivElement | null>(null)
  // Refs par clé de programme pour déplacer le focus DOM aux flèches
  const programRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const gridContainerRef = useRef<HTMLDivElement | null>(null)
  const selectedDayColumnRef = useRef<HTMLButtonElement | null>(null)
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null)
  const [optionsMenuPosition, setOptionsMenuPosition] = useState({ top: 0, right: 16 })

  // Largeur minimale lisible par colonne pour qu'une carte programme reste lisible
  // (titre + horaire + catégorie + boutons d'action)
  const MIN_COL_WIDTH = 130

  // Calcul dynamique du zoom optimal pour cadrer les 7 jours selon la largeur réelle disponible
  // Le zoom est calculé par rapport à la largeur de référence de 180px par colonne
  const calculateFitZoom = useCallback(() => {
    if (typeof window === 'undefined') return 1
    const container = gridContainerRef.current
    const availableWidth = container ? container.clientWidth - 75 : window.innerWidth - 75 - 32
    const daysCount = weekDays.length || 7
    const targetColWidth = availableWidth / daysCount
    // Le zoom 1.0 correspond à 180px de largeur par colonne
    return Math.max(0.6, Math.min(1.15, Math.round((targetColWidth / 180) * 100) / 100))
  }, [weekDays.length])

  // État pour le zoom (adapté par défaut sur écrans <= 1340px pour afficher les 7 jours sans défilement forcé)
  const [zoomLevel, setZoomLevel] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1340) {
      const availableWidth = window.innerWidth - 75 - 32
      const targetCol = availableWidth / 7
      return Math.max(0.65, Math.min(1, Math.round((targetCol / 180) * 100) / 100))
    }
    return 1
  })
  // Densité d'affichage de la grille : 'compact' (aperçu 24h) ou 'detailed' (détails production)
  const [density, setDensity] = useState<'compact' | 'detailed'>(() => {
    try {
      return (localStorage.getItem('grille-week-density') as 'compact' | 'detailed') || 'compact'
    } catch {
      return 'compact'
    }
  })
  // Largeur minimale dynamique par colonne basée sur le zoom actuel
  // Chaque colonne fait au moins MIN_COL_WIDTH px pour rester lisible
  const columnMinWidth = Math.max(MIN_COL_WIDTH, Math.round(180 * zoomLevel))
  const minGridWidth = 75 + weekDays.length * columnMinWidth
  const [hoveredProgram, setHoveredProgram] = useState<string | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null)
  const [programDetails, setProgramDetails] = useState<{ program: Program; day: string } | null>(null)
  const [focusedProgram, setFocusedProgram] = useState<string | null>(null)
  const [showBroadcastOptions, setShowBroadcastOptions] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showConflicts, setShowConflicts] = useState(true)
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const [showFreeTime, setShowFreeTime] = useState(true)
  const [programToDelete, setProgramToDelete] = useState<string | null>(null)
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null)
  const [moveTargetDay, setMoveTargetDay] = useState<string | null>(null)
  const [moveTargetTime, setMoveTargetTime] = useState<string | null>(null)
  // États pour la surbrillance lors de la navigation
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null)
  const [highlightedTimeRange, setHighlightedTimeRange] = useState<{ start: number; end: number } | null>(null)
  const [isHighlightLocked, setIsHighlightLocked] = useState(false)
  
  // Heure actuelle
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.getHours() * 60 + now.getMinutes())
    }, 60000) // Mise à jour chaque minute
    return () => clearInterval(interval)
  }, [])

  // Appliquer le mode UI au body pour les styles CSS
  useEffect(() => {
    document.body.setAttribute('data-ui-mode', uiMode)
    return () => {
      document.body.removeAttribute('data-ui-mode')
    }
  }, [uiMode])

  // Scroll automatique vers le programme ON AIR en mode RÉGIE
  useEffect(() => {
    if (isRegieMode() && onAirProgramRef.current) {
      setTimeout(() => {
        onAirProgramRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 500)
    }
  }, [isRegieMode, programs])
  
  // Jour actuel
  const currentDayIndex = useMemo(() => {
    const today = new Date().getDay()
    const dayMap: Record<number, string> = {
      0: 'Dimanche',
      1: 'Lundi',
      2: 'Mardi',
      3: 'Mercredi',
      4: 'Jeudi',
      5: 'Vendredi',
      6: 'Samedi',
    }
    const todayName = dayMap[today]
    return weekDays.indexOf(todayName)
  }, [weekDays])

  // Calculer les dates pour chaque jour de la semaine
  const getDateForDay = useCallback((dayName: string): number => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const today = new Date()
    const todayDayIndex = today.getDay()
    const targetDayIndex = days.indexOf(dayName)
    
    // Calculer le décalage en jours
    const offset = targetDayIndex - todayDayIndex
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + offset)
    
    return targetDate.getDate()
  }, [])

  const getServiceDateForDay = useCallback((dayName: string): string => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const today = new Date()
    const targetDayIndex = days.indexOf(dayName)
    const offset = targetDayIndex - today.getDay()
    const serviceDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    const year = serviceDate.getFullYear()
    const month = String(serviceDate.getMonth() + 1).padStart(2, '0')
    const day = String(serviceDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])
  
  // Fonctions de zoom
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }, [])
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }, [])

  // Navigation entre les jours
  const currentSelectedDayIndex = useMemo(() => {
    if (!selectedDay) return currentDayIndex
    return weekDays.indexOf(selectedDay)
  }, [selectedDay, weekDays, currentDayIndex])

  const handlePreviousDay = useCallback(() => {
    if (!onSelectDay) return
    const currentIndex = currentSelectedDayIndex >= 0 ? currentSelectedDayIndex : 0
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : weekDays.length - 1
    onSelectDay(weekDays[prevIndex])
  }, [onSelectDay, currentSelectedDayIndex, weekDays])

  const handleNextDay = useCallback(() => {
    if (!onSelectDay) return
    const currentIndex = currentSelectedDayIndex >= 0 ? currentSelectedDayIndex : 0
    const nextIndex = currentIndex < weekDays.length - 1 ? currentIndex + 1 : 0
    onSelectDay(weekDays[nextIndex])
  }, [onSelectDay, currentSelectedDayIndex, weekDays])

  const handleDayClick = useCallback((day: string) => {
    if (onSelectDay) {
      onSelectDay(day)
    }
  }, [onSelectDay])

  // Référence pour le scroll automatique vers le jour sélectionné (déclarée en haut du composant)

  // Scroll automatique vers le jour sélectionné
  useEffect(() => {
    if (selectedDay && selectedDayColumnRef.current && gridContainerRef.current) {
      // Attendre que le DOM soit mis à jour
      setTimeout(() => {
        selectedDayColumnRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        })
      }, 100)
    }
  }, [selectedDay])

  // États pour la détection fine du défilement horizontal
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollState = useCallback(() => {
    const el = gridContainerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
  }, [])

  useEffect(() => {
    const el = gridContainerRef.current
    if (!el) return
    checkScrollState()
    const timer = setTimeout(checkScrollState, 150)
    el.addEventListener('scroll', checkScrollState, { passive: true })
    window.addEventListener('resize', checkScrollState)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('scroll', checkScrollState)
      window.removeEventListener('resize', checkScrollState)
    }
  }, [checkScrollState, zoomLevel, programs])

  const isFitted = useMemo(() => {
    return (!canScrollLeft && !canScrollRight && zoomLevel <= 1) || Math.abs(zoomLevel - calculateFitZoom()) < 0.05
  }, [canScrollLeft, canScrollRight, zoomLevel, calculateFitZoom])

  const handleToggleFit7Days = useCallback(() => {
    const fitZoom = calculateFitZoom()
    setZoomLevel((prev) => (Math.abs(prev - fitZoom) < 0.05 || (prev < 0.98 && Math.abs(prev - fitZoom) < 0.1) ? 1 : fitZoom))
  }, [calculateFitZoom])

  // Navigation clavier directe sur le conteneur de la grille (flèches gauche/droite)
  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== gridContainerRef.current) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      gridContainerRef.current?.scrollBy({ left: -columnMinWidth, behavior: 'smooth' })
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      gridContainerRef.current?.scrollBy({ left: columnMinWidth, behavior: 'smooth' })
    } else if (e.key === 'Home') {
      e.preventDefault()
      gridContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
    } else if (e.key === 'End') {
      e.preventDefault()
      if (gridContainerRef.current) {
        gridContainerRef.current.scrollTo({ left: gridContainerRef.current.scrollWidth, behavior: 'smooth' })
      }
    }
  }, [columnMinWidth])
  
  // Calcul de la position de l'heure actuelle
  const currentTimeRow = useMemo(() => {
    if (currentTime < startHour * 60 || currentTime > endHour * 60) return null
    const relativeTime = currentTime - startHour * 60
    return Math.floor(relativeTime / SLOT_MINUTES)
  }, [currentTime, startHour, endHour])

  const handleStatusChange = async (programId: string, serviceDate: string, newStatus: "PLANNED" | "ON_AIR" | "AIRED" | "CANCELLED") => {
    if (!canChangeStatus || !newStatus) return

    try {
      await onStatusChange?.(programId, serviceDate, newStatus)
    } catch (error) {
      console.error('Erreur changement statut:', error)
    }
  }

  const handleEdit = useCallback((program: Program, e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(program)
  }, [onEdit])

  const handleDeleteClick = useCallback((programId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProgramToDelete(programId)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (programToDelete && onDelete) {
      onDelete(programToDelete)
      setProgramToDelete(null)
    }
  }, [programToDelete, onDelete])

  const handleCancelDelete = useCallback(() => {
    setProgramToDelete(null)
  }, [])

  const handleMoveClick = useCallback((programId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const program = programs.find(p => p.id === programId)
    setShowMoveMenu(programId)
    setMoveTargetDay(null)
    setMoveTargetTime(program?.start || null)
  }, [programs])

  const handleMoveConfirm = useCallback((programId: string) => {
    if (moveTargetDay && onMoveProgram) {
      onMoveProgram(programId, moveTargetDay, moveTargetTime || undefined)
      setShowMoveMenu(null)
      setMoveTargetDay(null)
      setMoveTargetTime(null)
    }
  }, [moveTargetDay, moveTargetTime, onMoveProgram])

  const handleMoveCancel = useCallback(() => {
    setShowMoveMenu(null)
    setMoveTargetDay(null)
    setMoveTargetTime(null)
  }, [])

  // Générer les heures disponibles pour le déplacement
  const availableHours = useMemo(() => {
    const hours: string[] = []
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 15) {
        hours.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return hours
  }, [startHour, endHour])

  const getQuickActions = (program: Program, currentStatus: string) => {
    if (!canChangeStatus) return null

    const actions: Array<{ status: "PLANNED" | "ON_AIR" | "AIRED" | "CANCELLED"; label: string; icon: React.ReactNode }> = []

    switch (currentStatus) {
      case 'PLANNED':
        actions.push({ status: 'ON_AIR', label: 'ON AIR', icon: <Radio className="w-3 h-3" /> })
        actions.push({ status: 'CANCELLED', label: 'Annuler', icon: <XCircle className="w-3 h-3" /> })
        break
      case 'ON_AIR':
        actions.push({ status: 'AIRED', label: 'Diffusé', icon: <CheckCircle2 className="w-3 h-3" /> })
        actions.push({ status: 'CANCELLED', label: 'Annuler', icon: <XCircle className="w-3 h-3" /> })
        break
      case 'UNRECORDED':
        actions.push({ status: 'AIRED', label: 'Marquer diffusé', icon: <CheckCircle2 className="w-3 h-3" /> })
        actions.push({ status: 'CANCELLED', label: 'Annuler', icon: <XCircle className="w-3 h-3" /> })
        break
    }
    return actions
  }

  const weekDaySet = useMemo(() => new Set(weekDays), [weekDays])
  const [styles, setStyles] = useState<CategoryStyles>(() => categoryStyles || loadCategories())

  useEffect(() => {
    if (categoryStyles) {
      setStyles(categoryStyles)
      return
    }
    const refresh = () => setStyles(loadCategories())
    window.addEventListener("grille:categories-updated", refresh)
    return () => window.removeEventListener("grille:categories-updated", refresh)
  }, [categoryStyles])

  const visibleSet = useMemo(() => {
    if (visibleIds instanceof Set) return visibleIds
    if (Array.isArray(visibleIds)) return new Set(visibleIds)
    return new Set(programs.map((p) => p.id))
  }, [visibleIds, programs])

  const conflictSet = useMemo(() => ensureSet(conflicts?.ids), [conflicts])
  const totalMinutes = Math.max(0, (endHour - startHour) * 60)
  const slotCount = Math.max(0, Math.ceil(totalMinutes / SLOT_MINUTES))
  const slots = useMemo(() => {
    return Array.from({ length: slotCount }, (_, index) => startHour * 60 + index * SLOT_MINUTES)
  }, [slotCount, startHour])

  const occurrences = useMemo<ProgramOccurrence[]>(() => {
    const seen = new Set<string>()
    return programs.flatMap((program, programIndex) => {
      if (!program?.id || !visibleSet.has(program.id)) return []
      
      // Normaliser le programme pour s'assurer qu'il a les propriétés attendues
      const normalizedProgram: Program = {
        ...program,
        // Utiliser startTime si start n'existe pas (compatibilité backend)
        start: (program as any).start || (program as any).startTime || '00:00',
        // Utiliser endTime si end n'existe pas (compatibilité backend)
        end: program.end || (program as any).endTime,
        // Utiliser durationMin si duration n'existe pas (compatibilité backend)
        duration: program.duration || (program as any).durationMin || 60,
      }
      
      const startMin = toMinutes(normalizedProgram.start || '00:00')
      const rawEnd = normalizedProgram.end ? toMinutes(normalizedProgram.end) : startMin + (normalizedProgram.duration || 60)
      const endMin = rawEnd <= startMin ? rawEnd + 24 * 60 : rawEnd
      
      const days = Array.isArray(normalizedProgram.days) ? normalizedProgram.days : []
      return days
        .filter((day) => weekDaySet.has(day))
        .flatMap((day) => {
          const occurrences: ProgramOccurrence[] = []
          
          // Occurrence principale sur le jour de programmation
          const primaryKey = `${normalizedProgram.id}-${day}-${normalizedProgram.start}-${programIndex}`
          if (!seen.has(primaryKey)) {
            seen.add(primaryKey)
            occurrences.push({ program: normalizedProgram, day })
          }
          
          // Si le programme franchit minuit (endMin <= startMin après normalisation),
          // ajouter une occurrence sur le jour suivant pour la partie après minuit.
          // Une fin à 00:00 est la limite du jour, pas un programme de 24 h le lendemain.
          // N'ajouter une occurrence au jour suivant que si l'émission déborde réellement minuit.
          if (rawEnd <= startMin && endMin > 24 * 60) {
            const dayIndex = weekDays.indexOf(day)
            const nextDayIndex = (dayIndex + 1) % weekDays.length
            const nextDay = weekDays[nextDayIndex]
            
            if (weekDaySet.has(nextDay)) {
              const nextKey = `${normalizedProgram.id}-${nextDay}-${normalizedProgram.start}-${programIndex}`
              if (!seen.has(nextKey)) {
                seen.add(nextKey)
                // Occurrence sur le jour suivant : commence à 00:00, garde l'heure de fin d'origine
                occurrences.push({
                  program: { ...normalizedProgram, start: '00:00' },
                  day: nextDay,
                })
              }
            }
          }
          
          return occurrences
        })
    })
  }, [programs, visibleSet, weekDaySet])

  const programsByDay = useMemo(() => {
    const map = new Map<string, ProgramOccurrence[]>()
    for (const day of weekDays) {
      map.set(day, [])
    }
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.day)
      if (list) list.push(occurrence)
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        // Les programmes sont déjà normalisés dans occurrences, donc start devrait toujours exister
        const startA = a.program.start || '00:00'
        const startB = b.program.start || '00:00'
        return startA.localeCompare(startB)
      })
    }
    return map
  }, [occurrences, weekDays])

  // Durées cumulées programmées par jour (en minutes).
  // Si freeInfo est fourni (calcul unifié de computeFreeTime), utiliser directement cette source de vérité.
  // Sinon, calculer le temps effectif non chevauchant par jour pour préserver la cohérence 24 h.
  const dayDurations = useMemo(() => {
    const map = new Map<string, number>()
    for (const day of weekDays) {
      if (freeInfo && freeInfo[day]?.scheduledMinutes !== undefined) {
        map.set(day, freeInfo[day].scheduledMinutes)
        continue
      }
      const list = programsByDay.get(day) || []
      const gridStartMin = startHour * 60
      const gridEndMin = endHour * 60
      
      const intervals = list.map(occ => {
        const s = toMinutes(occ.program.start || "00:00")
        const rawEnd = occ.program.end ? toMinutes(occ.program.end) : s + (occ.program.duration || 60)
        const e = rawEnd <= s ? rawEnd + 24 * 60 : rawEnd
        return { start: Math.max(gridStartMin, s), end: Math.min(gridEndMin, e) }
      }).filter(i => i.end > i.start).sort((a, b) => a.start - b.start)

      let scheduled = 0
      let cursor = gridStartMin
      for (const item of intervals) {
        scheduled += Math.max(0, item.end - Math.max(item.start, cursor))
        cursor = Math.max(cursor, item.end)
      }
      map.set(day, scheduled)
    }
    return map
  }, [programsByDay, weekDays, freeInfo, startHour, endHour])

  // Le dénominateur suit le périmètre effectivement affiché (19 h/jour pour 05:00–00:00).
  const weekWindowMinutes = (endHour - startHour) * 60 * weekDays.length
  const weekWindowHours = weekWindowMinutes / 60
  const totalWeeklyMinutes = useMemo(() => {
    if (freeInfo && typeof freeInfo.totalScheduledMinutes === 'number') {
      return freeInfo.totalScheduledMinutes
    }
    let sum = 0
    dayDurations.forEach((val) => { sum += val })
    return sum
  }, [dayDurations, freeInfo])

  // Taux d'occupation de la grille par rapport au périmètre affiché.
  const csaCompletion = useMemo(() => {
    if (totalWeeklyMinutes <= 0) return 0
    return Math.min(100, Math.round((totalWeeklyMinutes / weekWindowMinutes) * 100))
  }, [totalWeeklyMinutes, weekWindowMinutes])

  const csaColor = useMemo(() => {
    if (csaCompletion < 50) return '#EF4444' // rouge - sous-rempli
    if (csaCompletion < 85) return '#F59E0B' // ambre - en cours
    return '#10B981' // vert - complet
  }, [csaCompletion])

  // Détection des plages libres (trous d'antenne) par jour
  const freeSlotsByDay = useMemo(() => {
    const map = new Map<string, Array<{ startMin: number; endMin: number; duration: number; startLabel: string; endLabel: string }>>()
    const gridStartMin = startHour * 60
    const gridEndMin = endHour * 60

    for (const day of weekDays) {
      const dayOccurrences = programsByDay.get(day) || []
      const slots: Array<{ startMin: number; endMin: number; duration: number; startLabel: string; endLabel: string }> = []
      
      let cursor = gridStartMin
      // Intervalles triés avec prise en charge du passage de minuit
      const sortedIntervals = dayOccurrences.map(occ => {
        const s = toMinutes(occ.program.start || "00:00")
        let computedEnd = occ.program.end ? toMinutes(occ.program.end) : s + (occ.program.duration || 60)
        if (computedEnd <= s) computedEnd += 24 * 60
        return { start: Math.max(gridStartMin, s), end: Math.min(gridEndMin, computedEnd) }
      }).filter(int => int.end > int.start).sort((a, b) => a.start - b.start)

      for (const item of sortedIntervals) {
        if (item.start > cursor && (item.start - cursor) >= 15) {
          slots.push({
            startMin: cursor,
            endMin: item.start,
            duration: item.start - cursor,
            startLabel: minutesToLabel(cursor),
            endLabel: minutesToLabel(item.start)
          })
        }
        cursor = Math.max(cursor, item.end)
      }

      if (cursor < gridEndMin && (gridEndMin - cursor) >= 15) {
        slots.push({
          startMin: cursor,
          endMin: gridEndMin,
          duration: gridEndMin - cursor,
          startLabel: minutesToLabel(cursor),
          endLabel: minutesToLabel(gridEndMin)
        })
      }

      map.set(day, slots)
    }
    return map
  }, [programsByDay, weekDays, startHour, endHour])

  // Nombre total de plages libres dans la semaine
  const totalFreeSlotsCount = useMemo(() => {
    let count = 0
    freeSlotsByDay.forEach((slots) => { count += slots.length })
    return count
  }, [freeSlotsByDay])

  // Calculer les positions et créneaux pour éviter tout chevauchement ou masquage de cartes
  // Gère intelligemment la structure broadcast (ex: Publicités et Jingles de début d'heure + Émission principale)
  // et alloue des sous-colonnes (lanes) sans débordement de marge.
  const programPositions = useMemo(() => {
    const positions = new Map<string, {
      rowStart: number
      rowSpan: number
      topOffset: number
      height: number
      left: string
      width: string
      index: number
      total: number
      hasOverlap: boolean
    }>()
    const gridStartMin = startHour * 60
    const gridEndMin = endHour * 60

    for (const day of weekDays) {
      const dayPrograms = programsByDay.get(day) || []

      // 1. Préparer les horaires exacts et leurs lignes de grille englobantes.
      const items = dayPrograms.map((occurrence) => {
        const program = occurrence.program
        const startMin = toMinutes(program.start || "00:00")
        let computedEnd = program.end ? toMinutes(program.end) : startMin + (program.duration || 60)
        if (computedEnd <= startMin) computedEnd += 24 * 60
        const endMin = computedEnd

        const adjStart = Math.max(startMin, gridStartMin)
        const adjEnd = Math.min(endMin, gridEndMin)
        const adjDuration = adjEnd - adjStart

        const rawSlotStart = Math.floor((adjStart - gridStartMin) / SLOT_MINUTES)
        const rawSlotEnd = Math.max(rawSlotStart + 1, Math.ceil((adjEnd - gridStartMin) / SLOT_MINUTES))

        return {
          occurrence,
          adjStart,
          adjEnd,
          adjDuration,
          rawSlotStart,
          rawSlotEnd,
          rowStart: rawSlotStart,
          rowSpan: rawSlotEnd - rawSlotStart,
          topOffset: ((adjStart - gridStartMin) % SLOT_MINUTES) / SLOT_MINUTES * Math.round(38 * zoomLevel),
          height: adjDuration / SLOT_MINUTES * Math.round(38 * zoomLevel),
          lane: 0
        }
      }).filter(p => p.adjEnd > p.adjStart && p.rawSlotStart < slotCount)

      // Trier par heure de début croissante, puis par durée décroissante
      items.sort((a, b) => a.adjStart - b.adjStart || b.adjDuration - a.adjDuration)

      // 3. Les horaires précis font foi : les événements qui se suivent dans un
      // même créneau de 15 minutes ne sont pas des collisions.
      const collisionMatrix: boolean[][] = []
      for (let i = 0; i < items.length; i++) {
        collisionMatrix[i] = []
        const a = items[i]
        for (let j = 0; j < items.length; j++) {
          if (i === j) {
            collisionMatrix[i][j] = false
          } else {
            const b = items[j]
            collisionMatrix[i][j] = a.adjStart < b.adjEnd && b.adjStart < a.adjEnd
          }
        }
      }

      // 4. Regroupement par composantes connexes en collision
      const visited = new Set<number>()
      const clusters: number[][] = []

      const dfs = (node: number, cluster: number[]) => {
        if (visited.has(node)) return
        visited.add(node)
        cluster.push(node)
        for (let j = 0; j < items.length; j++) {
          if (collisionMatrix[node][j] && !visited.has(j)) {
            dfs(j, cluster)
          }
        }
      }

      for (let i = 0; i < items.length; i++) {
        if (!visited.has(i)) {
          const cluster: number[] = []
          dfs(i, cluster)
          clusters.push(cluster)
        }
      }

      // 5. Allocation des couloirs uniquement pour les vrais chevauchements.
      for (const cluster of clusters) {
        const clusterItems = cluster.map(idx => items[idx])
        clusterItems.sort((a, b) => a.rowStart - b.rowStart || b.rowSpan - a.rowSpan || a.adjStart - b.adjStart)

        const lanes: Array<typeof clusterItems> = []
        for (const item of clusterItems) {
          let placed = false
          for (let l = 0; l < lanes.length; l++) {
            const collides = lanes[l].some(other => {
              return item.adjStart < other.adjEnd && other.adjStart < item.adjEnd
            })
            if (!collides) {
              lanes[l].push(item)
              item.lane = l
              placed = true
              break
            }
          }
          if (!placed) {
            item.lane = lanes.length
            lanes.push([item])
          }
        }

        const totalLanes = lanes.length
        for (const item of clusterItems) {
          const key = `${item.occurrence.program.id}-${day}`
          const hasOverlap = totalLanes > 1
          let left: string
          let width: string

          if (!hasOverlap) {
            left = '8px'
            width = 'calc(100% - 16px)'
          } else {
            const gapPx = totalLanes === 2 ? 4 : 3
            const totalGapsPx = (totalLanes - 1) * gapPx
            width = `calc((100% - 16px - ${totalGapsPx}px) / ${totalLanes})`
            left = `calc(8px + ${item.lane} * ((100% - 16px - ${totalGapsPx}px) / ${totalLanes} + ${gapPx}px))`
          }

          positions.set(key, {
            rowStart: item.rowStart,
            rowSpan: item.rowSpan,
            topOffset: item.topOffset,
            height: item.height,
            left,
            width,
            index: item.lane,
            total: totalLanes,
            hasOverlap
          })
        }
      }
    }

    return positions
  }, [programsByDay, weekDays, startHour, endHour, slotCount, zoomLevel])

  // Liste ordonnée des cartes programme focusables au clavier (navigation 2D par flèches)
  const focusableKeys = useMemo(() => {
    const keys: string[] = []
    weekDays.forEach((day) => {
      ;(programsByDay.get(day) || []).forEach((occ) => {
        const key = `${occ.program.id}-${day}`
        keys.push(key)
      })
    })
    return keys
  }, [programsByDay, weekDays])

  // Navigation clavier dans la grille : flèches pour se déplacer, Entrée/Espace pour activer
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent, currentKey: string | null) => {
      if (!currentKey) return
      const idx = focusableKeys.indexOf(currentKey)
      if (idx === -1) return
      let nextIdx = idx
      switch (e.key) {
        case "ArrowRight":
          nextIdx = (idx + 1) % focusableKeys.length
          break
        case "ArrowLeft":
          nextIdx = (idx - 1 + focusableKeys.length) % focusableKeys.length
          break
        case "ArrowDown":
          // Passe au même créneau du jour suivant (7 jours)
          nextIdx = Math.min(idx + 7, focusableKeys.length - 1)
          break
        case "ArrowUp":
          nextIdx = Math.max(idx - 7, 0)
          break
        case "Enter":
          e.preventDefault()
          {
            const occurrence = occurrences.find(({ program, day }) => `${program.id}-${day}` === currentKey)
            if (occurrence) setProgramDetails(occurrence)
          }
          return
        case " ":
          e.preventDefault()
          setSelectedProgram((prev) => (prev === currentKey ? null : currentKey))
          setFocusedProgram(currentKey)
          return
        default:
          return
      }
      e.preventDefault()
      setFocusedProgram(focusableKeys[nextIdx])
      const nextEl = programRefs.current.get(focusableKeys[nextIdx])
      nextEl?.focus({ preventScroll: true })
      nextEl?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "nearest" })
    },
    [focusableKeys, occurrences]
  )

  // Composant Plage Libre (Trou d'antenne)
  const FreeSlotCard: React.FC<{
    slot: { startMin: number; endMin: number; duration: number; startLabel: string; endLabel: string };
    day: string;
    dayIndex: number;
  }> = ({ slot, day, dayIndex }) => {
    const gridStartMin = startHour * 60
    const relativeStart = Math.max(0, slot.startMin - gridStartMin)
    const rowStart = Math.floor(relativeStart / SLOT_MINUTES)
    const rowSpan = Math.max(1, Math.ceil(slot.duration / SLOT_MINUTES))
    const finalRowSpan = Math.min(rowSpan, slotCount - rowStart)

    if (finalRowSpan <= 0) return null

    return (
      <div
        className={cn(
          "rounded-xl transition-all duration-200 border border-dashed",
          "border-slate-700/60 hover:border-blue-500/80 bg-slate-900/40 hover:bg-slate-800/60",
          "flex flex-col items-center justify-center p-1.5 cursor-pointer group text-center"
        )}
        style={{
          gridColumn: dayIndex + 2,
          gridRow: `${Math.max(1, rowStart + 1)} / span ${finalRowSpan}`,
          marginLeft: '8px',
          marginRight: '8px',
          width: 'calc(100% - 16px)',
          position: 'relative',
          minHeight: '100%',
          maxHeight: '100%',
          zIndex: 16,
          boxSizing: 'border-box',
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(148, 163, 184, 0.03) 8px, rgba(148, 163, 184, 0.03) 16px)',
        }}
        onClick={() => {
          onAddProgram?.(day, slot.startLabel)
        }}
        title={`Plage libre : ${slot.startLabel} - ${slot.endLabel} (${formatDuration(slot.duration)}). Cliquer pour créer.`}
      >
        <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-200 transition-colors">
          <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:scale-125 transition-transform" />
          <span className="text-[11px] font-mono font-medium">
            {slot.startLabel} – {slot.endLabel}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            ({formatDuration(slot.duration)})
          </span>
        </div>
        {finalRowSpan >= 2 && (
          <span className="text-[10px] font-semibold text-blue-400/90 group-hover:text-blue-300 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            + Planifier un programme
          </span>
        )}
      </div>
    )
  }

  // Composant Programme Card Broadcast Pro Console
  const ProgramCard: React.FC<{ program: Program; day: string; isFocused?: boolean }> = ({ program, day, isFocused = false }) => {
    const startMin = toMinutes(program.start || "00:00")
    let computedEnd = program.end ? toMinutes(program.end) : startMin + (program.duration || 60)
    // Un programme peut franchir minuit (ex: 23:00 → 01:00). endMinutes est alors < startMinutes,
    // on ajoute 24h pour obtenir la durée réelle et l'affichage sur la grille.
    if (computedEnd <= startMin) computedEnd += 24 * 60
    const endMin = computedEnd
    
    // Calculer la position relative dans la grille
    const gridStartMin = startHour * 60
    const gridEndMin = endHour * 60
    
    if (endMin <= gridStartMin || startMin >= gridEndMin) return null
    
    const adjustedStartMin = Math.max(startMin, gridStartMin)
    const adjustedEndMin = Math.min(endMin, gridEndMin)
    const adjustedDuration = adjustedEndMin - adjustedStartMin
    
    const relativeStart = adjustedStartMin - gridStartMin
    const dayIndex = weekDays.indexOf(day)
    if (dayIndex === -1) return null

    const positionKey = `${program.id}-${day}`
    const position = programPositions.get(positionKey)

    // Utiliser les coordonnées calculées sans collision
    const rowStart = position ? position.rowStart : Math.floor(relativeStart / SLOT_MINUTES)
    const rowSpan = position ? position.rowSpan : Math.max(1, Math.ceil(adjustedDuration / SLOT_MINUTES))
    
    if (rowStart < 0 || rowStart >= slotCount) return null
    const finalRowSpan = Math.min(rowSpan, slotCount - rowStart)
    if (finalRowSpan <= 0) return null

    const hasOverlap = position ? position.hasOverlap : false

    const horizontalStyle = {
      top: `${position?.topOffset ?? 0}px`,
      // Garder la durée proportionnelle : un événement d'une minute reste un repère
      // fin et ne déborde pas sur le programme qui commence juste après.
      height: `${Math.max(position?.height ?? finalRowSpan * Math.round(38 * zoomLevel), 4)}px`,
      left: position?.left ?? '8px',
      width: position?.width ?? 'calc(100% - 16px)',
      boxSizing: 'border-box' as const,
    }

    const isConflict = conflictSet.has(program.id)
    const categoryColor = deriveCategoryColor(program.category, categoryStyles?.[program.category])
    const serviceDate = getServiceDateForDay(day)
    const hasRecordedOccurrence = Object.prototype.hasOwnProperty.call(program.occurrenceStatuses || {}, serviceDate)
    const occurrenceStatus = hasRecordedOccurrence ? program.occurrenceStatuses?.[serviceDate] : 'PLANNED'
    const status = occurrenceStatus || 'UNRECORDED'
    const statusInfo = status === 'UNRECORDED'
      ? { label: 'Non renseigné', color: 'status-planned border border-slate-700', icon: Info, broadcastColor: '#94a3b8' }
      : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PLANNED
    const quickActions = getQuickActions(program, status)
    const isHovered = hoveredProgram === `${program.id}-${day}`
    const isFocusedCard = focusedProgram === `${program.id}-${day}`
    const isToday = dayIndex === currentDayIndex
    const isSelected = selectedProgram === `${program.id}-${day}`
    const isMicroProgram = adjustedDuration < 8
    const showMicroProgramLabel = isMicroProgram && (isHovered || isFocusedCard || isSelected)
    
    // Configuration intelligente du type broadcast
    const broadcastInfo = getBroadcastTypeInfo(program.typeDiffusion || (program as any).type)
    const usesTransmissionColor = broadcastInfo.isLive || broadcastInfo.label === 'REPLAY'
    const cardColor = usesTransmissionColor ? broadcastInfo.rgb : categoryColor
    const cardColorCss = rgbArrayToCss(cardColor)
    
    const isOnAir = status === "ON_AIR"
    const isAired = status === "AIRED"
    const isCurrentlyOnAir = isToday && currentTime >= adjustedStartMin && currentTime <= adjustedEndMin && isOnAir
    const progress = isCurrentlyOnAir && adjustedDuration > 0
      ? Math.min(100, Math.max(0, ((currentTime - adjustedStartMin) / adjustedDuration) * 100))
      : null
    
    const isPast = isToday && currentTime > adjustedEndMin
    const isFuture = isToday && currentTime < adjustedStartMin

    const ramadanFlags = extractRamadanFlags(program.description)

    return (
      <div
        id={`prog-${positionKey}`}
        ref={(el) => {
          if (el) {
            programRefs.current.set(`${program.id}-${day}`, el)
          } else {
            programRefs.current.delete(`${program.id}-${day}`)
          }
          if (isCurrentlyOnAir && isRegieMode()) {
            onAirProgramRef.current = el
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={
          `Programme ${program.title}, ${program.start} à ${program.end || minutesToLabel(adjustedStartMin + adjustedDuration)}, jour ${day}, statut ${statusInfo.label}`
        }
        title={`${program.title} — ${program.start}–${program.end || minutesToLabel(adjustedStartMin + adjustedDuration)} (${formatDuration(adjustedDuration)}) — ${statusInfo.label}`}
        aria-description="Double-cliquez pour modifier le programme. Appuyez sur Entrée pour afficher ses détails."
        className={cn(
          "rounded-md shadow-md transition-all duration-200 outline-none",
          "week-agenda-program-card group cursor-pointer flex flex-col justify-between",
          isMicroProgram ? "overflow-visible" : "overflow-hidden",
          // Le contenu détaillé gère son propre padding. Un padding ici puis un
          // second dans le corps faisait tomber le titre à zéro sur les cartes
          // courtes (30–45 min), tout en le laissant présent dans l’arbre a11y.
          (isMicroProgram || finalRowSpan <= 2) && (density === 'compact' ? "p-1" : "p-2 sm:p-2.5"),
          isFocused && "ring-2 ring-blue-400 ring-offset-2 z-30",
          isConflict
            ? "border-2 border-red-500 bg-red-950/40 ring-2 ring-red-500/40 animate-pulse"
            : isCurrentlyOnAir
            ? "border-2 border-red-500 ring-2 ring-red-500/30 shadow-lg shadow-red-500/25"
            : "border border-slate-700/80 hover:border-slate-600 bg-slate-900/90 hover:bg-slate-850/95",
          isToday && !isConflict && !isCurrentlyOnAir && "ring-1 ring-slate-700",
          isHovered && "ring-2 ring-blue-500/50 shadow-xl scale-[1.005]",
          isSelected && "ring-2 ring-blue-400 shadow-2xl",
          isPast && !isConflict && !isCurrentlyOnAir && "opacity-65"
        )}
        style={{
          gridColumn: dayIndex + 2,
          gridRow: `${Math.max(1, rowStart + 1)} / span ${finalRowSpan}`,
          ...horizontalStyle,
          zIndex: isCurrentlyOnAir ? 30 : isHovered ? 25 : isFocused ? 28 : 20,
          position: 'relative',
          borderLeftWidth: isCurrentlyOnAir ? "5px" : "4px",
          borderLeftColor: isConflict 
            ? "#ef4444" 
            : isCurrentlyOnAir
            ? "#E10600"
            : cardColorCss,
          background: isConflict
            ? 'linear-gradient(135deg, rgba(127, 29, 29, 0.48) 0%, rgba(69, 10, 10, 0.42) 100%)'
            : `linear-gradient(135deg, ${rgbArrayToCss(cardColor, 0.62)} 0%, ${rgbArrayToCss(cardColor, 0.5)} 100%)`,
        }}
        onMouseEnter={() => {
          setHoveredProgram(`${program.id}-${day}`)
          if (!isHighlightLocked) {
            setHighlightedDay(day)
            setHighlightedTimeRange({ start: startMin, end: endMin })
          }
        }}
        onMouseLeave={() => {
          setHoveredProgram(null)
        }}
        onFocus={() => setFocusedProgram(`${program.id}-${day}`)}
        onBlur={() => setFocusedProgram(null)}
        onKeyDown={(e) => handleGridKeyDown(e, `${program.id}-${day}`)}
        onClick={() => {
          setSelectedProgram(isSelected ? null : `${program.id}-${day}`)
          setFocusedProgram(`${program.id}-${day}`)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (onEdit) onEdit(program)
          else setProgramDetails({ program, day })
        }}
      >
        {/* Barre de progression LIVE ON AIR */}
        {isCurrentlyOnAir && progress !== null && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-950/80 overflow-hidden z-20">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-400 shadow-md transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Corps principal de la carte */}
        {adjustedDuration < 8 ? (
          <>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-white/90 opacity-90" />
            {showMicroProgramLabel && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-full z-[60] mt-1 w-max max-w-[220px] rounded-sm border border-slate-600 bg-slate-950 px-2 py-1 text-left text-[11px] leading-snug text-white shadow-xl"
              >
                <span className="block font-mono font-bold text-cyan-300">
                  {program.start}–{program.end || minutesToLabel(adjustedStartMin + adjustedDuration)} · {formatDuration(adjustedDuration)}
                </span>
                <span className="block truncate font-semibold">{program.title}</span>
              </span>
            )}
          </>
        ) : finalRowSpan <= 2 ? (
          <div className="flex flex-col h-full justify-center px-1.5 py-0.5 overflow-hidden select-none">
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono leading-none">
              <span className="font-black text-white tracking-tight truncate">{program.start}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span
                  className="text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider leading-none"
                  style={{
                    backgroundColor: rgbArrayToCss(cardColor, 0.35),
                    color: rgbArrayToCss(cardColor),
                    border: `1px solid ${rgbArrayToCss(cardColor, 0.7)}`
                  }}
                >
                  {formatDuration(adjustedDuration)}
                </span>
                {isConflict && (
                  <span className="text-[8px] font-black px-1 rounded bg-red-600 text-white animate-pulse leading-none">
                    !
                  </span>
                )}
                {status !== 'PLANNED' && (
                  <span
                    className="max-w-[72px] truncate text-[8px] font-bold leading-none text-slate-100"
                    title={`Statut : ${statusInfo.label}`}
                    aria-label={`Statut : ${statusInfo.label}`}
                  >
                    {statusInfo.label}
                  </span>
                )}
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-100 truncate leading-tight mt-0.5" title={program.title}>
              {program.title}
            </div>

            {/* Actions rapides au survol dans les micro-créneaux */}
            {(isHovered || isSelected) && (
              <div 
                className="absolute right-1 bottom-1 flex items-center gap-0.5 z-30 bg-slate-900/95 rounded px-1 py-0.5 border border-slate-700 shadow-xl backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                {canChangeStatus && quickActions?.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleStatusChange(program.id, serviceDate, action.status)
                    }}
                    className="min-h-7 px-1 rounded-sm bg-slate-800 text-[8px] font-bold text-slate-100 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                    title={`${action.label} — diffusion du ${serviceDate}`}
                    aria-label={`${action.label} : ${program.title}, diffusion du ${serviceDate}`}
                  >
                    {action.label}
                  </button>
                ))}
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => handleEdit(program, e)}
                    className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Modifier"
                    aria-label={`Modifier ${program.title}`}
                  >
                    <Edit className="w-2.5 h-2.5 text-blue-400" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(program.id, e)}
                    className="p-0.5 rounded hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                    aria-label={`Supprimer ${program.title}`}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            "flex flex-col h-full justify-between gap-1",
            density === 'compact' ? "p-1" : "p-2 sm:p-2.5"
          )}>
            {/* Ligne 1 : Horaires + Badge Type Broadcast */}
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className={cn(
                "flex items-center gap-1 font-mono font-bold text-slate-200",
                density === 'compact' ? "text-[9px]" : "text-[11px]"
              )}>
                <Clock className={cn("w-3 h-3 text-slate-400 flex-shrink-0", density === 'compact' ? "w-2.5 h-2.5" : "")} />
                <span>{program.start} – {program.end || minutesToLabel(adjustedStartMin + adjustedDuration)}</span>
                <span className="text-slate-500 font-sans">•</span>
                <span className={cn("text-slate-400 font-sans font-medium", density === 'compact' ? "text-[9px]" : "text-[10px]")}>
                  {formatDuration(adjustedDuration)}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Badge type de diffusion */}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-sm font-mono font-bold flex items-center gap-1 border",
                  density === 'compact' ? "text-[9px] px-1 py-0.25" : "text-[10px]",
                  isCurrentlyOnAir 
                    ? "bg-red-600 text-white border-red-500 animate-pulse shadow-sm shadow-red-500/50" 
                    : broadcastInfo.badgeClass
                )}>
                  {React.createElement(broadcastInfo.icon, { className: "w-2.5 h-2.5 flex-shrink-0" })}
                  <span>{isCurrentlyOnAir ? "ON AIR" : broadcastInfo.label}</span>
                </span>

                {/* Conflit */}
                {isConflict && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-sm font-extrabold border animate-pulse",
                    density === 'compact' ? "text-[9px] px-1 py-0.25" : "text-[10px]",
                    "bg-red-600 text-white border-red-400"
                  )}>
                    CONFLIT
                  </span>
                )}
              </div>
            </div>

            {/* Ligne 2 : Titre du programme */}
              <div className="flex-1 min-w-0 min-h-[1rem] my-0.5 overflow-hidden">
              <div className="flex items-start gap-1">
                {ramadanFlags?.isRamadan && (
                  <span className="text-xs flex-shrink-0" title="Programme Ramadan">🌙</span>
                )}
                {ramadanFlags?.isCritical && (
                  <span className="text-xs flex-shrink-0" title="Critique">🔴</span>
                )}
                <h4 
                  className={cn(
                    "line-clamp-2 font-bold leading-snug break-words text-white transition-colors",
                    density === 'compact' ? "text-xs" : (finalRowSpan >= 4 ? "text-sm" : "text-xs"),
                    isCurrentlyOnAir && "text-white font-extrabold",
                    isConflict && "text-red-200"
                  )}
                  style={{
                    wordBreak: 'normal',
                    overflowWrap: 'break-word',
                    hyphens: 'none'
                  }}
                >
                  {program.title}
                </h4>
              </div>
            </div>

            {/* Ligne 3 : Catégorie & Actions rapides au survol */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80 mt-auto">
              <span 
                className={cn(
                  "font-semibold px-1.5 py-0.2 rounded-sm border min-w-0 max-w-[130px] truncate",
                  density === 'compact' ? "text-[9px] px-1 py-0.5" : "text-[10px]"
                )}
                style={{
                  backgroundColor: rgbArrayToCss(categoryColor, 0.22),
                  color: rgbArrayToCss(categoryColor),
                  borderColor: rgbArrayToCss(categoryColor, 0.55),
                }}
              >
                {program.category || "Divers"}
              </span>

              {status !== 'PLANNED' && (
                <span
                  className="shrink truncate text-[9px] font-bold"
                  style={{ color: statusInfo.broadcastColor }}
                  title={`Statut : ${statusInfo.label} — diffusion du ${serviceDate}`}
                  aria-label={`Statut : ${statusInfo.label} — diffusion du ${serviceDate}`}
                >
                  {statusInfo.label}
                </span>
              )}

              {/* Garder les commandes disponibles dans les deux densités, y compris au tactile. */}
              <div className="flex shrink-0 items-center gap-0.5 opacity-100">
                  {canChangeStatus && quickActions?.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleStatusChange(program.id, serviceDate, action.status)
                      }}
                      className="min-h-7 px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                      title={`${action.label} — diffusion du ${serviceDate}`}
                      aria-label={`${action.label} : ${program.title}, diffusion du ${serviceDate}`}
                    >
                      {action.label}
                    </button>
                  ))}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleEdit(program, e)}
                      className={cn("rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors", density === 'compact' ? "p-0.5" : "p-1")}
                      title="Modifier"
                      aria-label={`Modifier ${program.title}`}
                    >
                      <Edit className="w-3 h-3 text-blue-400" />
                    </button>
                  )}
                  {onMoveProgram && (
                    <button
                      type="button"
                      onClick={(e) => handleMoveClick(program.id, e)}
                      className={cn("rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors", density === 'compact' ? "p-0.5" : "p-1")}
                      title="Déplacer"
                      aria-label={`Déplacer ${program.title}`}
                    >
                      <Move className="w-3 h-3 text-purple-400" />
                    </button>
                  )}
                  {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(program.id, e)}
                    className={cn("rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors", density === 'compact' ? "p-0.5" : "p-1")}
                    title="Supprimer"
                    aria-label={`Supprimer ${program.title}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Return du composant principal WeekAgendaModern
  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col animate-fade-in week-agenda-container">
      {/* Barre d'outils de la grille - Sleek Broadcast Console Ribbon */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-1.5 sm:py-2 bg-slate-900/90 border border-slate-800 rounded-lg shadow-sm backdrop-blur-md mb-2">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/60" />
            <span className="font-extrabold text-[10px] sm:text-xs tracking-[0.16em] text-white uppercase font-mono">
              Semaine
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-mono whitespace-nowrap"
            title={startHour === 0 && endHour === 24 ? "Périmètre complet 24h/24 (00:00 → 00:00)" : `Périmètre personnalisé : ${String(startHour).padStart(2, '0')}:00 → ${endHour === 24 ? '00:00' : `${String(endHour).padStart(2, '0')}:00`}`}
          >
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{String(startHour).padStart(2, "0")}:00 → {endHour === 24 ? '00:00' : `${String(endHour).padStart(2, "0")}:00`}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-mono whitespace-nowrap">
            <Radio className="w-3 h-3 text-blue-400" />
            <span>{programs.length} prog.</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-mono whitespace-nowrap">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: csaColor }} />
            <span>Couverture {csaCompletion}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowConflicts(!showConflicts)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all border whitespace-nowrap",
              conflictSet.size > 0
                ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                : showConflicts
                ? "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-slate-900 border-slate-800 text-slate-500 line-through"
            )}
            title="Afficher/masquer les conflits"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Conflits{conflictSet.size > 0 ? ` (${conflictSet.size})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFreeTime(!showFreeTime)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all border whitespace-nowrap",
              showFreeTime
                ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                : "bg-slate-900 border-slate-800 text-slate-500 line-through"
            )}
            title="Afficher/masquer les plages libres"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Libres{totalFreeSlotsCount > 0 ? ` (${totalFreeSlotsCount})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setDensity((d) => (d === 'compact' ? 'detailed' : 'compact'))}
            aria-pressed={density === 'detailed'}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all border whitespace-nowrap",
              density === 'detailed'
                ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/80"
            )}
            title={`Passer en mode ${density === 'compact' ? 'détaillé' : 'compact'}`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{density === 'compact' ? 'Compact' : 'Détail'}</span>
          </button>

          {(canScrollLeft || canScrollRight) ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 text-slate-300 text-[11px] font-medium shadow-sm">
              <button
                type="button"
                onClick={() => gridContainerRef.current?.scrollBy({ left: -columnMinWidth * 1.5, behavior: 'smooth' })}
                disabled={!canScrollLeft}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition-colors"
                title="Défiler vers la gauche"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="hidden md:inline text-slate-300">↔</span>
              <button
                type="button"
                onClick={() => gridContainerRef.current?.scrollBy({ left: columnMinWidth * 1.5, behavior: 'smooth' })}
                disabled={!canScrollRight}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white transition-colors"
                title="Défiler vers la droite"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-md border border-slate-700/60">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.6}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Zoom arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-200 px-1.5 min-w-[2.6rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 1.8}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Zoom avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <button
              ref={optionsButtonRef}
              type="button"
              onClick={() => {
                if (!showOptionsMenu && optionsButtonRef.current) {
                  const rect = optionsButtonRef.current.getBoundingClientRect()
                  setOptionsMenuPosition({
                    top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 176)),
                    right: Math.max(12, window.innerWidth - rect.right),
                  })
                }
                setShowOptionsMenu(!showOptionsMenu)
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap",
                showOptionsMenu
                  ? "bg-slate-700 text-white border-slate-600"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80"
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Options</span>
            </button>

            {showOptionsMenu && createPortal(
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowOptionsMenu(false)}
                />
                <div
                  className="fixed z-50 max-h-[calc(100dvh-1rem)] w-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 py-1 shadow-2xl"
                  style={{
                    top: `${optionsMenuPosition.top}px`,
                    right: `${optionsMenuPosition.right}px`,
                  }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Outils & Exports
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1)
                      setShowOptionsMenu(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors text-left"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Réinitialiser zoom (100%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dataStr = JSON.stringify(programs, null, 2)
                      const dataBlob = new Blob([dataStr], { type: 'application/json' })
                      const url = URL.createObjectURL(dataBlob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `grille-${new Date().toISOString().split('T')[0]}.json`
                      link.click()
                      URL.revokeObjectURL(url)
                      setShowOptionsMenu(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors text-left"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Exporter JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csvHeaders = ['ID', 'Titre', 'Catégorie', 'Jour', 'Heure début', 'Heure fin', 'Durée', 'Statut']
                      const csvRows = programs.map(p => {
                        const days = p.days.join(', ')
                        return [
                          p.id,
                          `"${p.title}"`,
                          p.category,
                          `"${days}"`,
                          p.start,
                          p.end || '',
                          p.duration || '',
                          p.opStatus || ''
                        ].join(',')
                      })
                      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')
                      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(dataBlob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `grille-${new Date().toISOString().split('T')[0]}.csv`
                      link.click()
                      URL.revokeObjectURL(url)
                      setShowOptionsMenu(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Exporter CSV</span>
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Sélecteur de jour rapide & Accès direct Conducteur */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/70 border border-slate-800/80 rounded-md overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            Jour actif :
          </span>
          {weekDays.map(day => {
            const isDaySelected = selectedDay === day
            const isToday = day === weekDays[currentDayIndex] || (currentDayIndex >= 0 && selectedDay === weekDays[currentDayIndex])
            return (
              <button
                key={`nav-chip-${day}`}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  "px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-all border",
                  isDaySelected
                    ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                    : isToday
                    ? "bg-red-500/15 text-red-300 border-red-500/40"
                    : "bg-slate-800/70 text-slate-300 border-slate-700/60 hover:bg-slate-700 hover:text-white"
                )}
                title={isToday ? 'Aujourd’hui' : `Sélectionner ${day}`}
              >
                <span className="flex items-center gap-1.5">
                  {day}
                  {isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" aria-label="Aujourd’hui" />}
                </span>
              </button>
            )
          })}
        </div>

        {onOpenDayView && selectedDay && (
          <button
            type="button"
            onClick={() => onOpenDayView(selectedDay)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all flex-shrink-0 shadow-sm active:scale-95"
            title={`Ouvrir le conducteur détaillé du ${selectedDay}`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Voir conducteur ({selectedDay})</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Conteneur avec en-tête et grille (flex-1 dynamique sans débordement de page) */}
      <div 
        ref={gridContainerRef}
        tabIndex={0}
        onKeyDown={handleContainerKeyDown}
        aria-label="Grille hebdomadaire - Naviguez avec les flèches gauche et droite pour faire défiler"
        className="week-agenda-container flex-1 min-h-0 w-full rounded-lg border border-slate-800 bg-slate-950/90 shadow-xl overflow-auto focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        style={{
          width: '100%',
          maxWidth: '100%',
          position: 'relative',
          isolation: 'isolate'
        }}
      >
        {/* Ligne d'en-tête Sticky des jours - Reste figée lors du défilement vertical */}
        <div 
          className="week-agenda-modern-header grid gap-0 sticky top-0 z-40 border-b border-slate-700/80 bg-slate-950/98"
          style={{
            gridTemplateColumns: `75px repeat(${weekDays.length}, minmax(${columnMinWidth}px, 1fr))`,
            minWidth: `${minGridWidth}px`,
            width: '100%',
          }}
        >
          {/* Angle HEURE (Sticky horizontal gauche ET vertical haut - z-index 50) */}
          <div 
            style={{ 
              position: 'sticky',
              left: 0,
              top: 0,
              zIndex: 50,
              borderRight: '1px solid rgb(51 65 85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            className="flex items-center justify-center p-2 bg-slate-100/98 dark:bg-slate-950/98 border-r border-slate-300 dark:border-slate-700/80"
          >
            <div className="flex flex-col items-center gap-0.5 text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-tight">HEURE</span>
            </div>
          </div>
          
          {/* Colonnes des jours */}
          {weekDays.map((day, index) => {
            const count = programsByDay.get(day)?.length || 0
            const dayMinutes = dayDurations.get(day) || 0
            const isToday = index === currentDayIndex
            const isSelected = selectedDay ? day === selectedDay : isToday
            const isHighlighted = highlightedDay === day
            const ref = isSelected ? selectedDayColumnRef : null
            const dayDate = getDateForDay(day)

            return (
              <button
                type="button"
                key={`header-${day}`}
                ref={ref}
                onClick={() => handleDayClick(day)}
                aria-pressed={isSelected}
                aria-label={`${day} ${dayDate}, ${count} programmes, ${Math.round(dayMinutes / 60)} heures sur 24${isToday ? ', aujourd’hui' : ''}`}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)'
                }}
                className={cn(
                  "flex min-h-[76px] w-full flex-col items-center justify-center gap-1 border-r border-slate-700/80 px-1.5 py-2 text-center transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400",
                  isToday && "border-t-2 border-t-red-500",
                  isSelected && !isToday && "border-t-2 border-t-blue-500",
                  isSelected && "bg-slate-800/90",
                  !isSelected && "hover:bg-slate-800/60",
                  isHighlighted && "ring-1 ring-inset ring-blue-400/50"
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className={cn(
                    "font-semibold text-xs capitalize tracking-wide",
                    isToday ? "text-red-400 font-black" : isSelected ? "text-blue-400 font-black" : "text-slate-100 font-bold"
                  )}>
                    {day}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-slate-400">
                    {dayDate}
                  </span>
                  {isToday && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                  )}
                </div>

                <div className="flex flex-col items-center gap-0.5 text-[10px] leading-tight text-slate-400">
                  <span><span className="font-semibold text-slate-200">{count}</span> programmes</span>
                  <span className="font-mono text-slate-300">{Math.round(dayMinutes / 60)} h / 24 h</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Grille unifiée avec colonnes et créneaux */}
        <div
          className="grid gap-0 week-agenda__timeline-grid"
          style={{
            gridTemplateColumns: `75px repeat(${weekDays.length}, minmax(${columnMinWidth}px, 1fr))`,
            gridTemplateRows: `repeat(${slotCount}, ${Math.round(38 * zoomLevel)}px)`,
            width: '100%',
            minWidth: `${minGridWidth}px`,
            paddingBottom: '1rem',
            position: 'relative'
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.absolute') === null && !isHighlightLocked) {
              setHighlightedDay(null)
              setHighlightedTimeRange(null)
            }
          }}
        >
          {/* Timeline horaire - Heures pleines et demi-heures uniquement */}
          {slots.map((min, slotIndex) => {
            const hour = Math.floor(min / 60)
            const minutes = min % 60
            const isFullHour = minutes === 0
            const isHalfHour = minutes === 30
            const isQuarterHour = minutes === 15 || minutes === 45
            // Afficher uniquement les heures pleines et demi-heures
            const showLabel = isFullHour || isHalfHour
            const gridRow = slotIndex + 1 // Commence à la ligne 1
              
              // Vérifier si cette heure est dans la plage surlignée
              const isHighlighted = highlightedTimeRange && 
                min >= highlightedTimeRange.start && 
                min < highlightedTimeRange.end

              return (
                <React.Fragment key={min}>
                  <div
                    className={cn(
                      "sticky left-0 flex items-center justify-center pr-2 pl-2 font-mono font-bold border-r-2 transition-all duration-200",
                      "bg-slate-50/98 dark:bg-slate-950/98 backdrop-blur-md",
                      isHighlighted
                        ? "bg-blue-100 dark:bg-blue-900/90 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100 h-full shadow-lg ring-2 ring-blue-400/50 dark:ring-blue-500/50 backdrop-blur-sm scale-[1.02]"
                        : isFullHour 
                        ? "border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white h-full shadow-sm" 
                        : isHalfHour
                        ? "border-slate-300 dark:border-slate-700/80 border-dashed"
                        : "border-transparent"
                    )}
                    style={{ 
                      gridColumn: 1,
                      gridRow: gridRow,
                      position: 'sticky',
                      left: 0,
                      zIndex: 35, // Z-index supérieur aux cartes pour ne jamais être recouvert lors du scroll horizontal
                    }}
                  >
                    {showLabel && (
                      <span className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                        isFullHour && "bg-white/90 dark:bg-slate-800/90 shadow-md",
                        isHighlighted && "bg-blue-200/80 dark:bg-blue-800/80 shadow-lg"
                      )}>
                        {isFullHour && (
                          <Clock className={cn(
                            "w-4 h-4 transition-colors",
                            isHighlighted 
                              ? "text-blue-700 dark:text-blue-200" 
                              : "text-slate-700 dark:text-slate-200"
                          )} />
                        )}
                        <span className={cn(
                          "font-bold transition-colors",
                          isHighlighted
                            ? "text-blue-900 dark:text-blue-50 text-sm font-extrabold"
                            : isFullHour 
                            ? "text-slate-900 dark:text-slate-50 text-sm font-extrabold" 
                            : isHalfHour
                            ? "text-slate-700 dark:text-slate-300 text-sm font-semibold"
                            : "text-slate-600 dark:text-slate-400 text-xs"
                        )}>
                          {hour.toString().padStart(2, "0")}:{String(minutes).padStart(2, "0")}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Cellules pour chaque jour */}
                  {weekDays.map((day, dayIndex) => {
                    const isToday = dayIndex === currentDayIndex
                    const isSelected = selectedDay ? day === selectedDay : isToday
                    const isCurrentTimeSlot = currentTimeRow !== null && 
                      slotIndex === currentTimeRow && 
                      isToday
                    const is15MinInterval = minutes % 15 === 0
                    // Vérifier si cette cellule doit être surlignée
                    const isCellHighlighted = highlightedDay === day && 
                      highlightedTimeRange && 
                      min >= highlightedTimeRange.start && 
                      min < highlightedTimeRange.end

                    return (
                      <div
                        key={`${day}-${min}`}
                        className={cn(
                          "week-agenda__slot-cell relative transition-all duration-200",
                          // Garder seulement les indicateurs visuels essentiels, pas les cages
                          isCellHighlighted && "bg-gradient-to-br from-blue-100/80 via-blue-50/60 to-blue-100/80 dark:from-blue-900/60 dark:via-blue-800/50 dark:to-blue-900/60 border-blue-300 dark:border-blue-600 border-b-2 ring-2 ring-blue-400/50 dark:ring-blue-500/50 shadow-md",
                          isCurrentTimeSlot && !isCellHighlighted && "border-l border-blue-400/30 dark:border-blue-500/20"
                        )}
                        style={{
                          gridColumn: dayIndex + 2,
                          gridRow: gridRow,
                          backgroundColor: 'transparent',
                          border: 'none',
                        }}
                      >
                        {/* Indicateur de l'heure actuelle - discrètement intégré dans la bordure */}
                      </div>
                    )
                  })}
                  
                  {/* Séparateurs horaires - Ligne épaisse pour heures pleines, fine pour demi-heures */}
                  {isFullHour && (
                    <div
                      style={{
                        gridColumn: `1 / ${weekDays.length + 2}`, // S'étend sur toutes les colonnes
                        gridRow: gridRow,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        backgroundColor: '#475569', // slate-600 (plus foncé, moins visible)
                        opacity: 0.4, // Réduire l'opacité pour moins gêner
                        zIndex: 15,
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                  {isHalfHour && (
                    <div
                      style={{
                        gridColumn: `1 / ${weekDays.length + 2}`, // S'étend sur toutes les colonnes
                        gridRow: gridRow,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        backgroundColor: '#64748B', // slate-500
                        opacity: 0.3, // Réduire l'opacité pour moins gêner
                        zIndex: 14,
                        pointerEvents: 'none',
                        borderStyle: 'dashed',
                        borderWidth: '0 0 1px 0'
                      }}
                    />
                  )}
                </React.Fragment>
              )
            })}

            {/* Ligne "MAINTENANT" - Rouge, uniquement sur le programme en cours */}
            {(() => {
              // Trouver le programme actuellement ON AIR
              const onAirProgram = occurrences.find(({ program, day }) => {
                const dayIndex = weekDays.indexOf(day)
                if (dayIndex === -1) return false
                
                const isToday = dayIndex === currentDayIndex
                if (!isToday) return false
                
                const startMin = toMinutes(program.start || "00:00")
                const computedEnd = program.end ? toMinutes(program.end) : startMin + (program.duration || 60)
                const endMin = Math.max(startMin, computedEnd)
                
                const status = program.opStatus ?? "PLANNED"
                // Le repère « Maintenant » ne concerne que le programme réellement en cours.
                const isOnAir = status === "ON_AIR"
                
                return isOnAir && currentTime >= startMin && currentTime < endMin
              })
              
              if (!onAirProgram || currentTimeRow === null) return null
              
              const { program, day } = onAirProgram
              const dayIndex = weekDays.indexOf(day)
              if (dayIndex === -1) return null

              // Reprendre la largeur de la carte (notamment en cas de chevauchement),
              // afin que le repère ne déborde pas sur les colonnes voisines.
              const onAirPosition = programPositions.get(`${program.id}-${day}`)
              const markerHorizontalStyle = onAirPosition && onAirPosition.total > 1
                ? {
                    left: `${onAirPosition.left}%`,
                    width: `${onAirPosition.width}%`,
                    marginLeft: onAirPosition.index === 0 ? '8px' : '2px',
                    marginRight: onAirPosition.index === onAirPosition.total - 1 ? '8px' : '2px',
                    boxSizing: 'border-box' as const,
                  }
                : {
                    left: '8px',
                    right: '8px',
                    width: 'auto',
                    boxSizing: 'border-box' as const,
                  }
              
              // Calculer la position du programme
              const startMin = toMinutes(program.start || "00:00")
              const gridStartMin = startHour * 60
              const relativeStart = Math.max(startMin, gridStartMin) - gridStartMin
              const rowStart = Math.floor(relativeStart / SLOT_MINUTES)
              
              return (
                <div
                  style={{
                    gridColumn: dayIndex + 2, // Colonne du jour du programme ON AIR
                    gridRow: currentTimeRow + 1, // Ligne de l'heure actuelle
                    position: 'absolute',
                    top: 0,
                    ...markerHorizontalStyle,
                    height: '3px',
                    backgroundColor: '#EF4444', // red-500
                    zIndex: 26, // Au-dessus des séparateurs mais en dessous des programmes
                    pointerEvents: 'none',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6), 0 0 4px rgba(239, 68, 68, 0.4)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                  className="animate-pulse"
                >
                  {/* Label "MAINTENANT" */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '4px',
                      top: '4px',
                      backgroundColor: '#EF4444',
                      color: 'white',
                      padding: '2px 8px',
                      maxWidth: 'calc(100% - 8px)',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    MAINTENANT
                  </div>
                </div>
              )
            })()}

            {/* Plages libres (Trous d'antenne) */}
            {showFreeTime && weekDays.flatMap((day, dayIndex) => {
              const freeSlots = freeSlotsByDay.get(day) || []
              return freeSlots.map((slot, sIdx) => (
                <FreeSlotCard
                  key={`free-slot-${day}-${slot.startMin}-${sIdx}`}
                  slot={slot}
                  day={day}
                  dayIndex={dayIndex}
                />
              ))
            })}

            {/* Programmes */}
            {occurrences.map(({ program, day }, index) => {
              // Créer une clé unique en combinant l'ID du programme, le jour, l'heure de début et l'index
              // L'index garantit l'unicité même si le même programme apparaît plusieurs fois
              const uniqueKey = `program-${program.id}-${day}-${program.start || '00:00'}-${index}`
              return (
                <ProgramCard
                  key={uniqueKey}
                  program={program}
                  day={day}
                  isFocused={focusedProgram === `${program.id}-${day}`}
                />
              )
            })}
          </div>
        </div>

      {/* Modal de confirmation de suppression */}
      {programToDelete && (
        <Modal
          isOpen={!!programToDelete}
          onClose={handleCancelDelete}
          title="Confirmer la suppression"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-slate-700 dark:text-slate-300">
              Êtes-vous sûr de vouloir supprimer ce programme ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={handleCancelDelete}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de déplacement de programme */}
      {showMoveMenu && onMoveProgram && (() => {
        const programToMove = programs.find(p => p.id === showMoveMenu)
        if (!programToMove) return null
        
        return (
          <Modal
            key={showMoveMenu}
            isOpen={!!showMoveMenu}
            onClose={handleMoveCancel}
            title="Déplacer le programme"
            size="md"
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Programme : <span className="text-slate-900 dark:text-slate-100">{programToMove.title}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Actuellement : {programToMove.days.join(', ')} à {programToMove.start}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Nouveau jour
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {weekDays.map((day) => (
                      <button
                        key={day}
                        onClick={() => setMoveTargetDay(day)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                          moveTargetDay === day
                            ? "bg-amber-500 text-black shadow-lg scale-105"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Nouvelle heure (optionnel)
                  </label>
                  <select
                    value={moveTargetTime || programToMove.start}
                    onChange={(e) => setMoveTargetTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  >
                    {availableHours.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={handleMoveCancel}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleMoveConfirm(showMoveMenu)}
                  disabled={!moveTargetDay}
                  leftIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Déplacer
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}

      <ProgramDetailsModal
        program={programDetails?.program || null}
        day={programDetails?.day}
        onClose={() => setProgramDetails(null)}
        onEdit={programDetails && onEdit ? () => {
          const program = programDetails.program
          setProgramDetails(null)
          onEdit(program)
        } : undefined}
      />
    </div>
  )
}

export default WeekAgendaModern
