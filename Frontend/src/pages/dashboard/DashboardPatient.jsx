import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Calendar, Video, FileText, ClipboardList, Clock, Search, ArrowRight, CheckCircle, Heart, Stethoscope, Pill, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { appointmentsApi, consultationsApi, documentsApi, prescriptionsApi, messagesApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, StatCard } from '@/components/ui/Card'
import { AppointmentBadge } from '@/components/common/StatusBadge'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import Button from '@/components/ui/Button'
import { formatDate, formatDateLabel, CONSULTATION_TYPES } from '@/utils/helpers'

export default function DashboardPatient() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: upcoming = [], isLoading } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn:  () => appointmentsApi.list({ status: 'confirmed', date_from: new Date().toISOString().split('T')[0] }).then(r => r.data.data ?? []),
  })

  // Stats patient pour les indicateurs de suivi
  const { data: allAppointments } = useQuery({
    queryKey: ['appointments', 'all-patient'],
    queryFn: () => appointmentsApi.list({ per_page: 100 }).then(r => r.data),
  })

  const { data: consultationsList } = useQuery({
    queryKey: ['consultations', 'all-patient'],
    queryFn: () => consultationsApi.list({ per_page: 100 }).then(r => r.data),
  })

  const { data: documentsData } = useQuery({
    queryKey: ['documents', 'patient'],
    queryFn: () => documentsApi.list().then(r => r.data),
  })

  const { data: prescriptionsData } = useQuery({
    queryKey: ['prescriptions', 'patient'],
    queryFn: () => prescriptionsApi.list().then(r => r.data),
  })

  const { data: unreadData } = useQuery({
    queryKey: ['messages', 'unread-patient'],
    queryFn: () => messagesApi.unreadCount().then(r => r.data?.data ?? r.data),
  })

  // Dériver les indicateurs
  const totalRdv = allAppointments?.data?.length ?? allAppointments?.meta?.pagination?.total ?? 0
  const totalConsultations = consultationsList?.data?.length ?? consultationsList?.meta?.pagination?.total ?? 0
  const totalDocs = documentsData?.data?.length ?? documentsData?.meta?.pagination?.total ?? 0
  const totalPrescriptions = prescriptionsData?.data?.length ?? prescriptionsData?.meta?.pagination?.total ?? 0
  const unreadMessages = unreadData?.unread_count ?? unreadData?.count ?? 0

  return (
    <AppLayout title="Tableau de bord">
      <div className="space-y-6 animate-fade-in">
        {/* Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 rounded-2xl p-6 text-white shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute bottom-0 right-20 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-white/70 text-sm font-medium">Bienvenue</p>
            <h2 className="text-2xl font-extrabold mt-1">{user?.first_name}</h2>
            <p className="mt-2 text-sm text-white/80">Comment vous sentez-vous aujourd'hui ?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => navigate('/directory')} variant="secondary" size="sm" icon={Search}
                className="!bg-white/15 !text-white border-white/20 hover:!bg-white/25 backdrop-blur-sm !rounded-xl">
                Trouver un médecin
              </Button>
              <Button onClick={() => navigate('/appointments')} variant="secondary" size="sm" icon={Calendar}
                className="!bg-white/15 !text-white border-white/20 hover:!bg-white/25 backdrop-blur-sm !rounded-xl">
                Mes rendez-vous
              </Button>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <Card>
          <CardHeader><h3 className="text-sm font-bold text-gray-800">Actions rapides</h3></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Search,       label: 'Chercher un médecin',   color: 'from-blue-400 to-blue-500',     to: '/directory' },
              { icon: Calendar,     label: 'Prendre un RDV',        color: 'from-emerald-400 to-green-500',  to: '/directory' },
              { icon: FileText,     label: 'Mes documents',         color: 'from-purple-400 to-purple-500',  to: '/documents' },
              { icon: ClipboardList,label: 'Mes ordonnances',       color: 'from-amber-400 to-orange-500',   to: '/prescriptions' },
              { icon: Video,        label: 'Mes consultations',     color: 'from-teal-400 to-teal-500',      to: '/consultations' },
              { icon: CheckCircle,  label: 'Mon dossier médical',   color: 'from-rose-400 to-red-500',       to: '/profile' },
            ].map(({ icon: Icon, label, color, to }) => (
              <button key={to + label} onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-gray-100/80 hover:border-gray-200 hover:shadow-md transition-all duration-200 group bg-white/60">
                <div className={`w-11 h-11 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Stats - Priority: upcoming first */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Calendar}     label="Prochains RDV"  value={upcoming.length}     color="blue" />
          <StatCard icon={Video}        label="Consultations"  value={totalConsultations}  color="purple" />
          <StatCard icon={FileText}     label="Documents"      value={totalDocs}           color="green" />
          <StatCard icon={ClipboardList}label="Ordonnances"    value={totalPrescriptions}  color="orange" />
        </div>

        <div className="grid lg:grid-cols-1 gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-400" />
                  Prochains rendez-vous
                </h3>
                <Button onClick={() => navigate('/appointments')} variant="ghost" size="sm" className="text-primary-600">
                  Voir tout <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {isLoading ? <LoadingPage /> : upcoming.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Aucun rendez-vous à venir</p>
                  <Button onClick={() => navigate('/directory')} size="sm">Prendre un RDV</Button>
                </div>
              ) : upcoming.map(apt => (
                <div key={apt.id} onClick={() => navigate(`/appointments/${apt.id}`)}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50/80 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200/80 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                    <Clock className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Dr. {apt.doctor?.last_name}</p>
                    <p className="text-xs text-gray-500">{CONSULTATION_TYPES[apt.type] ?? apt.type}</p>
                    <p className="text-xs text-primary-600 font-semibold mt-0.5">{apt.time ? `${formatDate(apt.date)} à ${apt.time}` : formatDateLabel(apt.date)}</p>
                  </div>
                  <AppointmentBadge status={apt.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Mon parcours santé */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-rose-400 to-red-500 rounded-lg flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              Mon parcours santé
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total rendez-vous',       value: totalRdv,             icon: Calendar,      color: 'from-blue-400 to-blue-500' },
                { label: 'Consultations',            value: totalConsultations,   icon: Stethoscope,   color: 'from-teal-400 to-teal-500' },
                { label: 'Ordonnances reçues',       value: totalPrescriptions,   icon: Pill,          color: 'from-amber-400 to-orange-500' },
                { label: 'Documents médicaux',       value: totalDocs,            icon: FileText,      color: 'from-purple-400 to-purple-500' },
                { label: 'Messages non lus',         value: unreadMessages,       icon: MessageSquare, color: 'from-pink-400 to-pink-500' },
                { label: 'RDV à venir',              value: upcoming.length,      icon: Clock,         color: 'from-emerald-400 to-green-500' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex flex-col items-center p-4 rounded-2xl border border-gray-100/80 bg-white/60 hover:shadow-md transition-all duration-200">
                  <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 shadow-md`}>
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <p className="text-xl font-extrabold text-gray-900">{value}</p>
                  <p className="text-2xs text-gray-500 text-center mt-1">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
