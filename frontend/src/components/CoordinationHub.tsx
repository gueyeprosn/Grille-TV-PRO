import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Modal, Input } from './ui'
import { MessageSquare, AlertTriangle, TrendingDown, Tv, CheckSquare, Plus, Send, X } from 'lucide-react'
import { cn } from '../lib/utils'
import apiClient from '../lib/api'
import toast from 'react-hot-toast'

interface Incident {
  id: string
  gridId: string
  programId?: string
  time: string
  area: 'TECH' | 'POST' | 'PROD' | 'PLAYOUT' | 'NETWORK'
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL'
  description: string
  impact: string
  actionTaken?: string
  actionNext?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  assignedTo?: string
  createdBy: string
}

interface Deviation {
  id: string
  gridId: string
  programId: string
  type: 'REPORT' | 'REPLACEMENT' | 'CANCELLATION'
  planned: { title: string; start: string; end: string }
  aired?: { title: string; start: string; end: string }
  justification: string
  approvedBy?: string
}

interface AdLog {
  id: string
  gridId: string
  timePlanned: string
  advertiser: string
  spotTitle: string
  durationSec: number
  status: 'AIRED' | 'MISSED'
  notes?: string
}

interface Task {
  id: string
  title: string
  owner: string
  state: 'TODO' | 'IN_PROGRESS' | 'DONE'
  deadline?: string
  description?: string
}

interface Message {
  id: string
  from: string
  to?: string
  content: string
  timestamp: string
  type: 'INFO' | 'ALERT' | 'QUESTION'
}

interface CoordinationHubProps {
  gridId: string
  userRole?: string
}

type Tab = 'messages' | 'incidents' | 'deviations' | 'ads' | 'tasks'

const CoordinationHub: React.FC<CoordinationHubProps> = ({ gridId, userRole }) => {
  const [activeTab, setActiveTab] = useState<Tab>('messages')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [deviations, setDeviations] = useState<Deviation[]>([])
  const [adLogs, setAdLogs] = useState<AdLog[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [showDeviationForm, setShowDeviationForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    if (gridId) {
      loadData()
    }
  }, [gridId, activeTab])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      if (activeTab === 'incidents') {
        const res = await apiClient.get(`/v3/grids/${gridId}/incidents`, { headers })
        setIncidents(res.data)
      } else if (activeTab === 'deviations') {
        const res = await apiClient.get(`/v3/grids/${gridId}/deviations`, { headers })
        setDeviations(res.data)
      } else if (activeTab === 'ads') {
        const res = await apiClient.get(`/v3/grids/${gridId}/ads`, { headers })
        setAdLogs(res.data)
      } else if (activeTab === 'messages') {
        const res = await apiClient.get(
          `/v3/grids/${gridId}/coordination/messages`,
          { headers }
        )
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setMessages(
          raw.map((m: any) => ({
            id: m.id,
            from: m.from || 'Vous',
            to: m.to,
            content: m.content,
            timestamp: m.timestamp,
            type: m.type,
          }))
        )
      } else if (activeTab === 'tasks') {
        const res = await apiClient.get(
          `/v3/grids/${gridId}/coordination/tasks`,
          { headers }
        )
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setTasks(
          raw.map((t: any) => ({
            id: t.id,
            title: t.title,
            owner: t.owner || 'Non assigné',
            state: t.state,
            deadline: t.deadline,
            description: t.description,
          }))
        )
      }
    } catch (error: any) {
      console.error('Erreur chargement:', error)
      setError(error.response?.data?.error || 'Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateIncident = async (incident: Partial<Incident>) => {
    try {
      const token = localStorage.getItem('token')
      await apiClient.post(
        '/v3/incidents',
        { ...incident, gridId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowIncidentForm(false)
      loadData()
    } catch (error: any) {
      console.error('Erreur création incident:', error)
      toast.error(error.response?.data?.error || "Impossible d’enregistrer l’incident.")
    }
  }

  const handleCreateDeviation = async (deviation: Partial<Deviation>) => {
    try {
      const token = localStorage.getItem('token')
      await apiClient.post(
        '/v3/deviations',
        { ...deviation, gridId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowDeviationForm(false)
      loadData()
    } catch (error: any) {
      console.error('Erreur création écart:', error)
      toast.error(error.response?.data?.error || "Impossible d’enregistrer l’écart.")
    }
  }

  const handleCreateTask = async (task: Partial<Task>) => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      await apiClient.post(
        `/v3/grids/${gridId}/coordination/tasks`,
        {
          title: task.title,
          ownerName: task.owner,
          state: task.state,
          deadline: task.deadline,
          description: task.description,
        },
        { headers }
      )

      setShowTaskForm(false)
      toast.success("✅ Tâche créée avec succès !")
      loadData()
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Échec de la création de la tâche'
      setError(msg)
      toast.error(msg)
      console.error('Erreur création tâche:', error)
    }
  }

  const handleUpdateTaskState = async (taskId: string, newState: Task['state']) => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      await apiClient.put(
        `/v3/coordination/tasks/${taskId}`,
        { state: newState },
        { headers }
      )
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, state: newState } : t)))
      toast.success("✅ Statut de la tâche mis à jour")
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Échec de la mise à jour du statut'
      toast.error(msg)
      console.error('Erreur mise à jour tâche:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setSendingMessage(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const res = await apiClient.post(
        `/v3/grids/${gridId}/coordination/messages`,
        { content: newMessage.trim(), type: 'INFO' },
        { headers }
      )

      const m = res.data
      setMessages((prev) => [
        ...prev,
        {
          id: m.id,
          from: m.from || 'Vous',
          to: m.to,
          content: m.content,
          timestamp: m.timestamp,
          type: m.type,
        },
      ])
      setNewMessage('')
      toast.success("✅ Message envoyé")
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Échec de l\'envoi du message'
      setError(msg)
      toast.error(msg)
      console.error('Erreur envoi message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const tabs = [
    { id: 'messages' as Tab, label: 'Messages', icon: MessageSquare },
    { id: 'incidents' as Tab, label: 'Incidents', icon: AlertTriangle },
    { id: 'deviations' as Tab, label: 'Écarts', icon: TrendingDown },
    { id: 'ads' as Tab, label: 'Publicités', icon: Tv },
    { id: 'tasks' as Tab, label: 'Tâches', icon: CheckSquare },
  ]

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Coordination</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Communication et suivi des activités
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div role="group" aria-label="Rubriques de coordination" className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              aria-label={`${tab.label}${activeTab === tab.id ? ', rubrique sélectionnée' : ''}`}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <Icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              {tab.id === 'incidents' && incidents.filter((i) => i.status !== 'RESOLVED').length > 0 && (
                <Badge variant="error" size="sm" className="ml-1">
                  {incidents.filter((i) => i.status !== 'RESOLVED').length}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Erreur de chargement de la coordination</p>
            <p className="mt-1 text-red-700 dark:text-red-300">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void loadData()} disabled={loading}>
            {loading ? 'Nouvel essai…' : 'Réessayer'}
          </Button>
        </div>
      )}

      {/* Contenu des onglets */}
      <div className="min-h-[300px] sm:min-h-[400px]">
        {activeTab === 'messages' && (
          <Card variant="elevated" className="p-4 sm:p-6">
            <div aria-live="polite" className="space-y-3 sm:space-y-4 mb-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Chargement des messages…</p>
              ) : error && messages.length === 0 ? null : messages.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm sm:text-base">
                  Aucun message. Commencez la conversation !
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'p-3 sm:p-4 rounded-lg',
                      msg.type === 'ALERT'
                        ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
                        : 'bg-slate-50 dark:bg-slate-800/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">{msg.from}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 break-words">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Tapez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="flex-1"
              />
              <Button 
                variant="primary" 
                onClick={handleSendMessage} 
                leftIcon={<Send className="w-3 h-3 sm:w-4 sm:h-4" />}
                size="sm"
                disabled={sendingMessage || !newMessage.trim()}
                className="w-full sm:w-auto"
              >
                {sendingMessage ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-end">
              {(userRole === 'ADMIN' || userRole === 'PRODUCTION') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowIncidentForm(true)}
                  leftIcon={<Plus className="w-3 h-3 sm:w-4 sm:h-4" />}
                  className="w-full sm:w-auto"
                >
                  <span className="hidden sm:inline">Nouvel Incident</span>
                  <span className="sm:hidden">Nouvel Incident</span>
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 sm:py-12 text-sm sm:text-base">Chargement des incidents…</div>
            ) : error ? (
              <Card variant="elevated" className="p-8 sm:p-12 text-center">
                <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-red-400 mb-4" />
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">Impossible de charger les incidents</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Le service est temporairement indisponible ou la grille n’a pas pu être interrogée.</p>
                <Button variant="outline" size="sm" onClick={() => void loadData()} className="mt-4" disabled={loading}>
                  Réessayer
                </Button>
              </Card>
            ) : incidents.length === 0 ? (
              <Card variant="elevated" className="p-8 sm:p-12 text-center">
                <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Aucun incident signalé pour cette grille.</p>
              </Card>
            ) : (
              incidents.map((incident) => (
                <Card key={incident.id} variant="elevated" className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge
                          variant={incident.severity === 'CRITICAL' ? 'error' : incident.severity === 'MEDIUM' ? 'warning' : 'info'}
                          size="sm"
                        >
                          {incident.severity}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {incident.area}
                        </Badge>
                        <Badge
                          variant={incident.status === 'RESOLVED' ? 'success' : incident.status === 'IN_PROGRESS' ? 'info' : 'warning'}
                          size="sm"
                        >
                          {incident.status}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 mb-1 break-words">{incident.description}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <strong>Impact :</strong> {incident.impact}
                      </p>
                      {incident.actionTaken && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">
                          <strong>Action :</strong> {incident.actionTaken}
                        </p>
                      )}
                      {incident.actionNext && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          <strong>À faire :</strong> {incident.actionNext}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 flex-shrink-0">
                      {new Date(incident.time).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'deviations' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              {(userRole === 'ADMIN' || userRole === 'PRODUCTION') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowDeviationForm(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Nouvel Écart
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">Chargement des écarts…</div>
            ) : error ? (
              <Card variant="elevated" className="p-8 sm:p-12 text-center">
                <TrendingDown className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-red-400 mb-4" />
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">Impossible de charger les écarts</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Le service est temporairement indisponible ou la grille n’a pas pu être interrogée.</p>
                <Button variant="outline" size="sm" onClick={() => void loadData()} className="mt-4" disabled={loading}>
                  Réessayer
                </Button>
              </Card>
            ) : deviations.length === 0 ? (
              <Card variant="elevated" className="p-12 text-center">
                <TrendingDown className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Aucun écart signalé pour cette grille.</p>
              </Card>
            ) : (
              deviations.map((deviation) => (
                <Card key={deviation.id} variant="elevated" className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="warning" size="sm">
                          {deviation.type}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {deviation.planned.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-2 text-sm">
                        <div>
                          <p className="text-slate-600 dark:text-slate-400 mb-1">
                            <strong>Prévu :</strong> {deviation.planned.start} - {deviation.planned.end}
                          </p>
                          {deviation.aired && (
                            <p className="text-slate-600 dark:text-slate-400">
                              <strong>Diffusé :</strong> {deviation.aired.start} - {deviation.aired.end}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Justification :</strong> {deviation.justification}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">Chargement des publicités…</div>
            ) : error ? (
              <Card variant="elevated" className="p-8 sm:p-12 text-center">
                <Tv className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-red-400 mb-4" />
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">Impossible de charger les publicités</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Le service est temporairement indisponible ou la grille n’a pas pu être interrogée.</p>
                <Button variant="outline" size="sm" onClick={() => void loadData()} className="mt-4" disabled={loading}>
                  Réessayer
                </Button>
              </Card>
            ) : adLogs.length === 0 ? (
              <Card variant="elevated" className="p-12 text-center">
                <Tv className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Aucune publicité enregistrée pour cette grille.</p>
              </Card>
            ) : (
              adLogs.map((ad) => (
                <Card key={ad.id} variant="elevated" className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={ad.status === 'MISSED' ? 'error' : 'success'} size="sm">
                          {ad.status}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{ad.spotTitle}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        <strong>Annonceur :</strong> {ad.advertiser}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Durée :</strong> {ad.durationSec}s •{' '}
                        {new Date(ad.timePlanned).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowTaskForm(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                disabled={loading}
              >
                Nouvelle Tâche
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                Chargement des tâches…
              </div>
            ) : error ? (
              <Card variant="elevated" className="p-8 sm:p-12 text-center">
                <CheckSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-red-400 mb-4" />
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">Impossible de charger les tâches</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Le service est temporairement indisponible ou la grille n’a pas pu être interrogée.</p>
                <Button variant="outline" size="sm" onClick={() => void loadData()} className="mt-4" disabled={loading}>
                  Réessayer
                </Button>
              </Card>
            ) : tasks.length === 0 ? (
              <Card variant="elevated" className="p-12 text-center">
                <CheckSquare className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Aucune tâche pour cette grille. Créez votre première tâche ci-dessous.
                </p>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} variant="elevated" className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            task.state === 'DONE'
                              ? 'success'
                              : task.state === 'IN_PROGRESS'
                              ? 'info'
                              : 'default'
                          }
                          size="sm"
                        >
                          {task.state === 'DONE' ? 'Terminé' : task.state === 'IN_PROGRESS' ? 'En cours' : 'À faire'}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                          {task.description}
                        </p>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        <strong>Responsable :</strong> {task.owner}
                      </p>
                      {task.deadline && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          <strong>Échéance :</strong>{' '}
                          {new Date(task.deadline).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    {/* Modification rapide du statut de la tâche */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Statut :</label>
                      <select
                        value={task.state}
                        onChange={(e) => handleUpdateTaskState(task.id, e.target.value as Task['state'])}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                        aria-label={`Statut de la tâche ${task.title}`}
                      >
                        <option value="TODO">À faire</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="DONE">Terminé</option>
                      </select>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modales de création */}
      {showIncidentForm && (
        <IncidentFormModal
          isOpen={showIncidentForm}
          onClose={() => setShowIncidentForm(false)}
          onSubmit={handleCreateIncident}
        />
      )}

      {showDeviationForm && (
        <DeviationFormModal
          isOpen={showDeviationForm}
          onClose={() => setShowDeviationForm(false)}
          onSubmit={handleCreateDeviation}
        />
      )}

      {showTaskForm && (
        <TaskFormModal
          isOpen={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          onSubmit={handleCreateTask}
        />
      )}
    </div>
  )
}

// Composant modal pour créer un incident
const IncidentFormModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (incident: Partial<Incident>) => void
}> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    area: 'TECH' as Incident['area'],
    severity: 'MEDIUM' as Incident['severity'],
    description: '',
    impact: '',
    actionTaken: '',
    actionNext: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...form,
      time: new Date().toISOString(),
      status: 'OPEN',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvel Incident" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Zone</label>
          <select
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value as Incident['area'] })}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          >
            <option value="TECH">Technique</option>
            <option value="POST">Post-production</option>
            <option value="PROD">Production</option>
            <option value="PLAYOUT">Playout</option>
            <option value="NETWORK">Réseau</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sévérité</label>
          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value as Incident['severity'] })}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          >
            <option value="LOW">Faible</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="CRITICAL">Critique</option>
          </select>
        </div>

        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <Input
          label="Impact"
          value={form.impact}
          onChange={(e) => setForm({ ...form, impact: e.target.value })}
          required
        />

        <Input
          label="Action prise"
          value={form.actionTaken}
          onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
        />

        <Input
          label="Action à faire"
          value={form.actionNext}
          onChange={(e) => setForm({ ...form, actionNext: e.target.value })}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Composant modal pour créer un écart
const DeviationFormModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (deviation: Partial<Deviation>) => void
}> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    type: 'REPORT' as Deviation['type'],
    programId: '',
    plannedTitle: '',
    plannedStart: '',
    plannedEnd: '',
    justification: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      type: form.type,
      programId: form.programId,
      planned: {
        title: form.plannedTitle,
        start: form.plannedStart,
        end: form.plannedEnd,
      },
      justification: form.justification,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvel Écart" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as Deviation['type'] })}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          >
            <option value="REPORT">Report</option>
            <option value="REPLACEMENT">Remplacement</option>
            <option value="CANCELLATION">Annulation</option>
          </select>
        </div>

        <Input
          label="Titre programme prévu"
          value={form.plannedTitle}
          onChange={(e) => setForm({ ...form, plannedTitle: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Heure début"
            type="time"
            value={form.plannedStart}
            onChange={(e) => setForm({ ...form, plannedStart: e.target.value })}
            required
          />
          <Input
            label="Heure fin"
            type="time"
            value={form.plannedEnd}
            onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Justification</label>
          <textarea
            value={form.justification}
            onChange={(e) => setForm({ ...form, justification: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 min-h-[100px]"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Composant modal pour créer une tâche de coordination
const TaskFormModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (task: Partial<Task>) => void
}> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    title: '',
    owner: '',
    state: 'TODO' as Task['state'],
    deadline: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      onSubmit({
        title: form.title.trim(),
        owner: form.owner.trim() || undefined,
        state: form.state,
        deadline: form.deadline || undefined,
        description: form.description.trim() || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle tâche" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Titre de la tâche"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          placeholder="Ex: Préparer le conducteur du 20h"
        />
        <Input
          label="Responsable"
          value={form.owner}
          onChange={(e) => setForm({ ...form, owner: e.target.value })}
          placeholder="Ex: Jean Dupont"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Statut</label>
            <select
              value={form.state}
              onChange={(e) =>
                setForm({ ...form, state: e.target.value as Task['state'] })
              }
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            >
              <option value="TODO">À faire</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="DONE">Terminé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Échéance</label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 min-h-[100px]"
            placeholder="Détails de la tâche..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CoordinationHub
