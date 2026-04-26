import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  Building2,
  ToggleLeft,
  ToggleRight,
  Edit,
  Stethoscope,
  LayoutDashboard,
  CheckCircle,
  XCircle,
  DoorOpen,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { gestionnaireApi, referentielsApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, StatCard } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";

const TABS = [
  { value: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { value: "professionnels", label: "Professionnels", icon: Stethoscope },
  { value: "services", label: "Services", icon: Building2 },
  { value: "salles", label: "Salles", icon: DoorOpen },
];

const extractCollection = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function GestionnaireManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingPro, setEditingPro] = useState(null);
  const [form, setForm] = useState({
    nom: "",
    prenoms: "",
    sexe: "",
    date_naissance: "",
    lieu_naissance: "",
    email: "",
    telephone_1: "",
    telephone_2: "",
    matricule: "",
    numero_ordre: "",
    password: "",
    type_professionnel_sante_id: "",
    specialite: "",
    grade_id: "",
    service_id: "",
    localite_id: "",
    role: "",
  });
  const [serviceForm, setServiceForm] = useState({ libelle: "", code: "" });
  const [showSalleModal, setShowSalleModal] = useState(false);
  const [editingSalle, setEditingSalle] = useState(null);
  const [salleForm, setSalleForm] = useState({
    libelle: "",
    description: "",
    capacite: 1,
    type_salle_id: "",
    equipements: "",
  });
  const [deleteSalleConfirm, setDeleteSalleConfirm] = useState(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ["gestionnaire-dashboard"],
    queryFn: () =>
      gestionnaireApi.dashboard().then((r) => r.data.data ?? r.data ?? {}),
    enabled: activeTab === "dashboard",
  });

  const { data: professionels = [], isLoading: loadingPros } = useQuery({
    queryKey: ["gestionnaire-pros", search],
    queryFn: () =>
      gestionnaireApi
        .listProfessionnels({ search: search || undefined })
        .then((r) => extractCollection(r)),
    enabled: activeTab === "professionnels",
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["gestionnaire-services"],
    queryFn: () =>
      gestionnaireApi.listServices().then((r) => extractCollection(r)),
  });

  const { data: salles = [], isLoading: loadingSalles } = useQuery({
    queryKey: ["gestionnaire-salles"],
    queryFn: () =>
      gestionnaireApi.listSalles().then((r) => extractCollection(r)),
    enabled: activeTab === "salles",
  });

  const { data: typeSallesData } = useQuery({
    queryKey: ["type-salles"],
    queryFn: () =>
      referentielsApi.typeSalles().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 30,
  });

  // Référentiels
  const { data: gradesData } = useQuery({
    queryKey: ["grades"],
    queryFn: () =>
      referentielsApi.grades().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 30,
  });
  const { data: typesPSData } = useQuery({
    queryKey: ["types-professionnel-sante"],
    queryFn: () =>
      referentielsApi
        .typesProfessionnelSante()
        .then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 30,
  });
  const { data: localitesData } = useQuery({
    queryKey: ["localites-all"],
    queryFn: () =>
      referentielsApi.localites().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 10,
  });
  const { data: specialitesData } = useQuery({
    queryKey: ["specialites"],
    queryFn: () =>
      referentielsApi.specialites().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 30,
  });

  const gradesOptions = (gradesData || []).map((g) => ({
    value: String(g.id),
    label: g.libelle,
  }));
  const typesPSOptions = (typesPSData || []).map((t) => ({
    value: String(t.id),
    label: t.libelle,
  }));
  const localiteOptions = (localitesData || []).map((l) => ({
    value: String(l.id),
    label: [l.commune, l.province, l.region].filter(Boolean).join(", "),
  }));
  const specialiteOptions = (specialitesData || []).map((s) => ({
    value: s.libelle,
    label: s.libelle,
  }));

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingPro
        ? gestionnaireApi.updateProfessionnel(editingPro.id, data)
        : gestionnaireApi.createProfessionnel(data),
    onSuccess: () => {
      toast.success(
        editingPro ? "Professionnel mis à jour" : "Professionnel ajouté",
      );
      queryClient.invalidateQueries({ queryKey: ["gestionnaire-pros"] });
      queryClient.invalidateQueries({ queryKey: ["gestionnaire-dashboard"] });
      closeModal();
    },
    onError: (err) => {
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.values(data.errors).flat().join("\n");
        toast.error(msgs || data.message || "Erreur de validation");
      } else {
        toast.error(data?.message ?? "Erreur lors de l'enregistrement");
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => gestionnaireApi.toggleStatus(id),
    onSuccess: () => {
      toast.success("Statut modifié");
      queryClient.invalidateQueries({ queryKey: ["gestionnaire-pros"] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const serviceMutation = useMutation({
    mutationFn: (data) => gestionnaireApi.createService(data),
    onSuccess: () => {
      toast.success("Service ajouté");
      queryClient.invalidateQueries({ queryKey: ["gestionnaire-services"] });
      setShowServiceModal(false);
      setServiceForm({ libelle: "", code: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const saveSalleMutation = useMutation({
    mutationFn: (data) =>
      editingSalle
        ? gestionnaireApi.updateSalle(editingSalle.id, data)
        : gestionnaireApi.createSalle(data),
    onSuccess: () => {
      toast.success(editingSalle ? "Salle mise à jour" : "Salle créée");
      queryClient.invalidateQueries({ queryKey: ["gestionnaire-salles"] });
      queryClient.invalidateQueries({ queryKey: ["gestionnaire-dashboard"] });
      closeSalleModal();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const deleteSalleMutation = useMutation({
    mutationFn: (id) => gestionnaireApi.deleteSalle(id),
    onSuccess: () => {
      toast.success("Salle supprimée");
      queryClient.invalidateQueries({ queryKey: ["gestionnaire-salles"] });
      setDeleteSalleConfirm(null);
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingPro(null);
    setForm({
      nom: "",
      prenoms: "",
      sexe: "",
      date_naissance: "",
      lieu_naissance: "",
      email: "",
      telephone_1: "",
      telephone_2: "",
      matricule: "",
      numero_ordre: "",
      password: "",
      type_professionnel_sante_id: "",
      specialite: "",
      grade_id: "",
      service_id: "",
      localite_id: "",
      role: "",
    });
  };

  const closeSalleModal = () => {
    setShowSalleModal(false);
    setEditingSalle(null);
    setSalleForm({
      libelle: "",
      description: "",
      capacite: 1,
      type_salle_id: "",
      equipements: "",
    });
  };

  const openEditSalle = (salle) => {
    setEditingSalle(salle);
    setSalleForm({
      libelle: salle.name || salle.libelle || "",
      description: salle.description || "",
      capacite: salle.capacite || 1,
      type_salle_id: salle.type_salle?.id ? String(salle.type_salle.id) : "",
      equipements: Array.isArray(salle.equipements)
        ? salle.equipements.join(", ")
        : "",
    });
    setShowSalleModal(true);
  };

  const handleSalleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      libelle: salleForm.libelle.trim(),
      description: salleForm.description || null,
      capacite: Number(salleForm.capacite) || 1,
      type_salle_id: salleForm.type_salle_id
        ? Number(salleForm.type_salle_id)
        : null,
      equipements: salleForm.equipements
        ? salleForm.equipements
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : null,
    };
    saveSalleMutation.mutate(payload);
  };

  const typeSalleOptions = (typeSallesData || []).map((t) => ({
    value: String(t.id),
    label: t.libelle,
  }));

  const openEdit = (pro) => {
    setEditingPro(pro);
    setForm({
      nom: pro.nom ?? pro.last_name ?? "",
      prenoms: pro.prenoms ?? pro.first_name ?? "",
      sexe: pro.sexe ?? "",
      date_naissance: pro.date_naissance ?? "",
      lieu_naissance: pro.lieu_naissance ?? "",
      email: pro.email ?? "",
      telephone_1: pro.telephone_1 ?? pro.telephone ?? pro.phone ?? "",
      telephone_2: pro.telephone_2 ?? "",
      matricule: pro.matricule ?? "",
      numero_ordre: pro.numero_ordre ?? "",
      type_professionnel_sante_id: pro.type_professionnel_sante_id
        ? String(pro.type_professionnel_sante_id)
        : "",
      specialite: pro.specialite ?? pro.specialty ?? "",
      grade_id: pro.grade_id ? String(pro.grade_id) : "",
      service_id: pro.service_id ? String(pro.service_id) : "",
      localite_id: pro.localite_id ? String(pro.localite_id) : "",
      password: "",
      role: pro.roles?.[0]?.name ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nom?.trim() || !form.prenoms?.trim() || !form.email?.trim()) {
      toast.error("Nom, prénoms et email sont obligatoires");
      return;
    }
    if (!editingPro && (!form.password || form.password.length < 8)) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Veuillez saisir un email valide");
      return;
    }
    const payload = { ...form };
    if (editingPro && !payload.password) delete payload.password;
    saveMutation.mutate(payload);
  };

  // ── Dashboard tab ───────────────────────────────────────────────────────────
  const renderDashboard = () => {
    if (loadingDash) return <LoadingPage />;
    const stats = dashboard ?? {};
    const totalProfessionals =
      stats.total_professionals ??
      stats.professionnels ??
      (Number(stats.total_doctors ?? 0) +
        Number(stats.total_health_professionals ?? 0));
    const activeProfessionals =
      stats.active ??
      stats.actifs ??
      stats.active_professionals ??
      (Number(stats.active_doctors ?? 0) +
        Number(stats.active_health_professionals ?? 0));
    const inactiveProfessionals =
      stats.inactive ??
      stats.inactifs ??
      stats.inactive_professionals ??
      Math.max(Number(totalProfessionals) - Number(activeProfessionals), 0);
    const totalServices =
      stats.total_services ?? stats.services ?? stats.services_count ?? 0;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Professionnels"
          value={totalProfessionals}
          icon={Users}
          color="primary"
        />
        <StatCard
          label="Actifs"
          value={activeProfessionals}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Inactifs"
          value={inactiveProfessionals}
          icon={XCircle}
          color="red"
        />
        <StatCard
          label="Services"
          value={totalServices}
          icon={Building2}
          color="blue"
        />
      </div>
    );
  };

  // ── Professionnels tab ──────────────────────────────────────────────────────
  const renderProfessionnels = () => {
    if (loadingPros) return <LoadingPage />;
    const pros = Array.isArray(professionels) ? professionels : [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un professionnel…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <Button icon={Plus} onClick={() => setShowModal(true)}>
            Ajouter
          </Button>
        </div>

        {pros.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun professionnel"
            description="Ajoutez des professionnels de santé à votre structure."
            action={<Button onClick={() => setShowModal(true)}>Ajouter</Button>}
          />
        ) : (
          <div className="space-y-2">
            {pros.map((pro) => {
              const isActive =
                pro.statut === "actif" ||
                pro.status === "active" ||
                pro.is_active;
              return (
                <div
                  key={pro.id}
                  className="bg-white rounded-lg border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {pro.prenoms ?? pro.first_name} {pro.nom ?? pro.last_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{pro.specialite ?? pro.specialty ?? "—"}</span>
                      <span>·</span>
                      <span>{pro.email}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {isActive ? "Actif" : "Inactif"}
                  </span>
                  <button
                    onClick={() => toggleMutation.mutate(pro.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-50 transition"
                  >
                    {isActive ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <Button
                    size="xs"
                    variant="outline"
                    icon={Edit}
                    onClick={() => openEdit(pro)}
                  >
                    Modifier
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Services tab ────────────────────────────────────────────────────────────
  const renderServices = () => {
    if (loadingServices) return <LoadingPage />;
    const svcList = Array.isArray(services) ? services : [];
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button icon={Plus} onClick={() => setShowServiceModal(true)}>
            Nouveau service
          </Button>
        </div>
        {svcList.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aucun service"
            description="Créez des services pour organiser votre structure."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {svcList.map((svc) => (
              <Card key={svc.id}>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {svc.nom ?? svc.name}
                      </p>
                      {svc.code && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Code : {svc.code}
                        </p>
                      )}
                      {svc.users_count != null && (
                        <p className="text-xs text-gray-400">
                          {svc.users_count} professionnel(s)
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Salles tab ──────────────────────────────────────────────────────────────
  const renderSalles = () => {
    if (loadingSalles) return <LoadingPage />;
    const salleList = Array.isArray(salles) ? salles : [];
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button icon={Plus} onClick={() => setShowSalleModal(true)}>
            Nouvelle salle
          </Button>
        </div>
        {salleList.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Aucune salle"
            description="Créez des salles dans votre structure."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {salleList.map((salle) => (
              <Card
                key={salle.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <DoorOpen className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {salle.name || salle.libelle}
                        </p>
                        {salle.type_salle && (
                          <span className="text-xs text-gray-500">
                            {salle.type_salle.name || salle.type_salle.libelle}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        (salle.active ?? salle.actif) !== false
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {(salle.active ?? salle.actif) !== false
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Capacité : {salle.capacite || 1}</p>
                    {salle.description && (
                      <p className="text-xs text-gray-400">
                        {salle.description}
                      </p>
                    )}
                    {Array.isArray(salle.equipements) &&
                      salle.equipements.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {salle.equipements.map((eq, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                    <Button
                      size="xs"
                      variant="outline"
                      icon={Edit}
                      onClick={() => openEditSalle(salle)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      icon={Trash2}
                      onClick={() => setDeleteSalleConfirm(salle)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="Gestion de la structure">
      <div className="space-y-5 animate-fade-in">
        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                  activeTab === tab.value
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <TabIcon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "professionnels" && renderProfessionnels()}
        {activeTab === "services" && renderServices()}
        {activeTab === "salles" && renderSalles()}
      </div>

      {/* Professionnel modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={
          editingPro
            ? "Modifier le professionnel"
            : "Ajouter un professionnel de santé"
        }
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeModal}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="pro-form"
              loading={saveMutation.isPending}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="pro-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nom *"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              required
            />
            <Input
              label="Prénom(s) *"
              value={form.prenoms}
              onChange={(e) =>
                setForm((f) => ({ ...f, prenoms: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Sexe *"
              value={form.sexe}
              onChange={(e) => setForm((f) => ({ ...f, sexe: e.target.value }))}
              options={[
                { value: "M", label: "Masculin" },
                { value: "F", label: "Féminin" },
              ]}
              placeholder="Sélectionner ici !"
            />
            <Input
              label="Date de naissance *"
              type="date"
              value={form.date_naissance}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_naissance: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Lieu de naissance *"
              value={form.lieu_naissance}
              onChange={(e) =>
                setForm((f) => ({ ...f, lieu_naissance: e.target.value }))
              }
              required
            />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Téléphone 1 *"
              value={form.telephone_1}
              onChange={(e) =>
                setForm((f) => ({ ...f, telephone_1: e.target.value }))
              }
              required
            />
            <Input
              label="Téléphone 2"
              value={form.telephone_2}
              onChange={(e) =>
                setForm((f) => ({ ...f, telephone_2: e.target.value }))
              }
            />
          </div>
          {!editingPro && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mot de passe *"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                required
              />
              <Select
                label="Rôle *"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                options={[
                  { value: "doctor", label: "Médecin" },
                  { value: "specialist", label: "Spécialiste" },
                  {
                    value: "health_professional",
                    label: "Professionnel de santé",
                  },
                ]}
                placeholder="Sélectionner un rôle"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Numéro matricule *"
              value={form.matricule}
              onChange={(e) =>
                setForm((f) => ({ ...f, matricule: e.target.value }))
              }
              required
            />
            <Input
              label="Numéro d'inscription à l'Ordre"
              value={form.numero_ordre}
              onChange={(e) =>
                setForm((f) => ({ ...f, numero_ordre: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Types de professionnels de santé *"
              value={form.type_professionnel_sante_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type_professionnel_sante_id: e.target.value,
                }))
              }
              options={typesPSOptions}
              placeholder="Sélectionner ici !"
            />
            <Select
              label="Spécialités"
              value={form.specialite}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialite: e.target.value }))
              }
              options={specialiteOptions}
              placeholder="Sélectionner une spécialité"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Grades *"
              value={form.grade_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, grade_id: e.target.value }))
              }
              options={gradesOptions}
              placeholder="Sélectionner ici !"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Service d'exercice *"
              value={form.service_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, service_id: e.target.value }))
              }
              options={(Array.isArray(services) ? services : []).map((s) => ({
                value: String(s.id),
                label: s.nom ?? s.name,
              }))}
              placeholder="Sélectionner un service"
            />
            <Select
              label="Localités *"
              value={form.localite_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, localite_id: e.target.value }))
              }
              options={localiteOptions}
              placeholder="Sélectionner ici !"
            />
          </div>
        </form>
      </Modal>

      {/* Service modal */}
      <Modal
        open={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title="Ajouter un service"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            serviceMutation.mutate(serviceForm);
          }}
          className="space-y-4"
        >
          <Input
            label="Nom du service *"
            value={serviceForm.libelle}
            onChange={(e) =>
              setServiceForm((f) => ({ ...f, libelle: e.target.value }))
            }
            required
          />
          <Input
            label="Code du service *"
            placeholder="Ex: CARDIO, URG, PEDIA"
            value={serviceForm.code}
            onChange={(e) =>
              setServiceForm((f) => ({ ...f, code: e.target.value }))
            }
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowServiceModal(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={serviceMutation.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Salle create/edit modal */}
      <Modal
        open={showSalleModal}
        onClose={closeSalleModal}
        title={editingSalle ? "Modifier la salle" : "Nouvelle salle"}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeSalleModal}>
              Annuler
            </Button>
            <Button
              variant="primary"
              icon={Save}
              loading={saveSalleMutation.isPending}
              onClick={handleSalleSubmit}
            >
              {editingSalle ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSalleSubmit} className="space-y-4">
          <Input
            label="Nom de la salle *"
            placeholder="Salle de consultation A"
            value={salleForm.libelle}
            onChange={(e) =>
              setSalleForm((f) => ({ ...f, libelle: e.target.value }))
            }
            required
          />
          <Input
            label="Description"
            placeholder="Description de la salle"
            value={salleForm.description}
            onChange={(e) =>
              setSalleForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capacité"
              type="number"
              min="1"
              value={salleForm.capacite}
              onChange={(e) =>
                setSalleForm((f) => ({ ...f, capacite: e.target.value }))
              }
            />
            <Select
              label="Type de salle"
              value={salleForm.type_salle_id}
              onChange={(e) =>
                setSalleForm((f) => ({ ...f, type_salle_id: e.target.value }))
              }
              options={typeSalleOptions}
              placeholder="Sélectionner"
            />
          </div>
          <Input
            label="Équipements"
            placeholder="Écran, Caméra, Tensiomètre (séparés par des virgules)"
            value={salleForm.equipements}
            onChange={(e) =>
              setSalleForm((f) => ({ ...f, equipements: e.target.value }))
            }
          />
        </form>
      </Modal>

      {/* Salle delete confirm */}
      <Modal
        open={!!deleteSalleConfirm}
        onClose={() => setDeleteSalleConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteSalleConfirm(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={deleteSalleMutation.isPending}
              onClick={() => deleteSalleMutation.mutate(deleteSalleConfirm.id)}
            >
              Supprimer
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Êtes-vous sûr de vouloir supprimer la salle{" "}
          <span className="font-semibold">
            {deleteSalleConfirm?.name || deleteSalleConfirm?.libelle}
          </span>{" "}
          ?
        </p>
      </Modal>
    </AppLayout>
  );
}
