import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Video,
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Settings,
  Heart,
  Stethoscope,
  MapPin,
  FileText,
  Pill,
  Share2,
  Building2,
  Key,
  Cog,
} from "lucide-react";
import { adminApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/utils/helpers";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminApi.dashboard().then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const { data: announcements } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () =>
      adminApi.publicAnnouncements().then((r) => r.data.data ?? []),
  });

  const pendingDoctors = stats?.pending_verifications ?? 0;

  const health = stats?.health_indicators;
  const ehealth = stats?.ehealth_indicators;

  return (
    <AppLayout title="Administration">
      <div className="space-y-6 animate-fade-in">
        {/* Header Hero */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-primary-900 to-primary-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute bottom-0 right-32 w-24 h-24 rounded-full bg-primary-500/10" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 bg-primary-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-primary-400/20">
                  <ShieldCheck className="w-5 h-5 text-primary-300" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Administration
                </h2>
              </div>
              <p className="text-gray-400 text-sm">
                Vue d'ensemble de la plateforme · Burkina Faso
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => navigate("/admin/users")}
                  variant="secondary"
                  size="sm"
                  icon={Users}
                  className="!bg-white/10 !text-white border-white/10 hover:!bg-white/20 backdrop-blur-sm !rounded-xl"
                >
                  Utilisateurs
                </Button>
                <Button
                  onClick={() => navigate("/admin/audit")}
                  variant="secondary"
                  size="sm"
                  icon={ShieldCheck}
                  className="!bg-white/10 !text-white border-white/10 hover:!bg-white/20 backdrop-blur-sm !rounded-xl"
                >
                  Journaux d'audit
                </Button>
              </div>
            </div>
            {pendingDoctors > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/15 backdrop-blur-sm border border-amber-400/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">
                  {pendingDoctors} médecin{pendingDoctors > 1 ? "s" : ""} à
                  vérifier
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats principales — Priorité : urgents d'abord */}
        {isLoading ? (
          <LoadingPage />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="text-left"
            >
              <StatCard
                icon={Users}
                label="Utilisateurs total"
                value={stats?.total_users ?? 0}
                color="blue"
                className="hover:shadow-md transition-shadow cursor-pointer"
              />
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/users?role=doctor&status=active")}
              className="text-left"
            >
              <StatCard
                icon={Activity}
                label="Médecins actifs"
                value={stats?.active_doctors ?? 0}
                color="teal"
                className="hover:shadow-md transition-shadow cursor-pointer"
              />
            </button>
            <button
              type="button"
              onClick={() => navigate("/consultations")}
              className="text-left"
            >
              <StatCard
                icon={Video}
                label="Consultations (mois)"
                value={stats?.consultations_month ?? 0}
                color="purple"
                className="hover:shadow-md transition-shadow cursor-pointer"
              />
            </button>
            <button
              type="button"
              onClick={() => navigate("/appointments")}
              className="text-left"
            >
              <StatCard
                icon={TrendingUp}
                label="RDV ce mois"
                value={stats?.appointments_month ?? 0}
                color="green"
                className="hover:shadow-md transition-shadow cursor-pointer"
              />
            </button>
          </div>
        )}

        {/* Actions rapides — en haut */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-gray-800">Actions rapides</h3>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                icon: Users,
                label: "Gérer les utilisateurs",
                to: "/admin/users",
                color: "from-blue-400 to-blue-500",
              },
              {
                icon: ShieldCheck,
                label: "Journaux d'audit",
                to: "/admin/audit",
                color: "from-purple-400 to-purple-500",
              },
              {
                icon: Activity,
                label: "Annonces système",
                to: "/admin/announcements",
                color: "from-emerald-400 to-green-500",
              },
              {
                icon: Building2,
                label: "Structures sanitaires",
                to: "/admin/structures",
                color: "from-teal-400 to-teal-500",
              },
              {
                icon: Key,
                label: "Licences",
                to: "/admin/licenses",
                color: "from-amber-400 to-orange-500",
              },
              {
                icon: Cog,
                label: "Paramètres",
                to: "/admin/settings",
                color: "from-gray-400 to-gray-500",
              },
            ].map(({ icon: Icon, label, to, color }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-gray-100/80 hover:border-gray-200 hover:shadow-md transition-all duration-200 group bg-white/60"
              >
                <div
                  className={`w-11 h-11 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Médecins en attente */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    Médecins en attente de vérification
                  </h3>
                  <Button
                    onClick={() => navigate("/admin/users?status=pending")}
                    variant="ghost"
                    size="sm"
                    className="text-primary-600"
                  >
                    Voir tout <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingPage />
                ) : (
                  <>
                    {(stats?.pending_doctors_list ?? []).length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="w-7 h-7 text-green-400" />
                        </div>
                        <p className="text-sm text-gray-500">
                          Aucun médecin en attente
                        </p>
                      </div>
                    ) : (
                      (stats?.pending_doctors_list ?? [])
                        .slice(0, 5)
                        .map((doctor) => (
                          <div
                            key={doctor.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 border-b border-gray-50 last:border-0 group"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-sm">
                              {doctor.first_name?.[0]}
                              {doctor.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                Dr. {doctor.first_name} {doctor.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doctor.specialty ??
                                  "Spécialité non renseignée"}
                              </p>
                            </div>
                            <Button
                              onClick={() => navigate(`/admin/users?userId=${doctor.id}`)}
                              size="xs"
                              variant="outline"
                            >
                              Vérifier
                            </Button>
                          </div>
                        ))
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* KPIs */}
          <div>
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-gray-800">
                  Indicateurs clés
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Utilisateurs actifs",
                    value: stats?.active_users ?? "—",
                    color: "bg-green-500",
                  },
                  {
                    label: "Patients inscrits",
                    value: stats?.active_patients ?? "—",
                    color: "bg-blue-500",
                  },
                  {
                    label: "Total consultations",
                    value: stats?.consultations_month ?? "—",
                    color: "bg-purple-500",
                  },
                  {
                    label: "Total RDV (mois)",
                    value: stats?.appointments_month ?? "—",
                    color: "bg-teal-500",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      {value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Indicateurs sanitaires & e-santé */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-rose-400 to-red-500 rounded-lg flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-white" />
                </div>
                Indicateurs sanitaires
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    label: "Taux de complétion",
                    value: `${health?.completion_rate ?? 0}%`,
                    color: "from-emerald-400 to-green-500",
                  },
                  {
                    label: "Taux d'absences",
                    value: `${health?.no_show_rate ?? 0}%`,
                    color: "from-amber-400 to-orange-500",
                  },
                  {
                    label: "Taux d'annulation",
                    value: `${health?.cancellation_rate ?? 0}%`,
                    color: "from-rose-400 to-red-500",
                  },
                  {
                    label: "Taux d'urgences",
                    value: `${health?.urgent_rate ?? 0}%`,
                    color: "from-purple-400 to-purple-500",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className={`p-3.5 rounded-xl bg-gradient-to-br ${color} text-white text-center shadow-md`}
                  >
                    <p className="text-2xl font-extrabold">{value}</p>
                    <p className="text-xs text-white/80 mt-1 font-medium">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-gray-100 pt-3">
                {[
                  {
                    label: "Patients vus aujourd'hui",
                    value: health?.patients_seen_today ?? 0,
                    icon: Users,
                    color: "from-blue-400 to-blue-500",
                  },
                  {
                    label: "Patients vus ce mois",
                    value: health?.patients_seen_month ?? 0,
                    icon: Users,
                    color: "from-teal-400 to-teal-500",
                  },
                  {
                    label: "Ratio médecin / patient",
                    value: health?.doctor_patient_ratio ?? "—",
                    icon: Stethoscope,
                    color: "from-purple-400 to-purple-500",
                  },
                  {
                    label: "Consultations terminées",
                    value: health?.completed_consultations ?? 0,
                    icon: CheckCircle,
                    color: "from-emerald-400 to-green-500",
                  },
                  {
                    label: "Diagnostics posés",
                    value: health?.diagnostics_count ?? 0,
                    icon: Stethoscope,
                    color: "from-amber-400 to-orange-500",
                  },
                  {
                    label: "Examens demandés",
                    value: health?.examens_count ?? 0,
                    icon: Activity,
                    color: "from-pink-400 to-pink-500",
                  },
                  {
                    label: "RDV urgents",
                    value: health?.urgent_appointments ?? 0,
                    icon: AlertCircle,
                    color: "from-rose-400 to-red-500",
                  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center shadow-sm`}
                      >
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {health?.gender_distribution && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Répartition par genre
                  </p>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-500" />
                      <span className="text-xs text-gray-700">
                        Hommes :{" "}
                        <strong>{health.gender_distribution.male ?? 0}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-400 to-pink-500" />
                      <span className="text-xs text-gray-700">
                        Femmes :{" "}
                        <strong>
                          {health.gender_distribution.female ?? 0}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                </div>
                Indicateurs e-santé & télémédecine
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    label: "Taux e-ordonnances signées",
                    value: `${ehealth?.e_prescription_rate ?? 0}%`,
                    color: "from-teal-400 to-teal-500",
                  },
                  {
                    label: "Taux réponse téléexpertise",
                    value: `${ehealth?.teleexpertise_response_rate ?? 0}%`,
                    color: "from-purple-400 to-purple-500",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className={`p-3.5 rounded-xl bg-gradient-to-br ${color} text-white text-center shadow-md`}
                  >
                    <p className="text-2xl font-extrabold">{value}</p>
                    <p className="text-xs text-white/80 mt-1 font-medium">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-gray-100 pt-3">
                {[
                  {
                    label: "Téléexpertises totales",
                    value: ehealth?.total_teleexpertise ?? 0,
                    icon: Share2,
                    color: "from-purple-400 to-purple-500",
                  },
                  {
                    label: "Téléexpertises répondues",
                    value: ehealth?.teleexpertise_answered ?? 0,
                    icon: CheckCircle,
                    color: "from-emerald-400 to-green-500",
                  },
                  {
                    label: "Téléexpertises ce mois",
                    value: ehealth?.teleexpertise_month ?? 0,
                    icon: TrendingUp,
                    color: "from-blue-400 to-blue-500",
                  },
                  {
                    label: "Ordonnances électroniques",
                    value: ehealth?.e_prescriptions ?? 0,
                    icon: Pill,
                    color: "from-teal-400 to-teal-500",
                  },
                  {
                    label: "Ordonnances signées",
                    value: ehealth?.e_prescriptions_signed ?? 0,
                    icon: CheckCircle,
                    color: "from-green-400 to-green-500",
                  },
                  {
                    label: "Documents uploadés",
                    value: ehealth?.documents_uploaded ?? 0,
                    icon: FileText,
                    color: "from-slate-400 to-slate-500",
                  },
                  {
                    label: "Documents ce mois",
                    value: ehealth?.documents_month ?? 0,
                    icon: FileText,
                    color: "from-blue-400 to-blue-500",
                  },
                  {
                    label: "Structures actives",
                    value: ehealth?.structures_count ?? 0,
                    icon: Building2,
                    color: "from-amber-400 to-orange-500",
                  },
                  {
                    label: "Couverture géographique (régions)",
                    value: ehealth?.geographic_coverage ?? 0,
                    icon: MapPin,
                    color: "from-rose-400 to-red-500",
                  },
                  {
                    label: "Régions avec patients",
                    value: ehealth?.regions_with_patients ?? 0,
                    icon: MapPin,
                    color: "from-teal-400 to-teal-500",
                  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center shadow-sm`}
                      >
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Annonces récentes */}
        {(announcements ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  Annonces récentes
                </h3>
                <Button
                  onClick={() => navigate("/admin/announcements")}
                  variant="ghost"
                  size="sm"
                  className="text-primary-600"
                >
                  Gérer <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcements.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50/60 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${a.type === "urgent" ? "bg-red-500 animate-pulse-slow" : "bg-blue-400"}`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
