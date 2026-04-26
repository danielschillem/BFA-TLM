import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDateTime, getInitials } from "@/utils/helpers";

const STATUS_CONFIG = {
  active: {
    label: "Actif",
    color: "text-green-700 bg-green-50 border-green-200",
  },
  inactive: {
    label: "Inactif",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  banned: { label: "Banni", color: "text-red-700 bg-red-50 border-red-200" },
  suspended: {
    label: "Suspendu",
    color: "text-orange-700 bg-orange-50 border-orange-200",
  },
  pending: {
    label: "En attente",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
};

const ROLE_FILTER = [
  { value: "", label: "Tous les rôles" },
  { value: "patient", label: "Patients" },
  { value: "doctor", label: "Médecins" },
  { value: "specialist", label: "Spécialistes" },
  { value: "health_professional", label: "PS Accompagnants" },
  { value: "structure_manager", label: "Gestionnaires" },
  { value: "admin", label: "Admins" },
];

const ROLES = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Médecin" },
  { value: "specialist", label: "Spécialiste" },
  { value: "health_professional", label: "PS Accompagnant" },
  { value: "structure_manager", label: "Gestionnaire" },
  { value: "admin", label: "Administrateur" },
];

const emptyForm = {
  nom: "",
  prenoms: "",
  email: "",
  password: "",
  telephone_1: "",
  sexe: "",
  role: "patient",
  specialite: "",
  structure_id: "",
  service_id: "",
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "";
  const highlightedUserId = searchParams.get("userId");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") ?? "");
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", roleFilter, statusFilter, search],
    queryFn: () =>
      adminApi
        .listUsers({ role: roleFilter, status: statusFilter, search })
        .then((r) => {
          const payload = r.data?.data;
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.data)) return payload.data;
          return [];
        }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateUserStatus(id, { status }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowModal(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour du statut"),
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => adminApi.verifyDoctor(id),
    onSuccess: () => {
      toast.success("Médecin vérifié et activé !");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowModal(false);
    },
    onError: () => toast.error("Erreur lors de la vérification"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createUser(data),
    onSuccess: () => {
      toast.success("Utilisateur créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Erreur lors de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      toast.success("Utilisateur mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowForm(false);
      setForm(emptyForm);
      setIsEditing(false);
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message || "Erreur lors de la mise à jour",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowDelete(false);
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message || "Erreur lors de la suppression",
      ),
  });

  const users = data ?? [];

  useEffect(() => {
    if (!highlightedUserId || showDetail || selectedUser) return;
    const userToOpen = users.find(
      (u) => String(u.id) === String(highlightedUserId),
    );
    if (userToOpen) {
      setSelectedUser(userToOpen);
      setShowDetail(true);
    }
  }, [highlightedUserId, users, showDetail, selectedUser]);

  const openCreate = () => {
    setIsEditing(false);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setIsEditing(true);
    setSelectedUser(u);
    setForm({
      nom: u.last_name || "",
      prenoms: u.first_name || "",
      email: u.email || "",
      password: "",
      telephone_1: u.phone || "",
      sexe: u.gender === "male" ? "M" : u.gender === "female" ? "F" : "",
      role: u.roles?.[0] || "patient",
      specialite: u.specialty || "",
      structure_id: "",
      service_id: "",
    });
    setShowForm(true);
  };

  const openDetail = (u) => {
    setSelectedUser(u);
    setShowDetail(true);
  };

  const openDelete = (u) => {
    setSelectedUser(u);
    setShowDelete(true);
  };

  const openStatus = (u) => {
    setSelectedUser(u);
    setNewStatus(u.status);
    setShowModal(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      const { password, ...rest } = form;
      updateMutation.mutate({ id: selectedUser.id, data: rest });
    } else {
      createMutation.mutate(form);
    }
  };

  const updateField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <AppLayout title="Gestion des utilisateurs">
      <div className="space-y-5 animate-fade-in">
        {/* Header + Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="input-field pl-9 w-full"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field min-w-40"
          >
            {ROLE_FILTER.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field min-w-40"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="suspended">Suspendu</option>
            <option value="pending">En attente vérification</option>
          </select>
          <Button icon={Plus} onClick={openCreate}>
            Créer un utilisateur
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingPage />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun utilisateur"
            description="Aucun résultat pour ces critères."
          />
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const statusCfg =
                STATUS_CONFIG[u.status] ?? STATUS_CONFIG.inactive;
              const isPendingDoctor =
                (u.roles?.includes("doctor") ||
                  u.roles?.includes("specialist")) &&
                u.status !== "active";
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getInitials(`${u.first_name ?? ""} ${u.last_name ?? ""}`)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 truncate">
                        {u.first_name} {u.last_name}
                      </p>
                      {isPendingDoctor && (
                        <span className="text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> À vérifier
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {u.roles?.map((r) => (
                        <span
                          key={r}
                          className="text-xs bg-primary-50 text-primary-700 rounded-md px-1.5 py-0.5"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs border rounded-full px-2.5 py-1 font-medium ${statusCfg.color}`}
                    >
                      {statusCfg.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDetail(u)}
                        title="Voir"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(u)}
                        title="Modifier"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDelete(u)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => openStatus(u)}
                      >
                        Gérer
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <Modal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={`Détail · ${selectedUser?.first_name} ${selectedUser?.last_name}`}
        size="md"
        footer={
          <Button variant="outline" onClick={() => setShowDetail(false)}>
            Fermer
          </Button>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl">
                {getInitials(
                  `${selectedUser.first_name ?? ""} ${selectedUser.last_name ?? ""}`,
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedUser.roles?.map((r) => (
                    <span
                      key={r}
                      className="text-xs bg-primary-50 text-primary-700 rounded-md px-2 py-0.5 font-medium"
                    >
                      {r}
                    </span>
                  ))}
                  <span
                    className={`text-xs border rounded-full px-2 py-0.5 font-medium ${(STATUS_CONFIG[selectedUser.status] ?? STATUS_CONFIG.inactive).color}`}
                  >
                    {
                      (
                        STATUS_CONFIG[selectedUser.status] ??
                        STATUS_CONFIG.inactive
                      ).label
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Identifiant", selectedUser.identifiant_national],
                ["Téléphone", selectedUser.phone || "—"],
                [
                  "Sexe",
                  selectedUser.gender === "male"
                    ? "Homme"
                    : selectedUser.gender === "female"
                      ? "Femme"
                      : "—",
                ],
                ["Spécialité", selectedUser.specialty || "—"],
                ["Matricule", selectedUser.matricule || "—"],
                ["Structure", selectedUser.structure?.name || "—"],
                [
                  "Dernière connexion",
                  selectedUser.last_login_at
                    ? formatDateTime(selectedUser.last_login_at)
                    : "—",
                ],
                ["Inscrit le", formatDateTime(selectedUser.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium text-gray-800 text-sm mt-0.5">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setIsEditing(false);
        }}
        title={
          isEditing
            ? `Modifier · ${selectedUser?.first_name} ${selectedUser?.last_name}`
            : "Créer un utilisateur"
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleFormSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                value={form.nom}
                onChange={(e) => updateField("nom", e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénoms *
              </label>
              <input
                value={form.prenoms}
                onChange={(e) => updateField("prenoms", e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="input-field w-full"
                  required
                  minLength={8}
                  placeholder="Min. 8 car., maj., min., chiffre"
                />
              </div>
            )}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  value={form.telephone_1}
                  onChange={(e) => updateField("telephone_1", e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  value={form.telephone_1}
                  onChange={(e) => updateField("telephone_1", e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexe
              </label>
              <select
                value={form.sexe}
                onChange={(e) => updateField("sexe", e.target.value)}
                className="input-field w-full"
              >
                <option value="">—</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle *
              </label>
              <select
                value={form.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="input-field w-full"
                required
              >
                {ROLES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(form.role === "doctor" || form.role === "specialist") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spécialité
              </label>
              <input
                value={form.specialite}
                onChange={(e) => updateField("specialite", e.target.value)}
                className="input-field w-full"
                placeholder="Ex: Cardiologie, Pédiatrie…"
              />
            </div>
          )}
        </form>
      </Modal>

      {/* ── Status / Manage Modal ── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`Gérer · ${selectedUser?.first_name} ${selectedUser?.last_name}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Fermer
            </Button>
            <Button
              onClick={() =>
                statusMutation.mutate({
                  id: selectedUser?.id,
                  status: newStatus,
                })
              }
              loading={statusMutation.isPending}
            >
              Appliquer
            </Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-gray-800 text-xs mt-0.5">
                  {selectedUser.email}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Inscrit le</p>
                <p className="font-medium text-gray-800 text-xs mt-0.5">
                  {formatDateTime(selectedUser.created_at)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut du compte
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="input-field w-full"
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="banned">Banni</option>
              </select>
            </div>

            {(selectedUser.roles?.includes("doctor") ||
              selectedUser.roles?.includes("specialist")) &&
              selectedUser.status !== "active" && (
                <div className="border-t border-gray-100 pt-3">
                  <Button
                    onClick={() => verifyMutation.mutate(selectedUser.id)}
                    loading={verifyMutation.isPending}
                    icon={ShieldCheck}
                    variant="success"
                    className="w-full"
                  >
                    Vérifier et approuver ce médecin
                  </Button>
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Confirmer la suppression"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate(selectedUser?.id)}
              loading={deleteMutation.isPending}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer
            <br />
            <strong>
              {selectedUser?.first_name} {selectedUser?.last_name}
            </strong>{" "}
            ?
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Cette action est irréversible.
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
}
