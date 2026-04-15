import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  FileText,
  Maximize2,
  Minimize2,
  WifiOff,
  Clock,
  Video,
  Activity,
  ClipboardList,
  X,
  AlertTriangle,
  Pill,
  Stethoscope,
  Star,
  MessageSquare,
  Shield,
  Share2,
  Plus,
  FlaskConical,
  Trash2,
  Check,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  consultationsApi,
  patientRecordApi,
  diagnosticsApi,
  examensApi,
  prescriptionsApi,
  traitementsApi,
} from "@/api";
import { useAuthStore } from "@/stores/authStore";
import { useConsultationChannel } from "@/hooks/useWebSocket";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input, { Textarea, Select } from "@/components/ui/Input";
import logoImg from "@/assets/logo.jpeg";

// ── Jitsi configuration (meet.jit.si — serveur public, sans JWT) ─────────────
const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
const JITSI_SCRIPT_URL = `https://${JITSI_DOMAIN}/external_api.js`;

export default function ConsultationRoom() {
  const { id } = useParams(); // consultation id
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDoctor } = useAuthStore();
  const jitsiContainerRef = useRef(null);

  // WebSocket: écouter les events temps réel de la consultation
  useConsultationChannel(id ? Number(id) : null);

  const jitsiApiRef = useRef(null);
  const connectionStateRef = useRef("connecting");
  const observerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [connectionState, setConnectionState] = useState("connecting");
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  // Keep ref in sync for use inside closures/timeouts
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [showPatientRecord, setShowPatientRecord] = useState(false);
  const [showConsultForm, setShowConsultForm] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [participantCount, setParticipantCount] = useState(0);

  const [vitals, setVitals] = useState({
    weight: "",
    height: "",
    temperature: "",
    blood_pressure_systolic: "",
    blood_pressure_diastolic: "",
    heart_rate: "",
    respiratory_rate: "",
    spo2: "",
    glycemia: "",
  });

  const vitalsMutation = useMutation({
    mutationFn: (data) => consultationsApi.transmitParams(id, data),
    onSuccess: () => {
      toast.success("Paramètres vitaux enregistrés");
      setShowVitals(false);
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  // ── Consultation form state ─────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const [reportForm, setReportForm] = useState({
    chief_complaint: "",
    history: "",
    examination: "",
    diagnosis: "",
    treatment_plan: "",
    notes: "",
    follow_up_instructions: "",
  });
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showPrescModal, setShowPrescModal] = useState(false);
  const [showTraitModal, setShowTraitModal] = useState(false);

  const invalidateConsultation = () =>
    queryClient.invalidateQueries({ queryKey: ["consultations", id] });

  const saveReportMutation = useMutation({
    mutationFn: () =>
      consultationsApi.createReport(id, {
        title: `Compte-rendu consultation #${id}`,
        content: [
          reportForm.chief_complaint && `Motif: ${reportForm.chief_complaint}`,
          reportForm.history && `Anamnèse: ${reportForm.history}`,
          reportForm.examination && `Examen: ${reportForm.examination}`,
          reportForm.diagnosis && `Diagnostic: ${reportForm.diagnosis}`,
          reportForm.treatment_plan &&
            `Conduite à tenir: ${reportForm.treatment_plan}`,
          reportForm.notes && `Notes: ${reportForm.notes}`,
          reportForm.follow_up_instructions &&
            `Suivi: ${reportForm.follow_up_instructions}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        follow_up_instructions: reportForm.follow_up_instructions || null,
        structured_data: {
          chief_complaint: reportForm.chief_complaint || null,
          history: reportForm.history || null,
          examination: reportForm.examination || null,
          diagnosis: reportForm.diagnosis || null,
          treatment_plan: reportForm.treatment_plan || null,
          notes: reportForm.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Rapport sauvegardé");
      invalidateConsultation();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const deleteDiagnostic = useMutation({
    mutationFn: (dId) => diagnosticsApi.delete(dId),
    onSuccess: () => {
      toast.success("Diagnostic supprimé");
      invalidateConsultation();
    },
  });
  const deleteExamen = useMutation({
    mutationFn: (eId) => examensApi.delete(eId),
    onSuccess: () => {
      toast.success("Examen supprimé");
      invalidateConsultation();
    },
  });
  const deleteTraitement = useMutation({
    mutationFn: (tId) => traitementsApi.delete(tId),
    onSuccess: () => {
      toast.success("Traitement supprimé");
      invalidateConsultation();
    },
  });

  const handleVitalsSubmit = (e) => {
    e.preventDefault();
    // Map frontend keys to backend column names
    const keyMap = {
      weight: "poids",
      height: "taille",
      temperature: "temperature",
      blood_pressure_systolic: "tension_systolique",
      blood_pressure_diastolic: "tension_diastolique",
      heart_rate: "frequence_cardiaque",
      respiratory_rate: "frequence_respiratoire",
      spo2: "saturation_o2",
      glycemia: "glycemie",
    };
    const payload = {};
    Object.entries(vitals).forEach(([k, v]) => {
      if (v !== "" && keyMap[k]) payload[keyMap[k]] = Number(v);
    });
    if (Object.keys(payload).length === 0) {
      toast.error("Saisissez au moins un paramètre");
      return;
    }
    vitalsMutation.mutate(payload);
  };

  const { data: consultation, isLoading } = useQuery({
    queryKey: ["consultations", id],
    queryFn: () => consultationsApi.get(id).then((r) => r.data.data),
  });

  const patientId =
    consultation?.patient_record?.patient?.id ||
    consultation?.appointment?.patient?.id;
  const { data: patientRecord } = useQuery({
    queryKey: ["patient-record-sidebar", patientId],
    queryFn: () => patientRecordApi.get(patientId).then((r) => r.data.data),
    enabled: !!patientId && showPatientRecord,
  });

  const endMutation = useMutation({
    mutationFn: () => consultationsApi.end(id),
    onSuccess: () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
      }
      setShowEndConfirm(false);
      setShowConsultForm(false);
      setShowRating(true);
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });



  // Pre-fill report from existing data
  useEffect(() => {
    if (!consultation) return;
    const report = consultation.report;
    if (report) {
      const s = report.structured_data ?? {};
      setReportForm({
        chief_complaint: s.chief_complaint ?? "",
        history: s.history ?? "",
        examination: s.examination ?? "",
        diagnosis: s.diagnosis ?? "",
        treatment_plan: s.treatment_plan ?? "",
        notes: s.notes ?? "",
        follow_up_instructions: report.follow_up_instructions ?? "",
      });
    } else {
      setReportForm((f) => ({
        ...f,
        chief_complaint: consultation.reason ?? "",
      }));
    }
  }, [consultation?.id, consultation?.report]);

  const ratingMutation = useMutation({
    mutationFn: (data) => consultationsApi.rateVideoQuality(id, data),
    onSuccess: () => toast.success("Merci pour votre retour !"),
    onError: () => {}, // non-bloquant
    onSettled: () => {
      navigate(isDoctor() ? `/consultations/${id}/report` : "/appointments");
    },
  });

  const handleRatingSubmit = () => {
    if (rating > 0) {
      ratingMutation.mutate({ rating, comment: ratingComment || undefined });
    } else {
      navigate(isDoctor() ? `/consultations/${id}/report` : "/appointments");
    }
  };

  // ── Chrono ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Jitsi Meet via meet.jit.si (serveur public gratuit) ──────────────────────
  useEffect(() => {
    if (!consultation || !jitsiContainerRef.current) return;

    const fullRoomName = consultation.jitsi_room_name ?? `tlm-${consultation.id}`;

    const loadJitsi = () => {
      if (window.JitsiMeetExternalAPI) {
        initJitsi(fullRoomName);
      } else {
        const script = document.createElement("script");
        script.src = JITSI_SCRIPT_URL;
        script.async = true;
        script.onload = () => initJitsi(fullRoomName);
        script.onerror = () => {
          setConnectionState("disconnected");
          toast.error("Impossible de charger la visioconférence");
        };
        document.head.appendChild(script);
      }
    };

    const initJitsi = (roomName) => {
      if (!jitsiContainerRef.current) return;
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
      }

      // Construct displayName based on current user role
      // Le user connecté peut être médecin ou patient - utiliser ses propres infos
      const rawName =
        `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
      // Éviter le double "Dr." si le prénom contient déjà le titre
      const cleanName = rawName.replace(/^Dr\.?\s*/i, "").trim();
      const displayName = isDoctor()
        ? `Dr. ${cleanName || "Médecin"}`
        : rawName || "Patient";

      // Build consultation subject for header
      const patientName = consultation.patient_record?.patient
        ? `${consultation.patient_record.patient.first_name ?? ""} ${consultation.patient_record.patient.last_name ?? ""}`.trim()
        : consultation.appointment?.patient
          ? `${consultation.appointment.patient.first_name ?? ""} ${consultation.appointment.patient.last_name ?? ""}`.trim()
          : "";
      const doctorName = consultation.doctor?.last_name
        ? `Dr. ${consultation.doctor.last_name}`
        : consultation.appointment?.doctor?.last_name
          ? `Dr. ${consultation.appointment.doctor.last_name}`
          : "";
      const subject =
        patientName && doctorName
          ? `LiptakoCare Live · ${doctorName} — ${patientName}`
          : "LiptakoCare Live";

      // Toolbar buttons by role
      const toolbarButtons = isDoctor()
        ? [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "tileview",
            "fullscreen",
            "settings",
            "raisehand",
            "filmstrip",
            "select-background",
          ]
        : [
            "microphone",
            "camera",
            "chat",
            "tileview",
            "fullscreen",
            "raisehand",
            "select-background",
          ];

      try {
        const jitsiOptions = {
          roomName,
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName,
            email: user?.email ?? "",
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            enableNoisyMicDetection: true,
            enableClosePage: false,
            disableRemoteMute: !isDoctor(),
            defaultLanguage: "fr",
            // Restrictions médecin / patient
            disableScreenSharingForGuests: !isDoctor(),
            remoteVideoMenu: {
              disableKick: !isDoctor(),
              disableGrantModerator: true,
            },
            // Qualité & performance
            resolution: 720,
            constraints: {
              video: { height: { ideal: 720, max: 720, min: 360 } },
            },
            enableLayerSuspension: true,
            channelLastN: 2,
            // Sécurité & lobby
            enableLobbyChat: false,
            hideLobbyButton: true,
            // Notifications selectionnées
            notifications: [
              "connection.CONNFAIL",
              "dialog.micNotSendingData",
              "dialog.cameraNotSendingData",
            ],
            disabledNotifications: [
              "lobby.joinRejectedMessage",
              "lobby.notificationTitle",
            ],
            // Subject
            subject,
          },
          interfaceConfigOverwrite: {
            // Branding LiptakoCare / TLM-BFA
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: true,
            BRAND_WATERMARK_LINK: "",
            SHOW_POWERED_BY: false,
            TOOLBAR_ALWAYS_VISIBLE: true,
            DEFAULT_REMOTE_DISPLAY_NAME: "Participant",
            DEFAULT_LOCAL_DISPLAY_NAME: "Moi",
            APP_NAME: "LiptakoCare Live",
            NATIVE_APP_NAME: "LiptakoCare Live",
            PROVIDER_NAME: "TLM-BFA",
            LANG_DETECTION: false,
            // Toolbar
            TOOLBAR_BUTTONS: toolbarButtons,
            TOOLBAR_TIMEOUT: 4000,
            // Layouts
            FILM_STRIP_MAX_HEIGHT: 120,
            VERTICAL_FILMSTRIP: true,
            TILE_VIEW_MAX_COLUMNS: 2,
            // Disable unnecessary features
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            DISABLE_FOCUS_INDICATOR: false,
            DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
            DISABLE_VIDEO_BACKGROUND: false,
            HIDE_INVITE_MORE_HEADER: true,
            HIDE_DEEP_LINKING_LOGO: true,
            DISABLE_RINGING: true,
            // Feedback
            DISABLE_PRESENCE_STATUS: false,
          },
          width: "100%",
          height: "100%",
        };

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, jitsiOptions);

        jitsiApiRef.current = api;

        // Auto-dismiss overlay after 6s as fallback
        const dismissTimer = setTimeout(() => {
          setConnectionState((prev) => {
            if (prev === "connecting") return "connected";
            return prev;
          });
          setOverlayDismissed(true);
        }, 6000);

        // Watch for the iframe to appear (Jitsi creates it asynchronously)
        const container = jitsiContainerRef.current;
        if (container) {
          const onIframeReady = () => {
            setConnectionState((prev) =>
              prev === "connecting" ? "connected" : prev,
            );
            setOverlayDismissed(true);
          };
          // Check if already there
          const existingIframe = container.querySelector("iframe");
          if (existingIframe) {
            existingIframe.addEventListener("load", onIframeReady);
          } else {
            // Observe mutations to catch the iframe injection
            const observer = new MutationObserver((mutations) => {
              const iframe = container.querySelector("iframe");
              if (iframe) {
                observer.disconnect();
                observerRef.current = null;
                iframe.addEventListener("load", onIframeReady);
                // Also fire after a short delay in case load already fired
                setTimeout(onIframeReady, 3000);
              }
            });
            observerRef.current = observer;
            observer.observe(container, { childList: true, subtree: true });
          }
        }

        // Set subject after join
        api.addEventListener("videoConferenceJoined", () => {
          clearTimeout(dismissTimer);
          setConnectionState("connected");
          setOverlayDismissed(true);
          setParticipantCount((p) => p + 1);
          try {
            api.executeCommand("subject", subject);
          } catch {}
        });

        api.addEventListener("connectionEstablished", () => {
          setConnectionState("connected");
          setOverlayDismissed(true);
        });

        api.addEventListener("connectionFailed", () => {
          setConnectionState("poor");
          toast.warning("Connexion instable — tentative de reconnexion…");
          // Auto-reload after 10s if still degraded
          setTimeout(() => {
            const current = connectionStateRef.current;
            if (current === "poor" || current === "disconnected") {
              window.location.reload();
            }
          }, 10000);
        });

        api.addEventListener("videoConferenceLeft", () => {
          setConnectionState("disconnected");
        });

        api.addEventListener("participantJoined", () => {
          setParticipantCount((p) => p + 1);
          toast.info("Un participant a rejoint la salle");
        });

        api.addEventListener("participantLeft", () => {
          setParticipantCount((p) => Math.max(0, p - 1));
          toast.info("L'autre participant a quitté la salle");
        });

        // Network quality monitoring (Jitsi sends 1 = bad … 5 = excellent)
        api.addEventListener("videoQualityChanged", (e) => {
          if (e?.videoQuality <= 2) {
            setConnectionState("poor");
          } else if (e?.videoQuality >= 3) {
            setConnectionState("connected");
          }
        });
      } catch {
        setConnectionState("disconnected");
        toast.error("Erreur d'initialisation Jitsi");
      }
    };

    loadJitsi();

    return () => {
      if (observerRef.current) {
        try {
          observerRef.current.disconnect();
        } catch {}
        observerRef.current = null;
      }
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
        jitsiApiRef.current = null;
      }
    };
  }, [
    consultation?.id,
    consultation?.jitsi_room_name,
    user?.id,
    user?.first_name,
    user?.last_name,
  ]);

  const fmt = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // ── Loading / Not found ────────────────────────────────────────────────────
  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingPage />
      </div>
    );

  if (!consultation)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Consultation introuvable
      </div>
    );

  // Redirect physical consultations to dedicated page
  if (consultation.type === "presentiel") {
    navigate(`/consultations/${id}/physical`, { replace: true });
    return null;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`${isFullscreen ? "fixed inset-0 z-50" : "min-h-screen"} bg-gray-900 flex flex-col`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Branding */}
          <img
            src={logoImg}
            alt="LiptakoCare"
            className="h-7 w-7 rounded-md object-cover"
          />
          <span className="text-sm font-semibold text-white hidden md:inline">
            LiptakoCare
          </span>
          <span className="text-gray-600 hidden md:inline">|</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === "connected"
                  ? "bg-green-400 animate-pulse"
                  : connectionState === "poor"
                    ? "bg-orange-400 animate-pulse"
                    : connectionState === "disconnected"
                      ? "bg-red-400"
                      : "bg-yellow-400 animate-pulse"
              }`}
            />
            <span className="text-xs text-gray-300">
              {connectionState === "connected"
                ? "Connecté"
                : connectionState === "poor"
                  ? "Connexion instable"
                  : connectionState === "disconnected"
                    ? "Déconnecté"
                    : "Connexion en cours…"}
            </span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1 text-gray-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{fmt(duration)}</span>
          </div>
          {participantCount > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <div className="flex items-center gap-1 text-gray-300">
                <Video className="w-3.5 h-3.5" />
                <span className="text-xs">
                  {participantCount} participant
                  {participantCount > 1 ? "s" : ""}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="items-center gap-1 text-gray-400 text-xs hidden lg:flex">
            <Shield className="w-3 h-3" />
            <span>Chiffré</span>
          </div>
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Jitsi container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={jitsiContainerRef}
          data-jitsi-container
          className="absolute inset-0"
          style={{
            width:
              showPatientRecord || showConsultForm
                ? "calc(100% - 400px)"
                : "100%",
            height: "100%",
            transition: "width 0.3s",
          }}
        />

        {/* Patient record sidebar */}
        {showPatientRecord && (
          <div className="absolute top-0 right-0 w-[400px] h-full bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-400" /> Dossier
                patient
              </h3>
              <button
                onClick={() => setShowPatientRecord(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {!patientRecord ? (
              <div className="p-4 text-gray-400 text-sm text-center">
                Chargement…
              </div>
            ) : (
              <div className="p-3 space-y-4 text-sm">
                {/* Allergies */}
                <SidebarSection
                  title="Allergies"
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  items={patientRecord.allergies}
                  empty="Aucune allergie connue"
                  render={(a) => (
                    <div
                      key={a.id}
                      className="p-2 bg-red-900/20 rounded border border-red-900/30"
                    >
                      <span className="text-red-300 font-medium">
                        {a.allergen || a.allergenes}
                      </span>
                      {a.severity && (
                        <span className="ml-2 text-xs text-red-400">
                          {a.severity || a.severite}
                        </span>
                      )}
                    </div>
                  )}
                />
                {/* Antécédents */}
                <SidebarSection
                  title="Antécédents"
                  icon={<Stethoscope className="w-3.5 h-3.5 text-yellow-400" />}
                  items={patientRecord.antecedents}
                  empty="Aucun antécédent"
                  render={(a) => (
                    <div key={a.id} className="p-2 bg-gray-700/50 rounded">
                      <span className="text-gray-200">
                        {a.title || a.libelle}
                      </span>
                      {a.type && (
                        <span className="ml-2 text-xs text-gray-400">
                          {a.type}
                        </span>
                      )}
                    </div>
                  )}
                />
                {/* Traitements en cours */}
                <SidebarSection
                  title="Traitements en cours"
                  icon={<Pill className="w-3.5 h-3.5 text-green-400" />}
                  items={patientRecord.prescriptions?.filter(
                    (p) => p.status === "en_cours" || p.statut === "en_cours",
                  )}
                  empty="Aucun traitement en cours"
                  render={(p) => (
                    <div
                      key={p.id}
                      className="p-2 bg-green-900/20 rounded border border-green-900/30"
                    >
                      <span className="text-green-300">
                        {p.name || p.denomination}
                      </span>
                      {p.dosage && (
                        <span className="ml-2 text-xs text-green-400">
                          {p.dosage}
                        </span>
                      )}
                    </div>
                  )}
                />
                {/* Constantes récentes */}
                {patientRecord.constantes?.length > 0 && (
                  <div>
                    <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />{" "}
                      Dernières constantes
                    </h4>
                    {(() => {
                      const last = patientRecord.constantes[0];
                      return (
                        <div className="grid grid-cols-2 gap-1.5">
                          {last.poids && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">Poids</p>
                              <p className="text-white font-mono">
                                {last.poids} kg
                              </p>
                            </div>
                          )}
                          {last.taille && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">Taille</p>
                              <p className="text-white font-mono">
                                {last.taille} cm
                              </p>
                            </div>
                          )}
                          {last.tension_systolique && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">TA</p>
                              <p className="text-white font-mono">
                                {last.tension_systolique}/
                                {last.tension_diastolique}
                              </p>
                            </div>
                          )}
                          {last.frequence_cardiaque && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">FC</p>
                              <p className="text-white font-mono">
                                {last.frequence_cardiaque} bpm
                              </p>
                            </div>
                          )}
                          {last.temperature && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">T°</p>
                              <p className="text-white font-mono">
                                {last.temperature}°C
                              </p>
                            </div>
                          )}
                          {last.saturation_o2 && (
                            <div className="bg-gray-700/50 rounded p-1.5 text-center">
                              <p className="text-xs text-gray-400">SpO2</p>
                              <p className="text-white font-mono">
                                {last.saturation_o2}%
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* Lien vers dossier complet */}
                {patientId && (
                  <button
                    onClick={() =>
                      window.open(`/patients/${patientId}/record`, "_blank")
                    }
                    className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Voir le dossier complet ↗
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Consultation form sidebar ── */}
        {showConsultForm && !showPatientRecord && (
          <div className="absolute top-0 right-0 w-[400px] h-full bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Formulaire de
                consultation
              </h3>
              <button
                onClick={() => setShowConsultForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              {/* Report fields */}
              {[
                {
                  key: "chief_complaint",
                  label: "Motif de consultation",
                  rows: 2,
                },
                { key: "history", label: "Anamnèse / Historique", rows: 2 },
                { key: "examination", label: "Examen clinique", rows: 2 },
                { key: "diagnosis", label: "Diagnostic", rows: 2 },
                { key: "treatment_plan", label: "Plan thérapeutique", rows: 2 },
                {
                  key: "follow_up_instructions",
                  label: "Consignes de suivi",
                  rows: 1,
                },
                { key: "notes", label: "Notes", rows: 1 },
              ].map(({ key, label, rows }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    {label}
                  </label>
                  <textarea
                    rows={rows}
                    value={reportForm[key]}
                    onChange={(e) =>
                      setReportForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
                    placeholder={`${label}…`}
                  />
                </div>
              ))}

              {/* Save report button */}
              <button
                onClick={() => saveReportMutation.mutate()}
                disabled={saveReportMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saveReportMutation.isPending
                  ? "Sauvegarde…"
                  : "Sauvegarder le rapport"}
              </button>

              {/* Entités médicales — boutons d'ajout */}
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Entités médicales
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowDiagModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />{" "}
                    Diagnostic
                  </button>
                  <button
                    onClick={() => setShowExamModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-purple-400" />{" "}
                    Examen
                  </button>
                  <button
                    onClick={() => setShowPrescModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <Pill className="w-3.5 h-3.5 text-indigo-400" />{" "}
                    Prescription
                  </button>
                  <button
                    onClick={() => setShowTraitModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-teal-400" />{" "}
                    Traitement
                  </button>
                </div>
              </div>

              {/* Entités ajoutées */}
              {(consultation?.diagnostics?.length > 0 ||
                consultation?.examens?.length > 0 ||
                consultation?.prescriptions?.length > 0 ||
                consultation?.treatments?.length > 0) && (
                <div className="border-t border-gray-700 pt-3 space-y-3">
                  {/* Diagnostics */}
                  {consultation.diagnostics?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-cyan-400" />{" "}
                        Diagnostics ({consultation.diagnostics.length})
                      </p>
                      {consultation.diagnostics.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-200 truncate block">
                              {d.title || d.libelle}
                            </span>
                            {d.icd_code && (
                              <span className="text-[10px] text-cyan-400 font-mono">
                                {d.icd_code}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm("Supprimer ?"))
                                deleteDiagnostic.mutate(d.id);
                            }}
                            className="p-0.5 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Examens */}
                  {consultation.examens?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <FlaskConical className="w-3 h-3 text-purple-400" />{" "}
                        Examens ({consultation.examens.length})
                      </p>
                      {consultation.examens.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-200 truncate block">
                              {e.title || e.libelle}
                            </span>
                            {e.urgent && (
                              <span className="text-[10px] text-red-400">
                                Urgent
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm("Supprimer ?"))
                                deleteExamen.mutate(e.id);
                            }}
                            className="p-0.5 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prescriptions */}
                  {consultation.prescriptions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <Pill className="w-3 h-3 text-indigo-400" />{" "}
                        Prescriptions ({consultation.prescriptions.length})
                      </p>
                      {consultation.prescriptions.map((p) => (
                        <div
                          key={p.id}
                          className="p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <span className="text-xs text-gray-200">
                            {p.name || p.denomination}
                          </span>
                          {p.dosage && (
                            <span className="text-[10px] text-gray-400 ml-1">
                              {p.dosage}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Traitements */}
                  {consultation.treatments?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <ClipboardList className="w-3 h-3 text-teal-400" />{" "}
                        Traitements ({consultation.treatments.length})
                      </p>
                      {consultation.treatments.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-1.5 bg-gray-700/50 rounded mb-1"
                        >
                          <span className="text-xs text-gray-200">
                            {t.type} {t.medications ? `— ${t.medications}` : ""}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm("Supprimer ?"))
                                deleteTraitement.mutate(t.id);
                            }}
                            className="p-0.5 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lien vers rapport complet */}
              <button
                onClick={() =>
                  window.open(`/consultations/${id}/report`, "_blank")
                }
                className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 underline pt-2"
              >
                Ouvrir le rapport complet ↗
              </button>
            </div>
          </div>
        )}

        {connectionState === "connecting" && !overlayDismissed && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-6 z-10 transition-opacity duration-700">
            <img
              src={logoImg}
              alt="LiptakoCare"
              className="h-16 w-16 rounded-2xl object-cover mb-2"
            />
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <Video className="w-8 h-8 text-primary-400 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-semibold text-lg">
                Connexion en cours…
              </p>
              <p className="text-gray-400 text-sm">
                Préparation de votre salle de téléconsultation sécurisée
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Communication chiffrée de bout en bout</span>
            </div>
          </div>
        )}

        {connectionState === "disconnected" && overlayDismissed && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-semibold text-lg">
                Connexion perdue
              </p>
              <p className="text-gray-400 text-sm">
                Vérifiez votre connexion internet et réessayez
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10"
            >
              Reconnecter
            </Button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700">
        <div className="text-xs text-gray-400 hidden sm:block">
          {consultation.patient_record?.patient?.first_name ??
            consultation.appointment?.patient?.first_name}{" "}
          {consultation.patient_record?.patient?.last_name ??
            consultation.appointment?.patient?.last_name}
          {" · Dr. "}
          {consultation.doctor?.last_name ??
            consultation.appointment?.doctor?.last_name}
        </div>

        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          {!showEndConfirm ? (
            <Button
              onClick={() => setShowEndConfirm(true)}
              variant="danger"
              size="sm"
              icon={Phone}
            >
              Terminer
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-gray-700 rounded-xl p-2">
              <span className="text-white text-sm">
                Terminer la consultation ?
              </span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => endMutation.mutate()}
                loading={endMutation.isPending}
              >
                Oui
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEndConfirm(false)}
                className="text-white border-gray-500"
              >
                Non
              </Button>
            </div>
          )}
          {isDoctor() && !showEndConfirm && (
            <Button
              onClick={() => setShowVitals(true)}
              variant="secondary"
              size="sm"
              icon={Activity}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
            >
              Constantes
            </Button>
          )}
          {isDoctor() && !showEndConfirm && (
            <Button
              onClick={() => {
                setShowConsultForm((v) => !v);
                if (!showConsultForm) setShowPatientRecord(false);
              }}
              variant="secondary"
              size="sm"
              icon={FileText}
              className={`${showConsultForm ? "bg-cyan-700 border-cyan-600" : "bg-gray-700 border-gray-600"} text-white hover:bg-gray-600`}
            >
              Consultation
            </Button>
          )}
          {isDoctor() && !showEndConfirm && (
            <Button
              onClick={() => {
                setShowPatientRecord((v) => !v);
                if (!showPatientRecord) setShowConsultForm(false);
              }}
              variant="secondary"
              size="sm"
              icon={ClipboardList}
              className={`${showPatientRecord ? "bg-cyan-700 border-cyan-600" : "bg-gray-700 border-gray-600"} text-white hover:bg-gray-600`}
            >
              Dossier
            </Button>
          )}
        </div>
      </div>

      {/* Vital signs modal */}
      <Modal
        open={showVitals}
        onClose={() => setShowVitals(false)}
        title="Paramètres vitaux"
      >
        <form onSubmit={handleVitalsSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Poids (kg)"
              type="number"
              step="0.1"
              value={vitals.weight}
              onChange={(e) =>
                setVitals((v) => ({ ...v, weight: e.target.value }))
              }
            />
            <Input
              label="Taille (cm)"
              type="number"
              value={vitals.height}
              onChange={(e) =>
                setVitals((v) => ({ ...v, height: e.target.value }))
              }
            />
            <Input
              label="Température (°C)"
              type="number"
              step="0.1"
              value={vitals.temperature}
              onChange={(e) =>
                setVitals((v) => ({ ...v, temperature: e.target.value }))
              }
            />
            <Input
              label="Fréq. cardiaque"
              type="number"
              value={vitals.heart_rate}
              onChange={(e) =>
                setVitals((v) => ({ ...v, heart_rate: e.target.value }))
              }
            />
            <Input
              label="TA systolique"
              type="number"
              value={vitals.blood_pressure_systolic}
              onChange={(e) =>
                setVitals((v) => ({
                  ...v,
                  blood_pressure_systolic: e.target.value,
                }))
              }
            />
            <Input
              label="TA diastolique"
              type="number"
              value={vitals.blood_pressure_diastolic}
              onChange={(e) =>
                setVitals((v) => ({
                  ...v,
                  blood_pressure_diastolic: e.target.value,
                }))
              }
            />
            <Input
              label="Fréq. respiratoire"
              type="number"
              value={vitals.respiratory_rate}
              onChange={(e) =>
                setVitals((v) => ({ ...v, respiratory_rate: e.target.value }))
              }
            />
            <Input
              label="SpO2 (%)"
              type="number"
              value={vitals.spo2}
              onChange={(e) =>
                setVitals((v) => ({ ...v, spo2: e.target.value }))
              }
            />
          </div>
          <Input
            label="Glycémie (g/L)"
            type="number"
            step="0.01"
            value={vitals.glycemia}
            onChange={(e) =>
              setVitals((v) => ({ ...v, glycemia: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowVitals(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={vitalsMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Video quality rating modal – shown after ending consultation */}
      <Modal
        open={showRating}
        onClose={handleRatingSubmit}
        title="Évaluation de la qualité vidéo"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Comment évaluez-vous la qualité de cette téléconsultation ?
          </p>
          {/* Star rating */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            {rating === 0 && "Sélectionnez une note"}
            {rating === 1 && "Très mauvaise"}
            {rating === 2 && "Mauvaise"}
            {rating === 3 && "Correcte"}
            {rating === 4 && "Bonne"}
            {rating === 5 && "Excellente"}
          </p>
          {/* Optional comment */}
          {rating > 0 && rating <= 3 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Décrivez le problème (optionnel)
              </label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Coupures, image floue, décalage son…"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleRatingSubmit}>
              Passer
            </Button>
            <Button
              onClick={handleRatingSubmit}
              disabled={rating === 0}
              loading={ratingMutation.isPending}
            >
              Envoyer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Medical entity modals ── */}
      <DiagnosticFormModal
        open={showDiagModal}
        onClose={() => setShowDiagModal(false)}
        consultationId={id}
        onSuccess={invalidateConsultation}
      />
      <ExamenFormModal
        open={showExamModal}
        onClose={() => setShowExamModal(false)}
        consultationId={id}
        dossierPatientId={consultation?.dossier_patient_id}
        onSuccess={invalidateConsultation}
      />
      <PrescriptionFormModal
        open={showPrescModal}
        onClose={() => setShowPrescModal(false)}
        consultationId={id}
        onSuccess={invalidateConsultation}
      />
      <TraitementFormModal
        open={showTraitModal}
        onClose={() => setShowTraitModal(false)}
        consultationId={id}
        diagnostics={consultation?.diagnostics || []}
        onSuccess={invalidateConsultation}
      />
    </div>
  );
}

// ── Modal forms for medical entities ──────────────────────────────────────────
const DIAG_TYPE_OPTIONS = [
  { value: "principal", label: "Principal" },
  { value: "secondaire", label: "Secondaire" },
  { value: "differentiel", label: "Différentiel" },
];
const DIAG_SEVERITY_OPTIONS = [
  { value: "legere", label: "Légère" },
  { value: "moderee", label: "Modérée" },
  { value: "severe", label: "Sévère" },
  { value: "critique", label: "Critique" },
];
const DIAG_STATUS_OPTIONS = [
  { value: "presume", label: "Présumé" },
  { value: "confirme", label: "Confirmé" },
  { value: "infirme", label: "Infirmé" },
];

function DiagnosticFormModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({
    libelle: "",
    type: "principal",
    code_cim: "",
    gravite: "",
    statut: "presume",
    description: "",
  });
  useEffect(() => {
    if (open)
      setForm({
        libelle: "",
        type: "principal",
        code_cim: "",
        gravite: "",
        statut: "presume",
        description: "",
      });
  }, [open]);
  const mutation = useMutation({
    mutationFn: (data) =>
      diagnosticsApi.create({ ...data, consultation_id: consultationId }),
    onSuccess: () => {
      toast.success("Diagnostic ajouté");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter un diagnostic"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Intitulé *"
            value={form.libelle}
            onChange={(e) => set("libelle", e.target.value)}
            placeholder="Ex: Paludisme à P. falciparum"
          />
        </div>
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          options={DIAG_TYPE_OPTIONS}
        />
        <Input
          label="Code CIM-10"
          value={form.code_cim}
          onChange={(e) => set("code_cim", e.target.value)}
          placeholder="Ex: B50.9"
        />
        <Select
          label="Gravité"
          value={form.gravite}
          onChange={(e) => set("gravite", e.target.value)}
          options={DIAG_SEVERITY_OPTIONS}
          placeholder="Sélectionner..."
        />
        <Select
          label="Statut"
          value={form.statut}
          onChange={(e) => set("statut", e.target.value)}
          options={DIAG_STATUS_OPTIONS}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
}

function ExamenFormModal({
  open,
  onClose,
  consultationId,
  dossierPatientId,
  onSuccess,
}) {
  const [form, setForm] = useState({
    libelle: "",
    type: "",
    indication: "",
    urgent: false,
  });
  useEffect(() => {
    if (open) setForm({ libelle: "", type: "", indication: "", urgent: false });
  }, [open]);
  const mutation = useMutation({
    mutationFn: (data) =>
      examensApi.create({
        ...data,
        consultation_id: consultationId,
        dossier_patient_id: dossierPatientId,
      }),
    onSuccess: () => {
      toast.success("Examen prescrit");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Prescrire un examen"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Prescrire
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Intitulé *"
          value={form.libelle}
          onChange={(e) => set("libelle", e.target.value)}
          placeholder="NFS, Goutte épaisse, Radio thorax..."
        />
        <Input
          label="Type"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          placeholder="Biologie, Imagerie..."
        />
        <Textarea
          label="Indication"
          value={form.indication}
          onChange={(e) => set("indication", e.target.value)}
          rows={2}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.urgent}
            onChange={(e) => set("urgent", e.target.checked)}
            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm font-medium text-gray-700">Urgent</span>
        </label>
      </div>
    </Modal>
  );
}

function PrescriptionFormModal({ open, onClose, consultationId, onSuccess }) {
  const [form, setForm] = useState({
    denomination: "",
    posologie: "",
    instructions: "",
    duree_jours: "",
    urgent: false,
  });
  useEffect(() => {
    if (open)
      setForm({
        denomination: "",
        posologie: "",
        instructions: "",
        duree_jours: "",
        urgent: false,
      });
  }, [open]);
  const mutation = useMutation({
    mutationFn: (data) => prescriptionsApi.create(consultationId, data),
    onSuccess: () => {
      toast.success("Prescription ajoutée");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter une prescription"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Dénomination *"
            value={form.denomination}
            onChange={(e) => set("denomination", e.target.value)}
            placeholder="Paracétamol 500mg"
          />
        </div>
        <Input
          label="Posologie"
          value={form.posologie}
          onChange={(e) => set("posologie", e.target.value)}
          placeholder="3x/jour après repas"
        />
        <Input
          label="Durée (jours)"
          type="number"
          value={form.duree_jours}
          onChange={(e) => set("duree_jours", e.target.value)}
          placeholder="7"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Instructions"
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            rows={2}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.urgent}
            onChange={(e) => set("urgent", e.target.checked)}
            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm font-medium text-gray-700">Urgent</span>
        </label>
      </div>
    </Modal>
  );
}

const TRAIT_TYPE_OPTIONS = [
  { value: "medicamenteux", label: "Médicamenteux" },
  { value: "chirurgical", label: "Chirurgical" },
  { value: "physiotherapie", label: "Physiothérapie" },
  { value: "autre", label: "Autre" },
];

function TraitementFormModal({
  open,
  onClose,
  consultationId,
  diagnostics,
  onSuccess,
}) {
  const [form, setForm] = useState({
    type: "medicamenteux",
    medicaments: "",
    dosages: "",
    posologies: "",
    duree: "",
    diagnostic_id: "",
  });
  useEffect(() => {
    if (open)
      setForm({
        type: "medicamenteux",
        medicaments: "",
        dosages: "",
        posologies: "",
        duree: "",
        diagnostic_id: diagnostics?.[0]?.id || "",
      });
  }, [open, diagnostics]);
  const mutation = useMutation({
    mutationFn: (data) =>
      traitementsApi.create({ ...data, consultation_id: consultationId }),
    onSuccess: () => {
      toast.success("Traitement ajouté");
      onClose();
      onSuccess();
    },
    onError: () => toast.error("Erreur"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const diagOptions = (diagnostics || []).map((d) => ({
    value: String(d.id),
    label: d.title || d.libelle,
  }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter un traitement"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(form)}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Type *"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
          options={TRAIT_TYPE_OPTIONS}
        />
        {diagOptions.length > 0 ? (
          <Select
            label="Diagnostic associé"
            value={form.diagnostic_id}
            onChange={(e) => set("diagnostic_id", e.target.value)}
            options={diagOptions}
          />
        ) : (
          <div className="flex items-center text-sm text-amber-600">
            <AlertTriangle className="w-4 h-4 mr-1" /> Ajoutez d'abord un
            diagnostic
          </div>
        )}
        <Input
          label="Médicaments"
          value={form.medicaments}
          onChange={(e) => set("medicaments", e.target.value)}
          placeholder="Artéméther-luméfantrine"
        />
        <Input
          label="Dosages"
          value={form.dosages}
          onChange={(e) => set("dosages", e.target.value)}
          placeholder="80/480mg"
        />
        <Input
          label="Posologie"
          value={form.posologies}
          onChange={(e) => set("posologies", e.target.value)}
          placeholder="2 fois/jour"
        />
        <Input
          label="Durée"
          value={form.duree}
          onChange={(e) => set("duree", e.target.value)}
          placeholder="3 jours"
        />
      </div>
    </Modal>
  );
}

function SidebarSection({ title, icon, items, empty, render }) {
  if (!items || items.length === 0)
    return (
      <div>
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
          {icon} {title}
        </h4>
        <p className="text-gray-500 text-xs italic">{empty}</p>
      </div>
    );
  return (
    <div>
      <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
        {icon} {title} ({items.length})
      </h4>
      <div className="space-y-1.5">{items.slice(0, 5).map(render)}</div>
      {items.length > 5 && (
        <p className="text-xs text-gray-500 mt-1">
          +{items.length - 5} autres…
        </p>
      )}
    </div>
  );
}
