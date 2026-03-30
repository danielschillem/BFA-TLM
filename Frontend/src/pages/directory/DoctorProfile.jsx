import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Phone, Mail, Video, Calendar, Clock, ChevronLeft, Star, CheckCircle, Globe } from 'lucide-react'
import { directoryApi, appointmentsApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingPage, Spinner } from '@/components/common/LoadingSpinner'
import Button from '@/components/ui/Button'
import { getInitials, CONSULTATION_TYPES } from '@/utils/helpers'

export default function DoctorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['directory', id],
    queryFn: () => directoryApi.getDoctor(id).then(r => r.data.data),
  })

  // Récupérer les prochains créneaux disponibles
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', id],
    queryFn: () => appointmentsApi.availableSlots({ doctor_id: id, date_from: today, date_to: nextWeek }).then(r => r.data.data ?? r.data ?? []),
    enabled: !!id,
  })

  if (isLoading) return <AppLayout title="Médecin"><LoadingPage /></AppLayout>
  if (!doctor)   return <AppLayout title="Médecin"><div className="text-center py-12 text-gray-400">Médecin introuvable</div></AppLayout>

  const structureName = doctor.structure?.name
  const serviceName = doctor.service?.name

  return (
    <AppLayout title={`Dr. ${doctor.last_name}`}>
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        {/* Retour */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Retour à l'annuaire
        </button>

        {/* Carte principale */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                {getInitials(`${doctor.first_name} ${doctor.last_name}`)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Dr. {doctor.first_name} {doctor.last_name}</h1>
                    <p className="text-primary-600 font-medium">{doctor.specialty ?? 'Médecin généraliste'}</p>
                    {serviceName && <p className="text-sm text-gray-500">{serviceName}</p>}
                  </div>
                  {doctor.status === 'active' && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-full px-2.5 py-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Actif
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                  {structureName && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {structureName}</span>
                  )}
                  {doctor.matricule && (
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Mat. {doctor.matricule}</span>
                  )}
                  {doctor.email && (
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {doctor.email}</span>
                  )}
                  {doctor.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {doctor.phone}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Informations */}
          <Card>
            <CardHeader><h3 className="section-title">Informations</h3></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">Téléconsultation</span>
                </div>
                <span className="text-sm font-semibold text-green-600">Disponible</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">Présentiel</span>
                </div>
                <span className="text-sm font-semibold text-green-600">Disponible</span>
              </div>
            </CardContent>
          </Card>

          {/* Structure */}
          <Card>
            <CardHeader><h3 className="section-title">Rattachement</h3></CardHeader>
            <CardContent>
              {structureName ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">{structureName}</p>
                  {serviceName && <p className="text-sm text-gray-500">Service : {serviceName}</p>}
                  {doctor.matricule && <p className="text-xs text-gray-400 mt-2">Matricule : {doctor.matricule}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Non renseigné</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Créneaux disponibles */}
        <Card>
          <CardHeader><h3 className="section-title flex items-center gap-2"><Clock className="w-4 h-4 text-primary-500" /> Prochaines disponibilités</h3></CardHeader>
          <CardContent>
            {slotsLoading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : !slotsData || (Array.isArray(slotsData) && slotsData.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-3">Aucun créneau configuré pour les 7 prochains jours</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(slotsData) ? slotsData : Object.entries(slotsData).flatMap(([date, times]) =>
                  (Array.isArray(times) ? times : []).map(t => ({ date, time: t }))
                )).slice(0, 12).map((slot, i) => {
                  const d = slot.date || slot.day
                  const t = slot.time || slot.start_time || slot.heure
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary-50 text-primary-700 text-xs font-medium border border-primary-100">
                      <Calendar className="w-3 h-3" /> {d} {t && `à ${t}`}
                    </span>
                  )
                })}
                {((Array.isArray(slotsData) ? slotsData.length : Object.keys(slotsData).length) > 12) && (
                  <span className="text-xs text-gray-400 self-center ml-1">+ autres créneaux…</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="sticky bottom-4">
          <div className="bg-white rounded-lg shadow-card border border-gray-100 p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1">
              {doctor.status === 'active' ? (
                <p className="text-sm font-medium text-green-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                  Disponible pour téléconsultation
                </p>
              ) : (
                <p className="text-sm text-gray-400">Vérifiez les disponibilités</p>
              )}
            </div>
            <Button onClick={() => navigate(`/directory/${id}/book`)} size="lg" icon={Calendar} className="w-full sm:w-auto">
              Prendre rendez-vous
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
