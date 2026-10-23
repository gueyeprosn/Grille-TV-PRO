import React, { useEffect, useState } from 'react'
import { Button, Badge, Modal } from './ui'
import { Calendar, Copy, Archive, Eye, Plus, FileText, Edit, Trash2, MoreVertical, Loader2, Star, Sparkles, Moon } from 'lucide-react'
import { cn } from '../lib/utils'
import apiClient from '../lib/api'
import { getApiBaseURL } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import AiGridTemplateModal from './AiGridTemplateModal'

interface Grid {
  id: string
  name: string
  type: 'weekly' | 'special' | 'ramadan'
  startDate: string
  endDate: string
  status: 'draft' | 'published' | 'archived'
  version: number
  createdAt: string
  isDefault?: boolean | string
}

interface GridSelectorProps {
  onSelectGrid: (gridId: string) => void
  onCreateGrid?: () => void
}

interface RamadanTemplate {
  id: string
  name: string
  type: 'WEEK' | 'FRIDAY' | 'WEEKEND' | 'COMMERCIAL' | 'FALLBACK'
  description: string
  programsCount: number
}

const GridSelector: React.FC<GridSelectorProps> = ({ onSelectGrid, onCreateGrid }) => {
  const { user } = useAuth()
  const canManageGrids = user?.role === 'ADMIN' || user?.role === 'PROGRAMMER'
  const [grids, setGrids] = useState<Grid[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [editingGrid, setEditingGrid] = useState<Grid | null>(null)
  const [deletingGrid, setDeletingGrid] = useState<Grid | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showRamadanTemplates, setShowRamadanTemplates] = useState(false)
  const [showAiTemplate, setShowAiTemplate] = useState(false)
  const [ramadanTemplates, setRamadanTemplates] = useState<RamadanTemplate[]>([])
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null)
  const gridsRetryTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'weekly' as 'weekly' | 'special' | 'ramadan',
    startDate: '',
    endDate: '',
  })
  const [templateForm, setTemplateForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    templateType: 'WEEK' as 'WEEK' | 'FRIDAY' | 'WEEKEND' | 'COMMERCIAL' | 'FALLBACK',
    applyToWeek: false,
    overwriteExisting: false,
  })

  useEffect(() => {
    loadGrids()
    if (showRamadanTemplates) {
      loadRamadanTemplates()
    }
    
    // Cleanup: annuler le timeout si le composant se démonte
    return () => {
      if (gridsRetryTimeoutRef.current) {
        clearTimeout(gridsRetryTimeoutRef.current)
        gridsRetryTimeoutRef.current = null
      }
    }
  }, [showRamadanTemplates])

  const loadRamadanTemplates = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token d\'authentification manquant')
      }
      
      const response = await fetch(`${getApiBaseURL()}/v3/ramadan/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des templates')
      }

      const data = await response.json()
      setRamadanTemplates(data)
    } catch (error: any) {
      console.error('Erreur chargement templates:', error)
      toast.error('Erreur lors du chargement des templates')
    }
  }

  const handleCreateFromTemplate = async () => {
    if (!templateForm.name || !templateForm.startDate || !templateForm.endDate) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    if (!user) {
      toast.error('Vous devez être connecté')
      return
    }

    setCreatingFromTemplate(templateForm.templateType)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Token d\'authentification manquant')
        return
      }
      
      // 1. Créer la grille
      const gridResponse = await fetch(`${getApiBaseURL()}/v3/grids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: templateForm.name,
          type: 'RAMADAN',
          startDate: new Date(templateForm.startDate).toISOString(),
          endDate: new Date(templateForm.endDate).toISOString(),
          status: 'DRAFT',
        }),
      })

      if (!gridResponse.ok) {
        const error = await gridResponse.json()
        throw new Error(error.error || 'Erreur lors de la création de la grille')
      }

      const newGrid = await gridResponse.json()

      // 2. Appliquer le template
      const templateResponse = await fetch(`${getApiBaseURL()}/v3/ramadan/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          gridId: newGrid.id,
          templateType: templateForm.templateType,
          startDate: templateForm.startDate,
          endDate: templateForm.endDate,
          overwriteExisting: templateForm.overwriteExisting,
          applyToWeek: templateForm.applyToWeek,
        }),
      })

      if (!templateResponse.ok) {
        const error = await templateResponse.json()
        throw new Error(error.error || 'Erreur lors de l\'application du template')
      }

      const result = await templateResponse.json()

      toast.success(
        `Grille "${templateForm.name}" créée avec ${result.programsCreated || result.summary?.totalProgramsCreated || 0} programme(s) !`
      )

      // Réinitialiser le formulaire
      setTemplateForm({
        name: '',
        startDate: '',
        endDate: '',
        templateType: 'WEEK',
        applyToWeek: false,
        overwriteExisting: false,
      })
      setShowRamadanTemplates(false)

      // Recharger les grilles et sélectionner la nouvelle
      await loadGrids()
      setTimeout(() => {
        onSelectGrid(newGrid.id)
      }, 500)
    } catch (error: any) {
      console.error('Erreur création depuis template:', error)
      toast.error(error.message || 'Erreur lors de la création de la grille')
    } finally {
      setCreatingFromTemplate(null)
    }
  }

  const loadGrids = async () => {
    // Vérifier qu'un token existe avant de charger les grilles
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('⚠️ Aucun token disponible, arrêt du chargement des grilles')
      setLoading(false)
      return
    }

    try {
      // Utiliser apiClient qui gère automatiquement le bon baseURL
      const response = await apiClient.get('/v3/grids', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000, // 30 secondes
      })
      // Log seulement si les données changent vraiment (éviter les logs répétitifs)
      const hasChanged = grids.length !== response.data.length || 
        grids.some((g, i) => !response.data[i] || g.id !== response.data[i].id)
      
      if (hasChanged || grids.length === 0) {
        console.log('📋 Grilles chargées:', response.data.length, 'grille(s)')
        const defaultGrids = response.data.filter((g: Grid) => {
          // Normaliser isDefault : peut être boolean, string 'true', ou undefined
          const isDefault = g.isDefault === true || (typeof g.isDefault === 'string' && g.isDefault.toLowerCase() === 'true')
          return isDefault
        })
        if (defaultGrids.length > 0) {
          console.log('⭐ Grilles par défaut:', defaultGrids.map((g: Grid) => g.name))
        }
      }
      setGrids(response.data)
    } catch (error: any) {
      // Ignorer les erreurs d'annulation de requête (ECONNABORTED)
      if (error.code === 'ECONNABORTED' || error.message === 'Request aborted' || error.name === 'CanceledError') {
        console.log('Requête annulée (normal si navigation rapide)')
        return
      }
      // Gestion spéciale pour les erreurs 401 (non authentifié)
      if (error.response?.status === 401) {
        console.log('⚠️ Token invalide ou expiré, arrêt du chargement des grilles')
        // Nettoyer le token invalide
        localStorage.removeItem('token')
        localStorage.removeItem('localUser')
        setLoading(false)
        return
      }
      // Gestion spéciale pour les erreurs 429
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after']
        const delaySeconds = retryAfter ? parseInt(retryAfter, 10) : 5
        
        // Ne pas retry si le délai est trop long (> 60 secondes)
        if (delaySeconds > 60) {
          console.log(`⏳ Rate limit atteint, délai trop long (${delaySeconds}s). Pas de retry automatique.`)
          setLoading(false)
          return
        }
        
        console.log(`⏳ Rate limit atteint, réessai dans ${delaySeconds} secondes...`)
        
        // Annuler le timeout précédent s'il existe
        if (gridsRetryTimeoutRef.current) {
          clearTimeout(gridsRetryTimeoutRef.current)
        }
        
        // Retry après le délai
        gridsRetryTimeoutRef.current = setTimeout(() => {
          gridsRetryTimeoutRef.current = null
          loadGrids()
        }, delaySeconds * 1000)
        return
      }
      console.error('Erreur chargement grilles:', error)
      console.error('Détails:', error.response?.data || error.message || error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (gridId: string) => {
    try {
      const response = await apiClient.post(`/v3/grids/${gridId}/publish`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      console.log('✅ Grille publiée:', response.data)
      
      // Afficher un message de succès
      toast.success('Grille publiée avec succès !')
      
      // Attendre un peu pour laisser le backend mettre à jour
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Recharger les grilles
      await loadGrids()
      
      // Si on est dans le filtre "published", forcer un re-render
      if (filter === 'published') {
        // Forcer un re-render en changeant temporairement le filtre
        setFilter('all')
        setTimeout(() => {
          setFilter('published')
        }, 200)
      } else {
        // Si on n'est pas dans le filtre published, basculer automatiquement
        setFilter('published')
      }
    } catch (error: any) {
      console.error('Erreur publication:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la publication de la grille')
    }
  }

  const handleArchive = async (gridId: string) => {
    try {
      await apiClient.post(`/v3/grids/${gridId}/archive`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      loadGrids()
    } catch (error) {
      console.error('Erreur archivage:', error)
    }
  }

  const handleDuplicate = async (grid: Grid) => {
    try {
      const { id, ...newGrid } = grid
      const gridToCreate = {
        ...newGrid,
        name: `${grid.name} (copie)`,
        status: 'draft' as const,
        version: 1,
      }
      await apiClient.post('/v3/grids', gridToCreate, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      toast.success('Grille dupliquée avec succès')
      loadGrids()
    } catch (error: any) {
      console.error('Erreur duplication:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la duplication')
    }
  }

  const handleEdit = (grid: Grid) => {
    setEditingGrid(grid)
    setEditForm({
      name: grid.name,
      type: grid.type,
      startDate: grid.startDate.split('T')[0], // Extraire la date sans l'heure
      endDate: grid.endDate.split('T')[0],
    })
  }

  const handleUpdate = async () => {
    if (!editingGrid) return

    try {
      // Convertir le type pour l'API (backend attend WEEKLY, DAILY, SPECIAL, RAMADAN)
      const typeMap: Record<string, string> = {
        weekly: 'WEEKLY',
        special: 'SPECIAL',
        ramadan: 'RAMADAN',
      }
      
      const updateData = {
        name: editForm.name,
        type: typeMap[editForm.type] || 'WEEKLY',
        startDate: editForm.startDate,
        endDate: editForm.endDate,
      }

      await apiClient.put(`/v3/grids/${editingGrid.id}`, updateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      
      toast.success('Grille modifiée avec succès')
      setEditingGrid(null)
      loadGrids()
    } catch (error: any) {
      console.error('Erreur modification:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erreur lors de la modification'
      toast.error(errorMessage)
    }
  }

  const handleSetDefault = async (gridId: string) => {
    try {
      console.log('⭐ Définition grille par défaut:', gridId)
      const response = await apiClient.post(`/v3/grids/${gridId}/set-default`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      console.log('✅ Grille définie comme par défaut:', response.data)
      toast.success('Grille définie comme par défaut')
      await loadGrids()
    } catch (error: any) {
      console.error('❌ Erreur définition par défaut:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erreur lors de la définition'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async () => {
    if (!deletingGrid) return

    try {
      await apiClient.delete(`/v3/grids/${deletingGrid.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      
      toast.success('Grille supprimée avec succès')
      setDeletingGrid(null)
      loadGrids()
    } catch (error: any) {
      console.error('Erreur suppression:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erreur lors de la suppression'
      toast.error(errorMessage)
    }
  }

  const filteredGrids = React.useMemo(() => {
    const filtered = grids.filter((g) => {
      if (filter === 'all') return true
      // Normaliser le statut (backend peut retourner PUBLISHED, DRAFT, ARCHIVED en majuscules)
      const normalizedStatus = (g.status || '').toLowerCase()
      const normalizedFilter = filter.toLowerCase()
      return normalizedStatus === normalizedFilter
    })
    // Log seulement si le résultat change vraiment (éviter les logs répétitifs)
    if (filtered.length > 0 || filter === 'all') {
      console.log(`🔍 Filtre "${filter}": ${filtered.length} grille(s) trouvée(s)`, filtered.map(g => ({ name: g.name, status: g.status })))
    }
    return filtered
  }, [grids, filter])

  const getStatusBadge = (status: string) => {
    // Normaliser le statut (backend peut retourner PUBLISHED, DRAFT, ARCHIVED en majuscules)
    const normalizedStatus = (status || '').toLowerCase()
    const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
      draft: {
        label: 'Brouillon',
        color: '#94A3B8',
        bgColor: 'rgba(148, 163, 184, 0.15)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
      },
      published: {
        label: 'Publiée',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.4)',
      },
      archived: {
        label: 'Archivée',
        color: '#64748B',
        bgColor: 'rgba(100, 116, 139, 0.15)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
      },
    }
    
    const config = statusConfig[normalizedStatus] || statusConfig.draft
    
    return (
      <Badge
        variant="default"
        size="sm"
        className="font-semibold"
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
          borderColor: config.borderColor,
          borderWidth: '1px',
        }}
      >
        {config.label}
      </Badge>
    )
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      weekly: 'Semaine',
      special: 'Spéciale',
      ramadan: 'Ramadan',
    }
    return labels[type as keyof typeof labels] || type
  }

  if (loading) {
    return <div className="text-center py-12">Chargement des grilles...</div>
  }

  const filterOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'draft', label: 'Brouillons' },
    { value: 'published', label: 'Publiées' },
    { value: 'archived', label: 'Archivées' },
  ] as const

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" style={{ background: 'var(--card-bg-solid)', borderColor: 'var(--card-border)' }}>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <h2 className="text-xl font-bold text-primary sm:text-2xl">Grilles de programmes</h2>
          </div>
          <p className="text-sm text-secondary">Gérez vos grilles hebdomadaires, spéciales et vos modèles</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onCreateGrid && <Button variant="primary" onClick={onCreateGrid} leftIcon={<Plus className="h-5 w-5" />} size="md">Nouvelle grille</Button>}
          <Button variant="outline" onClick={() => setShowAiTemplate(true)} leftIcon={<Sparkles className="h-5 w-5" />} size="md">Créer avec l’IA</Button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les grilles par statut">
        {filterOptions.map(({ value, label }) => {
          const count = value === 'all' ? grids.length : grids.filter((grid) => (grid.status || '').toLowerCase() === value).length
          return (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
              className={cn('min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', filter === value ? 'border-amber-500/60 bg-amber-500/15 text-amber-300' : 'border-[var(--card-border)] bg-[var(--card-bg-solid)] text-secondary hover:text-primary')}>
              {label}<span className="ml-2 text-xs opacity-75">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid-selector-list">
        {filteredGrids.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--card-border)] px-5 py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-secondary" aria-hidden="true" />
            <p className="mb-1 font-semibold text-primary">Aucune grille {filter !== 'all' && `(${filter})`}</p>
            <p className="text-sm text-secondary">Créez votre première grille pour commencer.</p>
          </div>
        ) : filteredGrids.map((grid) => {
          const isDefault = grid.isDefault === true || String(grid.isDefault) === 'true'
          const normalizedStatus = (grid.status || '').toLowerCase()
          const isPublished = normalizedStatus === 'published'
          return (
            <article key={grid.id} className="relative flex min-w-0 flex-col rounded-xl border transition-shadow hover:shadow-lg" style={{ background: 'var(--card-bg-solid)', borderColor: isDefault ? 'rgba(245, 158, 11, 0.55)' : 'var(--card-border)' }}>
              {isDefault && <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-amber-400" />}
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="mb-4">
                  {isDefault && <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-300"><Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />Par défaut</div>}
                  <h3 className="mb-3 break-words text-lg font-semibold leading-snug text-primary">{grid.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(grid.status)}
                    <Badge variant="info" size="sm" className="font-semibold" style={{ backgroundColor: grid.type === 'ramadan' ? 'rgba(139, 92, 246, 0.2)' : grid.type === 'special' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: grid.type === 'ramadan' ? '#A78BFA' : grid.type === 'special' ? '#60A5FA' : '#94A3B8' }}>{getTypeLabel(grid.type)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Calendar className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="font-medium text-primary">{new Date(grid.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs">au {new Date(grid.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--card-border)] pt-3 text-xs text-secondary">
                  <span className="font-medium">Version {grid.version}</span>
                  <span>Créée le {new Date(grid.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="mt-auto flex items-center gap-2 border-t border-[var(--card-border)] pt-4 mt-5">
                  <Button variant="primary" size="sm" onClick={() => onSelectGrid(grid.id)} leftIcon={<Eye className="h-4 w-4" aria-hidden="true" />} className="flex-1 font-semibold">Ouvrir la grille</Button>
                  {canManageGrids && <div className="relative">
                    <button type="button" aria-label={`Autres actions pour ${grid.name}`} aria-expanded={menuOpen === grid.id}
                      onClick={() => setMenuOpen(menuOpen === grid.id ? null : grid.id)} onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(null) }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--card-border)] text-secondary transition-colors hover:bg-white/5 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
                      <MoreVertical className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {menuOpen === grid.id && <div role="group" aria-label={`Actions pour ${grid.name}`} className="absolute bottom-12 right-0 z-20 min-w-48 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-solid)] p-1 shadow-xl">
                      <button type="button" onClick={() => { handleSetDefault(grid.id); setMenuOpen(null) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-primary hover:bg-white/5"><Star className="h-4 w-4 text-amber-400" aria-hidden="true" />{isDefault ? 'Grille par défaut' : 'Définir par défaut'}</button>
                      <button type="button" onClick={() => { handleEdit(grid); setMenuOpen(null) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-primary hover:bg-white/5"><Edit className="h-4 w-4" aria-hidden="true" />Modifier</button>
                      <button type="button" onClick={() => { handleDuplicate(grid); setMenuOpen(null) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-primary hover:bg-white/5"><Copy className="h-4 w-4" aria-hidden="true" />Dupliquer</button>
                      {normalizedStatus !== 'archived' && <button type="button" onClick={() => { handlePublish(grid.id); setMenuOpen(null) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-primary hover:bg-white/5"><FileText className="h-4 w-4" aria-hidden="true" />{isPublished ? 'Republier' : 'Publier'}</button>}
                      {normalizedStatus !== 'archived' && <button type="button" onClick={() => { handleArchive(grid.id); setMenuOpen(null) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-primary hover:bg-white/5"><Archive className="h-4 w-4" aria-hidden="true" />Archiver</button>}
                      <button type="button" onClick={() => { setDeletingGrid(grid); setMenuOpen(null) }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" aria-hidden="true" />Supprimer</button>
                    </div>}
                  </div>}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Modale de modification */}
      <Modal
        isOpen={!!editingGrid}
        onClose={() => setEditingGrid(null)}
        title="Modifier la grille"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Nom de la grille
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-surface text-primary"
              placeholder="Nom de la grille"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Type
            </label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'weekly' | 'special' | 'ramadan' })}
              className="w-full px-3 py-2 rounded-lg border bg-surface text-primary"
            >
              <option value="weekly">Semaine</option>
              <option value="special">Spéciale</option>
              <option value="ramadan">Ramadan</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Date de début
              </label>
              <input
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-surface text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Date de fin
              </label>
              <input
                type="date"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-surface text-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setEditingGrid(null)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modale Templates */}
      <Modal
        isOpen={showRamadanTemplates}
        onClose={() => {
          setShowRamadanTemplates(false)
          setTemplateForm({
            name: '',
            startDate: '',
            endDate: '',
            templateType: 'WEEK',
            applyToWeek: false,
            overwriteExisting: false,
          })
        }}
        title="🌙 Créer une grille depuis un template"
        size="lg"
      >
        <div className="space-y-6">
          {/* Informations de la grille */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Nom de la grille *
              </label>
              <input
                type="text"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border bg-surface text-primary"
                placeholder="Ex: Grille Ramadan Semaine 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Date de début *
                </label>
                <input
                  type="date"
                  value={templateForm.startDate}
                  onChange={(e) => setTemplateForm({ ...templateForm, startDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border bg-surface text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Date de fin *
                </label>
                <input
                  type="date"
                  value={templateForm.endDate}
                  onChange={(e) => setTemplateForm({ ...templateForm, endDate: e.target.value })}
                  min={templateForm.startDate}
                  className="w-full px-4 py-2 rounded-lg border bg-surface text-primary"
                />
              </div>
            </div>
          </div>

          {/* Sélection du template */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Template à appliquer *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ramadanTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setTemplateForm({ ...templateForm, templateType: template.type })}
                  className={cn(
                    "border-2 rounded-lg p-4 cursor-pointer transition-all",
                    templateForm.templateType === template.type
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-200 hover:border-purple-300"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {template.type === 'WEEK' && '📅'}
                      {template.type === 'FRIDAY' && '🕌'}
                      {template.type === 'WEEKEND' && '🎉'}
                      {template.type === 'COMMERCIAL' && '💰'}
                      {template.type === 'FALLBACK' && '⚠️'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm mb-1">{template.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                      <div className="text-xs text-gray-500">
                        📺 {template.programsCount} programmes
                      </div>
                    </div>
                    {templateForm.templateType === template.type && (
                      <div className="text-purple-600">✓</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4">
            {templateForm.templateType === 'WEEK' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="applyWeek"
                  checked={templateForm.applyToWeek}
                  onChange={(e) => setTemplateForm({ ...templateForm, applyToWeek: e.target.checked })}
                  className="w-4 h-4 text-purple-600"
                />
                <label htmlFor="applyWeek" className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Appliquer tous les templates de la semaine (Semaine + Vendredi + Week-end)
                </label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overwrite"
                checked={templateForm.overwriteExisting}
                onChange={(e) => setTemplateForm({ ...templateForm, overwriteExisting: e.target.checked })}
                className="w-4 h-4 text-purple-600"
              />
              <label htmlFor="overwrite" className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Remplacer les programmes existants (si la grille existe déjà)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button
              variant="outline"
              onClick={() => {
                setShowRamadanTemplates(false)
                setTemplateForm({
                  name: '',
                  startDate: '',
                  endDate: '',
                  templateType: 'WEEK',
                  applyToWeek: false,
                  overwriteExisting: false,
                })
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateFromTemplate}
              disabled={!templateForm.name || !templateForm.startDate || !templateForm.endDate || !!creatingFromTemplate}
              className="bg-purple-600 hover:bg-purple-700"
              leftIcon={creatingFromTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon className="w-4 h-4" />}
            >
              {creatingFromTemplate ? 'Création...' : 'Créer la grille'}
            </Button>
          </div>
        </div>
      </Modal>

      <AiGridTemplateModal
        isOpen={showAiTemplate}
        onClose={() => setShowAiTemplate(false)}
        onCreated={(gridId) => {
          setShowAiTemplate(false)
          void loadGrids()
          onSelectGrid(gridId)
        }}
      />

      {/* Modale de suppression */}
      <Modal
        isOpen={!!deletingGrid}
        onClose={() => setDeletingGrid(null)}
        title="Supprimer la grille"
      >
        <div className="space-y-4">
          <p style={{ color: 'var(--text-secondary)' }}>
            Êtes-vous sûr de vouloir supprimer la grille <strong>{deletingGrid?.name}</strong> ?
          </p>
          <p className="text-sm text-red-500">
            ⚠️ Cette action est irréversible. Tous les programmes associés seront également supprimés.
          </p>
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingGrid(null)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default GridSelector

