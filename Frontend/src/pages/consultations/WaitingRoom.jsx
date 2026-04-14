import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Mic,
  Camera,
  Wifi,
  MapPin,
  Calendar,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { consultationsApi, appointmentsApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import ConsentModal from "@/components/consultation/ConsentModal";
import { formatDateTime, CONSULTATION_TYPES } from "@/utils/helpers";
import logoImg from "@/assets/logo.jpeg";

const CHECKS = [
  { id: "camera", label: "Caméra", icon: Camera },
  { id: "mic", label: "Microphone", icon: Mic },
  { id: "network", label: "Connexion réseau", icon: Wifi },
];

export default function WaitingRoom() {
  const { id } = useParams(); // appointment id
  const navigate = useNavigate();
  const { isDoctor } = useAuthStore();
  const [checks, setChecks] = useState({
    camera: "pending",
    mic: "pending",
    network: "pending",
  });
  const [elapsed, setElapsed] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const { data: apt, isLoading } = useQuery({
    queryKey: ["appointments", id],
    queryFn: () => appointmentsApi.get(id).then((r) => r.data.data),
    refetchInterval: 10_000,
  });

  const isTeleconsultation = apt?.type !== "presentiel";

  // Auto-navigate patient to consultation room when doctor starts
  useEffect(() => {
    if (!apt || isDoctor()) return;
    if (apt.status === "in_progress" && apt.consultation_id) {
      if (isTeleconsultation) {
        navigate(`/consultations/${apt.consultation_id}/room`, {
          replace: true,
        });
      } else {
        navigate(`/consultations/${apt.consultation_id}/physical`, {
          replace: true,
        });
      }
    }
  }, [apt, isDoctor, isTeleconsultation, navigate]);

  // Run device checks (only for teleconsultation)
  useEffect(() => {
    if (!isTeleconsultation) return;
    const runChecks = async () => {
      setChecks((c) => ({ ...c, network: navigator.onLine ? "ok" : "fail" }));
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setChecks((c) => ({ ...c, camera: "ok", mic: "ok" }));
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
          setChecks((c) => ({ ...c, camera: "fail", mic: "fail" }));
        } else {
          setChecks((c) => ({ ...c, camera: "warn", mic: "ok" }));
        }
      }
    };
    runChecks();
  }, [isTeleconsultation]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const startMutation = useMutation({
    mutationFn: () => consultationsApi.start({ appointment_id: id }),
    onSuccess: (res) => {
      const consultationId =
        res.data?.data?.consultation?.id ?? res.data?.data?.id;
      const jitsiToken = res.data?.jitsi_token ?? null;
      if (!consultationId) {
        toast.error("Réponse inattendue du serveur.");
        return;
      }
      if (isTeleconsultation) {
        navigate(`/consultations/${consultationId}/room`, {
          state: { jitsiToken },
        });
      } else {
        toast.success("Consultation physique démarrée");
        navigate(`/consultations/${consultationId}/physical`);
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Erreur au démarrage"),
  });

  const consentMutation = useMutation({
    mutationFn: (data) => appointmentsApi.recordConsent(id, data),
    onSuccess: () => {
      setConsentGiven(true);
      setShowConsent(false);
      toast.success("Consentement enregistré");
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message ??
          "Erreur lors de l'enregistrement du consentement",
      ),
  });

  const allChecksOk = Object.values(checks).every((v) => v === "ok");
  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  if (isLoading)
    return (
      <AppLayout title="Salle d'attente">
        <LoadingPage />
      </AppLayout>
    );
  if (!apt)
    return (
      <AppLayout title="Salle d'attente">
        <EmptyState
          icon={AlertCircle}
          title="Rendez-vous introuvable"
          description="Impossible de charger les données du rendez-vous."
        />
      </AppLayout>
    );

  return (
    <AppLayout
      title={
        isTeleconsultation
          ? "Salle d'attente virtuelle"
          : "Préparation consultation"
      }
    >
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        {/* Bannière */}
        <div
          className={`rounded-2xl p-8 text-white text-center ${
            isTeleconsultation
              ? "bg-gradient-to-br from-primary-500 to-primary-700"
              : "bg-gradient-to-br from-emerald-500 to-emerald-700"
          }`}
        >
          <div className="relative inline-flex mb-4">
            <img
              src={logoImg}
              alt="LiptakoCare"
              className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
            />
            {isTeleconsultation && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-400" />
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold">
            {isTeleconsultation
              ? "Salle d'attente virtuelle"
              : "Consultation physique"}
          </h2>
          <p className="text-white/80 text-sm mt-1">
            {isTeleconsultation
              ? isDoctor()
                ? `En attente du patient · ${minutes}:${seconds}`
                : `En attente du médecin · ${minutes}:${seconds}`
              : (CONSULTATION_TYPES[apt?.type] ?? "Consultation")}
          </p>
          {isTeleconsultation && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-white/60 text-xs">
              <Shield className="w-3 h-3" />
              <span>Transmission sécurisée · LiptakoCare Live</span>
            </div>
          )}
        </div>

        {/* Infos RDV */}
        {apt && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  {isDoctor() ? (
                    <>
                      <p className="font-medium text-gray-900">
                        {apt.patient?.full_name ??
                          `${apt.patient?.first_name ?? ""} ${apt.patient?.last_name ?? ""}`.trim()}
                      </p>
                      <p className="text-sm text-gray-500">Patient</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900">
                        {apt.doctor?.full_name ??
                          `Dr. ${apt.doctor?.first_name ?? ""} ${apt.doctor?.last_name ?? ""}`.trim()}
                      </p>
                      <p className="text-sm text-primary-600">
                        {apt.doctor?.specialty}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {/* Date / heure */}
              <div className="flex items-center gap-2 text-sm text-gray-500 pt-1 border-t border-gray-100">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {apt.date
                    ? formatDateTime(`${apt.date}T${apt.time ?? "00:00"}`)
                    : "—"}
                </span>
                <span className="ml-auto text-xs bg-gray-100 text-gray-600 rounded-lg px-2 py-0.5">
                  {CONSULTATION_TYPES[apt.type] ?? apt.type}
                </span>
              </div>
              {apt.reason && (
                <div className="text-sm text-gray-500 pt-1 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Motif :</span>{" "}
                  {apt.reason}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vérifications techniques (téléconsultation uniquement) */}
        {isTeleconsultation && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Vérification technique
              </p>
              {CHECKS.map(({ id: cid, label, icon: Icon }) => {
                const state = checks[cid];
                return (
                  <div key={cid} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-600">
                      {label}
                    </span>
                    {state === "pending" && (
                      <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
                    )}
                    {state === "ok" && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {state === "fail" && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {state === "warn" && (
                      <AlertCircle className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                );
              })}
              {!allChecksOk && (
                <p className="text-xs text-orange-600 bg-orange-50 rounded-lg p-2 mt-2">
                  Autorisez l'accès à la caméra et au microphone pour une
                  meilleure expérience.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info consultation physique */}
        {!isTeleconsultation && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Informations pratiques
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                {apt?.structure?.name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>
                      Structure :{" "}
                      <span className="font-medium text-gray-800">
                        {apt.structure.name}
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>
                    Le patient doit se présenter au lieu de consultation
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consentement patient */}
        {!isDoctor() && !consentGiven && (
          <Button
            onClick={() => setShowConsent(true)}
            className="w-full"
            size="lg"
            icon={Shield}
          >
            Donner mon consentement
          </Button>
        )}
        {!isDoctor() && consentGiven && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl p-3">
            <CheckCircle className="w-4 h-4" />
            Consentement enregistré
          </div>
        )}

        {/* Action — médecin démarre */}
        {isDoctor() && (
          <Button
            onClick={() => startMutation.mutate()}
            loading={startMutation.isPending}
            className="w-full"
            size="lg"
            icon={isTeleconsultation ? Video : CheckCircle}
          >
            {isTeleconsultation
              ? "Démarrer la téléconsultation"
              : "Démarrer la consultation"}
          </Button>
        )}
        {/* Patient attend */}
        {!isDoctor() && isTeleconsultation && consentGiven && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4 animate-pulse text-primary-400" />
              Le médecin va démarrer la session…
            </div>
          </div>
        )}
      </div>

      {/* Modal de consentement */}
      <ConsentModal
        open={showConsent}
        onClose={() => setShowConsent(false)}
        onAccept={(data) => consentMutation.mutate(data)}
        loading={consentMutation.isPending}
        appointmentType={apt?.type}
      />
    </AppLayout>
  );
}
