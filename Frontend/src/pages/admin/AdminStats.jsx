import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Activity, Users, Video, Calendar, TrendingUp,
  Heart, Stethoscope, MapPin, FileText, Pill,
  Share2, Building2, CheckCircle, XCircle, Clock, AlertTriangle, WifiOff
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { adminApi } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, StatCard } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/LoadingSpinner'

const PIE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

function IndicatorCard({ label, value, suffix = '', icon: Icon, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}{suffix}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function AdminStats() {
  const [visioPeriod, setVisioPeriod] = useState('24h')
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard().then(r => r.data.data),
    refetchInterval: 120_000,
  })
  const { data: visioMetrics } = useQuery({
    queryKey: ['admin', 'visio-metrics', visioPeriod],
    queryFn: () => adminApi.visioMetrics(visioPeriod).then(r => r.data.data),
    refetchInterval: 120_000,
  })

  if (isLoading) return <AppLayout title="Statistiques"><LoadingPage /></AppLayout>

  const health = stats?.health_indicators ?? {}
  const ehealth = stats?.ehealth_indicators ?? {}

  // Charts data
  const consultationsChart = [
    { name: 'Total', value: health.total_consultations ?? 0 },
    { name: 'Terminées', value: health.completed_consultations ?? 0 },
    { name: 'Aujourd\'hui', value: health.patients_seen_today ?? 0 },
    { name: 'Ce mois', value: health.patients_seen_month ?? 0 },
  ]

  const ratesChart = [
    { name: 'Complétion', value: health.completion_rate ?? 0 },
    { name: 'No-show', value: health.no_show_rate ?? 0 },
    { name: 'Annulation', value: health.cancellation_rate ?? 0 },
    { name: 'Urgences', value: health.urgent_rate ?? 0 },
  ]

  const genderData = [
    { name: 'Hommes', value: health.gender_distribution?.male ?? 0 },
    { name: 'Femmes', value: health.gender_distribution?.female ?? 0 },
  ]

  const ehealthChart = [
    { name: 'Téléexpertises', total: ehealth.total_teleexpertise ?? 0, repondu: ehealth.teleexpertise_answered ?? 0 },
    { name: 'Ordonnances', total: ehealth.e_prescriptions ?? 0, repondu: ehealth.e_prescriptions_signed ?? 0 },
    { name: 'Documents', total: ehealth.documents_uploaded ?? 0, repondu: ehealth.documents_month ?? 0 },
  ]

  return (
    <AppLayout title="Statistiques & Indicateurs">
      <div className="space-y-6 animate-fade-in">
        {/* Section 1: Vue globale */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" /> Vue d'ensemble
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users}      label="Utilisateurs" value={stats?.total_users ?? 0} color="blue" />
            <StatCard icon={Stethoscope} label="Médecins actifs" value={stats?.active_doctors ?? 0} color="teal" />
            <StatCard icon={Heart}      label="Patients"      value={stats?.total_patients ?? 0} color="red" />
            <StatCard icon={Building2}  label="Structures"    value={ehealth.structures_count ?? 0} color="green" />
          </div>
        </div>

        {/* Section 2: Indicateurs sanitaires */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" /> Indicateurs sanitaires
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <IndicatorCard icon={CheckCircle} label="Taux de complétion" value={health.completion_rate ?? 0} suffix="%" color="green" />
            <IndicatorCard icon={XCircle}     label="Taux de no-show" value={health.no_show_rate ?? 0} suffix="%" color="red" />
            <IndicatorCard icon={Clock}       label="Taux d'annulation" value={health.cancellation_rate ?? 0} suffix="%" color="yellow" />
            <IndicatorCard icon={AlertTriangle} label="Taux d'urgences" value={health.urgent_rate ?? 0} suffix="%" color="purple" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Bar chart consultations */}
            <Card>
              <CardHeader><h3 className="section-title">Consultations</h3></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultationsChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie chart genre */}
            <Card>
              <CardHeader><h3 className="section-title">Répartition patients par genre</h3></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 3: Indicateurs e-santé */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" /> Indicateurs e-Santé
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <IndicatorCard icon={Share2}   label="Taux réponse téléexpertise" value={ehealth.teleexpertise_response_rate ?? 0} suffix="%" color="blue" />
            <IndicatorCard icon={Pill}     label="Ordonnances signées"       value={`${ehealth.e_prescriptions_signed ?? 0}/${ehealth.e_prescriptions ?? 0}`} color="green" />
            <IndicatorCard icon={FileText} label="Documents ce mois"         value={ehealth.documents_month ?? 0} color="purple" />
            <IndicatorCard icon={MapPin}   label="Couverture régionale"      value={ehealth.geographic_coverage ?? 0} suffix=" régions" color="yellow" />
          </div>

          <Card>
            <CardHeader><h3 className="section-title">Téléexpertise & Documents (total vs traité)</h3></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ehealthChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="#6366f1" radius={[6,6,0,0]} />
                    <Bar dataKey="repondu" name="Traité" fill="#10b981" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3bis: Qualité visio */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-500" /> Qualité visio
            </h2>
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
              {['24h', '7d'].map((period) => (
                <button
                  key={period}
                  onClick={() => setVisioPeriod(period)}
                  className={`px-3 py-1 text-xs rounded-lg transition ${
                    visioPeriod === period
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <IndicatorCard
              icon={WifiOff}
              label="Échecs de jonction"
              value={visioMetrics?.join_fail_count ?? 0}
              color="red"
            />
            <IndicatorCard
              icon={TrendingUp}
              label="Reconnexions cumulées"
              value={visioMetrics?.reconnect_events ?? 0}
              color="yellow"
            />
            <IndicatorCard
              icon={AlertTriangle}
              label="Fallback audio-only"
              value={visioMetrics?.fallback_rate_percent_avg ?? 0}
              suffix="%"
              color="purple"
            />
            <IndicatorCard
              icon={CheckCircle}
              label="Score qualité session"
              value={visioMetrics?.session_quality_score_avg ?? 0}
              suffix="/100"
              color="green"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Basé sur {visioMetrics?.samples_count ?? 0} échantillon(s) de métriques visio ({visioPeriod}).
          </p>
          <Card className="mt-4">
            <CardHeader><h3 className="section-title">Tendance visio</h3></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visioMetrics?.trend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis yAxisId="left" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="session_quality_score"
                      name="Score qualité"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="join_fail_count"
                      name="Join fail"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="reconnect_events"
                      name="Reconnect"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Détails numériques */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-green-500" /> Détails médicaux
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <IndicatorCard icon={Calendar}       label="RDV ce mois"           value={stats?.appointments_month ?? 0} color="blue" />
            <IndicatorCard icon={AlertTriangle}   label="RDV urgents"           value={health.urgent_appointments ?? 0} color="red" />
            <IndicatorCard icon={Stethoscope}    label="Diagnostics posés"     value={health.diagnostics_count ?? 0} color="green" />
            <IndicatorCard icon={FileText}       label="Examens réalisés"      value={health.examens_count ?? 0} color="purple" />
          </div>
        </div>

        {/* Ratio */}
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
            <Users className="w-7 h-7 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Ratio médecin / patient</p>
            <p className="text-3xl font-bold text-gray-900">{health.doctor_patient_ratio ?? 0}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-gray-600">Régions avec patients</p>
            <p className="text-3xl font-bold text-gray-900">{ehealth.regions_with_patients ?? 0}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
