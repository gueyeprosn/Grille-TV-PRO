/**
 * Composant pour sélectionner et appliquer les templates
 */

import React, { useState, useEffect } from 'react'
import { Moon, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from './ui'
import { getApiBaseURL } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

interface RamadanTemplate {
  id: string
  name: string
  type: 'WEEK' | 'FRIDAY' | 'WEEKEND' | 'COMMERCIAL' | 'FALLBACK' | 'DIASPORA'
  description: string
  programsCount: number
}

interface RamadanTemplateSelectorProps {
  gridId: string
  onTemplateApplied?: () => void
  onClose?: () => void
}

const RamadanTemplateSelector: React.FC<RamadanTemplateSelectorProps> = ({
  gridId,
  onTemplateApplied,
  onClose,
}) => {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<RamadanTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<RamadanTemplate | null>(null)
  const [overwriteExisting, setOverwriteExisting] = useState(false)
  const [applyToWeek, setApplyToWeek] = useState(false)

  // Charger les templates disponibles
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true)
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
        setTemplates(data)
      } catch (error: any) {
        console.error('Erreur chargement templates:', error)
        toast.error('Erreur lors du chargement des templates')
      } finally {
        setLoading(false)
      }
    }

    if (user && gridId) {
      loadTemplates()
    }
  }, [user, gridId])

  // Appliquer un template
  const applyTemplate = async (template: RamadanTemplate) => {
    if (!user) {
      toast.error('Vous devez être connecté')
      return
    }

    setApplying(template.id)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Token d\'authentification manquant')
        return
      }
      
      const response = await fetch(`${getApiBaseURL()}/v3/ramadan/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          gridId,
          templateType: template.type,
          overwriteExisting,
          applyToWeek,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'application du template')
      }

      const result = await response.json()

      if (result.success) {
        const createdCount = result.summary?.totalProgramsCreated ?? result.programsCreated ?? 0
        toast.success(
          `Template « ${template.name} » appliqué : ${createdCount} programme(s) créé(s).`
        )
        onTemplateApplied?.()
        setShowConfirm(false)
        setSelectedTemplate(null)
      } else {
        toast.error(`Erreur: ${result.errors?.join(', ') || 'Erreur inconnue'}`)
      }
    } catch (error: any) {
      console.error('Erreur application template:', error)
      toast.error(error.message || 'Erreur lors de l\'application du template')
    } finally {
      setApplying(null)
    }
  }

  const handleTemplateSelect = (template: RamadanTemplate) => {
    setSelectedTemplate(template)
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    if (selectedTemplate) {
      applyTemplate(selectedTemplate)
    }
  }

  const templateIcons = {
    WEEK: '📅',
    FRIDAY: '🕌',
    WEEKEND: '🎉',
    COMMERCIAL: '💰',
    FALLBACK: '⚠️',
    DIASPORA: '🌍',
  }

  const templateColors = {
    WEEK: 'bg-blue-500',
    FRIDAY: 'bg-purple-500',
    WEEKEND: 'bg-green-500',
    COMMERCIAL: 'bg-yellow-500',
    FALLBACK: 'bg-red-500',
    DIASPORA: 'bg-cyan-600',
  }

  if (!user) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Templates</h2>
              <p className="text-purple-200 text-sm">Sélectionnez un template pour générer automatiquement une grille</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : showConfirm && selectedTemplate ? (
            /* Confirmation Dialog */
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">
                  Confirmer l'application du template
                </h3>
                <p className="text-purple-700 mb-4">
                  Vous êtes sur le point d'appliquer le template <strong>{selectedTemplate.name}</strong>.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="overwrite"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <label htmlFor="overwrite" className="text-sm text-purple-700">
                      Remplacer les programmes existants
                    </label>
                  </div>
                  {selectedTemplate.type === 'WEEK' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="applyWeek"
                        checked={applyToWeek}
                        onChange={(e) => setApplyToWeek(e.target.checked)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <label htmlFor="applyWeek" className="text-sm text-purple-700">
                        Appliquer tous les templates de la semaine (Semaine + Vendredi + Week-end)
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setShowConfirm(false)
                    setSelectedTemplate(null)
                  }}
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={applying === selectedTemplate.id}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {applying === selectedTemplate.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Application...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmer
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Templates List */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`${templateColors[template.type]} text-white rounded-lg p-3 text-2xl`}>
                      {templateIcons[template.type]}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📺 {template.programsCount} programmes</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {template.type}
                        </span>
                      </div>
                    </div>
                    {applying === template.id && (
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {templates.length === 0 && !loading && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun template disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RamadanTemplateSelector

