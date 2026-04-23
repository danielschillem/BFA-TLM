import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Video,
  FileText,
  ClipboardList,
  Clock,
  Search,
  ArrowRight,
  CheckCircle,
  Heart,
  Stethoscope,
  Pill,
  MessageSquare,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import {
  appointmentsApi,
  consultationsApi,
  documentsApi,
  prescriptionsApi,
  messagesApi,
} from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui/Card";
import { AppointmentBadge } from "@/components/common/StatusBadge";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import {
  formatDate,
  formatDateLabel,
  CONSULTATION_TYPES,
} from "@/utils/helpers";

export default function DashboardPatient() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: upcoming = [], isLoading } = useQuery({
    queryKey: ["appointments", "upcoming"],
    queryFn: () =>
      appointmentsApi
        .list({
          status: "confirmed",
          date_from: new Date().toISOString().split("T")[0],
        })
        .then((r) => r.data.data ?? []),
  });

  // Stats patient pour les indicateurs de suivi
  const { data: allAppointments } = useQuery({
    queryKey: ["appointments", "all-patient"],
    queryFn: () => appointmentsApi.list({ per_page: 100 }).then((r) => r.data),
  });

  const { data: consultationsList } = useQuery({
    queryKey: ["consultations", "all-patient"],
    queryFn: () => consultationsApi.list({ per_page: 100 }).then((r) => r.data),
  });

  const { data: documentsData } = useQuery({
    queryKey: ["documents", "patient"],
    queryFn: () => documentsApi.list().then((r) => r.data),
  });

  const { data: prescriptionsData } = useQuery({
    queryKey: ["prescriptions", "patient"],
    queryFn: () => prescriptionsApi.list().then((r) => r.data),
  });

  const { data: unreadData } = useQuery({
    queryKey: ["messages", "unread-patient"],
    queryFn: () =>
      messagesApi.unreadCount().then((r) => r.data?.data ?? r.data),
  });

  // Dériver les indicateurs
  const totalRdv =
    allAppointments?.data?.length ??
    allAppointments?.meta?.pagination?.total ??
    0;
  const totalConsultations =
    consultationsList?.data?.length ??
    consultationsList?.meta?.pagination?.total ??
    0;
  const totalDocs =
    documentsData?.data?.length ?? documentsData?.meta?.pagination?.total ?? 0;
  const totalPrescriptions =
    prescriptionsData?.data?.length ??
    prescriptionsData?.meta?.pagination?.total ??
    0;
  const unreadMessages = unreadData?.unread_count ?? unreadData?.count ?? 0;

  return (
    <AppLayout title="Tableau de bord">
      <div className="space-y-6 animate-fade-in">
        {/* Hero Card */}
        <div className="bg-primary-500 rounded-lg p-6 text-white">
          <div>
            <p className="text-primary-100 text-sm">Bienvenue</p>
            <h2 className="text-2xl font-semibold mt-1">{user?.first_name}</h2>
            <p className="mt-2 text-sm text-primary-100">
              Comment vous sentez-vous aujourd'hui ?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => navigate("/directory")}
                variant="secondary"
                size="sm"
                icon={Search}
                className="!bg-white/15 !text-white hover:!bg-white/25"
              >
                Trouver un médecin
              </Button>
              <Button
                onClick={() => navigate("/appointments")}
                variant="secondary"
                size="sm"
                icon={Calendar}
                className="!bg-white/15 !text-white hover:!bg-white/25"
              >
                Mes rendez-vous
              </Button>
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
                icon: Search,
                label: "Chercher un médecin",
                color: "text-blue-500",
                bg: "bg-blue-50",
                to: "/directory",
              },
              {
                icon: Calendar,
                label: "Prendre un RDV",
                color: "text-green-500",
                bg: "bg-green-50",
                to: "/directory",
              },
              {
                icon: FileText,
                label: "Mes documents",
                color: "text-purple-500",
                bg: "bg-purple-50",
                to: "/documents",
              },
              {
                icon: ClipboardList,
                label: "Mes ordonnances",
                color: "text-amber-500",
                bg: "bg-amber-50",
                to: "/prescriptions",
              },
              {
                icon: Video,
                label: "Mes consultations",
                color: "text-teal-500",
                bg: "bg-teal-50",
                to: "/consultations",
              },
              {
                icon: CheckCircle,
                label: "Mon dossier médical",
                color: "text-gray-500",
                bg: "bg-gray-100",
                to: "/profile",
              },
            ].map(({ icon: Icon, label, color, bg, to }) => (
              <button
                key={to + label}
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

        {/* Stats - Priority: upcoming first */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            label="Prochains RDV"
            value={upcoming.length}
            color="blue"
          />
          <StatCard
            icon={Video}
            label="Consultations"
            value={totalConsultations}
            color="purple"
          />
          <StatCard
            icon={FileText}
            label="Documents"
            value={totalDocs}
            color="green"
          />
          <StatCard
            icon={ClipboardList}
            label="Ordonnances"
            value={totalPrescriptions}
            color="orange"
          />
        </div>

        <div className="grid lg:grid-cols-1 gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Prochains rendez-vous
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
              {isLoading ? (
                <LoadingPage />
              ) : upcoming.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">
                    Aucun rendez-vous à venir
                  </p>
                  <Button onClick={() => navigate("/directory")} size="sm">
                    Prendre un RDV
                  </Button>
                </div>
              ) : (
                upcoming.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Dr. {apt.doctor?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {CONSULTATION_TYPES[apt.type] ?? apt.type}
                      </p>
                      <p className="text-xs text-primary-600 font-medium mt-0.5">
                        {apt.time
                          ? `${formatDate(apt.date)} à ${apt.time}`
                          : formatDateLabel(apt.date)}
                      </p>
                    </div>
                    <AppointmentBadge status={apt.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mon parcours santé */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              Mon parcours santé
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  label: "Total rendez-vous",
                  value: totalRdv,
                  icon: Calendar,
                  color: "text-blue-500",
                  bg: "bg-blue-50",
                },
                {
                  label: "Consultations",
                  value: totalConsultations,
                  icon: Stethoscope,
                  color: "text-teal-500",
                  bg: "bg-teal-50",
                },
                {
                  label: "Ordonnances reçues",
                  value: totalPrescriptions,
                  icon: Pill,
                  color: "text-amber-500",
                  bg: "bg-amber-50",
                },
                {
                  label: "Documents médicaux",
                  value: totalDocs,
                  icon: FileText,
                  color: "text-purple-500",
                  bg: "bg-purple-50",
                },
                {
                  label: "Messages non lus",
                  value: unreadMessages,
                  icon: MessageSquare,
                  color: "text-pink-500",
                  bg: "bg-pink-50",
                },
                {
                  label: "RDV à venir",
                  value: upcoming.length,
                  icon: Clock,
                  color: "text-green-500",
                  bg: "bg-green-50",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-2`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-2xs text-gray-500 text-center mt-1">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
