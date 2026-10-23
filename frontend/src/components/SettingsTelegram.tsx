import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Badge, Modal } from './ui'
import { Settings, Plus, Trash2, Edit2, Save, X, Bell, BellOff } from 'lucide-react'
import { cn } from '../lib/utils'
import apiClient from '../lib/api'

interface NotificationRule {
  id: string
  channelId: string
  event: string
  target: string
  chatId: string
  enabled: boolean
  throttlingSec: number
}

const SettingsTelegram: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NotificationRule | null>(null)
  const [form, setForm] = useState({
    event: '',
    chatId: '',
    enabled: true,
    throttlingSec: 30,
  })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await apiClient.get('/v3/notifications/rules', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRules(response.data)
    } catch (error) {
      console.error('Erreur chargement règles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      const ruleData = {
        ...form,
        target: 'TELEGRAM',
        channelId: 'default',
      }

      if (editing) {
        await apiClient.put(`/v3/notifications/rules/${editing.id}`, ruleData, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        await apiClient.post('/v3/notifications/rules', ruleData, {
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      setShowForm(false)
      setEditing(null)
      setForm({ event: '', chatId: '', enabled: true, throttlingSec: 30 })
      loadRules()
    } catch (error) {
      console.error('Erreur sauvegarde règle:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return

    try {
      const token = localStorage.getItem('token')
      await apiClient.delete(`/v3/notifications/rules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      loadRules()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const handleToggle = async (rule: NotificationRule) => {
    try {
      const token = localStorage.getItem('token')
      await apiClient.put(
        `/v3/notifications/rules/${rule.id}`,
        { ...rule, enabled: !rule.enabled },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      loadRules()
    } catch (error) {
      console.error('Erreur toggle:', error)
    }
  }

  const events = [
    { value: 'GRID_PUBLISHED', label: 'Grille publiée' },
    { value: 'PROGRAM_CREATED', label: 'Programme créé' },
    { value: 'PROGRAM_UPDATED', label: 'Programme modifié' },
    { value: 'PROGRAM_STATUS_CHANGED', label: 'Changement de statut' },
    { value: 'INCIDENT_CRITICAL', label: 'Incident critique' },
    { value: 'INCIDENT_CREATED', label: 'Incident créé' },
    { value: 'AD_MISSED', label: 'Pub manquée' },
    { value: 'AD_PLANNED', label: 'Pub planifiée' },
    { value: 'DEVIATION_CREATED', label: 'Écart signalé' },
    { value: '*', label: 'Tous les événements' },
  ]

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Configuration Telegram</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gérez les notifications Telegram pour votre équipe
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null)
            setForm({ event: '', chatId: '', enabled: true, throttlingSec: 30 })
            setShowForm(true)
          }}
          leftIcon={<Plus className="w-3 h-3 sm:w-4 sm:h-4" />}
          size="sm"
          className="w-full sm:w-auto"
        >
          <span className="hidden sm:inline">Nouvelle Règle</span>
          <span className="sm:hidden">Nouvelle Règle</span>
        </Button>
      </div>

      {/* Info */}
      <Card variant="outlined" className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
          <strong>💡 Comment obtenir le Chat ID :</strong>
          <br className="hidden sm:block" />
          <span className="block sm:inline">1. Créez un groupe Telegram et ajoutez le bot</span>
          <br className="hidden sm:block" />
          <span className="block sm:inline">2. Envoyez un message dans le groupe</span>
          <br className="hidden sm:block" />
          <span className="block sm:inline">3. Visitez : https://api.telegram.org/bot{'<TOKEN>'}getUpdates</span>
          <br className="hidden sm:block" />
          <span className="block sm:inline">4. Trouvez le "chat.id" dans la réponse</span>
        </p>
      </Card>

      {/* Liste des règles */}
      {rules.length === 0 ? (
        <Card variant="elevated" className="p-8 sm:p-12 text-center">
          <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4">Aucune règle configurée</p>
          <Button variant="primary" onClick={() => setShowForm(true)} leftIcon={<Plus className="w-3 h-3 sm:w-4 sm:h-4" />} size="sm">
            Créer une règle
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} variant="elevated" className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={rule.enabled ? 'success' : 'default'} size="sm">
                      {rule.enabled ? 'Actif' : 'Inactif'}
                    </Badge>
                    <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 break-words">
                      {events.find((e) => e.value === rule.event)?.label || rule.event}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <p>
                      <strong>Chat ID :</strong> <span className="break-all">{rule.chatId}</span>
                    </p>
                    <p>
                      <strong>Throttling :</strong> {rule.throttlingSec}s entre messages similaires
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(rule)}
                    leftIcon={rule.enabled ? <BellOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Bell className="w-3 h-3 sm:w-4 sm:h-4" />}
                    className="flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">{rule.enabled ? 'Désactiver' : 'Activer'}</span>
                    <span className="sm:hidden">{rule.enabled ? 'Off' : 'On'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(rule)
                      setForm({
                        event: rule.event,
                        chatId: rule.chatId,
                        enabled: rule.enabled,
                        throttlingSec: rule.throttlingSec,
                      })
                      setShowForm(true)
                    }}
                    leftIcon={<Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />}
                    className="flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">Modifier</span>
                    <span className="sm:hidden">Mod.</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
                    leftIcon={<Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />}
                    className="text-red-600 flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">Supprimer</span>
                    <span className="sm:hidden">Supp.</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
          setForm({ event: '', chatId: '', enabled: true, throttlingSec: 30 })
        }}
        title={editing ? 'Modifier la Règle' : 'Nouvelle Règle'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Événement</label>
            <select
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            >
              <option value="">Sélectionner un événement</option>
              {events.map((event) => (
                <option key={event.value} value={event.value}>
                  {event.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Chat ID Telegram"
            value={form.chatId}
            onChange={(e) => setForm({ ...form, chatId: e.target.value })}
            placeholder="-1001234567890"
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2">Throttling (secondes)</label>
            <Input
              type="number"
              value={form.throttlingSec}
              onChange={(e) => setForm({ ...form, throttlingSec: parseInt(e.target.value) || 30 })}
              min="0"
              max="3600"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Délai minimum entre messages similaires (anti-spam)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="enabled" className="text-sm font-medium">
              Règle active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
                setForm({ event: '', chatId: '', enabled: true, throttlingSec: 30 })
              }}
            >
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
              {editing ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SettingsTelegram

