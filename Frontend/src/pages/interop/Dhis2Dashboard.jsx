import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Building2,
  RefreshCw,
  Upload,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity,
  Clock,
  MapPin,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { dhis2Api } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui/Card";
import { Spinner } from "@/components/common/LoadingSpinner";
import { toast } from "sonner";

function StatusBadge({ status }) {
  if (status === "online")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
        <CheckCircle2 className="w-3.5 h-3.5" /> En ligne
      </span>
    );
  if (status === "disabled")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
        <XCircle className="w-3.5 h-3.5" /> Désactivé
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-500">
      <XCircle className="w-3.5 h-3.5" /> Hors ligne
    </span>
  );
}

export default function Dhis2Dashboard() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // ── Queries ──────────────────────────────────────────────────────────────

  const metadata = useQuery({
    queryKey: ["dhis2", "metadata"],
    queryFn: () => dhis2Api.metadata().then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const indicators = useQuery({
    queryKey: ["dhis2", "indicators", period],
    queryFn: () => dhis2Api.indicators({ period }).then((r) => r.data?.data),
    staleTime: 60 * 1000,
  });

  const mapping = useQuery({
    queryKey: ["dhis2", "mapping"],
    queryFn: () => dhis2Api.mapping().then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  });

  const syncStatus = useQuery({
    queryKey: ["dhis2", "sync-status"],
    queryFn: () => dhis2Api.syncStatus().then((r) => r.data?.data),
    staleTime: 30 * 1000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const pushDhis2 = useMutation({
    mutationFn: (data) => dhis2Api.push(data),
    onSuccess: () => {
      toast.success("Données poussées vers DHIS2");
      queryClient.invalidateQueries({ queryKey: ["dhis2", "sync-status"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Erreur DHIS2"),
  });

  const pushEndos = useMutation({
    mutationFn: (data) => dhis2Api.endosPush(data),
    onSuccess: () => {
      toast.success("Données poussées vers ENDOS");
      queryClient.invalidateQueries({ queryKey: ["dhis2", "sync-status"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Erreur ENDOS"),
  });

  const syncEndosOrgUnits = useMutation({
    mutationFn: () => dhis2Api.endosSyncOrgUnits(),
    onSuccess: (res) => {
      const data = res.data?.data;
      toast.success(`Org units synchronisées: ${data?.mapped ?? 0} mappées`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Erreur sync"),
  });

  // ── Derived ──────────────────────────────────────────────────────────────

  const dhis2Status = metadata.data?.dhis2?.health?.status;
  const endosStatus = metadata.data?.endos?.health?.status;
  const mappedCount = mapping.data?.mapped_count ?? 0;
  const unmappedCount = mapping.data?.unmapped_count ?? 0;
  const lastDhis2Sync = syncStatus.data?.dhis2_last_sync;
  const lastEndosSync = syncStatus.data?.endos_last_sync;

  const indicatorList = indicators.data
    ? Object.entries(indicators.data)
        .filter(([k]) => !["period", "period_start", "period_end"].includes(k))
        .map(([key, value]) => ({ key, value }))
    : [];

  const periodLabel = indicators.data
    ? `${indicators.data.period_start} — ${indicators.data.period_end}`
    : period;

  return (
    <AppLayout title="DHIS2 & ENDOS">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Database}
            label="DHIS2"
            value={dhis2Status === "online" ? "Connecté" : "Déconnecté"}
            color={dhis2Status === "online" ? "green" : "red"}
          />
          <StatCard
            icon={Building2}
            label="ENDOS"
            value={
              endosStatus === "online"
                ? "Connecté"
                : endosStatus === "disabled"
                  ? "Désactivé"
                  : "Déconnecté"
            }
            color={endosStatus === "online" ? "green" : "gray"}
          />
          <StatCard
            icon={BarChart3}
            label="Indicateurs mappés"
            value={`${mappedCount}/${mappedCount + unmappedCount}`}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Dernière sync"
            value={
              lastDhis2Sync?.timestamp
                ? new Date(lastDhis2Sync.timestamp).toLocaleDateString("fr")
                : "—"
            }
            color="purple"
          />
        </div>

        {/* Service status cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DHIS2 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-900">DHIS2</h3>
                </div>
                <StatusBadge status={dhis2Status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metadata.data?.dhis2?.health?.version && (
                  <p className="text-xs text-gray-500">
                    Version: {metadata.data.dhis2.health.version}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Dataset UID:{" "}
                  {metadata.data?.dhis2?.dataset_uid || (
                    <span className="text-amber-500">Non configuré</span>
                  )}
                </p>
                {lastDhis2Sync && (
                  <p className="text-xs text-gray-500">
                    Dernière sync:{" "}
                    {new Date(lastDhis2Sync.timestamp).toLocaleString("fr")}
                  </p>
                )}
                <button
                  onClick={() =>
                    pushDhis2.mutate({
                      org_unit: metadata.data?.endos?.org_unit_root,
                      period,
                    })
                  }
                  disabled={pushDhis2.isPending || dhis2Status !== "online"}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pushDhis2.isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Pousser indicateurs vers DHIS2
                </button>
              </div>
            </CardContent>
          </Card>

          {/* ENDOS */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    ENDOS (Burkina Faso)
                  </h3>
                </div>
                <StatusBadge status={endosStatus} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Org Unit Racine:{" "}
                  {metadata.data?.endos?.org_unit_root || (
                    <span className="text-amber-500">Non configuré</span>
                  )}
                </p>
                {lastEndosSync && (
                  <p className="text-xs text-gray-500">
                    Dernière sync:{" "}
                    {new Date(lastEndosSync.timestamp).toLocaleString("fr")}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => syncEndosOrgUnits.mutate()}
                    disabled={
                      syncEndosOrgUnits.isPending || endosStatus !== "online"
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncEndosOrgUnits.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Sync Org Units
                  </button>
                  <button
                    onClick={() => pushEndos.mutate({ period })}
                    disabled={pushEndos.isPending || endosStatus !== "online"}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pushEndos.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Push ENDOS
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Indicators preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Indicateurs TLM — {periodLabel}
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={`${period.slice(0, 4)}-${period.slice(4)}`}
                  onChange={(e) => setPeriod(e.target.value.replace("-", ""))}
                  className="text-xs border rounded-lg px-2 py-1.5"
                />
                <button
                  onClick={() => indicators.refetch()}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {indicators.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {indicatorList.map(({ key, value }) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {typeof value === "number" && key.includes("rate")
                        ? `${value}%`
                        : value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mapping status */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">
              Configuration du mapping DHIS2
            </h3>
          </CardHeader>
          <CardContent>
            {mapping.isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">
                    {mappedCount} mappés
                  </span>
                  <span className="text-amber-600 font-medium">
                    {unmappedCount} non mappés
                  </span>
                </div>
                {unmappedCount > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-700">
                          Indicateurs sans mapping DHIS2 :
                        </p>
                        <ul className="mt-1 text-xs text-amber-600">
                          {(mapping.data?.unmapped_keys || []).map((k) => (
                            <li key={k} className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-amber-500 inline-block" />{" "}
                              {k}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-amber-500">
                          Configurez les UIDs correspondants dans le fichier
                          .env (DHIS2_DE_*)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-gray-500 font-medium">
                          Indicateur TLM
                        </th>
                        <th className="text-left py-2 text-gray-500 font-medium">
                          UID DHIS2
                        </th>
                        <th className="text-left py-2 text-gray-500 font-medium">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(mapping.data?.data_elements || {}).map(
                        ([key, uid]) => (
                          <tr key={key} className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">{key}</td>
                            <td className="py-2 font-mono text-gray-500">
                              {uid || "—"}
                            </td>
                            <td className="py-2">
                              {uid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">
              Flux d'intégration
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <h4 className="text-xs font-semibold text-gray-700">
                    Collecte
                  </h4>
                </div>
                <p className="text-xs text-gray-500 ml-8">
                  TLM-BFA agrège les indicateurs de télémédecine mensuellement
                  (consultations, téléexpertise, prescriptions électroniques)
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <h4 className="text-xs font-semibold text-gray-700">
                    Mapping
                  </h4>
                </div>
                <p className="text-xs text-gray-500 ml-8">
                  Les indicateurs TLM sont mappés vers les data elements DHIS2
                  (UIDs) et les structures sanitaires vers les org units
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <h4 className="text-xs font-semibold text-gray-700">Push</h4>
                </div>
                <p className="text-xs text-gray-500 ml-8">
                  Les données agrégées sont poussées via l'API Web DHIS2
                  (dataValueSets) vers le serveur national (ENDOS) et/ou DHIS2
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
