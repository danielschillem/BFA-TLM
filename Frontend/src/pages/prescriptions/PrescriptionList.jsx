import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { prescriptionsApi, consultationsApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { downloadBlob, previewPdfBlob } from "@/utils/helpers";
import {
  Pill,
  Search,
  Filter,
  CheckCircle,
  Send,
  Clock,
  ArrowLeft,
  AlertTriangle,
  FileText,
  PenTool,
  Share2,
  Download,
  Printer,
  Calendar,
  User,
  Stethoscope,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  signed: {
    label: "Signée",
    color: "bg-blue-100 text-blue-700",
    icon: PenTool,
  },
  pending: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  shared: {
    label: "Partagée",
    color: "bg-purple-100 text-purple-700",
    icon: Share2,
  },
};

export default function PrescriptionList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDoctor, isAdmin } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["prescriptions", searchParams.toString()],
    queryFn: () =>
      prescriptionsApi.list({
        search: searchParams.get("search") || undefined,
        status: searchParams.get("status") || undefined,
        page: searchParams.get("page") || 1,
      }),
  });

  const signMutation = useMutation({
    mutationFn: (id) => prescriptionsApi.sign(id),
    onSuccess: () => {
      toast.success("Ordonnance signée avec succès");
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
    onError: () => toast.error("Erreur lors de la signature"),
  });

  const shareMutation = useMutation({
    mutationFn: (id) => prescriptionsApi.share(id, { share_with: ["patient"] }),
    onSuccess: () => {
      toast.success("Ordonnance partagée avec le patient");
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
    onError: () => toast.error("Erreur lors du partage"),
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set("search", search);
    else params.delete("search");
    if (statusFilter !== "all") params.set("status", statusFilter);
    else params.delete("status");
    params.delete("page");
    setSearchParams(params);
  };

  const prescriptions = data?.data?.data || data?.data || [];
  const meta = data?.data?.meta || {};

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-6">
      {/* Header avec retour */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ordonnances</h1>
            <p className="text-gray-500 mt-1">
              {isDoctor()
                ? "Gérez vos ordonnances médicales"
                : "Consultez vos ordonnances"}
              {prescriptions.length > 0 && (
                <span className="ml-2 text-sm font-medium text-primary-600">
                  ({meta.total || prescriptions.length} au total)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1">
              <Input
                icon={Search}
                placeholder="Rechercher par médicament..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "Tous les statuts" },
                { value: "active", label: "Active" },
                { value: "signed", label: "Signée" },
                { value: "pending", label: "En attente" },
              ]}
            />
            <Button type="submit" variant="outline" icon={Filter}>
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Liste */}
      {prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Aucune ordonnance"
          description="Les ordonnances créées lors des consultations apparaîtront ici."
        />
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription) => {
            const status = prescription.signed
              ? "signed"
              : prescription.status || "pending";
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            const consult = prescription.consultation;

            return (
              <Card
                key={prescription.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    {/* Ligne 1 : Médicament + statut + urgence */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            prescription.urgent ? "bg-red-100" : "bg-cyan-50"
                          }`}
                        >
                          {prescription.urgent ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Pill className="w-5 h-5 text-cyan-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">
                              {prescription.name || "Ordonnance"}
                            </h3>
                            {prescription.urgent && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Urgent
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                          {prescription.dosage && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Posologie :</span>{" "}
                              {prescription.dosage}
                            </p>
                          )}
                          {prescription.instructions && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                              {prescription.instructions}
                            </p>
                          )}
                          {prescription.duration_days && (
                            <p className="text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              Durée : {prescription.duration_days} jours
                              {prescription.start_date && (
                                <span className="ml-2">
                                  (du{" "}
                                  {format(
                                    new Date(prescription.start_date),
                                    "dd/MM/yyyy",
                                    { locale: fr },
                                  )}
                                  {prescription.end_date &&
                                    ` au ${format(
                                      new Date(prescription.end_date),
                                      "dd/MM/yyyy",
                                      { locale: fr },
                                    )}`}
                                  )
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isDoctor() && !prescription.signed && (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={PenTool}
                            loading={signMutation.isPending}
                            onClick={() => signMutation.mutate(prescription.id)}
                          >
                            Signer
                          </Button>
                        )}
                        {isDoctor() && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Send}
                            loading={shareMutation.isPending}
                            onClick={() =>
                              shareMutation.mutate(prescription.id)
                            }
                          >
                            Partager
                          </Button>
                        )}
                        {prescription.consultation_id && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Download}
                              onClick={async () => {
                                try {
                                  const res =
                                    await consultationsApi.downloadPrescriptionPdf(
                                      prescription.consultation_id,
                                    );
                                  downloadBlob(
                                    res.data,
                                    `ordonnance-${prescription.id}.pdf`,
                                    "application/pdf",
                                  );
                                } catch {
                                  toast.error("Erreur lors du téléchargement");
                                }
                              }}
                            >
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Printer}
                              onClick={async () => {
                                try {
                                  const res =
                                    await consultationsApi.downloadPrescriptionPdf(
                                      prescription.consultation_id,
                                    );
                                  previewPdfBlob(res.data);
                                } catch {
                                  toast.error("Erreur lors de l'impression");
                                }
                              }}
                            >
                              Imprimer
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Ligne 2 : Infos consultation liée */}
                    {consult && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 flex-1">
                          {consult.date && (
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md">
                              <Calendar className="w-3.5 h-3.5 text-primary-500" />
                              {format(
                                new Date(consult.date),
                                "EEEE d MMMM yyyy 'à' HH'h'mm",
                                { locale: fr },
                              )}
                            </span>
                          )}
                          {consult.doctor?.name && (
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md">
                              <Stethoscope className="w-3.5 h-3.5 text-teal-500" />
                              Dr. {consult.doctor.name}
                            </span>
                          )}
                          {consult.patient?.name && isDoctor() && (
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              {consult.patient.name}
                            </span>
                          )}
                          {consult.motif && (
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md">
                              <FileText className="w-3.5 h-3.5 text-amber-500" />
                              {consult.motif}
                            </span>
                          )}
                          {consult.type && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                consult.type === "teleconsultation"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              {consult.type === "teleconsultation"
                                ? "Téléconsultation"
                                : "Présentiel"}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            navigate(`/consultations/${consult.id}`)
                          }
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition shrink-0"
                        >
                          Voir la consultation{" "}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Ligne sans consultation — date de création */}
                    {!consult && prescription.created_at && (
                      <div className="pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Créée le{" "}
                          {format(
                            new Date(prescription.created_at),
                            "dd MMMM yyyy",
                            { locale: fr },
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: meta.last_page }, (_, i) => (
                <Button
                  key={i + 1}
                  size="sm"
                  variant={meta.current_page === i + 1 ? "primary" : "outline"}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set("page", i + 1);
                    setSearchParams(params);
                  }}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
