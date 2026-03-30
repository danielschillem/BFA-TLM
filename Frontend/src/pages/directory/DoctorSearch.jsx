import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Star, Video, Filter, ChevronDown, X } from 'lucide-react'
import { directoryApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { getInitials } from '@/utils/helpers'

const SPECIALTIES = [
  'Médecine générale','Cardiologie','Pédiatrie','Gynécologie','Dermatologie',
  'Ophtalmologie','Neurologie','Psychiatrie','Orthopédie','Radiologie',
  'Infectiologie','Endocrinologie',
]

export default function DoctorSearch() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ search: '', specialty: '', consultation_type: '', city: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['directory', filters],
    queryFn: () => directoryApi.search(filters).then(r => r.data.data?.data ?? []),
    enabled: true,
  })

  const doctors = data ?? []

  const applySearch = () => setFilters(f => ({ ...f, search }))

  const clearFilters = () => {
    setFilters({ search: '', specialty: '', consultation_type: '', city: '' })
    setSearch('')
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <AppLayout title="Annuaire médical">
      <div className="space-y-5 animate-fade-in">
        {/* Barre de recherche */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
                placeholder="Chercher par nom, spécialité…"
                className="input-field pl-9 w-full"
              />
            </div>
            <Button onClick={applySearch} icon={Search}>Rechercher</Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(v => !v)}
              className="relative"
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Spécialité</label>
                <select
                  value={filters.specialty}
                  onChange={e => setFilters(f => ({ ...f, specialty: e.target.value }))}
                  className="input-field w-full text-sm"
                >
                  <option value="">Toutes les spécialités</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type de consultation</label>
                <select
                  value={filters.consultation_type}
                  onChange={e => setFilters(f => ({ ...f, consultation_type: e.target.value }))}
                  className="input-field w-full text-sm"
                >
                  <option value="">Tous types</option>
                  <option value="video">Vidéo</option>
                  <option value="in_person">Présentiel</option>
                  <option value="phone">Téléphone</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                <input
                  value={filters.city}
                  onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                  placeholder="Ouagadougou, Bobo…"
                  className="input-field w-full text-sm"
                />
              </div>
              {activeFiltersCount > 0 && (
                <div className="sm:col-span-3 flex justify-end">
                  <Button size="sm" variant="ghost" onClick={clearFilters} icon={X} className="text-gray-500">
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Résultats */}
        <div>
          <p className="text-sm text-gray-500 mb-3">
            {isLoading ? 'Recherche…' : `${doctors.length} médecin${doctors.length !== 1 ? 's' : ''} trouvé${doctors.length !== 1 ? 's' : ''}`}
          </p>
          {isLoading ? (
            <LoadingPage />
          ) : doctors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Aucun médecin trouvé</p>
                <p className="text-sm text-gray-500 mt-1">Essayez de modifier vos critères de recherche</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map(doc => (
                <DoctorCard key={doc.id} doctor={doc} onSelect={() => navigate(`/directory/${doc.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function DoctorCard({ doctor, onSelect }) {
  const structureName = doctor.structure?.name
  return (
    <div onClick={onSelect}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-primary-100 cursor-pointer transition-all">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {getInitials(`${doctor.first_name} ${doctor.last_name}`)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">Dr. {doctor.first_name} {doctor.last_name}</p>
          <p className="text-sm text-primary-600 truncate">{doctor.specialty ?? 'Médecin'}</p>
          {structureName && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {structureName}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {doctor.specialty && (
          <span className="text-xs bg-teal-50 text-teal-700 rounded-lg px-2 py-0.5 flex items-center gap-1">
            <Video className="w-3 h-3" /> Téléconsultation
          </span>
        )}
        {doctor.status === 'active' && (
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" title="Disponible" />
        )}
      </div>

      <Button className="mt-3 w-full" size="sm">
        Prendre rendez-vous
      </Button>
    </div>
  )
}
