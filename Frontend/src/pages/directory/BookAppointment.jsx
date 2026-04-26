import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Video,
  Users as UsersIcon,
  MapPin,
  Clock,
  Check,
  FileText,
  CreditCard,
  ArrowRight,
  UserPlus,
  X,
  Search,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  directoryApi,
  appointmentsApi,
  patientsApi,
  referentielsApi,
  paymentsApi,
} from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import { getInitials, formatDate } from "@/utils/helpers";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STEP_TABS = [
  { step: 1, label: "1. Informations générales", icon: FileText },
  { step: 2, label: "2. Assistant (optionnel)", icon: UserPlus },
  { step: 3, label: "3. Récapitulatif", icon: ClipboardList },
  { step: 4, label: "4. Facturation", icon: CreditCard },
];

const PAYMENT_METHODS = [
  { value: "orange_money", label: "Orange Money" },
  { value: "moov_money", label: "Moov Money" },
  { value: "especes", label: "Espèces" },
];

export default function BookAppointment() {
  const { patientId: patientIdParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);

  // Form state — Step 1
  const [selectedActes, setSelectedActes] = useState([]);
  const [consultationType, setConsultationType] = useState("teleconsultation");
  const [selectedPatientId, setSelectedPatientId] = useState(
    patientIdParam || "",
  );
  const [motif, setMotif] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedHeure, setSelectedHeure] = useState("08:00");

  // Step 2 — Assistant PS (optionnel)
  const [assistantSearch, setAssistantSearch] = useState("");
  const [selectedAssistants, setSelectedAssistants] = useState([]);

  // Payment state — Step 4
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");

  // Result state — after booking
  const [bookingResult, setBookingResult] = useState(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: actes = [] } = useQuery({
    queryKey: ["actes"],
    queryFn: () =>
      referentielsApi.actes().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 30,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["directory-doctors"],
    queryFn: () =>
      directoryApi.search().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 10,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: () => patientsApi.list().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 10,
  });

  // ── Computed ────────────────────────────────────────────────────────────────
  const selectedActesList = useMemo(
    () => actes.filter((a) => selectedActes.includes(a.id)),
    [actes, selectedActes],
  );
  const totalCost = useMemo(
    () =>
      selectedActesList.reduce((sum, a) => sum + (parseFloat(a.cout) || 0), 0),
    [selectedActesList],
  );

  const selectedPatient = patients.find(
    (p) => String(p.id) === String(selectedPatientId),
  );

  // Filtrer les PS disponibles comme assistants (exclure le PS connecté)
  const filteredAssistants = useMemo(() => {
    if (!assistantSearch.trim()) return [];
    const q = assistantSearch.toLowerCase();
    return doctors.filter(
      (d) =>
        String(d.id) !== String(user?.id) &&
        !selectedAssistants.some((a) => a.id === d.id) &&
        ((d.first_name ?? d.prenoms ?? "").toLowerCase().includes(q) ||
          (d.last_name ?? d.nom ?? "").toLowerCase().includes(q) ||
          (d.specialty ?? d.specialite ?? "").toLowerCase().includes(q)),
    );
  }, [doctors, assistantSearch, selectedAssistants, user]);

  // ── Toggle acte ─────────────────────────────────────────────────────────────
  const toggleActe = (acteId) => {
    setSelectedActes((prev) =>
      prev.includes(acteId)
        ? prev.filter((id) => id !== acteId)
        : [...prev, acteId],
    );
  };

  const addAssistant = (doc) => {
    setSelectedAssistants((prev) => [...prev, doc]);
    setAssistantSearch("");
  };

  const removeAssistant = (docId) => {
    setSelectedAssistants((prev) => prev.filter((d) => d.id !== docId));
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await appointmentsApi.create({
        patient_id: Number(selectedPatientId),
        date: selectedDate,
        heure: selectedHeure,
        type: consultationType,
        motif: motif || null,
        priorite: "normale",
        acte_ids: selectedActes,
        assistant_user_ids: selectedAssistants.map((a) => a.id),
      });
      const rdv = res.data?.data;
      // Initier le paiement après la création du RDV
      if (rdv?.id && totalCost > 0) {
        try {
          await paymentsApi.initiateForAppointment(rdv.id, {
            consultation_amount: totalCost,
            method: paymentMethod,
            phone: paymentMethod !== "especes" ? paymentPhone : undefined,
          });
        } catch (payErr) {
          toast.warning(
            "RDV créé, mais le paiement n'a pas pu être initié. Vous pourrez payer plus tard.",
          );
        }
      }
      return res;
    },
    onSuccess: (res) => {
      const rdv = res.data?.data;
      setBookingResult(rdv);
      toast.success("Rendez-vous créé avec succès !");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ?? "Erreur lors de la réservation",
      );
    },
  });

  // ── Step validation ─────────────────────────────────────────────────────────
  const canGoStep2 =
    selectedActes.length > 0 &&
    selectedPatientId &&
    motif.trim() &&
    selectedDate &&
    selectedHeure;

  const handleNextStep = () => {
    if (step === 1) {
      if (selectedActes.length === 0) {
        toast.error("Sélectionnez au moins un acte médical");
        return;
      }
      if (!selectedPatientId) {
        toast.error("Sélectionnez un patient");
        return;
      }
      if (!motif.trim()) {
        toast.error("Le motif est requis");
        return;
      }
      if (!selectedDate) {
        toast.error("La date est requise");
        return;
      }
      if (!selectedHeure) {
        toast.error("L'heure est requise");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleConfirmPayment = () => {
    if (!paymentMethod) {
      toast.error("Sélectionnez un mode de paiement");
      return;
    }
    if (paymentMethod !== "especes" && !paymentPhone.trim()) {
      toast.error("Numéro de téléphone requis pour le paiement mobile");
      return;
    }
    bookMutation.mutate();
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (bookingResult) {
    const isOnline = consultationType === "teleconsultation";
    const doctorName = `Dr. ${user?.first_name ?? user?.prenoms ?? ""} ${user?.last_name ?? user?.nom ?? ""}`;

    return (
      <AppLayout title="Rendez-vous confirmé">
        <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-800">
              Rendez-vous pris avec succès !
            </h2>
            <p className="text-sm text-green-600 mt-1">
              {isOnline
                ? "Consultation en ligne"
                : "Consultation en présentiel"}{" "}
              — {format(new Date(selectedDate), "dd/MM/yyyy", { locale: fr })} à{" "}
              {selectedHeure}
            </p>
          </div>

          {/* Récapitulatif */}
          <Card>
            <CardHeader>
              <h3 className="section-title">Récapitulatif du rendez-vous</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Médecin consultant", value: doctorName },
                {
                  label: "Patient",
                  value: selectedPatient
                    ? `${selectedPatient.first_name ?? selectedPatient.prenoms} ${selectedPatient.last_name ?? selectedPatient.nom}`
                    : "—",
                },
                { label: "Type", value: isOnline ? "En ligne" : "Physique" },
                {
                  label: "Date",
                  value: `${format(new Date(selectedDate), "dd/MM/yyyy", { locale: fr })} à ${selectedHeure}`,
                },
                { label: "Motif", value: motif },
                {
                  label: "Actes",
                  value: selectedActesList.map((a) => a.libelle).join(", "),
                },
                {
                  label: "Montant total",
                  value: `${totalCost.toLocaleString()} FCFA`,
                },
                ...(selectedAssistants.length > 0
                  ? [
                      {
                        label: "Assistant(s)",
                        value: selectedAssistants
                          .map(
                            (a) =>
                              `Dr. ${a.first_name ?? a.prenoms} ${a.last_name ?? a.nom}`,
                          )
                          .join(", "),
                      },
                    ]
                  : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between text-sm border-b border-gray-50 pb-2"
                >
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%]">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reçu de paiement */}
          <Card>
            <CardHeader>
              <h3 className="section-title">Reçu de paiement</h3>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Méthode</span>
                <span className="font-medium">
                  {
                    PAYMENT_METHODS.find((m) => m.value === paymentMethod)
                      ?.label
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Montant</span>
                <span className="font-bold text-primary-600">
                  {totalCost.toLocaleString()} FCFA
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Statut</span>
                <span className="text-green-600 font-medium">
                  En attente de confirmation
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Info visio si en ligne */}
          {isOnline && (
            <Card>
              <CardHeader>
                <h3 className="section-title">Visioconférence</h3>
              </CardHeader>
              <CardContent>
                <div className="bg-primary-50 rounded-xl p-4 flex items-center gap-3">
                  <Video className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800">
                      BFA TLM Live
                    </p>
                    <p className="text-xs text-primary-600">
                      Le lien de visioconférence sera disponible au moment du
                      rendez-vous.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Rendez-vous dans la salle d'attente le jour prévu pour
                  rejoindre la visioconférence.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/appointments")}
            >
              Mes rendez-vous
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate(`/appointments/${bookingResult.id}`)}
            >
              Voir le détail
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Prendre rendez-vous">
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
        {/* Back */}
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate(-1))}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          {step > 1 ? "Étape précédente" : "Retour"}
        </button>

        {/* Step tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {STEP_TABS.map((tab) => (
            <button
              key={tab.step}
              onClick={() => tab.step < step && setStep(tab.step)}
              className={`flex-1 min-w-fit px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                tab.step === step
                  ? "bg-primary-500 text-white shadow-sm"
                  : tab.step < step
                    ? "text-primary-600 hover:bg-primary-50 cursor-pointer"
                    : "text-gray-400 cursor-default"
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />} {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════ STEP 1 : Informations générales ═══════ */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Actes médicaux */}
            <Card>
              <CardHeader>
                <h3 className="section-title text-red-500">*Actes médicaux</h3>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                  {actes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Chargement des actes…
                    </p>
                  ) : (
                    actes.map((acte, idx) => (
                      <label
                        key={acte.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedActes.includes(acte.id)}
                          onChange={() => toggleActe(acte.id)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-700">
                            {idx + 1}) {acte.libelle}
                          </span>
                          {acte.cout > 0 && (
                            <span className="ml-2 text-xs text-primary-600 font-medium">
                              {parseFloat(acte.cout).toLocaleString()} FCFA
                            </span>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {selectedActes.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                    <span className="text-gray-500">
                      {selectedActes.length} acte(s) sélectionné(s)
                    </span>
                    <span className="font-bold text-primary-600">
                      {totalCost.toLocaleString()} FCFA
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Type, Patient, Motif, Date/Heure */}
            <div className="space-y-4">
              {/* Médecin consultant (vous) */}
              <Card>
                <CardContent className="pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Médecin consultant
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {(user?.first_name ?? user?.prenoms ?? "?")[0]}
                      {(user?.last_name ?? user?.nom ?? "?")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Dr. {user?.first_name ?? user?.prenoms}{" "}
                        {user?.last_name ?? user?.nom}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.specialty ??
                          user?.specialite ??
                          "Professionnel de santé"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Type de consultation */}
              <Card>
                <CardContent className="pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span>Type de consultation
                  </label>
                  <div className="flex gap-4">
                    {[
                      {
                        value: "teleconsultation",
                        label: "En ligne",
                        icon: Video,
                        color: "text-green-600",
                      },
                      {
                        value: "presentiel",
                        label: "Physique",
                        icon: UsersIcon,
                        color: "text-primary-600",
                      },
                    ].map(({ value, label, icon: Icon, color }) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="consultationType"
                          value={value}
                          checked={consultationType === value}
                          onChange={(e) => setConsultationType(e.target.value)}
                          className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                        />
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className={`text-sm font-medium ${color}`}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Patient select */}
              <Select
                label="Patient *"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                options={patients.map((p) => ({
                  value: String(p.id),
                  label: `${p.first_name ?? p.prenoms ?? ""} ${p.last_name ?? p.nom ?? ""}`,
                }))}
                placeholder="Sélectionner un patient"
              />

              {/* Motif */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="text-red-500">*</span>Motif
                </label>
                <input
                  type="text"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="input-field w-full"
                  placeholder="Motif de la consultation"
                />
              </div>

              {/* Date + Heure */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date *"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <Input
                  label="Heure *"
                  type="time"
                  value={selectedHeure}
                  onChange={(e) => setSelectedHeure(e.target.value)}
                />
              </div>

              <Button
                onClick={handleNextStep}
                className="w-full"
                size="lg"
                disabled={!canGoStep2}
              >
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══════ STEP 2 : Assistant PS (optionnel) ═══════ */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <h3 className="section-title">
                Inviter un professionnel de santé assistant
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Optionnel — Recherchez un PS pour vous assister à distance
                pendant la consultation.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={assistantSearch}
                  onChange={(e) => setAssistantSearch(e.target.value)}
                  placeholder="Rechercher un professionnel par nom ou spécialité…"
                  className="input-field pl-10 w-full"
                />
              </div>

              {/* Résultats de recherche */}
              {filteredAssistants.length > 0 && (
                <div className="border rounded-xl max-h-48 overflow-y-auto">
                  {filteredAssistants.slice(0, 5).map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => addAssistant(doc)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 transition text-left border-b last:border-b-0"
                    >
                      <UserPlus className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          Dr. {doc.first_name ?? doc.prenoms}{" "}
                          {doc.last_name ?? doc.nom}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.specialty ?? doc.specialite ?? "—"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Assistants sélectionnés */}
              {selectedAssistants.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Assistant(s) sélectionné(s)
                  </h4>
                  {selectedAssistants.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {(doc.first_name ?? doc.prenoms ?? "?")[0]}
                          {(doc.last_name ?? doc.nom ?? "?")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            Dr. {doc.first_name ?? doc.prenoms}{" "}
                            {doc.last_name ?? doc.nom}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.specialty ?? doc.specialite ?? "—"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAssistant(doc.id)}
                        className="p-1 rounded-full hover:bg-red-100 transition"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedAssistants.length === 0 && !assistantSearch && (
                <div className="text-center py-6 text-gray-400">
                  <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun assistant sélectionné</p>
                  <p className="text-xs">
                    Vous pouvez passer cette étape si pas d'assistance
                    nécessaire.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Retour
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)} size="lg">
                  {selectedAssistants.length > 0
                    ? "Suivant"
                    : "Passer cette étape"}{" "}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════ STEP 3 : Récapitulatif ═══════ */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <h3 className="section-title">Récapitulatif du rendez-vous</h3>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                {[
                  {
                    label: "Type",
                    value:
                      consultationType === "teleconsultation"
                        ? "En ligne (BFA TLM Live)"
                        : "Présentiel",
                  },
                  {
                    label: "Médecin consultant",
                    value: `Dr. ${user?.first_name ?? user?.prenoms ?? ""} ${user?.last_name ?? user?.nom ?? ""}`,
                  },
                  {
                    label: "Patient",
                    value: selectedPatient
                      ? `${selectedPatient.first_name ?? selectedPatient.prenoms} ${selectedPatient.last_name ?? selectedPatient.nom}`
                      : "—",
                  },
                  {
                    label: "Date",
                    value: `${format(new Date(selectedDate + "T00:00"), "EEEE dd MMMM yyyy", { locale: fr })} à ${selectedHeure}`,
                  },
                  { label: "Motif", value: motif },
                  ...(selectedAssistants.length > 0
                    ? [
                        {
                          label: "Assistant(s)",
                          value: selectedAssistants
                            .map(
                              (a) =>
                                `Dr. ${a.first_name ?? a.prenoms} ${a.last_name ?? a.nom}`,
                            )
                            .join(", "),
                        },
                      ]
                    : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className="text-gray-800">{value}</span>
                  </div>
                ))}
              </div>

              {/* Actes table */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Actes médicaux sélectionnés
                </h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">
                          Acte
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">
                          Durée
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">
                          Coût
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedActesList.map((acte) => (
                        <tr key={acte.id} className="border-t">
                          <td className="px-4 py-2 text-gray-800">
                            {acte.libelle}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-500">
                            {acte.duree ? `${acte.duree} min` : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {parseFloat(acte.cout).toLocaleString()} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-primary-50">
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-2 font-bold text-gray-800"
                        >
                          Total
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-primary-700">
                          {totalCost.toLocaleString()} FCFA
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Modifier
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)} size="lg">
                  Passer au paiement <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════ STEP 4 : Facturation ═══════ */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <h3 className="section-title">Facturation & Paiement</h3>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Montant à payer */}
              <div className="bg-primary-50 rounded-xl p-5 text-center">
                <p className="text-sm text-primary-600 mb-1">Montant à payer</p>
                <p className="text-3xl font-bold text-primary-800">
                  {totalCost.toLocaleString()} FCFA
                </p>
              </div>

              {/* Mode de paiement */}
              <Select
                label="Mode de paiement *"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={PAYMENT_METHODS}
                placeholder="Sélectionnez un mode de paiement"
              />

              {/* Téléphone pour mobile money */}
              {paymentMethod && paymentMethod !== "especes" && (
                <Input
                  label="Numéro de téléphone *"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="+226 70 00 00 00"
                />
              )}

              {/* Résumé paiement */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Actes ({selectedActes.length})
                  </span>
                  <span className="font-medium">
                    {totalCost.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-bold text-primary-700">
                    {totalCost.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(3)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Retour
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  icon={Check}
                  loading={bookMutation.isPending}
                  onClick={handleConfirmPayment}
                >
                  Confirmer & Payer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Annuler
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
