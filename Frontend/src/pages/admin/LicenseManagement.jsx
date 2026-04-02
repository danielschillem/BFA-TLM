import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Key,
  Search,
  Plus,
  Eye,
  RefreshCw,
  Ban,
  BarChart3,
  Building2,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  AlertTriangle,
  Shield,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { licensesApi, adminApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

// ── Constantes ────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active: {
    label: "Active",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  suspendue: {
    label: "Suspendue",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  expiree: {
    label: "Expirée",
    color: "bg-gray-100 text-gray-600",
    icon: Clock,
  },
  demo: { label: "Démo", color: "bg-amber-100 text-amber-700", icon: Zap },
};

const TYPE_MAP = {
  demo: "Démo",
  annuelle: "Annuelle",
  pluriannuelle: "Pluriannuelle",
};

const TABS = [
  { key: "licenses", label: "Licences", icon: Key },
  { key: "grille", label: "Grille tarifaire", icon: BarChart3 },
  { key: "stats", label: "Statistiques", icon: BarChart3 },
];

// ── Page principale ───────────────────────────────────────────────────────────
export default function LicenseManagement() {
  const [activeTab, setActiveTab] = useState("licenses");

  return (
    <AppLayout title="Gestion des licences">
      <div className="space-y-5 animate-fade-in">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-primary-50 text-primary-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "licenses" && <LicensesTab />}
        {activeTab === "grille" && <GrilleTab />}
        {activeTab === "stats" && <StatsTab />}
      </div>
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Onglet 1 : Liste des licences
// ══════════════════════════════════════════════════════════════════════════════
function LicensesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);

  const { data: structures } = useQuery({
    queryKey: ["admin", "structures-list"],
    queryFn: () =>
      adminApi
        .listStructures({ per_page: 200 })
        .then((r) => r.data.data?.data ?? r.data.data ?? []),
  });

  // Récupérer les licences de chaque structure connue
  const { data: allLicenses = [], isLoading } = useQuery({
    queryKey: ["admin", "licenses", structures?.length],
    queryFn: async () => {
      if (!structures || structures.length === 0) return [];
      const results = await Promise.allSettled(
        structures.map((s) =>
          licensesApi.parStructure(s.id).then((r) => {
            const list = r.data?.data ?? r.data ?? [];
            return (Array.isArray(list) ? list : []).map((l) => ({
              ...l,
              structure: s,
            }));
          }),
        ),
      );
      return results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value);
    },
    enabled: !!structures && structures.length > 0,
  });

  const filtered = useMemo(() => {
    let list = allLicenses;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (l) =>
          (l.license_key ?? "").toLowerCase().includes(s) ||
          (l.structure?.nom ?? "").toLowerCase().includes(s),
      );
    }
    if (filterStatus) list = list.filter((l) => l.statut === filterStatus);
    return list;
  }, [allLicenses, search, filterStatus]);

  const suspendMut = useMutation({
    mutationFn: (id) => licensesApi.suspendre(id),
    onSuccess: () => {
      toast.success("Licence suspendue");
      queryClient.invalidateQueries({ queryKey: ["admin", "licenses"] });
    },
    onError: () => toast.error("Erreur lors de la suspension"),
  });

  const renewMut = useMutation({
    mutationFn: (id) => licensesApi.renouveler(id),
    onSuccess: () => {
      toast.success("Licence renouvelée");
      queryClient.invalidateQueries({ queryKey: ["admin", "licenses"] });
    },
    onError: () => toast.error("Erreur lors du renouvellement"),
  });

  return (
    <>
      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par clé ou structure…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            Nouvelle licence
          </Button>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <LoadingPage />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Key}
          title="Aucune licence"
          description="Il n'y a encore aucune licence enregistrée dans le système."
          action={
            <Button icon={Plus} onClick={() => setShowCreate(true)}>
              Créer une licence
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((license) => {
            const st = STATUS_MAP[license.statut] ?? STATUS_MAP.active;
            const StIcon = st.icon;
            return (
              <Card key={license.id} hover>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Key className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {license.license_key ?? `#${license.id}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">
                          {license.structure?.nom ?? "—"}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">
                          {TYPE_MAP[license.type] ?? license.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${st.color}`}
                    >
                      <StIcon className="w-3.5 h-3.5" />
                      {st.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedLicense(license)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="Détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {license.statut === "active" && (
                        <button
                          onClick={() => suspendMut.mutate(license.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                          title="Suspendre"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {(license.statut === "expiree" ||
                        license.statut === "suspendue") && (
                        <button
                          onClick={() => renewMut.mutate(license.id)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                          title="Renouveler"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      <CreateLicenseModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        structures={structures ?? []}
      />

      {/* Modal détails */}
      {selectedLicense && (
        <LicenseDetailModal
          license={selectedLicense}
          onClose={() => setSelectedLicense(null)}
        />
      )}
    </>
  );
}

// ── Modal création ────────────────────────────────────────────────────────────
function CreateLicenseModal({ open, onClose, structures }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    structure_id: "",
    type: "annuelle",
    type_centre: "csps",
    capacite_lits: 10,
    max_utilisateurs: 5,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["license-modules"],
    queryFn: () =>
      licensesApi.modules().then((r) => r.data?.data ?? r.data ?? []),
    enabled: open,
  });

  const [selectedModules, setSelectedModules] = useState([]);

  const createMut = useMutation({
    mutationFn: (data) => licensesApi.store(data),
    onSuccess: () => {
      toast.success("Licence créée avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin", "licenses"] });
      onClose();
    },
    onError: (err) => {
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.values(data.errors).flat().join(", ");
        toast.error(msgs);
      } else {
        toast.error(data?.message ?? "Erreur lors de la création");
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Le backend attend structure_id comme entier et modules comme tableau de codes
    const payload = {
      structure_id: Number(form.structure_id),
      type_centre: form.type_centre,
      capacite_lits: form.capacite_lits,
      max_utilisateurs: form.max_utilisateurs,
      modules: selectedModules,
    };
    createMut.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle licence"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={createMut.isPending} onClick={handleSubmit}>
            Créer la licence
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Structure
            </label>
            <select
              value={form.structure_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, structure_id: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              required
            >
              <option value="">— Sélectionner —</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Type de licence
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="demo">Démo</option>
              <option value="annuelle">Annuelle</option>
              <option value="pluriannuelle">Pluriannuelle</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Type de centre
            </label>
            <select
              value={form.type_centre}
              onChange={(e) =>
                setForm((f) => ({ ...f, type_centre: e.target.value }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="csps">CSPS</option>
              <option value="cm">CM</option>
              <option value="cma">CMA</option>
              <option value="chr">CHR</option>
              <option value="chu">CHU</option>
              <option value="clinique">Clinique privée</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Capacité lits
            </label>
            <input
              type="number"
              min="1"
              value={form.capacite_lits}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacite_lits: +e.target.value }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Max utilisateurs
            </label>
            <input
              type="number"
              min="1"
              value={form.max_utilisateurs}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_utilisateurs: +e.target.value }))
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        {modules.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Modules optionnels
            </label>
            <div className="grid grid-cols-2 gap-2">
              {modules
                .filter((m) => !m.inclus_base)
                .map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 hover:border-primary-200 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(m.code)}
                      onChange={(e) => {
                        setSelectedModules((prev) =>
                          e.target.checked
                            ? [...prev, m.code]
                            : prev.filter((x) => x !== m.code),
                        );
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-700">
                        {m.libelle}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        {Number(m.prix_unitaire_fcfa).toLocaleString("fr-FR")}{" "}
                        FCFA
                      </span>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

// ── Modal détails ─────────────────────────────────────────────────────────────
function LicenseDetailModal({ license, onClose }) {
  const st = STATUS_MAP[license.statut] ?? STATUS_MAP.active;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Licence ${license.license_key ?? `#${license.id}`}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Structure" value={license.structure?.nom ?? "—"} />
          <Detail label="Type" value={TYPE_MAP[license.type] ?? license.type} />
          <Detail
            label="Statut"
            value={
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${st.color}`}
              >
                {st.label}
              </span>
            }
          />
          <Detail label="Clé" value={license.license_key ?? "—"} />
          <Detail label="Type de centre" value={license.type_centre ?? "—"} />
          <Detail label="Capacité lits" value={license.capacite_lits ?? "—"} />
          <Detail
            label="Max utilisateurs"
            value={license.max_utilisateurs ?? "—"}
          />
          <Detail
            label="Montant"
            value={
              license.montant_total_fcfa
                ? `${Number(license.montant_total_fcfa).toLocaleString("fr-FR")} FCFA`
                : "—"
            }
          />
          <Detail label="Début" value={license.date_debut ?? "—"} />
          <Detail label="Fin" value={license.date_fin ?? "—"} />
        </div>
        {license.modules?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Modules activés
            </p>
            <div className="flex flex-wrap gap-1.5">
              {license.modules.map((m) => (
                <span
                  key={m.id}
                  className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium"
                >
                  {m.libelle}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-900">
        {typeof value === "string" ? value : value}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Onglet 2 : Grille tarifaire
// ══════════════════════════════════════════════════════════════════════════════
function GrilleTab() {
  const { data: grille, isLoading } = useQuery({
    queryKey: ["license-grille"],
    queryFn: () =>
      licensesApi.grille().then((r) => r.data?.data ?? r.data ?? {}),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["license-modules"],
    queryFn: () =>
      licensesApi.modules().then((r) => r.data?.data ?? r.data ?? []),
  });

  if (isLoading) return <LoadingPage />;

  const tarifs = grille?.tarifs ?? grille?.grille ?? [];

  return (
    <div className="space-y-5">
      {/* Tarifs par type de centre */}
      {tarifs.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-gray-800">
              Tarifs par type de centre (FCFA/an)
            </h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">
                      Type de centre
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">
                      Tarif annuel
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">
                      Max utilisateurs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tarifs.map((t, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="py-2.5 px-3 font-medium text-gray-900">
                        {t.type_centre ?? t.label ?? "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-700">
                        {Number(
                          t.tarif_annuel_fcfa ?? t.prix ?? 0,
                        ).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-500">
                        {t.max_utilisateurs ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modules */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-bold text-gray-800">
            Modules disponibles
          </h3>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun module configuré
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.inclus_base ? "bg-emerald-50" : "bg-primary-50"}`}
                  >
                    {m.inclus_base ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Zap className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {m.libelle}
                    </p>
                    {m.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.description}
                      </p>
                    )}
                    <p className="text-xs mt-1">
                      {m.inclus_base ? (
                        <span className="text-emerald-600 font-medium">
                          Inclus dans la base
                        </span>
                      ) : (
                        <span className="text-primary-600 font-medium">
                          {Number(m.prix_unitaire_fcfa).toLocaleString("fr-FR")}{" "}
                          FCFA
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Onglet 3 : Statistiques
// ══════════════════════════════════════════════════════════════════════════════
function StatsTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["license-stats"],
    queryFn: () =>
      licensesApi.statistiques().then((r) => r.data?.data ?? r.data ?? {}),
  });

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Key}
          label="Total licences"
          value={stats?.total_licences ?? 0}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Actives"
          value={stats?.actives ?? 0}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Expirées"
          value={stats?.expirees ?? 0}
          color="orange"
        />
        <StatCard
          icon={Ban}
          label="Suspendues"
          value={stats?.suspendues ?? 0}
          color="red"
        />
      </div>

      {stats?.par_type_centre &&
        Array.isArray(stats.par_type_centre) &&
        stats.par_type_centre.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-gray-800">
                Répartition par type de centre
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.par_type_centre.map((item, i) => (
                  <div
                    key={item.type_centre ?? i}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700 font-medium capitalize">
                      {item.type_centre}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (item.total / (stats?.total_licences || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-8 text-right">
                        {item.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {stats?.revenu_annuel_fcfa != null && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-gray-800">Revenus</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-gray-900">
              {Number(stats.revenu_annuel_fcfa).toLocaleString("fr-FR")}{" "}
              <span className="text-lg font-medium text-gray-400">FCFA</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
