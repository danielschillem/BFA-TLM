import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Check,
  X,
  Clock,
  FileText,
  AlertTriangle,
  Plus,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { consentsApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Input";
import { formatDateTime } from "@/utils/helpers";

const CONSENT_TYPES = [
  { value: "teleconsultation", label: "Téléconsultation" },
  { value: "partage_donnees", label: "Partage de données médicales" },
  { value: "teleexpertise", label: "Téléexpertise" },
  { value: "enregistrement_video", label: "Enregistrement vidéo" },
  { value: "recherche", label: "Recherche médicale" },
  { value: "traitement_donnees", label: "Traitement des données personnelles" },
];

const STATUS_CONFIG = {
  accorde: {
    label: "Accordé",
    icon: Check,
    color: "text-green-700 bg-green-50",
  },
  refuse: { label: "Refusé", icon: X, color: "text-red-700 bg-red-50" },
  revoque: {
    label: "Révoqué",
    icon: Ban,
    color: "text-orange-700 bg-orange-50",
  },
  en_attente: {
    label: "En attente",
    icon: Clock,
    color: "text-yellow-700 bg-yellow-50",
  },
};

export default function ConsentManagement() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [consentForm, setConsentForm] = useState({ type: "", notes: "" });
  const isPatient = user?.roles?.includes("patient");

  // Fetch via REST API dédiée
  const { data: consents, isLoading } = useQuery({
    queryKey: ["consents"],
    queryFn: () => consentsApi.list().then((r) => r.data?.data ?? r.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (data) => consentsApi.create(data),
    onSuccess: () => {
      toast.success("Consentement enregistré");
      queryClient.invalidateQueries({ queryKey: ["consents"] });
      setShowModal(false);
      setConsentForm({ type: "", notes: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const withdrawMutation = useMutation({
    mutationFn: (id) => consentsApi.withdraw(id),
    onSuccess: () => {
      toast.success("Consentement révoqué");
      queryClient.invalidateQueries({ queryKey: ["consents"] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const consentList = Array.isArray(consents) ? consents : [];
  const active = consentList.filter((c) => c.statut === "accorde");
  const revoked = consentList.filter(
    (c) => c.statut === "revoque" || c.statut === "refuse",
  );

  return (
    <AppLayout title="Gestion des consentements">
      <div className="space-y-5 animate-fade-in max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total"
            value={consentList.length}
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="Actifs"
            value={active.length}
            icon={Check}
            color="green"
          />
          <StatCard
            label="Révoqués / Refusés"
            value={revoked.length}
            icon={X}
            color="red"
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Mes consentements
            </h2>
          </div>
          {isPatient && (
            <Button icon={Plus} onClick={() => setShowModal(true)}>
              Nouveau consentement
            </Button>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Conformément au RGPD et aux normes OMS, vous avez le droit de gérer
          vos consentements pour le traitement de vos données de santé.
        </p>

        {/* Consent list */}
        {isLoading ? (
          <LoadingPage />
        ) : consentList.length === 0 ? (
          <Card>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 font-medium">
                  Types de consentements disponibles :
                </p>
                {CONSENT_TYPES.map((ct) => (
                  <div
                    key={ct.value}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {ct.label}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      Non renseigné
                    </span>
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Les consentements sont enregistrés lors de vos
                      consultations. Vous pouvez les gérer ici à tout moment.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {consentList.map((consent) => {
              const status = consent.statut ?? "en_attente";
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.en_attente;
              const StatusIcon = cfg.icon;
              const typeLabel =
                CONSENT_TYPES.find((ct) => ct.value === consent.type)?.label ??
                consent.type ??
                "—";
              const isActive = status === "accorde";

              return (
                <div
                  key={consent.id}
                  className="bg-white rounded-lg border border-gray-100 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {typeLabel}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {consent.date_consentement
                        ? `Donné le ${formatDateTime(
                            consent.date_consentement,
                          )}`
                        : consent.created_at
                        ? `Créé le ${formatDateTime(consent.created_at)}`
                        : "Date inconnue"}
                    </p>
                    {consent.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {consent.notes}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${cfg.color}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </span>
                  {isActive && isPatient && (
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={Ban}
                      className="text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                      loading={withdrawMutation.isPending}
                      onClick={() => {
                        if (confirm("Révoquer ce consentement ?"))
                          withdrawMutation.mutate(consent.id);
                      }}
                    >
                      Révoquer
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New consent modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Enregistrer un consentement"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button
              icon={Check}
              loading={createMutation.isPending}
              disabled={!consentForm.type}
              onClick={() => createMutation.mutate(consentForm)}
            >
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Type de consentement *"
            value={consentForm.type}
            onChange={(e) =>
              setConsentForm((f) => ({ ...f, type: e.target.value }))
            }
            options={CONSENT_TYPES}
            placeholder="Sélectionner le type"
          />
          <Textarea
            label="Notes (optionnel)"
            value={consentForm.notes}
            onChange={(e) =>
              setConsentForm((f) => ({ ...f, notes: e.target.value }))
            }
            rows={2}
            placeholder="Informations complémentaires…"
          />
        </div>
      </Modal>
    </AppLayout>
  );
}
