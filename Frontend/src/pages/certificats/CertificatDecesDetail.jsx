import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  ShieldCheck,
  XCircle,
  Ban,
  Clock,
  User,
  MapPin,
  Calendar,
  Activity,
  AlertTriangle,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { certificatsDecesApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { formatDate, formatDateTime } from "@/utils/helpers";
import { useState } from "react";

const STATUS_CONFIG = {
  brouillon: {
    label: "Brouillon",
    icon: Clock,
    color: "text-gray-700 bg-gray-100",
  },
  certifie: {
    label: "Certifié",
    icon: CheckCircle,
    color: "text-blue-700 bg-blue-100",
  },
  valide: {
    label: "Validé",
    icon: ShieldCheck,
    color: "text-green-700 bg-green-100",
  },
  rejete: { label: "Rejeté", icon: XCircle, color: "text-red-700 bg-red-100" },
  annule: {
    label: "Annulé",
    icon: Ban,
    color: "text-orange-700 bg-orange-100",
  },
};

const MANNER_LABELS = {
  naturelle: "Mort naturelle",
  accident: "Accident",
  suicide: "Suicide",
  homicide: "Homicide",
  guerre: "Guerre / conflit",
  indeterminee: "Indéterminée",
  en_attente_enquete: "En attente d'enquête",
};

const PREGNANCY_LABELS = {
  non_applicable: "Non applicable",
  non_enceinte: "Non enceinte",
  enceinte: "Enceinte au moment du décès",
  moins_42_jours_postpartum: "Moins de 42 jours après la fin de grossesse",
  "43_jours_a_1_an_postpartum": "Entre 43 jours et 1 an après",
};

function InfoRow({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-xs text-gray-900 font-medium ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function CauseRow({ letter, label, cause, code, intervalle, colorClass }) {
  if (!cause) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}
      >
        {letter}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{cause}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {code && (
            <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {code}
            </span>
          )}
          {intervalle && (
            <span className="text-xs text-gray-400">
              Intervalle : {intervalle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CertificatDecesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["certificat-deces", id],
    queryFn: () =>
      certificatsDecesApi.get(id).then((r) => r.data.data ?? r.data),
  });

  const cert = data ?? {};
  const cfg = STATUS_CONFIG[cert.statut] ?? STATUS_CONFIG.brouillon;
  const StatusIcon = cfg.icon;

  const certifierMutation = useMutation({
    mutationFn: () => certificatsDecesApi.certifier(id),
    onSuccess: () => {
      toast.success("Certificat certifié");
      queryClient.invalidateQueries({ queryKey: ["certificat-deces", id] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const validerMutation = useMutation({
    mutationFn: () => certificatsDecesApi.valider(id),
    onSuccess: () => {
      toast.success("Certificat validé");
      queryClient.invalidateQueries({ queryKey: ["certificat-deces", id] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const rejeterMutation = useMutation({
    mutationFn: () =>
      certificatsDecesApi.rejeter(id, { motif_rejet: rejectReason }),
    onSuccess: () => {
      toast.success("Certificat rejeté");
      setShowRejectModal(false);
      queryClient.invalidateQueries({ queryKey: ["certificat-deces", id] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const annulerMutation = useMutation({
    mutationFn: () =>
      certificatsDecesApi.annuler(id, { motif_annulation: cancelReason }),
    onSuccess: () => {
      toast.success("Certificat annulé");
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ["certificat-deces", id] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  if (isLoading)
    return (
      <AppLayout title="Certificat de décès">
        <LoadingPage />
      </AppLayout>
    );
  if (error)
    return (
      <AppLayout title="Certificat de décès">
        <EmptyState
          icon={AlertTriangle}
          title="Certificat introuvable"
          description="Ce certificat n'existe pas ou vous n'y avez pas accès."
          action={
            <Button
              variant="primary"
              onClick={() => navigate("/certificats-deces")}
            >
              Retour
            </Button>
          }
        />
      </AppLayout>
    );

  const isAdmin = user?.roles?.includes("admin");
  const canCertify = cert.statut === "brouillon";
  const canValidate = cert.statut === "certifie" && isAdmin;
  const canReject = cert.statut === "certifie" && isAdmin;
  const canCancel = ["brouillon", "rejete"].includes(cert.statut);
  const canEdit = cert.statut === "brouillon";

  return (
    <AppLayout title="Certificat de décès">
      <div className="space-y-5 animate-fade-in max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate("/certificats-deces")}
          >
            Retour
          </Button>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                icon={Edit}
                onClick={() => navigate(`/certificats-deces/${id}/modifier`)}
              >
                Modifier
              </Button>
            )}
            {canCertify && (
              <Button
                variant="primary"
                icon={CheckCircle}
                loading={certifierMutation.isPending}
                onClick={() => certifierMutation.mutate()}
              >
                Certifier
              </Button>
            )}
            {canValidate && (
              <Button
                variant="primary"
                icon={ShieldCheck}
                loading={validerMutation.isPending}
                onClick={() => validerMutation.mutate()}
              >
                Valider
              </Button>
            )}
            {canReject && (
              <Button
                variant="danger"
                icon={XCircle}
                onClick={() => setShowRejectModal(true)}
              >
                Rejeter
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                icon={Ban}
                onClick={() => setShowCancelModal(true)}
              >
                Annuler
              </Button>
            )}
          </div>
        </div>

        {/* Status + certificate number */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {cert.nom_defunt} {cert.prenoms_defunt}
                </p>
                <p className="text-sm font-mono text-gray-500 mt-0.5">
                  {cert.numero_certificat}
                </p>
              </div>
              <span
                className={`flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5 ${cfg.color}`}
              >
                <StatusIcon className="w-4 h-4" />
                {cfg.label}
              </span>
            </div>
            {cert.motif_rejet && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 font-medium">
                  Motif du rejet :
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {cert.motif_rejet}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Identité */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold">Identité du défunt</h3>
            </div>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Nom complet"
              value={`${cert.prenoms_defunt} ${cert.nom_defunt}`}
            />
            <InfoRow
              label="Date de naissance"
              value={formatDate(cert.date_naissance_defunt)}
            />
            <InfoRow
              label="Sexe"
              value={
                cert.sexe_defunt === "M"
                  ? "Masculin"
                  : cert.sexe_defunt === "F"
                    ? "Féminin"
                    : cert.sexe_defunt
              }
            />
            <InfoRow
              label="Lieu de naissance"
              value={cert.lieu_naissance_defunt}
            />
            <InfoRow label="Nationalité" value={cert.nationalite_defunt} />
            <InfoRow label="Profession" value={cert.profession_defunt} />
            <InfoRow label="Adresse" value={cert.adresse_defunt} />
            {cert.patient?.ipp && (
              <InfoRow label="IPP (BFA-LPK)" value={cert.patient.ipp} mono />
            )}
          </CardContent>
        </Card>

        {/* Décès */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold">Circonstances du décès</h3>
            </div>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Date du décès"
              value={formatDate(cert.date_deces)}
            />
            <InfoRow label="Heure du décès" value={cert.heure_deces} />
            <InfoRow label="Lieu du décès" value={cert.lieu_deces} />
            <InfoRow
              label="Circonstances"
              value={
                MANNER_LABELS[cert.circonstances_deces ?? cert.maniere_deces]
              }
            />
            <InfoRow
              label="Autopsie"
              value={cert.autopsie_pratiquee ? "Oui" : "Non"}
            />
            {cert.resultats_autopsie && (
              <InfoRow
                label="Résultats autopsie"
                value={cert.resultats_autopsie}
              />
            )}
            <InfoRow
              label="Grossesse"
              value={
                PREGNANCY_LABELS[cert.statut_grossesse] ?? "Non applicable"
              }
            />
            {cert.chirurgie_recente && (
              <>
                <InfoRow label="Chirurgie récente" value="Oui" />
                <InfoRow
                  label="Date chirurgie"
                  value={formatDate(cert.date_chirurgie)}
                />
                <InfoRow
                  label="Raison chirurgie"
                  value={cert.raison_chirurgie}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Partie I — Chaîne causale */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold">
                Partie I — Chaîne causale OMS
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <CauseRow
              letter="a"
              cause={cert.cause_directe}
              code={cert.code_icd11_cause_directe}
              intervalle={cert.intervalle_cause_directe}
              colorClass="bg-red-100 text-red-700"
            />
            <CauseRow
              letter="b"
              cause={cert.cause_antecedente_1}
              code={cert.code_icd11_cause_antecedente_1}
              intervalle={cert.intervalle_cause_antecedente_1}
              colorClass="bg-orange-100 text-orange-700"
            />
            <CauseRow
              letter="c"
              cause={cert.cause_antecedente_2}
              code={cert.code_icd11_cause_antecedente_2}
              intervalle={cert.intervalle_cause_antecedente_2}
              colorClass="bg-yellow-100 text-yellow-700"
            />
            <CauseRow
              letter="d"
              cause={cert.cause_initiale}
              code={cert.code_icd11_cause_initiale}
              intervalle={cert.intervalle_cause_initiale}
              colorClass="bg-blue-100 text-blue-700"
            />
            {!cert.cause_directe && (
              <p className="text-xs text-gray-400 italic py-2">
                Aucune cause renseignée.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Partie II */}
        {cert.autres_conditions && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">
                Partie II — Autres conditions
              </h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{cert.autres_conditions}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">
              Informations complémentaires
            </h3>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Médecin certificateur"
              value={
                cert.medecin
                  ? `Dr. ${cert.medecin.prenoms ?? cert.medecin.first_name} ${cert.medecin.nom ?? cert.medecin.last_name}`
                  : "—"
              }
            />
            <InfoRow
              label="Structure"
              value={cert.structure?.nom ?? cert.structure?.name}
            />
            <InfoRow label="Créé le" value={formatDateTime(cert.created_at)} />
            <InfoRow
              label="Certifié le"
              value={formatDateTime(cert.date_certification)}
            />
            <InfoRow
              label="Validé le"
              value={formatDateTime(cert.date_validation)}
            />
            {cert.notes && <InfoRow label="Notes" value={cert.notes} />}
          </CardContent>
        </Card>
      </div>

      {/* Reject modal */}
      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Rejeter le certificat"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              icon={XCircle}
              loading={rejeterMutation.isPending}
              onClick={() => rejeterMutation.mutate()}
            >
              Rejeter
            </Button>
          </div>
        }
      >
        <Textarea
          label="Motif du rejet *"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
          required
        />
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Annuler le certificat"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Fermer
            </Button>
            <Button
              variant="danger"
              icon={Ban}
              loading={annulerMutation.isPending}
              onClick={() => annulerMutation.mutate()}
            >
              Confirmer l'annulation
            </Button>
          </div>
        }
      >
        <Textarea
          label="Motif d'annulation *"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          required
        />
      </Modal>
    </AppLayout>
  );
}
