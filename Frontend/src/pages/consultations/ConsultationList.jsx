import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Video, Clock, CheckCircle, XCircle, Search, Users, Calendar, Filter, MapPin } from 'lucide-react'
import { consultationsApi } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import { formatDate, formatTime } from '@/utils/helpers'

const STATUS_CONFIG = {
  en_cours:  { label: 'En cours',  color: 'text-blue-700 bg-blue-50',   icon: Video },
  planifiee: { label: 'Planifiée', color: 'text-yellow-700 bg-yellow-50', icon: Clock },
  terminee:  { label: 'Terminée',  color: 'text-green-700 bg-green-50', icon: CheckCircle },
  annulee:   { label: 'Annulée',   color: 'text-red-700 bg-red-50',     icon: XCircle },
  // EN keys from Resource
  in_progress: { label: 'En cours',  color: 'text-blue-700 bg-blue-50',   icon: Video },
  scheduled:   { label: 'Planifiée', color: 'text-yellow-700 bg-yellow-50', icon: Clock },
  completed:   { label: 'Terminée',  color: 'text-green-700 bg-green-50', icon: CheckCircle },
  cancelled:   { label: 'Annulée',   color: 'text-red-700 bg-red-50',     icon: XCircle },
}

const TYPE_LABELS = {
  teleconsultation: 'Téléconsultation',
  presentiel: 'Présentiel',
}

const TABS = [
  { value: '',           label: 'Toutes' },
  { value: 'en_cours',   label: 'En cours' },
  { value: 'planifiee',  label: 'Planifiées' },
  { value: 'terminee',   label: 'Terminées' },
  { value: 'annulee',    label: 'Annulées' },
]

export default function ConsultationList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isDoctor } = useAuthStore()
  const [activeTab, setActiveTab] = useState(searchParams.get('status') ?? '')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const { data, isLoading } = useQuery({
    queryKey: ['consultations', 'list', activeTab, search],
    queryFn: () => consultationsApi.list({
      status: activeTab || undefined,
      search: search || undefined,
    }).then(r => r.data.data ?? r.data ?? []),
  })

  const consultations = Array.isArray(data) ? data : []

  const getAction = (c) => {
    const status = c.status ?? c.statut
    if (status === 'en_cours' || status === 'in_progress') {
      return { label: 'Rejoindre', onClick: () => navigate(`/consultations/${c.id}/room`) }
    }
    if ((status === 'terminee' || status === 'completed') && isDoctor()) {
      return { label: 'Rapport', onClick: () => navigate(`/consultations/${c.id}/report`) }
    }
    if (status === 'terminee' || status === 'completed') {
      return { label: 'Détails', onClick: () => navigate(`/consultations/${c.id}/detail`) }
    }
    return null
  }

  return (
    <AppLayout title="Consultations">
      <div className="space-y-5 animate-fade-in">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par patient, médecin, motif…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? <LoadingPage /> : consultations.length === 0 ? (
          <EmptyState
            icon={Video}
            title="Aucune consultation"
            description={activeTab ? 'Aucune consultation avec ce statut.' : 'Vos consultations apparaîtront ici.'}
          />
        ) : (
          <div className="space-y-2">
            {consultations.map(c => {
              const status = c.status ?? c.statut ?? 'planifiee'
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.planifiee
              const StatusIcon = cfg.icon
              const action = getAction(c)
              const patientName = c.patient?.first_name
                ? `${c.patient.first_name} ${c.patient.last_name}`
                : c.patient_name ?? '—'
              const doctorName = c.doctor?.last_name
                ? `Dr. ${c.doctor.last_name}`
                : c.doctor_name ?? '—'

              return (
                <div key={c.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    {c.type === 'presentiel'
                      ? <MapPin className="w-5 h-5 text-emerald-600" />
                      : <Video className="w-5 h-5 text-primary-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {isDoctor() ? patientName : doctorName}
                      </p>
                      <span className={`text-xs rounded-full px-2 py-0.5 flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      {c.motif && <span>{c.motif}</span>}
                      {c.motif && <span>·</span>}
                      <span>{TYPE_LABELS[c.type] ?? c.type}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(c.date)} {c.heure_debut && `à ${c.heure_debut}`}
                      </span>
                    </div>
                  </div>
                  {action && (
                    <Button size="xs" onClick={action.onClick}>
                      {action.label}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
