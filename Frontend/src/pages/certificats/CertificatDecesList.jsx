import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Ban,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { certificatsDecesApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, StatCard } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/utils/helpers";

const STATUS_CONFIG = {
  brouillon: {
    label: "Brouillon",
    icon: Clock,
    color: "text-gray-700 bg-gray-50",
  },
  certifie: {
    label: "Certifié",
    icon: CheckCircle,
    color: "text-blue-700 bg-blue-50",
  },
  valide: {
    label: "Validé",
    icon: ShieldCheck,
    color: "text-green-700 bg-green-50",
  },
  rejete: { label: "Rejeté", icon: XCircle, color: "text-red-700 bg-red-50" },
  annule: { label: "Annulé", icon: Ban, color: "text-orange-700 bg-orange-50" },
};

const TABS = [
  { value: "", label: "Tous" },
  { value: "brouillon", label: "Brouillons" },
  { value: "certifie", label: "Certifiés" },
  { value: "valide", label: "Validés" },
  { value: "rejete", label: "Rejetés" },
];

export default function CertificatDecesList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["certificats-deces", activeTab, search],
    queryFn: () =>
      certificatsDecesApi
        .list({
          statut: activeTab || undefined,
          search: search || undefined,
        })
        .then((r) => ({
          certificats: r.data.data ?? [],
          meta: r.data.meta ?? {},
        })),
  });

  const { data: stats } = useQuery({
    queryKey: ["certificats-deces", "statistics"],
    queryFn: () =>
      certificatsDecesApi.statistics().then((r) => r.data.data ?? r.data ?? {}),
  });

  const certificats = data?.certificats ?? [];
  const totalCertificats =
    stats?.total_certificats ?? stats?.total ?? certificats.length;

  return (
    <AppLayout title="Certificats de décès">
      <div className="space-y-5 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={totalCertificats}
            icon={FileText}
            color="primary"
          />
          <StatCard
            label="Brouillons"
            value={stats?.brouillons ?? 0}
            icon={Clock}
            color="gray"
          />
          <StatCard
            label="Certifiés"
            value={stats?.certifies ?? 0}
            icon={CheckCircle}
            color="blue"
          />
          <StatCard
            label="Validés"
            value={stats?.valides ?? 0}
            icon={ShieldCheck}
            color="green"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, numéro de certificat…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <Button
            icon={Plus}
            onClick={() => navigate("/certificats-deces/nouveau")}
          >
            Nouveau certificat
          </Button>
          <Button
            variant="outline"
            icon={BarChart3}
            onClick={() => navigate("/certificats-deces/statistiques")}
          >
            Statistiques
          </Button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.value
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingPage />
        ) : certificats.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun certificat de décès"
            description="Créez un certificat de décès conforme au modèle OMS."
            action={
              <Button
                icon={Plus}
                onClick={() => navigate("/certificats-deces/nouveau")}
              >
                Créer
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {certificats.map((cert) => {
              const cfg = STATUS_CONFIG[cert.statut] ?? STATUS_CONFIG.brouillon;
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={cert.id}
                  onClick={() => navigate(`/certificats-deces/${cert.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {cert.nom_defunt} {cert.prenoms_defunt}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="font-mono">
                        {cert.numero_certificat}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(cert.date_deces)}</span>
                      {cert.cause_directe && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[200px]">
                            {cert.cause_directe}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${cfg.color}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
