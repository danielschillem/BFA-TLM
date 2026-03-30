import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MonitorDot, Upload, RefreshCw, Search, ExternalLink, Eye, Trash2, CheckCircle2, XCircle, HardDrive, Info } from 'lucide-react'
import { dicomApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, StatCard } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

const MODALITY_LABELS = {
  CR: 'Radiographie',
  CT: 'Tomodensitométrie',
  MR: 'IRM',
  US: 'Échographie',
  DX: 'Radiographie numérique',
  NM: 'Médecine nucléaire',
  PT: 'TEP (PET Scan)',
  XA: 'Angiographie',
  MG: 'Mammographie',
  OT: 'Autre',
}

const MODALITY_COLORS = {
  CR: 'bg-blue-100 text-blue-700',
  CT: 'bg-purple-100 text-purple-700',
  MR: 'bg-green-100 text-green-700',
  US: 'bg-teal-100 text-teal-700',
  DX: 'bg-orange-100 text-orange-700',
  NM: 'bg-red-100 text-red-700',
  PT: 'bg-pink-100 text-pink-700',
  XA: 'bg-indigo-100 text-indigo-700',
  MG: 'bg-rose-100 text-rose-700',
  OT: 'bg-gray-100 text-gray-700',
}

const STATUS_LABELS = {
  recu:       { label: 'Reçu',       color: 'bg-yellow-100 text-yellow-700' },
  en_lecture: { label: 'En lecture',  color: 'bg-blue-100 text-blue-700' },
  lu:         { label: 'Lu',         color: 'bg-green-100 text-green-700' },
  valide:     { label: 'Validé',     color: 'bg-emerald-100 text-emerald-700' },
}

export default function DicomViewer() {
  const [search, setSearch] = useState('')
  const [modality, setModality] = useState('')
  const [selectedStudy, setSelectedStudy] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [syncPatientId, setSyncPatientId] = useState('')
  const queryClient = useQueryClient()

  // Health check
  const { data: health } = useQuery({
    queryKey: ['dicom', 'health'],
    queryFn: () => dicomApi.health().then(r => r.data),
    staleTime: 60 * 1000,
  })

  // Studies list
  const { data: studiesData, isLoading } = useQuery({
    queryKey: ['dicom', 'studies', search, modality],
    queryFn: () => dicomApi.listStudies({ search, modality, per_page: 50 }).then(r => r.data),
  })

  const studies = studiesData?.data ?? studiesData ?? []
  const pacsOnline = health?.status === 'ok' || health?.data?.status === 'ok'

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData()
      formData.append('file', file)
      return dicomApi.upload(formData)
    },
    onSuccess: () => {
      setShowUpload(false)
      setUploadFile(null)
      queryClient.invalidateQueries({ queryKey: ['dicom', 'studies'] })
    },
  })

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => dicomApi.sync({ patient_id: syncPatientId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dicom', 'studies'] })
    },
  })

  const totalStudies = Array.isArray(studies) ? studies.length : studiesData?.meta?.total ?? 0
  const modalityStats = (Array.isArray(studies) ? studies : []).reduce((acc, s) => {
    acc[s.modality] = (acc[s.modality] || 0) + 1
    return acc
  }, {})

  return (
    <AppLayout title="DICOM — Imagerie médicale">
      <div className="space-y-5 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={MonitorDot} label="Études DICOM" value={totalStudies} color="blue" />
          <StatCard icon={HardDrive} label="PACS (dcm4chee)" value={pacsOnline ? 'En ligne' : 'Hors ligne'} color={pacsOnline ? 'green' : 'red'} />
          <StatCard icon={Eye} label="Modalités" value={Object.keys(modalityStats).length} color="purple" />
          <StatCard icon={Upload} label="Protocoles" value="QIDO/WADO/STOW" color="teal" />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher étude, patient, description…"
              className="input-field pl-9 w-full"
            />
          </div>
          <select
            value={modality}
            onChange={e => setModality(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Toutes modalités</option>
            {Object.entries(MODALITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{k} — {v}</option>
            ))}
          </select>
          <Button onClick={() => setShowUpload(true)} variant="primary" size="sm" icon={Upload}>Uploader</Button>
          <div className="flex items-center gap-2">
            <input
              value={syncPatientId}
              onChange={e => setSyncPatientId(e.target.value)}
              placeholder="ID patient (sync)"
              className="input-field text-sm w-36"
            />
            <Button onClick={() => syncMutation.mutate()} variant="outline" size="sm" icon={RefreshCw} loading={syncMutation.isPending}>
              Sync PACS
            </Button>
          </div>
        </div>

        {/* Sync result */}
        {syncMutation.isSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Synchronisation terminée — {syncMutation.data?.data?.synced ?? syncMutation.data?.data?.data?.synced ?? 0} étude(s) synchronisée(s)
          </div>
        )}
        {syncMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Erreur de synchronisation : {syncMutation.error?.response?.data?.message || 'PACS inaccessible'}
          </div>
        )}

        {/* Study list */}
        {isLoading ? <LoadingPage /> : (Array.isArray(studies) ? studies : []).length === 0 ? (
          <EmptyState icon={MonitorDot} title="Aucune étude DICOM" description="Aucun examen d'imagerie trouvé. Uploadez ou synchronisez depuis le PACS." />
        ) : (
          <div className="space-y-2">
            {(Array.isArray(studies) ? studies : []).map(study => {
              const status = STATUS_LABELS[study.statut] ?? STATUS_LABELS.recu
              return (
                <div
                  key={study.id}
                  className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setSelectedStudy(study)}
                >
                  {/* Modality badge */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex-shrink-0 ${MODALITY_COLORS[study.modality] ?? MODALITY_COLORS.OT}`}>
                    {study.modality}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {study.study_description || study.description || MODALITY_LABELS[study.modality] || 'Étude DICOM'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {study.patient?.nom} {study.patient?.prenom}
                      {study.study_date && ` · ${new Date(study.study_date).toLocaleDateString('fr-FR')}`}
                      {study.body_part_examined && ` · ${study.body_part_examined}`}
                    </p>
                  </div>

                  {/* Status */}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {study.viewer_url && (
                      <a href={study.viewer_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        onClick={e => e.stopPropagation()}
                        title="Ouvrir dans OHIF Viewer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Détails">
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <Modal open onClose={() => { setShowUpload(false); setUploadFile(null) }} title="Uploader un fichier DICOM" size="md">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
                <MonitorDot className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    {uploadFile ? uploadFile.name : 'Choisir un fichier .dcm'}
                  </span>
                  <input
                    type="file"
                    accept=".dcm,application/dicom"
                    className="hidden"
                    onChange={e => setUploadFile(e.target.files[0])}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">Format DICOM (.dcm) uniquement</p>
              </div>
              {uploadMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {uploadMutation.error?.response?.data?.message || 'Erreur lors de l\'upload.'}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowUpload(false); setUploadFile(null) }}>Annuler</Button>
                <Button
                  variant="primary"
                  onClick={() => uploadFile && uploadMutation.mutate(uploadFile)}
                  loading={uploadMutation.isPending}
                  disabled={!uploadFile}
                  icon={Upload}
                >
                  Envoyer au PACS
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Study Detail Modal */}
        {selectedStudy && (
          <Modal open onClose={() => setSelectedStudy(null)} title="Détail de l'étude DICOM" size="lg">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Study UID" value={selectedStudy.study_instance_uid} mono />
                <InfoField label="Modalité" value={`${selectedStudy.modality} — ${MODALITY_LABELS[selectedStudy.modality] ?? ''}`} />
                <InfoField label="Description" value={selectedStudy.study_description || selectedStudy.description} />
                <InfoField label="Date de l'étude" value={selectedStudy.study_date ? new Date(selectedStudy.study_date).toLocaleDateString('fr-FR') : '—'} />
                <InfoField label="Partie du corps" value={selectedStudy.body_part_examined} />
                <InfoField label="Statut" value={STATUS_LABELS[selectedStudy.statut]?.label ?? selectedStudy.statut} />
                <InfoField label="Nombre de séries" value={selectedStudy.number_of_series} />
                <InfoField label="Nombre d'instances" value={selectedStudy.number_of_instances} />
                {selectedStudy.interpretation && (
                  <div className="col-span-2">
                    <InfoField label="Interprétation" value={selectedStudy.interpretation} />
                  </div>
                )}
              </div>
              {selectedStudy.viewer_url && (
                <a href={selectedStudy.viewer_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir dans OHIF Viewer
                </a>
              )}
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  )
}

function InfoField({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-900 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value || '—'}</p>
    </div>
  )
}
