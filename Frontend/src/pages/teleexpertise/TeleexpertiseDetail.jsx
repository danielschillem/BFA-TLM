import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { teleexpertiseApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  TeleexpertiseBadge,
  UrgencyBadge,
} from "@/components/common/StatusBadge";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import { formatDateTime, printHtml } from "@/utils/helpers";
import { useState } from "react";

export default function TeleexpertiseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isDoctor } = useAuthStore();
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const { data: req, isLoading } = useQuery({
    queryKey: ["teleexpertise", id],
    queryFn: () => teleexpertiseApi.get(id).then((r) => r.data.data),
  });

  const acceptMutation = useMutation({
    mutationFn: () => teleexpertiseApi.accept(id),
    onSuccess: () => {
      toast.success("Demande acceptée");
      queryClient.invalidateQueries({ queryKey: ["teleexpertise", id] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => teleexpertiseApi.reject(id, { reason: declineReason }),
    onSuccess: () => {
      toast.info("Demande refusée");
      queryClient.invalidateQueries({ queryKey: ["teleexpertise", id] });
      setShowDecline(false);
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  if (isLoading)
    return (
      <AppLayout title="Téléexpertise">
        <LoadingPage />
      </AppLayout>
    );
  if (!req)
    return (
      <AppLayout title="Téléexpertise">
        <div className="text-center py-12 text-gray-400">Introuvable</div>
      </AppLayout>
    );

  const isSpecialist = user?.id === req.specialist_id;
  const isRequester = user?.id === req.requesting_doctor_id;
  const canAcceptReject = isSpecialist && req.status === "pending";
  const canRespond = isSpecialist && req.status === "accepted";

  const handlePrintExpertise = () => {
    printHtml(
      "Téléexpertise — " + req.title,
      `
      <div class="header">
        <h1>TLM-BFA — Demande de Téléexpertise</h1>
        <p>Plateforme de Télémédecine du Burkina Faso</p>
      </div>
      <div class="meta-grid">
        <div class="meta-col">
          <p class="label">Titre</p><p><strong>${req.title}</strong></p>
          <p class="label" style="margin-top:6px">Spécialité demandée</p><p>${
            req.specialty_requested || "—"
          }</p>
          <p class="label" style="margin-top:6px">Statut</p><p><strong>${
            req.status
          }</strong></p>
        </div>
        <div class="meta-col">
          <p class="label">Médecin demandeur</p><p>Dr. ${
            req.requesting_doctor?.last_name || "—"
          }</p>
          <p class="label" style="margin-top:6px">Spécialiste</p><p>${
            req.specialist ? "Dr. " + req.specialist.last_name : "Non assigné"
          }</p>
          <p class="label" style="margin-top:6px">Date</p><p>${formatDateTime(
            req.created_at,
          )}</p>
        </div>
      </div>
      ${
        req.patient_age
          ? `<p><strong>Patient :</strong> ${req.patient_age} ans${
              req.patient_gender ? ", " + req.patient_gender : ""
            }</p>`
          : ""
      }
      <h2>Résumé clinique</h2>
      <p>${req.clinical_summary || "—"}</p>
      <h2>Question posée</h2>
      <p>${req.question || "—"}</p>
      ${
        req.response
          ? `<h2>Avis du spécialiste</h2><p>${req.response}</p>${
              req.responded_at
                ? '<p style="color:#999;font-size:10px">Répondu le ' +
                  formatDateTime(req.responded_at) +
                  "</p>"
                : ""
            }`
          : ""
      }
      ${
        req.decline_reason
          ? `<h2>Motif de refus</h2><p>${req.decline_reason}</p>`
          : ""
      }
      <div class="footer">Imprimé le ${new Date().toLocaleDateString(
        "fr-FR",
      )} — TLM-BFA</div>
    `,
    );
  };

  return (
    <AppLayout title="Téléexpertise">
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/teleexpertise")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" /> Téléexpertise
          </button>
          <Button
            onClick={handlePrintExpertise}
            variant="outline"
            size="sm"
            icon={Printer}
          >
            Imprimer
          </Button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{req.title}</h2>
                <p className="text-sm text-gray-500">
                  {req.specialty_requested}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <TeleexpertiseBadge status={req.status} />
              {req.urgency_level !== "normal" && (
                <UrgencyBadge urgency={req.urgency_level} />
              )}
            </div>
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Médecin demandeur</p>
              <p className="font-medium text-gray-800">
                Dr. {req.requesting_doctor?.last_name}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Spécialiste</p>
              <p className="font-medium text-gray-800">
                {req.specialist
                  ? `Dr. ${req.specialist.last_name}`
                  : "Non assigné"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Date de la demande</p>
              <p className="font-medium text-gray-800">
                {formatDateTime(req.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Résumé clinique */}
        <Card>
          <CardHeader>
            <h3 className="section-title">Résumé clinique</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Résumé du cas
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">
                {req.clinical_summary}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Question posée
              </p>
              <p className="text-sm text-gray-700 bg-primary-50 rounded-xl p-3 border border-primary-100">
                {req.question}
              </p>
            </div>
            {req.patient_age && (
              <div className="flex gap-4 text-sm text-gray-600">
                {req.patient_age && <span>Âge : {req.patient_age} ans</span>}
                {req.patient_gender && (
                  <span>Genre : {req.patient_gender}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Réponse du spécialiste */}
        {req.response && (
          <Card>
            <CardHeader>
              <h3 className="section-title flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Avis du
                spécialiste
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {req.response}
                </p>
              </div>
              {req.responded_at && (
                <p className="text-xs text-gray-400">
                  Répondu le {formatDateTime(req.responded_at)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Decline reason */}
        {req.decline_reason && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-600">Demande refusée</p>
                  <p className="text-gray-600 mt-0.5">{req.decline_reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions spécialiste */}
        {canAcceptReject && !showDecline && (
          <div className="flex gap-3">
            <Button
              onClick={() => acceptMutation.mutate()}
              loading={acceptMutation.isPending}
              icon={CheckCircle}
              className="flex-1"
            >
              Accepter la demande
            </Button>
            <Button
              onClick={() => setShowDecline(true)}
              variant="danger"
              icon={XCircle}
              className="flex-1"
            >
              Refuser
            </Button>
          </div>
        )}

        {showDecline && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Motif du refus
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                className="input-field w-full resize-none"
                placeholder="Expliquez pourquoi vous ne pouvez pas traiter cette demande…"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDecline(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={() => rejectMutation.mutate()}
                  loading={rejectMutation.isPending}
                  className="flex-1"
                >
                  Confirmer le refus
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {canRespond && (
          <Button
            onClick={() => navigate(`/teleexpertise/${id}/respond`)}
            className="w-full"
            size="lg"
            icon={MessageSquare}
          >
            Rédiger ma réponse d'expertise
          </Button>
        )}
      </div>
    </AppLayout>
  );
}
