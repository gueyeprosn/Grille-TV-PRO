import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Badge } from './ui'
import { Calendar, Clock, Users, FileText, PenTool, CheckCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import axios from 'axios'
import { Modal } from './ui'

interface ShiftLog {
  id: string
  gridId: string
  shiftStart: string
  shiftEnd: string
  outgoingTeam: string
  incomingTeam: string
  activities: Array<{ time: string; action: string; status: 'OK' | 'IN_PROGRESS' | 'CHECK'; notes?: string }>
  incidents: string[]
  pendingTasks: Array<{ title: string; owner: string; state: 'TODO' | 'IN_PROGRESS'; deadline?: string }>
  handoverNotes?: string
  specialInstructions?: string
  signatures: { outgoing?: string; incoming?: string }
}

interface ShiftLogFormProps {
  gridId: string
  isOpen: boolean
  onClose: () => void
  onSave: (shiftLog: ShiftLog) => void
  existingShiftLog?: ShiftLog
}

const ShiftLogForm: React.FC<ShiftLogFormProps> = ({ gridId, isOpen, onClose, onSave, existingShiftLog }) => {
  const [form, setForm] = useState<Partial<ShiftLog>>({
    shiftStart: new Date().toISOString().slice(0, 16),
    shiftEnd: '',
    outgoingTeam: '',
    incomingTeam: '',
    activities: [],
    incidents: [],
    pendingTasks: [],
    handoverNotes: '',
    specialInstructions: '',
    signatures: {},
  })

  const [newActivity, setNewActivity] = useState({ time: '', action: '', status: 'OK' as const, notes: '' })
  const [newTask, setNewTask] = useState({ title: '', owner: '', state: 'TODO' as const, deadline: '' })

  useEffect(() => {
    if (existingShiftLog) {
      setForm(existingShiftLog)
    } else {
      setForm({
        shiftStart: new Date().toISOString().slice(0, 16),
        shiftEnd: '',
        outgoingTeam: '',
        incomingTeam: '',
        activities: [],
        incidents: [],
        pendingTasks: [],
        handoverNotes: '',
        specialInstructions: '',
        signatures: {},
      })
    }
  }, [existingShiftLog, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const shiftLogData = {
        ...form,
        gridId,
        id: existingShiftLog?.id || crypto.randomUUID(),
        shiftStart: new Date(form.shiftStart || new Date()).toISOString(),
        shiftEnd: form.shiftEnd ? new Date(form.shiftEnd).toISOString() : new Date().toISOString(),
      }

      const apiBase = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/' ? `${import.meta.env.BASE_URL}api` : '/api'
      if (existingShiftLog) {
        await axios.put(`${apiBase}/v3/shiftlogs/${existingShiftLog.id}`, shiftLogData, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        await axios.post(`${apiBase}/v3/shiftlogs`, shiftLogData, {
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      onSave(shiftLogData as ShiftLog)
      onClose()
    } catch (error) {
      console.error('Erreur sauvegarde journal:', error)
    }
  }

  const addActivity = () => {
    if (!newActivity.time || !newActivity.action) return
    setForm({
      ...form,
      activities: [...(form.activities || []), { ...newActivity, time: newActivity.time }],
    })
    setNewActivity({ time: '', action: '', status: 'OK', notes: '' })
  }

  const removeActivity = (index: number) => {
    setForm({
      ...form,
      activities: form.activities?.filter((_, i) => i !== index) || [],
    })
  }

  const addTask = () => {
    if (!newTask.title || !newTask.owner) return
    setForm({
      ...form,
      pendingTasks: [...(form.pendingTasks || []), { ...newTask, deadline: newTask.deadline || undefined }],
    })
    setNewTask({ title: '', owner: '', state: 'TODO', deadline: '' })
  }

  const removeTask = (index: number) => {
    setForm({
      ...form,
      pendingTasks: form.pendingTasks?.filter((_, i) => i !== index) || [],
    })
  }

  const handleSignature = (type: 'outgoing' | 'incoming') => {
    const name = prompt(`Nom pour la signature ${type === 'outgoing' ? 'sortante' : 'entrante'}:`)
    if (name) {
      setForm({
        ...form,
        signatures: {
          ...form.signatures,
          [type]: name,
        },
      })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Journal de Bord - Fin de Service" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Informations de Service
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Début de service</label>
              <Input
                type="datetime-local"
                value={form.shiftStart}
                onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin de service</label>
              <Input
                type="datetime-local"
                value={form.shiftEnd}
                onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Équipe sortante</label>
              <Input
                value={form.outgoingTeam}
                onChange={(e) => setForm({ ...form, outgoingTeam: e.target.value })}
                placeholder="Nom de l'équipe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Équipe entrante</label>
              <Input
                value={form.incomingTeam}
                onChange={(e) => setForm({ ...form, incomingTeam: e.target.value })}
                placeholder="Nom de l'équipe"
                required
              />
            </div>
          </div>
        </Card>

        {/* Activités */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Activités
          </h3>
          <div className="space-y-2 mb-4">
            {form.activities?.map((activity, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-600 dark:text-slate-400 w-20">
                  {new Date(activity.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex-1 text-sm">{activity.action}</span>
                <Badge
                  variant={activity.status === 'OK' ? 'success' : activity.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                  size="sm"
                >
                  {activity.status}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeActivity(index)}
                  className="text-red-600"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <Input
              type="time"
              value={newActivity.time}
              onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
              className="sm:col-span-2"
              placeholder="Heure"
            />
            <Input
              value={newActivity.action}
              onChange={(e) => setNewActivity({ ...newActivity, action: e.target.value })}
              className="sm:col-span-7"
              placeholder="Action effectuée"
            />
            <select
              value={newActivity.status}
              onChange={(e) => setNewActivity({ ...newActivity, status: e.target.value as any })}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="OK">OK</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="CHECK">À vérifier</option>
            </select>
            <Button type="button" variant="outline" size="sm" onClick={addActivity} className="sm:col-span-1">
              +
            </Button>
          </div>
        </Card>

        {/* Tâches en attente */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Tâches en Attente
          </h3>
          <div className="space-y-2 mb-4">
            {form.pendingTasks?.map((task, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="flex-1 text-sm font-medium">{task.title}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{task.owner}</span>
                <Badge variant="warning" size="sm">
                  {task.state}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTask(index)}
                  className="text-red-600"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <Input
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="sm:col-span-4"
              placeholder="Titre de la tâche"
            />
            <Input
              value={newTask.owner}
              onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
              className="sm:col-span-3"
              placeholder="Responsable"
            />
            <Input
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              className="sm:col-span-3"
              placeholder="Échéance"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTask} className="sm:col-span-2">
              Ajouter
            </Button>
          </div>
        </Card>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Notes de Passation
          </label>
          <textarea
            value={form.handoverNotes}
            onChange={(e) => setForm({ ...form, handoverNotes: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 min-h-[100px]"
            placeholder="Notes importantes pour l'équipe suivante..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Consignes Spéciales</label>
          <textarea
            value={form.specialInstructions}
            onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 min-h-[80px]"
            placeholder="Consignes particulières..."
          />
        </div>

        {/* Signatures */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <PenTool className="w-4 h-4" />
            Signatures
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">Équipe Sortante</label>
              {form.signatures?.outgoing ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium break-words">{form.signatures.outgoing}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSignature('outgoing')}
                    className="w-full sm:w-auto"
                  >
                    Modifier
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSignature('outgoing')}
                  className="w-full"
                >
                  Signer
                </Button>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">Équipe Entrante</label>
              {form.signatures?.incoming ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium break-words">{form.signatures.incoming}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSignature('incoming')}
                    className="w-full sm:w-auto"
                  >
                    Modifier
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSignature('incoming')}
                  className="w-full"
                >
                  Signer
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button type="submit" variant="primary" className="w-full sm:w-auto">
            {existingShiftLog ? 'Modifier' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ShiftLogForm

