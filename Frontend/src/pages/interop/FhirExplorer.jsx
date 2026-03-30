import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, FileJson, User, Stethoscope, Building2, Calendar, FlaskConical, Heart, Pill, ClipboardList, ShieldCheck, MonitorDot, ChevronDown, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { fhirApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

const RESOURCE_TYPES = [
  { type: 'Patient',              icon: User,          color: 'blue',   label: 'Patient',              fn: 'searchPatient' },
  { type: 'Practitioner',         icon: Stethoscope,   color: 'green',  label: 'Praticien',            fn: 'searchPractitioner' },
  { type: 'Organization',         icon: Building2,     color: 'purple', label: 'Organisation',         fn: 'searchOrganization' },
  { type: 'Encounter',            icon: Calendar,      color: 'orange', label: 'Consultation',         fn: 'searchEncounter' },
  { type: 'Observation',          icon: Heart,         color: 'red',    label: 'Observation',          fn: 'searchObservation' },
  { type: 'Condition',            icon: ClipboardList, color: 'teal',   label: 'Diagnostic',           fn: 'searchCondition' },
  { type: 'AllergyIntolerance',   icon: ShieldCheck,   color: 'orange', label: 'Allergie',             fn: 'searchAllergyIntolerance' },
  { type: 'MedicationRequest',    icon: Pill,          color: 'blue',   label: 'Prescription',         fn: 'searchMedicationRequest' },
  { type: 'DiagnosticReport',     icon: FlaskConical,  color: 'purple', label: 'Rapport diagnostique', fn: 'searchDiagnosticReport' },
  { type: 'Appointment',          icon: Calendar,      color: 'green',  label: 'Rendez-vous',          fn: 'searchAppointment' },
  { type: 'Consent',              icon: ShieldCheck,   color: 'teal',   label: 'Consentement',         fn: 'searchConsent' },
  { type: 'ImagingStudy',         icon: MonitorDot,    color: 'red',    label: 'Étude imagerie',       fn: 'searchImagingStudy' },
]

const COLORS = {
  blue:   'bg-blue-50 text-blue-600 border-blue-200',
  green:  'bg-green-50 text-green-600 border-green-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red:    'bg-red-50 text-red-600 border-red-200',
  teal:   'bg-teal-50 text-teal-600 border-teal-200',
}

function JsonViewer({ data, level = 0 }) {
  const [collapsed, setCollapsed] = useState(level > 1)

  if (data === null || data === undefined) return <span className="text-gray-400">null</span>
  if (typeof data === 'boolean') return <span className="text-purple-600">{String(data)}</span>
  if (typeof data === 'number') return <span className="text-blue-600">{data}</span>
  if (typeof data === 'string') {
    if (data.startsWith('http')) return <a href={data} target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-900 break-all">{data}</a>
    return <span className="text-green-700">"{data}"</span>
  }

  const isArray = Array.isArray(data)
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data)
  if (entries.length === 0) return <span className="text-gray-400">{isArray ? '[]' : '{}'}</span>

  return (
    <div className="ml-4">
      <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-0.5 text-xs">
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>{isArray ? `[${entries.length}]` : `{${entries.length}}`}</span>
      </button>
      {!collapsed && (
        <div className="border-l border-gray-200 ml-1 pl-2 space-y-0.5">
          {entries.map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-gray-800 font-medium">{isArray ? `[${key}]` : key}</span>
              <span className="text-gray-400 mx-1">:</span>
              <JsonViewer data={value} level={level + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FhirExplorer() {
  const [activeType, setActiveType] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState(null)
  const [patientId, setPatientId] = useState('')

  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ['fhir', 'metadata'],
    queryFn: () => fhirApi.metadata().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const activeConfig = RESOURCE_TYPES.find(r => r.type === activeType)

  const { data: resources, isLoading: resourcesLoading, refetch } = useQuery({
    queryKey: ['fhir', activeType, searchTerm],
    queryFn: () => {
      const params = { _count: 50 }
      if (searchTerm) params.name = searchTerm
      return fhirApi[activeConfig.fn](params).then(r => r.data)
    },
    enabled: !!activeType,
  })

  const { data: everything, isLoading: everythingLoading } = useQuery({
    queryKey: ['fhir', 'everything', patientId],
    queryFn: () => fhirApi.patientEverything(patientId).then(r => r.data),
    enabled: !!patientId,
  })

  const entries = resources?.entry ?? []
  const everythingEntries = everything?.entry ?? []

  return (
    <AppLayout title="FHIR R4 — Explorateur">
      <div className="space-y-5 animate-fade-in">
        {/* Metadata */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">HL7 FHIR R4</h2>
                  <p className="text-xs text-gray-500">
                    {metaLoading ? 'Chargement…' : `${metadata?.rest?.[0]?.resource?.length ?? 0} types de ressources · FHIR ${metadata?.fhirVersion ?? '4.0.1'}`}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">Actif</span>
            </div>
          </CardHeader>
        </Card>

        {/* Resource type picker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {RESOURCE_TYPES.map(({ type, icon: Icon, color, label }) => (
            <button
              key={type}
              onClick={() => { setActiveType(type); setSearchTerm(''); setPatientId('') }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-[13px] font-medium ${
                activeType === type
                  ? `${COLORS[color]} border-current shadow-sm`
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {/* Search & Results */}
        {activeType && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={`Rechercher ${activeConfig?.label}…`}
                    className="input-field pl-9 w-full"
                  />
                </div>
                <Button onClick={() => refetch()} variant="outline" size="sm" icon={RefreshCw}>Actualiser</Button>
              </div>
            </CardHeader>
            <CardContent>
              {resourcesLoading ? <LoadingPage /> : entries.length === 0 ? (
                <EmptyState icon={FileJson} title="Aucune ressource" description={`Aucun ${activeConfig?.label} trouvé.`} />
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {entries.map((entry, i) => {
                    const resource = entry.resource ?? entry
                    const display = resource.name?.[0]?.text
                      || resource.name?.[0]?.family
                      || resource.code?.text
                      || resource.code?.coding?.[0]?.display
                      || resource.type?.[0]?.text
                      || resource.description
                      || resource.subject?.display
                      || resource.id
                    return (
                      <div key={i}
                        className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedResource(resource)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{display}</p>
                          <p className="text-xs text-gray-500">
                            {resource.resourceType}/{resource.id}
                            {resource.meta?.lastUpdated && ` · ${new Date(resource.meta.lastUpdated).toLocaleDateString('fr-FR')}`}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Patient $everything */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">Patient/$everything — Dossier complet FHIR</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <input
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                placeholder="ID patient (ex: 1)"
                className="input-field flex-1"
              />
              <Button variant="primary" size="sm" disabled={!patientId} loading={everythingLoading}
                onClick={() => {/* query auto-triggers */}}>
                Charger
              </Button>
            </div>
            {everythingLoading ? <LoadingPage /> : everythingEntries.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2">{everythingEntries.length} ressource(s) dans le Bundle</p>
                {everythingEntries.map((entry, i) => {
                  const r = entry.resource ?? entry
                  return (
                    <div key={i}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => setSelectedResource(r)}
                    >
                      <div>
                        <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded mr-2">{r.resourceType}</span>
                        <span className="text-sm text-gray-700">{r.code?.text || r.code?.coding?.[0]?.display || r.name?.[0]?.text || r.description || r.id}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )
                })}
              </div>
            ) : patientId ? (
              <EmptyState icon={User} title="Aucune donnée" description="Aucune ressource FHIR trouvée pour ce patient." />
            ) : null}
          </CardContent>
        </Card>

        {/* JSON Viewer Modal */}
        {selectedResource && (
          <Modal open onClose={() => setSelectedResource(null)} title={`${selectedResource.resourceType}/${selectedResource.id}`} size="lg">
            <div className="bg-gray-50 rounded-lg p-4 max-h-[60vh] overflow-auto font-mono text-xs">
              <JsonViewer data={selectedResource} />
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  )
}
