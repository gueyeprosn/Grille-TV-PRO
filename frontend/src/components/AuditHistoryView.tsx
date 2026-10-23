/**
 * AuditHistoryView - Interface de consultation de l'historique des modifications
 * 
 * Affiche :
 * - Liste des modifications avec filtres (par programme, utilisateur, date)
 * - Détails : qui, quand, quel champ, ancienne valeur, nouvelle valeur
 * - Export PDF de l'historique
 */

import React, { useEffect, useState, useMemo } from 'react'
import { Card, Button, Badge } from './ui'
import { Clock, User, FileText, Filter, Download, Search, Calendar, X } from 'lucide-react'
import apiClient from '../lib/api'
import { cn } from '../lib/utils'

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  userId?: string
  before?: any
  after?: any
  changes?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
  user?: {
    id: string
    email: string
    displayName?: string
    role: string
  }
}

interface AuditHistoryViewProps {
  currentGridId?: string
  programs?: Array<{ id: string; title: string }>
}

const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({ currentGridId, programs = [] }) => {
  const [categoryFilter, setCategoryFilter] = useState<'business' | 'auth' | 'all'>('business')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    entityType: '',
    entityId: '',
    userId: '',
    action: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  // Charger les logs d'audit
  const loadAuditLogs = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.entityType) params.append('entityType', filters.entityType)
      if (filters.entityId) params.append('entityId', filters.entityId)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.action) params.append('action', filters.action)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      params.append('limit', '300')

      const response = await apiClient.get(`/v3/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLogs(response.data || [])
    } catch (error: any) {
      console.error('Erreur chargement audit:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [filters])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression',
      'PUBLISH': 'Publication',
      'ARCHIVE': 'Archivage',
      'STATUS_CHANGE': 'Changement de statut',
      'LOGIN': 'Connexion',
      'LOGOUT': 'Déconnexion'
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'CREATE': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-semibold',
      'UPDATE': 'bg-blue-500/20 text-blue-300 border-blue-500/60 font-semibold',
      'DELETE': 'bg-red-500/20 text-red-300 border-red-500/60 font-semibold',
      'PUBLISH': 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-semibold',
      'ARCHIVE': 'bg-slate-700/60 text-slate-300 border-slate-600 font-semibold',
      'STATUS_CHANGE': 'bg-purple-500/20 text-purple-300 border-purple-500/60 font-semibold',
      'LOGIN': 'bg-sky-500/20 text-sky-300 border-sky-500/60 font-semibold',
      'LOGOUT': 'bg-slate-800 text-slate-300 border-slate-700 font-semibold'
    }
    return colors[action] || 'bg-slate-700/40 text-slate-300 border-slate-600 font-semibold'
  }

  const getProgramTitle = (entityId: string) => {
    const program = programs.find(p => p.id === entityId)
    return program?.title || entityId
  }

  // Nombre d'événements par type
  const counts = useMemo(() => {
    let business = 0
    let auth = 0
    logs.forEach(l => {
      if (l.action === 'LOGIN' || l.action === 'LOGOUT') {
        auth++
      } else {
        business++
      }
    })
    return { business, auth, total: logs.length }
  }, [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtrage par catégorie
      if (categoryFilter === 'business' && (log.action === 'LOGIN' || log.action === 'LOGOUT')) {
        return false
      }
      if (categoryFilter === 'auth' && (log.action !== 'LOGIN' && log.action !== 'LOGOUT')) {
        return false
      }

      if (currentGridId && log.entityType === 'Program' && programs.length > 0) {
        // Filtrer uniquement les programmes de la grille actuelle
        return programs.some(p => p.id === log.entityId)
      }
      return true
    })
  }, [logs, currentGridId, programs, categoryFilter])

  return (
    <div className="space-y-4 p-4">
      {/* En-tête avec filtres */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Historique des Modifications
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Traçabilité complète des actions sur les programmes, grilles et accès système
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "primary" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filtres
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAuditLogs}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Actualiser
            </Button>
          </div>
        </div>

        {/* Filtres rapides par catégorie d'audit */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setCategoryFilter('business')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
              categoryFilter === 'business'
                ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <span>Modifications métier (Programmes & Grilles)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white font-mono font-bold">
              {counts.business}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('auth')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
              categoryFilter === 'auth'
                ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <span>Connexions & Sessions (Sécurité)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white font-mono font-bold">
              {counts.auth}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
              categoryFilter === 'all'
                ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <span>Tout l'historique ({counts.total})</span>
          </button>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 mt-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Type d'entité
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Tous</option>
                <option value="Program">Programme</option>
                <option value="Grid">Grille</option>
                <option value="User">Utilisateur</option>
              </select>
            </div>

            {filters.entityType === 'Program' && (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Programme
                </label>
                <select
                  value={filters.entityId}
                  onChange={(e) => setFilters(prev => ({ ...prev, entityId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">Tous les programmes</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Toutes</option>
                <option value="CREATE">Création</option>
                <option value="UPDATE">Modification</option>
                <option value="DELETE">Suppression</option>
                <option value="STATUS_CHANGE">Changement de statut</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Date début
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Date fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({
                  entityType: '',
                  entityId: '',
                  userId: '',
                  action: '',
                  startDate: '',
                  endDate: ''
                })}
                leftIcon={<X className="w-4 h-4" />}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Liste des logs */}
      <Card className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun log d'audit trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isAuthAction = log.action === 'LOGIN' || log.action === 'LOGOUT'
              return (
                <div
                  key={log.id}
                  className={cn(
                    "p-3.5 rounded-lg border transition-colors",
                    isAuthAction
                      ? "border-slate-800 bg-slate-900/40 hover:bg-slate-900/70"
                      : "border-slate-800 bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <Badge className={cn("text-xs font-bold font-mono px-2 py-0.5 border", getActionColor(log.action))}>
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className={cn(
                          "text-sm font-semibold",
                          isAuthAction ? "text-slate-300 font-mono" : "text-white font-bold"
                        )}>
                          {log.entityType === 'Program'
                            ? getProgramTitle(log.entityId)
                            : log.entityType === 'User'
                            ? (log.user?.email || log.entityId)
                            : `${log.entityType} (${log.entityId})`}
                        </span>
                        {log.entityType && (
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded border border-slate-700">
                            {log.entityType === 'Program' ? 'Programme' : log.entityType === 'Grid' ? 'Grille' : log.entityType === 'User' ? 'Compte' : log.entityType}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
                        {log.user && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-200 font-medium">{log.user.displayName || log.user.email}</span>
                            <span className="text-slate-500 font-mono">({log.user.role})</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono">{formatDate(log.createdAt)}</span>
                        </div>
                        {log.ipAddress && (
                          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </div>

                      {/* Détails des changements */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2.5 p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                          <div className="text-xs font-bold text-slate-300 mb-1.5">
                            Champs modifiés :
                          </div>
                          <div className="space-y-1">
                            {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                              <div key={field} className="text-xs font-mono flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">{field}</span>
                                <span className="text-red-400 line-through">
                                  {change.before !== null && change.before !== undefined 
                                    ? String(change.before) 
                                    : '—'}
                                </span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-400 font-semibold">
                                  {change.after !== null && change.after !== undefined 
                                    ? String(change.after) 
                                    : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

export default AuditHistoryView

