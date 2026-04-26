import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Video,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Activity,
  Star,
  Heart,
  Stethoscope,
  ClipboardList,
  TrendingUp,
  Pill,
  Share2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { consultationsApi, appointmentsApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui/Card";
import { AppointmentBadge } from "@/components/common/StatusBadge";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import {
  formatDateLabel,
  formatDateTime,
  CONSULTATION_TYPES,
} from "@/utils/helpers";

const extractCollection = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function DashboardDoctor() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: dashData, isLoading: statsLoading } = useQuery({
    queryKey: ["consultations", "dashboard"],
    queryFn: () => consultationsApi.dashboard().then((r) => r.data.data),
  });

  const stats = dashData?.stats;

  const { data: today = [], isLoading: aptsLoading } = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () => {
      const todayDate = new Date().toISOString().split("T")[0];
      return appointmentsApi
        .list({
          status: "confirmed",
          date_from: todayDate,
          date_to: todayDate,
        })
        .then((r) => extractCollection(r));
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["consultations", "pending-reports"],
    queryFn: () =>
      consultationsApi
        .list({ status: "completed" })
        .then((r) => extractCollection(r)),
  });

  const health = dashData?.health_indicators;
  const ehealth = dashData?.ehealth_indicators;

  return (
    <AppLayout title="Tableau de bord">
      <div className="space-y-6 animate-fade-in">
        {/* Bienvenue médecin - Hero Card */}
        <div className="bg-primary-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Bienvenue</p>
              <h2 className="text-2xl font-semibold mt-1">
                Dr. {user?.last_name}
              </h2>
              <p className="mt-2 text-sm text-primary-100">
                {today.length > 0
                  ? `${today.length} consultation${
                      today.length > 1 ? "s" : ""
                    } programmée${today.length > 1 ? "s" : ""} aujourd'hui`
                  : "Aucune consultation programmée aujourd'hui"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => navigate("/appointments")}
                  variant="secondary"
                  size="sm"
                  icon={Calendar}
                  className="!bg-white/15 !text-white hover:!bg-white/25"
                >
                  Mon agenda
                </Button>
                <Button
                  onClick={() => navigate("/teleexpertise")}
                  variant="secondary"
                  size="sm"
                  icon={Users}
                  className="!bg-white/15 !text-white hover:!bg-white/25"
                >
                  Téléexpertise
                </Button>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-medium">En ligne</span>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-800">
              Actions rapides
            </h3>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                icon: Calendar,
                label: "Mon agenda",
                color: "text-blue-500",
                bg: "bg-blue-50",
                to: "/appointments",
              },
              {
                icon: Video,
                label: "Consultations",
                color: "text-teal-500",
                bg: "bg-teal-50",
                to: "/consultations",
              },
              {
                icon: Users,
                label: "Téléexpertise",
                color: "text-purple-500",
                bg: "bg-purple-50",
                to: "/teleexpertise",
              },
              {
                icon: FileText,
                label: "Documents",
                color: "text-green-500",
                bg: "bg-green-50",
                to: "/documents",
              },
              {
                icon: Activity,
                label: "Mes patients",
                color: "text-red-500",
                bg: "bg-red-50",
                to: "/patients",
              },
              {
                icon: CheckCircle,
                label: "Mon profil",
                color: "text-amber-500",
                bg: "bg-amber-50",
                to: "/profile",
              },
            ].map(({ icon: Icon, label, color, bg, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
              >
                <div
                  className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-xs font-medium text-gray-600 text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Stats - Priority order: Urgent first */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={AlertCircle}
            label="RDV en attente"
            value={statsLoading ? "…" : stats?.pending_appointments ?? 0}
            color="orange"
          />
          <StatCard
            icon={Star}
            label="Aujourd'hui"
            value={statsLoading ? "…" : stats?.today_consultations ?? 0}
            color="purple"
          />
          <StatCard
            icon={Video}
            label="Consultations (mois)"
            value={statsLoading ? "…" : stats?.this_month ?? 0}
            color="teal"
          />
          <StatCard
            icon={CheckCircle}
            label="Rapports complétés"
            value={statsLoading ? "…" : stats?.signed_reports ?? 0}
            color="green"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Consultations du jour
                </h3>
                <Button
                  onClick={() => navigate("/appointments")}
                  variant="ghost"
                  size="sm"
                  className="text-primary-600"
                >
                  Voir tout <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {aptsLoading ? (
                <LoadingPage />
              ) : today.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Aucune consultation aujourd'hui
                  </p>
                </div>
              ) : (
                today.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {CONSULTATION_TYPES[apt.type] ?? apt.type}
                      </p>
                      <p className="text-xs text-teal-600 font-medium mt-0.5">
                        {apt.time
                          ? `${apt.date} à ${apt.time}`
                          : formatDateTime(apt.date)}
                      </p>
                    </div>
                    <AppointmentBadge status={apt.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Rapports en attente
                </h3>
                {reports.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                    {reports.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {reports.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Tous les rapports sont à jour
                  </p>
                </div>
              ) : (
                reports.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/consultations/${c.id}/report`)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors border border-amber-100"
                  >
                    <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {c.patient_record?.patient?.first_name ??
                          c.appointment?.patient?.first_name}{" "}
                        {c.patient_record?.patient?.last_name ??
                          c.appointment?.patient?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateLabel(c.date)}
                      </p>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 flex-shrink-0"
                    >
                      Rédiger
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Indicateurs sanitaires & e-santé */}
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                Indicateurs sanitaires
              </h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "Patients suivis",
                  value: health?.unique_patients ?? "—",
                  icon: Users,
                  color: "text-blue-500",
                  bg: "bg-blue-50",
                },
                {
                  label: "Taux de complétion consultations",
                  value:
                    health?.completion_rate != null
                      ? `${health.completion_rate}%`
                      : "—",
                  icon: CheckCircle,
                  color: "text-green-500",
                  bg: "bg-green-50",
                },
                {
                  label: "Taux d'absences (no-show)",
                  value:
                    health?.no_show_rate != null
                      ? `${health.no_show_rate}%`
                      : "—",
                  icon: AlertCircle,
                  color: "text-amber-500",
                  bg: "bg-amber-50",
                },
                {
                  label: "Taux d'urgences",
                  value:
                    health?.urgent_rate != null
                      ? `${health.urgent_rate}%`
                      : "—",
                  icon: Activity,
                  color: "text-red-500",
                  bg: "bg-red-50",
                },
                {
                  label: "Diagnostics posés",
                  value: health?.diagnostics_count ?? "—",
                  icon: Stethoscope,
                  color: "text-purple-500",
                  bg: "bg-purple-50",
                },
                {
                  label: "Examens demandés",
                  value: health?.examens_requested ?? "—",
                  icon: ClipboardList,
                  color: "text-teal-500",
                  bg: "bg-teal-50",
                },
                {
                  label: "Moy. prescriptions / consultation",
                  value: health?.avg_prescriptions_per_consultation ?? "—",
                  icon: Pill,
                  color: "text-pink-500",
                  bg: "bg-pink-50",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                Indicateurs e-santé
              </h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "Ordonnances électroniques",
                  value: health?.prescriptions_count ?? "—",
                  icon: ClipboardList,
                  color: "text-blue-500",
                  bg: "bg-blue-50",
                },
                {
                  label: "Ordonnances signées",
                  value: health?.prescriptions_signed ?? "—",
                  icon: CheckCircle,
                  color: "text-green-500",
                  bg: "bg-green-50",
                },
                {
                  label: "Taux signature e-ordonnances",
                  value:
                    health?.e_prescription_rate != null
                      ? `${health.e_prescription_rate}%`
                      : "—",
                  icon: Pill,
                  color: "text-teal-500",
                  bg: "bg-teal-50",
                },
                {
                  label: "Téléexpertises envoyées",
                  value: ehealth?.teleexpertise_sent ?? "—",
                  icon: Share2,
                  color: "text-purple-500",
                  bg: "bg-purple-50",
                },
                {
                  label: "Téléexpertises reçues",
                  value: ehealth?.teleexpertise_received ?? "—",
                  icon: Stethoscope,
                  color: "text-amber-500",
                  bg: "bg-amber-50",
                },
                {
                  label: "Taux de réponse téléexpertise",
                  value:
                    ehealth?.teleexpertise_response_rate != null
                      ? `${ehealth.teleexpertise_response_rate}%`
                      : "—",
                  icon: TrendingUp,
                  color: "text-green-500",
                  bg: "bg-green-50",
                },
                {
                  label: "Documents partagés",
                  value: ehealth?.documents_shared ?? "—",
                  icon: FileText,
                  color: "text-gray-500",
                  bg: "bg-gray-100",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
