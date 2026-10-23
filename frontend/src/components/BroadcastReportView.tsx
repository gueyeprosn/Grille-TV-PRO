import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Loading } from './ui'
import { FileText, Download, Calendar, AlertTriangle, TrendingDown, Tv, BarChart3 } from 'lucide-react'
import { exportToCSV, exportToJSON } from '../lib/export'
import { exportWeekToPdf } from '../legacy/lib/pdf'
import axios from 'axios'

interface BroadcastReport {
  gridId: string
  gridName: string
  period: { start: string; end: string }
  summary: {
    totalPrograms: number
    plannedMinutes: number
    programsMarkedAired: number
    complianceRate: number
    incidentsCount: number
    deviationsCount: number
    adsCount: number
    adsMissed: number
  }
  programs: Array<{
    id: string
    title: string
    planned: { start: string; end: string }
    category: string
    typeDiffusion: string
    duration: number
    days: string[]
    description?: string
    status: string
  }>
  incidents: Array<{
    id: string
    description: string
    severity: string
    time: string
  }>
  deviations: Array<{
    id: string
    type: string
    planned: { title: string }
    justification: string
  }>
  adLogs: Array<{
    id: string
    advertiser: string
    spotTitle: string
    status: string
    timePlanned: string
  }>
}

interface BroadcastReportViewProps {
  gridId: string
}

const indicatorDefinitions = [
  {
    title: 'Programmes planifiés',
    description: 'nombre total de fiches de programme de la grille, sans multiplier les occurrences récurrentes.',
  },
  {
    title: 'Taux de diffusion des fiches',
    description: 'proportion des fiches dont le statut est diffusé, terminé ou en direct.',
  },
  {
    title: 'Incidents et écarts',
    description: 'événements enregistrés sur la grille, sans interpréter un manque de données comme une absence réelle.',
  },
  {
    title: 'Publicités',
    description: 'nombre de journaux publicitaires enregistrés et nombre de spots manqués sur l’ensemble de la grille.',
  },
]

const IndicatorDefinitions: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
    {indicatorDefinitions.map(({ title, description }) => (
      <div key={title} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <strong style={{ color: 'var(--text-primary)' }}>{title}</strong> : {description}
      </div>
    ))}
  </div>
)

const BroadcastReportView: React.FC<BroadcastReportViewProps> = ({ gridId }) => {
  const [report, setReport] = useState<BroadcastReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    if (gridId) {
      generateReport()
    }
  }, [gridId])

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    setExportError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // Charger toutes les données
      const apiBase = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/' ? `${import.meta.env.BASE_URL}api` : '/api'
      const [gridRes, programsRes, incidentsRes, deviationsRes, adsRes] = await Promise.all([
        axios.get(`${apiBase}/v3/grids/${gridId}`, { headers }),
        axios.get(`${apiBase}/v3/grids/${gridId}/programs`, { headers, params: { page: 1, limit: 1000 } }),
        axios.get(`${apiBase}/v3/grids/${gridId}/incidents`, { headers }),
        axios.get(`${apiBase}/v3/grids/${gridId}/deviations`, { headers }),
        axios.get(`${apiBase}/v3/grids/${gridId}/ads`, { headers }),
      ])

      const grid = gridRes.data
      const programs = Array.isArray(programsRes.data?.data) 
        ? programsRes.data.data 
        : (Array.isArray(programsRes.data) ? programsRes.data : [])
      const incidents = Array.isArray(incidentsRes.data?.data) 
        ? incidentsRes.data.data 
        : (Array.isArray(incidentsRes.data) ? incidentsRes.data : [])
      const deviations = Array.isArray(deviationsRes.data?.data) 
        ? deviationsRes.data.data 
        : (Array.isArray(deviationsRes.data) ? deviationsRes.data : [])
      const adLogs = Array.isArray(adsRes.data?.data) 
        ? adsRes.data.data 
        : (Array.isArray(adsRes.data) ? adsRes.data : [])

      // Calculer les statistiques
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      const normalizedPrograms = (Array.isArray(programs) ? programs : []).map((p: any) => {
        const start = p.startTime || p.start || '00:00'
        const end = p.endTime || p.end || start
        const [startHour, startMinute] = start.split(':').map(Number)
        const [endHour, endMinute] = end.split(':').map(Number)
        const startMinutes = startHour * 60 + startMinute
        let endMinutes = endHour * 60 + endMinute
        if (endMinutes <= startMinutes) endMinutes += 24 * 60
        const declaredDuration = p.durationMin ?? p.duration
        const hasEnd = Boolean(p.endTime || p.end)
        return {
          ...p,
          start,
          end,
          duration: hasEnd && endMinutes !== startMinutes
            ? Math.max(0, endMinutes - startMinutes)
            : Number.isFinite(declaredDuration) ? Math.max(0, declaredDuration) : 0,
          days: Array.isArray(p.days)
            ? p.days.map((day: number | string) => typeof day === 'number' ? dayNames[day] : day).filter(Boolean)
            : [],
        }
      })
      const plannedMinutes = normalizedPrograms.reduce((sum: number, p: any) => sum + p.duration, 0)
      const programsMarkedAired = normalizedPrograms.filter((p: any) => ['AIRED', 'DONE', 'ON_AIR'].includes(p.opStatus)).length
      // Les statuts sont portés par les fiches de programme, pas par chaque occurrence de diffusion.
      const complianceRate = normalizedPrograms.length > 0 ? (programsMarkedAired / normalizedPrograms.length) * 100 : 0
      const adsMissed = adLogs.filter((a: any) => a.status === 'MISSED').length

      const reportData: BroadcastReport = {
        gridId: grid.id,
        gridName: grid.name,
        period: {
          start: grid.startDate,
          end: grid.endDate,
        },
        summary: {
          totalPrograms: programs.length,
          plannedMinutes,
          programsMarkedAired,
          complianceRate,
          incidentsCount: incidents.length,
          deviationsCount: deviations.length,
          adsCount: adLogs.length,
          adsMissed,
        },
        programs: normalizedPrograms.map((p: any) => ({
          id: p.id,
          title: p.title,
          planned: {
            start: p.start,
            end: p.end,
          },
          category: p.category || p.categoryId || 'Divers',
          typeDiffusion: p.typeDiffusion || p.type || 'Autre',
          duration: p.duration,
          days: p.days,
          description: p.description || '',
          status: p.opStatus || 'PLANNED',
        })),
        incidents: incidents.map((i: any) => ({
          id: i.id,
          description: i.description,
          severity: i.severity,
          time: i.time,
        })),
        deviations: deviations.map((d: any) => ({
          id: d.id,
          type: d.type,
          planned: { title: d.planned.title },
          justification: d.justification,
        })),
        adLogs: adLogs.map((a: any) => ({
          id: a.id,
          advertiser: a.advertiser,
          spotTitle: a.spotTitle,
          status: a.status,
          timePlanned: a.timePlanned,
        })),
      }

      setReport(reportData)
    } catch (error: any) {
      console.error('Erreur génération rapport:', error)
      setError(error?.response?.data?.error || error?.message || 'Impossible de générer le rapport pour cette grille.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!report) return
    setGenerating(true)
    setExportError(null)
    try {
      // Utiliser la fonction d'export PDF existante
      const programs = report.programs.map((p) => ({
        id: p.id,
        title: p.title,
        start: p.planned.start,
        end: p.planned.end,
        category: p.category,
        typeDiffusion: p.typeDiffusion,
        duration: p.duration,
        days: p.days,
        description: p.description,
      }))
      await exportWeekToPdf(programs as any)
    } catch (error) {
      console.error('Erreur export PDF:', error)
      setExportError("L’export PDF n’a pas pu être généré. Réessayez.")
    } finally {
      setGenerating(false)
    }
  }

  const handleExportCSV = () => {
    if (!report) return
    const csvData = [
      ['Rapport Diffusion', report.gridName],
      ['Période', `${report.period.start} - ${report.period.end}`],
      [''],
      ['Résumé'],
      ['Total Programmes', report.summary.totalPrograms],
      ['Durée cumulée des fiches de programme (minutes)', report.summary.plannedMinutes],
      ['Fiches au statut diffusé ou en direct', report.summary.programsMarkedAired],
      ['Part des fiches au statut diffusé ou en direct', `${report.summary.complianceRate.toFixed(1)}%`],
      ['Incidents', report.summary.incidentsCount],
      ['Écarts', report.summary.deviationsCount],
      ['Publicités', report.summary.adsCount],
      ['Publicités Manquées', report.summary.adsMissed],
      [''],
      ['Programmes'],
      ['Titre', 'Début Prévu', 'Fin Prévue', 'Statut'],
      ...report.programs.map((p) => [p.title, p.planned.start, p.planned.end, p.status]),
    ]

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rapport-diffusion-${report.gridId}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins > 0 ? mins : ''}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" text="Génération du rapport..." />
      </div>
    )
  }

  if (error && !report) {
    return (
      <Card variant="elevated" className="p-8 sm:p-12 text-center" style={{ color: 'var(--card-text)' }}>
        <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-red-400 mb-4" />
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Impossible de générer le rapport</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <Button variant="outline" size="sm" onClick={generateReport} className="mt-4">
          Réessayer
        </Button>
      </Card>
    )
  }

  if (!report) {
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in" style={{ color: 'var(--card-text)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Rapport de Diffusion</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {report.gridName} • {new Date(report.period.start).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} -{' '}
            {new Date(report.period.end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Indicateurs calculés sur l’ensemble de la grille ; le statut d’une fiche ne décrit pas chaque diffusion récurrente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="accent"
            onClick={handleExportPDF}
            leftIcon={<FileText className="w-3 h-3 sm:w-4 sm:h-4" />}
            isLoading={generating}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportCSV} 
            leftIcon={<Download className="w-3 h-3 sm:w-4 sm:h-4" />}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={generateReport} 
            leftIcon={<BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sm:hidden">🔄</span>
          </Button>
        </div>
      </div>

      {exportError && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Échec de l’export PDF : {exportError}</span>
            <Button variant="outline" size="sm" onClick={() => void handleExportPDF()} disabled={generating}>
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Résumé */}
      <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
          Définition des indicateurs
        </summary>
        <div className="mt-3">
          <IndicatorDefinitions />
        </div>
      </details>
      <Card variant="elevated" className="hidden p-4 sm:p-5 md:block" style={{ color: 'var(--card-text)' }}>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>Définition des indicateurs</p>
          <IndicatorDefinitions />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4 sm:p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Programmes planifiés</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {report.summary.totalPrograms}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {formatDuration(report.summary.plannedMinutes)} cumulées sur les fiches, sans répéter les jours programmés
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-4 sm:p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }} title="Part des fiches dont le statut est Diffusé, Terminé ou En direct">
                Fiches au statut diffusé / en direct
              </p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {report.summary.complianceRate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {report.summary.programsMarkedAired} sur {report.summary.totalPrograms} fiches
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(report.summary.complianceRate, 100)}%` }}
            />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 sm:p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Incidents</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {report.summary.incidentsCount}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-4 sm:p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Écarts</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {report.summary.deviationsCount}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <TrendingDown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents */}
        <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Incidents ({report.incidents.length})
            </h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {report.incidents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun incident</p>
            ) : (
              report.incidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={incident.severity === 'CRITICAL' ? 'error' : incident.severity === 'MEDIUM' ? 'warning' : 'info'}
                      size="sm"
                    >
                      {incident.severity}
                    </Badge>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(incident.time).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{incident.description}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Écarts */}
        <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Écarts ({report.deviations.length})
            </h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {report.deviations.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun écart</p>
            ) : (
              report.deviations.map((deviation) => (
                <div 
                  key={deviation.id} 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="warning" size="sm">
                      {deviation.type}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {deviation.planned.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{deviation.justification}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Publicités */}
      <Card variant="elevated" className="p-6" style={{ color: 'var(--card-text)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Publicités ({report.adLogs.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.adLogs.length === 0 ? (
            <p className="text-sm col-span-full" style={{ color: 'var(--text-secondary)' }}>Aucune publicité</p>
          ) : (
            report.adLogs.map((ad) => (
              <div 
                key={ad.id} 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={ad.status === 'MISSED' ? 'error' : 'success'} size="sm">
                    {ad.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ad.spotTitle}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ad.advertiser}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

export default BroadcastReportView
