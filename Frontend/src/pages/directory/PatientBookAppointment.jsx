import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  Calendar,
  Video,
  Users as UsersIcon,
  Clock,
  Check,
  CreditCard,
  ArrowRight,
  ExternalLink,
  MapPin,
  Phone,
  Smartphone,
  Banknote,
  Building,
  CircleCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { directoryApi, appointmentsApi, paymentsApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingPage, Spinner } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";
import { getInitials } from "@/utils/helpers";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STEP_TABS = [
  { step: 1, label: "1. Créneau & motif", icon: Calendar },
  { step: 2, label: "2. Récapitulatif & Paiement", icon: CreditCard },
  { step: 3, label: "3. Confirmation", icon: CircleCheck },
];

const PAYMENT_METHODS = [
  {
    value: "orange_money",
    label: "Orange Money",
    icon: Smartphone,
    color: "text-orange-500",
  },
  {
    value: "moov_money",
    label: "Moov Money",
    icon: Smartphone,
    color: "text-blue-500",
  },
  {
    value: "especes",
    label: "Espèces (sur place)",
    icon: Banknote,
    color: "text-green-600",
  },
];

const JOURS_SEMAINE = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function PatientBookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [consultationType, setConsultationType] = useState("teleconsultation");
  const [motif, setMotif] = useState("");

  // Step 2 state
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");

  // Result
  const [bookingResult, setBookingResult] = useState(null);

  // ── Queries ─────────────────────────────────────────────────────────────────

  // Profil du médecin
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["directory", doctorId],
    queryFn: () => directoryApi.getDoctor(doctorId).then((r) => r.data.data),
    enabled: !!doctorId,
  });

  // Disponibilités sur 14 jours
  const { data: availability = [], isLoading: availLoading } = useQuery({
    queryKey: ["availability", doctorId],
    queryFn: () =>
      directoryApi
        .getAvailability({ doctor_id: doctorId, days: 14 })
        .then((r) => r.data.data ?? []),
    enabled: !!doctorId,
    staleTime: 60_000,
  });

  // Créneaux pour la date sélectionnée
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", doctorId, selectedDate],
    queryFn: () =>
      directoryApi
        .getSlots({ doctor_id: doctorId, date: selectedDate })
        .then((r) => r.data.data),
    enabled: !!doctorId && !!selectedDate,
  });

  // Paramètres de frais de la plateforme
  const { data: paymentSettings } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: () => paymentsApi.getSettings().then((r) => r.data.data),
    staleTime: 300_000, // 5 minutes
  });

  const availableSlots = useMemo(
    () => (slotsData?.slots ?? []).filter((s) => s.available),
    [slotsData],
  );

  const tarif =
    slotsData?.tarif ??
    availability.find((d) => d.date === selectedDate)?.tarif ??
    0;

  // Calcul des frais en fonction du mode de paiement
  const feeBreakdown = useMemo(() => {
    if (!tarif || tarif <= 0) return null;

    const platformFee = paymentSettings?.platform_fee_enabled
      ? (paymentSettings?.platform_fee ?? 500)
      : 0;
    const mobileMoneyRate = paymentSettings?.mobile_money_rate ?? 1.5;

    // Pour mobile money, calculer les frais API
    const subtotal = tarif + platformFee;
    const isMobileMoney = paymentMethod && paymentMethod !== "especes";
    const mobileMoneyFee = isMobileMoney
      ? Math.ceil(subtotal * (mobileMoneyRate / 100))
      : 0;
    const total = subtotal + mobileMoneyFee;

    return {
      consultation: tarif,
      platformFee,
      mobileMoneyFee,
      mobileMoneyRate,
      total,
      isMobileMoney,
    };
  }, [tarif, paymentSettings, paymentMethod]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const bookMutation = useMutation({
    mutationFn: async () => {
      // 1. Créer le rendez-vous
      const rdvRes = await appointmentsApi.create({
        user_id: Number(doctorId),
        date: selectedDate,
        heure: selectedTime,
        type: consultationType,
        motif,
        priorite: "normale",
      });
      const rdv = rdvRes.data?.data;

      // 2. Initier le paiement si montant > 0
      let payment = null;
      if (tarif > 0 && paymentMethod) {
        const payRes = await paymentsApi.initiateForAppointment(rdv.id, {
          amount: tarif,
          method: paymentMethod,
          phone: paymentMethod !== "especes" ? paymentPhone : null,
        });
        payment = payRes.data?.data;
      }

      return { rdv, payment, feeBreakdown };
    },
    onSuccess: ({ rdv, payment }) => {
      setBookingResult({ rdv, payment });
      toast.success("Rendez-vous pris avec succès !");
      setStep(3);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ?? "Erreur lors de la réservation",
      );
    },
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  const canGoStep2 = selectedDate && selectedTime && motif.trim().length >= 3;

  const handleGoToPayment = () => {
    if (!selectedDate) {
      toast.error("Choisissez une date");
      return;
    }
    if (!selectedTime) {
      toast.error("Choisissez un créneau horaire");
      return;
    }
    if (!motif.trim()) {
      toast.error("Le motif est requis (min. 3 caractères)");
      return;
    }
    setStep(2);
  };

  const handleConfirm = () => {
    if (tarif > 0) {
      if (!paymentMethod) {
        toast.error("Choisissez un mode de paiement");
        return;
      }
      if (paymentMethod !== "especes" && !paymentPhone.trim()) {
        toast.error("Numéro de téléphone requis");
        return;
      }
    }
    bookMutation.mutate();
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (doctorLoading)
    return (
      <AppLayout title="Prendre rendez-vous">
        <LoadingPage />
      </AppLayout>
    );
  if (!doctor)
    return (
      <AppLayout title="Prendre rendez-vous">
        <div className="text-center py-12 text-gray-400">
          Médecin introuvable
        </div>
      </AppLayout>
    );

  const doctorName = `Dr. ${doctor.first_name ?? ""} ${doctor.last_name ?? ""}`;
  const structureName = doctor.structure?.name;

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 3: Confirmation
  // ══════════════════════════════════════════════════════════════════════════════
  if (step === 3 && bookingResult) {
    const isOnline = consultationType === "teleconsultation";
    const roomName = bookingResult.rdv?.room_name;
    const jitsiUrl = roomName ? `https://meet.jit.si/${roomName}` : null;

    return (
      <AppLayout title="Rendez-vous confirmé">
        <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
          {/* Success banner */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-800">
              Rendez-vous pris avec succès !
            </h2>
            <p className="text-sm text-green-600 mt-1">
              {isOnline ? "Téléconsultation" : "Consultation en présentiel"} —{" "}
              {format(new Date(selectedDate + "T00:00"), "EEEE dd MMMM yyyy", {
                locale: fr,
              })}{" "}
              à {selectedTime}
            </p>
          </div>

          {/* Appointment summary */}
          <Card>
            <CardHeader>
              <h3 className="section-title">Récapitulatif</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Médecin", value: doctorName },
                {
                  label: "Spécialité",
                  value: doctor.specialty ?? "Médecin généraliste",
                },
                structureName
                  ? { label: "Structure", value: structureName }
                  : null,
                {
                  label: "Date & Heure",
                  value: `${format(new Date(selectedDate + "T00:00"), "EEEE dd MMMM yyyy", { locale: fr })} à ${selectedTime}`,
                },
                {
                  label: "Type",
                  value: isOnline ? "Téléconsultation" : "Présentiel",
                },
                { label: "Motif", value: motif },
              ]
                .filter(Boolean)
                .map(({ label, value }) => (
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

          {/* Payment receipt */}
          {bookingResult.payment && (
            <Card>
              <CardHeader>
                <h3 className="section-title">Paiement</h3>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Référence</span>
                  <span className="font-mono text-xs">
                    {bookingResult.payment.reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Consultation</span>
                  <span className="font-medium">
                    {Number(
                      bookingResult.feeBreakdown?.consultation ?? tarif,
                    ).toLocaleString()}{" "}
                    FCFA
                  </span>
                </div>
                {bookingResult.feeBreakdown?.platformFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frais plateforme</span>
                    <span className="font-medium">
                      {Number(
                        bookingResult.feeBreakdown.platformFee,
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                )}
                {bookingResult.feeBreakdown?.mobileMoneyFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frais Mobile Money</span>
                    <span className="font-medium">
                      {Number(
                        bookingResult.feeBreakdown.mobileMoneyFee,
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-700 font-medium">Total</span>
                  <span className="font-bold text-primary-600">
                    {Number(
                      bookingResult.feeBreakdown?.total ?? tarif,
                    ).toLocaleString()}{" "}
                    FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Méthode</span>
                  <span>
                    {
                      PAYMENT_METHODS.find((m) => m.value === paymentMethod)
                        ?.label
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Statut</span>
                  <span className="text-amber-600 font-medium">
                    En attente de confirmation
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jitsi link */}
          {isOnline && jitsiUrl && (
            <Card>
              <CardContent className="pt-4">
                <div className="bg-primary-50 rounded-xl p-4 flex items-center gap-3">
                  <Video className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800">
                      Lien de visioconférence
                    </p>
                    <p className="text-xs text-primary-600 truncate">
                      {jitsiUrl}
                    </p>
                  </div>
                  <a
                    href={jitsiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800"
                  >
                    Rejoindre <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ce lien sera actif au moment du rendez-vous.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Prochaines étapes</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600">
              <li>Le médecin confirmera votre rendez-vous sous 24h.</li>
              <li>Vous recevrez une notification de confirmation.</li>
              {isOnline && (
                <li>Connectez-vous 5 minutes avant l'heure prévue.</li>
              )}
              {!isOnline && (
                <li>Présentez-vous 10 minutes avant l'heure prévue.</li>
              )}
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/appointments")}
            >
              Mes rendez-vous
            </Button>
            {bookingResult.rdv?.id && (
              <Button
                className="flex-1"
                onClick={() =>
                  navigate(`/appointments/${bookingResult.rdv.id}`)
                }
              >
                Voir le détail
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER (Steps 1 & 2)
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout title="Prendre rendez-vous">
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        {/* Back */}
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate(-1))}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          {step > 1 ? "Étape précédente" : "Retour au profil"}
        </button>

        {/* Doctor banner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {getInitials(
              `${doctor.first_name ?? ""} ${doctor.last_name ?? ""}`,
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900">{doctorName}</h2>
            <p className="text-sm text-primary-600">
              {doctor.specialty ?? "Médecin généraliste"}
            </p>
            {structureName && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {structureName}
              </p>
            )}
          </div>
          {tarif > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">Consultation</p>
              <p className="text-lg font-bold text-primary-600">
                {Number(tarif).toLocaleString()} FCFA
              </p>
            </div>
          )}
        </div>

        {/* Step tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1">
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

        {/* ═══════ STEP 1 : Créneau & Motif ═══════ */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Date selection */}
            <Card>
              <CardHeader>
                <h3 className="section-title flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" /> Choisir une
                  date
                </h3>
              </CardHeader>
              <CardContent>
                {availLoading ? (
                  <div className="flex justify-center py-6">
                    <Spinner size="sm" />
                  </div>
                ) : availability.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Aucune disponibilité dans les 14 prochains jours
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Le médecin n'a pas encore publié ses créneaux.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {availability.map((day) => (
                      <button
                        key={day.date}
                        onClick={() => {
                          setSelectedDate(day.date);
                          setSelectedTime("");
                        }}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          selectedDate === day.date
                            ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                            : "border-gray-200 hover:border-primary-200 hover:bg-gray-50"
                        }`}
                      >
                        <p className="text-xs text-gray-400">{day.day_label}</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">
                          {day.date.split("-")[2]}/{day.date.split("-")[1]}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {day.available_count} créneaux
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time slots */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <h3 className="section-title flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500" /> Choisir un
                    horaire
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(
                      new Date(selectedDate + "T00:00"),
                      "EEEE dd MMMM yyyy",
                      { locale: fr },
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  {slotsLoading ? (
                    <div className="flex justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Aucun créneau disponible à cette date
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-2.5 px-1 rounded-lg text-sm font-medium transition-all ${
                            selectedTime === slot.time
                              ? "bg-primary-500 text-white shadow-sm"
                              : "bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-700 border border-gray-200"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Consultation type + Motif */}
            {selectedTime && (
              <Card>
                <CardContent className="pt-5 space-y-4">
                  {/* Type de consultation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de consultation
                    </label>
                    <div className="flex gap-4">
                      {[
                        {
                          value: "teleconsultation",
                          label: "Téléconsultation",
                          icon: Video,
                          desc: "Depuis chez vous",
                        },
                        {
                          value: "presentiel",
                          label: "Présentiel",
                          icon: UsersIcon,
                          desc: "Sur place",
                        },
                      ].map(({ value, label, icon: Icon, desc }) => (
                        <label
                          key={value}
                          className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            consultationType === value
                              ? "border-primary-500 bg-primary-50"
                              : "border-gray-200 hover:border-primary-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="consultationType"
                            value={value}
                            checked={consultationType === value}
                            onChange={(e) =>
                              setConsultationType(e.target.value)
                            }
                            className="sr-only"
                          />
                          <Icon
                            className={`w-5 h-5 mb-1 ${consultationType === value ? "text-primary-600" : "text-gray-400"}`}
                          />
                          <p
                            className={`text-sm font-medium ${consultationType === value ? "text-primary-700" : "text-gray-700"}`}
                          >
                            {label}
                          </p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Motif */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="text-red-500">*</span> Motif de la
                      consultation
                    </label>
                    <textarea
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      placeholder="Décrivez brièvement la raison de votre consultation…"
                      className="input-field w-full min-h-[80px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {motif.length}/500
                    </p>
                  </div>

                  <Button
                    onClick={handleGoToPayment}
                    className="w-full"
                    size="lg"
                    disabled={!canGoStep2}
                  >
                    Continuer <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══════ STEP 2 : Récapitulatif & Paiement ═══════ */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Summary */}
            <Card>
              <CardHeader>
                <h3 className="section-title">Récapitulatif</h3>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  {[
                    { label: "Médecin", value: doctorName },
                    {
                      label: "Spécialité",
                      value: doctor.specialty ?? "Médecin généraliste",
                    },
                    structureName
                      ? { label: "Structure", value: structureName }
                      : null,
                    {
                      label: "Date",
                      value: format(
                        new Date(selectedDate + "T00:00"),
                        "EEEE dd MMMM yyyy",
                        { locale: fr },
                      ),
                    },
                    { label: "Heure", value: selectedTime },
                    {
                      label: "Type",
                      value:
                        consultationType === "teleconsultation"
                          ? "Téléconsultation"
                          : "Présentiel",
                    },
                    { label: "Motif", value: motif },
                  ]
                    .filter(Boolean)
                    .map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">
                          {label}
                        </span>
                        <span className="text-gray-800 text-right max-w-[60%]">
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment */}
            <Card>
              <CardHeader>
                <h3 className="section-title flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary-500" /> Paiement
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {tarif > 0 ? (
                  <>
                    {/* Fee breakdown */}
                    <div className="bg-primary-50 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Consultation</span>
                        <span className="font-medium text-gray-800">
                          {Number(tarif).toLocaleString()} FCFA
                        </span>
                      </div>

                      {feeBreakdown?.platformFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 flex items-center gap-1">
                            Frais de service plateforme
                            <span className="text-xs text-gray-400 inline-flex items-center">
                              <Info className="w-3 h-3 ml-0.5" />
                            </span>
                          </span>
                          <span className="font-medium text-gray-800">
                            {Number(feeBreakdown.platformFee).toLocaleString()}{" "}
                            FCFA
                          </span>
                        </div>
                      )}

                      {feeBreakdown?.isMobileMoney &&
                        feeBreakdown?.mobileMoneyFee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Frais Mobile Money ({feeBreakdown.mobileMoneyRate}
                              %)
                            </span>
                            <span className="font-medium text-gray-800">
                              {Number(
                                feeBreakdown.mobileMoneyFee,
                              ).toLocaleString()}{" "}
                              FCFA
                            </span>
                          </div>
                        )}

                      <div className="border-t border-primary-200 pt-3 flex justify-between">
                        <span className="font-semibold text-primary-700">
                          Total à payer
                        </span>
                        <span className="text-xl font-bold text-primary-800">
                          {feeBreakdown
                            ? Number(feeBreakdown.total).toLocaleString()
                            : Number(tarif).toLocaleString()}{" "}
                          FCFA
                        </span>
                      </div>
                    </div>

                    {/* Method selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode de paiement
                      </label>
                      <div className="space-y-2">
                        {PAYMENT_METHODS.map((method) => (
                          <label
                            key={method.value}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              paymentMethod === method.value
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-primary-200"
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={method.value}
                              checked={paymentMethod === method.value}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="sr-only"
                            />
                            <method.icon
                              className={`w-5 h-5 ${method.color}`}
                            />
                            <span
                              className={`text-sm font-medium ${paymentMethod === method.value ? "text-primary-700" : "text-gray-700"}`}
                            >
                              {method.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Phone for mobile money */}
                    {paymentMethod && paymentMethod !== "especes" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Phone className="w-3.5 h-3.5 inline mr-1" />
                          Numéro{" "}
                          {paymentMethod === "orange_money" ? "Orange" : "Moov"}
                        </label>
                        <input
                          type="tel"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                          placeholder="+226 70 00 00 00"
                          className="input-field w-full"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-green-50 rounded-xl p-5 text-center">
                    <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700">
                      Consultation gratuite
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Le paiement sera géré après la consultation si nécessaire.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Modifier
              </Button>
              <Button
                className="flex-1"
                size="lg"
                icon={Check}
                loading={bookMutation.isPending}
                onClick={handleConfirm}
              >
                {tarif > 0 ? "Confirmer & Payer" : "Confirmer le rendez-vous"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
