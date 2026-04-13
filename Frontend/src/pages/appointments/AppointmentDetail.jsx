import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Video,
  MapPin,
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Stethoscope,
  CreditCard,
  UserPlus,
  Search,
  Printer,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { appointmentsApi, consultationsApi, directoryApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AppointmentBadge } from "@/components/common/StatusBadge";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  formatDate,
  formatCurrency,
  CONSULTATION_TYPES,
  printHtml,
  downloadBlob,
  previewPdfBlob,
} from "@/utils/helpers";
import { useState } from "react";

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDoctor, isPatient } = useAuthStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateSearch, setDelegateSearch] = useState("");
  const [delegateReason, setDelegateReason] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const { data: apt, isLoading } = useQuery({
    queryKey: ["appointments", id],
    queryFn: () => appointmentsApi.get(id).then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => appointmentsApi.cancel(id, { reason: cancelReason }),
    onSuccess: () => {
      toast.success("Rendez-vous annulé");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowCancelModal(false);
      navigate("/appointments");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Erreur lors de l'annulation"),
  });

  const confirmMutation = useMutation({
    mutationFn: () => appointmentsApi.confirm(id),
    onSuccess: () => {
      toast.success("Rendez-vous confirmé !");
      queryClient.invalidateQueries({ queryKey: ["appointments", id] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const startConsultation = useMutation({
    mutationFn: () => consultationsApi.start({ appointment_id: id }),
    onSuccess: (res) => {
      const consultationId =
        res.data?.data?.consultation?.id ?? res.data?.data?.id;
      const jitsiToken = res.data?.jitsi_token ?? null;
      if (!consultationId) {
        toast.error("Réponse inattendue du serveur.");
        return;
      }
      toast.success("Consultation démarrée");
      // Route based on appointment type
      if (apt?.type === "presentiel") {
        navigate(`/consultations/${consultationId}/physical`);
      } else {
        navigate(`/consultations/${consultationId}/room`, {
          state: { jitsiToken },
        });
      }
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["directory-doctors", delegateSearch],
    queryFn: () =>
      directoryApi
        .search({ search: delegateSearch, per_page: 10 })
        .then((r) => r.data?.data ?? []),
    enabled: showDelegateModal && delegateSearch.length >= 2,
  });

  const delegateMutation = useMutation({
    mutationFn: () =>
      appointmentsApi.delegate(id, {
        delegate_to: selectedDoctor.id,
        reason: delegateReason,
      }),
    onSuccess: () => {
      toast.success("Rendez-vous délégué avec succès");
      queryClient.invalidateQueries({ queryKey: ["appointments", id] });
      setShowDelegateModal(false);
      setSelectedDoctor(null);
      setDelegateReason("");
      setDelegateSearch("");
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message ?? "Erreur lors de la délégation",
      ),
  });

  if (isLoading)
    return (
      <AppLayout title="Rendez-vous">
        <LoadingPage />
      </AppLayout>
    );
  if (!apt)
    return (
      <AppLayout title="Rendez-vous">
        <div className="text-center py-12 text-gray-400">Introuvable</div>
      </AppLayout>
    );

  const canCancel = ["pending", "confirmed"].includes(apt.status);
  const canConfirm = isDoctor() && apt.status === "pending";
  const canStart = isDoctor() && apt.status === "confirmed";
  const canDelegate =
    isDoctor() && ["pending", "confirmed"].includes(apt.status);

  const actes = apt.actes ?? [];
  const totalActes =
    apt.total_actes ?? actes.reduce((sum, a) => sum + (a.cout || 0), 0);
  const doctorName =
    `${apt.doctor?.first_name ?? ""} ${apt.doctor?.last_name ?? ""}`.trim();
  const patientName =
    `${apt.patient?.first_name ?? ""} ${apt.patient?.last_name ?? ""}`.trim();

  const handlePrintAppointment = () => {
    const actesRows = actes
      .map(
        (a, i) =>
          `<tr><td>${i + 1}</td><td>${a.libelle}</td><td style="text-align:right">${(a.cout || 0).toLocaleString()} FCFA</td></tr>`,
      )
      .join("");
    printHtml(
      "Récapitulatif du rendez-vous",
      `
      <div class="header">
        <h1>TLM-BFA — Récapitulatif du rendez-vous</h1>
        <p>Plateforme de Télémédecine du Burkina Faso</p>
      </div>
      <div class="meta-grid">
        <div class="meta-col">
          <p class="label">Motif</p>
          <p><strong>${apt.type === "presentiel" ? "[PHYSIQUE]" : "[EN LIGNE]"} ${apt.reason ?? "—"}</strong></p>
          <p class="label" style="margin-top:8px">Date</p>
          <p><strong>${apt.date ?? "—"}</strong></p>
          <p class="label" style="margin-top:8px">Heure</p>
          <p><strong>${apt.time ?? "—"}</strong></p>
        </div>
        <div class="meta-col">
          <p class="label">Statut</p>
          <p><strong>${apt.status ?? "—"}</strong></p>
        </div>
      </div>
      <h2>Professionnel de santé</h2>
      <table>
        <tr><td><strong>Nom</strong></td><td>${doctorName || "—"}</td></tr>
        ${apt.doctor?.matricule ? `<tr><td><strong>Matricule</strong></td><td>${apt.doctor.matricule}</td></tr>` : ""}
        ${apt.doctor?.specialty ? `<tr><td><strong>Spécialité</strong></td><td>${apt.doctor.specialty}</td></tr>` : ""}
      </table>
      <h2>Patient</h2>
      <table>
        <tr><td><strong>Nom</strong></td><td>${patientName || "—"}</td></tr>
        ${apt.patient?.identifiant ? `<tr><td><strong>Identifiant</strong></td><td>${apt.patient.identifiant}</td></tr>` : ""}
      </table>
      ${
        actes.length > 0
          ? `
      <h2>Actes médicaux</h2>
      <table><thead><tr><th>#</th><th>Libellé</th><th style="text-align:right">Montant</th></tr></thead><tbody>${actesRows}</tbody>
      <tfoot><tr><td colspan="2"><strong>Total</strong></td><td style="text-align:right"><strong>${totalActes.toLocaleString()} FCFA</strong></td></tr></tfoot></table>`
          : ""
      }
      ${apt.cancellation_reason ? `<h2>Motif d'annulation</h2><p>${apt.cancellation_reason}</p>` : ""}
      <div class="footer">Imprimé le ${new Date().toLocaleDateString("fr-FR")} — TLM-BFA</div>
    `,
    );
  };

  const handleDownloadAppointmentPdf = async () => {
    try {
      const res = await appointmentsApi.downloadPdf(id);
      downloadBlob(res.data, `rendez-vous-${id}.pdf`, "application/pdf");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handlePrintAppointmentPdf = async () => {
    try {
      const res = await appointmentsApi.downloadPdf(id);
      previewPdfBlob(res.data);
    } catch {
      toast.error("Erreur lors de l'impression");
    }
  };

  return (
    <AppLayout title="Détail du rendez-vous">
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
        <button
          onClick={() => navigate("/appointments")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" /> Mes rendez-vous
        </button>

        {/* ─── Header : Motif, Date, Heure ─── */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Motif</span>
                <span className="font-semibold text-gray-800">
                  {apt.type === "presentiel" ? "[PHYSIQUE] " : "[EN LIGNE] "}
                  {apt.reason ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Date</span>
                <span className="font-semibold text-gray-800">
                  {apt.date ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Heure</span>
                <span className="font-semibold text-gray-800">
                  {apt.time ?? "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Professionnel de santé ─── */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-primary-700">
                  Professionnel de santé &gt;&gt; {doctorName}
                </p>
                {apt.doctor?.matricule && (
                  <p className="text-sm text-gray-500">
                    {apt.doctor.matricule}
                  </p>
                )}
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-pink-400 rounded-full mb-3" />
            <div className="space-y-1">
              {apt.doctor?.matricule && (
                <div className="flex justify-between text-sm bg-gray-50 px-3 py-1.5 rounded">
                  <span className="text-gray-600">Matricule</span>
                  <span className="font-semibold">{apt.doctor.matricule}</span>
                </div>
              )}
              <div className="flex justify-between text-sm px-3 py-1.5">
                <span className="text-gray-600">Sexe</span>
                <span className="font-semibold">
                  {apt.doctor?.gender === "male"
                    ? "Homme"
                    : apt.doctor?.gender === "female"
                      ? "Femme"
                      : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm bg-gray-50 px-3 py-1.5 rounded">
                <span className="text-gray-600">Spécialité</span>
                <span className="font-semibold">
                  {apt.doctor?.specialty ?? "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Patient ─── */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-primary-700">
                  Patient &gt;&gt; {patientName}
                </p>
                {apt.patient?.identifiant && (
                  <p className="text-sm text-gray-600 font-semibold">
                    {apt.patient.identifiant}
                  </p>
                )}
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-pink-400 rounded-full" />
          </CardContent>
        </Card>

        {/* ─── Actes médicaux + Facturation ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Actes médicaux */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-600">
                Actes médicaux
              </h3>
            </CardHeader>
            <CardContent>
              {actes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Aucun acte associé
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-bold text-gray-700" />
                      <th className="text-left py-2 px-2 font-bold text-gray-700">
                        LIBELLE
                      </th>
                      <th className="text-right py-2 px-2 font-bold text-gray-700">
                        MONTANT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actes.map((acte, idx) => (
                      <tr key={acte.id} className="border-b border-gray-50">
                        <td className="py-2 px-2 text-gray-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 text-gray-800">
                          {acte.libelle}
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {(acte.cout || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Facturation & Paiement */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-600">
                Facturation & Paiement
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-600">Type</span>
                  <span className="font-bold text-primary-700">
                    Facturation
                  </span>
                </div>
                <div className="flex justify-between text-sm px-3 py-2">
                  <span className="text-gray-600">Téléphone</span>
                  <span className="font-medium">
                    {apt.patient?.phone ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-600">Montant</span>
                  <span className="font-bold text-primary-700">
                    {totalActes.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Type de Consultation ─── */}
        <div>
          <div className="bg-blue-500 text-white px-4 py-2.5 rounded-t-xl flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            <span className="font-semibold text-sm">Type de Consultation</span>
          </div>
          <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-4 flex items-center gap-3">
            <button
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                apt.type === "teleconsultation"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Video className="w-5 h-5" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider opacity-80">
                  En ligne
                </div>
                <div>TÉLÉCONSULTATION</div>
              </div>
            </button>
            <button
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                apt.type === "presentiel"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider opacity-80">
                  En présentiel
                </div>
                <div>CONSULTATION PHYSIQUE</div>
              </div>
            </button>
          </div>
        </div>

        {/* ─── Motif d'annulation ─── */}
        {apt.cancellation_reason && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Motif d'annulation
            </p>
            <p className="text-sm text-red-700">{apt.cancellation_reason}</p>
          </div>
        )}

        {/* ─── Actions ─── */}
        <div className="flex flex-wrap gap-3">
          {canStart && (
            <Button
              onClick={() => startConsultation.mutate()}
              loading={startConsultation.isPending}
              icon={apt?.type === "presentiel" ? Stethoscope : Video}
              className="flex-1"
            >
              {apt?.type === "presentiel"
                ? "Démarrer la consultation"
                : "Démarrer la téléconsultation"}
            </Button>
          )}
          {canConfirm && (
            <Button
              onClick={() => confirmMutation.mutate()}
              loading={confirmMutation.isPending}
              variant="success"
              icon={CheckCircle}
              className="flex-1"
            >
              Confirmer
            </Button>
          )}
          {canCancel && (
            <Button
              onClick={() => setShowCancelModal(true)}
              variant="danger"
              icon={X}
              className="flex-1"
            >
              Annuler le RDV
            </Button>
          )}
          {canDelegate && (
            <Button
              onClick={() => setShowDelegateModal(true)}
              variant="outline"
              icon={UserPlus}
              className="flex-1"
            >
              Déléguer
            </Button>
          )}
          {apt.status === "completed" && apt.consultation?.id && (
            <Button
              onClick={() =>
                navigate(`/consultations/${apt.consultation.id}/detail`)
              }
              variant="outline"
              icon={FileText}
              className="flex-1"
            >
              Voir le compte-rendu
            </Button>
          )}
          {isPatient() &&
            apt.status === "confirmed" &&
            apt.type !== "presentiel" && (
              <Button
                onClick={() => navigate(`/appointments/${id}/waiting`)}
                variant="outline"
                icon={Clock}
                className="flex-1"
              >
                Salle d'attente
              </Button>
            )}
          {apt.status === "completed" && apt.consultation?.id && (
            <Button
              onClick={() =>
                navigate(`/consultations/${apt.consultation.id}/payment`)
              }
              variant="outline"
              icon={CreditCard}
              className="flex-1"
            >
              Paiement
            </Button>
          )}
          <Button
            onClick={handlePrintAppointment}
            variant="outline"
            icon={Printer}
            className="flex-1"
          >
            Imprimer
          </Button>
          <Button
            onClick={handleDownloadAppointmentPdf}
            variant="outline"
            icon={Download}
            className="flex-1"
          >
            Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Cancel modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Annuler le rendez-vous"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Fermer
            </Button>
            <Button
              variant="danger"
              onClick={() => cancelMutation.mutate()}
              loading={cancelMutation.isPending}
              icon={X}
            >
              Confirmer l'annulation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir annuler ce rendez-vous ?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motif (optionnel)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="input-field w-full resize-none"
              placeholder="Raison de l'annulation…"
            />
          </div>
        </div>
      </Modal>

      {/* Delegate modal */}
      <Modal
        open={showDelegateModal}
        onClose={() => {
          setShowDelegateModal(false);
          setSelectedDoctor(null);
          setDelegateSearch("");
          setDelegateReason("");
        }}
        title="Déléguer le rendez-vous"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowDelegateModal(false)}
            >
              Annuler
            </Button>
            <Button
              icon={UserPlus}
              onClick={() => delegateMutation.mutate()}
              loading={delegateMutation.isPending}
              disabled={!selectedDoctor}
            >
              Déléguer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Recherchez un professionnel de santé à qui déléguer ce rendez-vous.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={delegateSearch}
              onChange={(e) => {
                setDelegateSearch(e.target.value);
                setSelectedDoctor(null);
              }}
              placeholder="Nom du médecin…"
              className="input-field w-full pl-9"
            />
          </div>
          {doctorsData?.length > 0 && !selectedDoctor && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {doctorsData.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoctor(doc)}
                  className="w-full text-left px-3 py-2 hover:bg-primary-50 flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                    {(doc.first_name?.[0] ?? "") + (doc.last_name?.[0] ?? "")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Dr. {doc.first_name} {doc.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.specialty ?? "Médecin"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedDoctor && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-200">
              <div className="w-10 h-10 bg-primary-200 rounded-full flex items-center justify-center text-primary-800 font-bold text-sm">
                {(selectedDoctor.first_name?.[0] ?? "") +
                  (selectedDoctor.last_name?.[0] ?? "")}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedDoctor.specialty ?? "Médecin"}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison (optionnel)
            </label>
            <textarea
              value={delegateReason}
              onChange={(e) => setDelegateReason(e.target.value)}
              rows={2}
              className="input-field w-full resize-none"
              placeholder="Motif de la délégation…"
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
