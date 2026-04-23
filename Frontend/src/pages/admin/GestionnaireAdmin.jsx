import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import {
  UserCog,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Save,
} from "lucide-react";

const EMPTY_FORM = {
  nom: "",
  prenoms: "",
  email: "",
  password: "",
  telephone_1: "",
  telephone_2: "",
  sexe: "",
  structure_id: "",
};

export default function GestionnaireAdmin() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // List gestionnaires
  const { data, isLoading } = useQuery({
    queryKey: ["admin-gestionnaires", search],
    queryFn: () =>
      adminApi
        .listGestionnaires({ search: search || undefined })
        .then((r) => r.data),
  });

  // List structures for select
  const { data: structuresData } = useQuery({
    queryKey: ["admin-structures-all"],
    queryFn: () =>
      adminApi.listStructures({ per_page: 200 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createGestionnaire(data),
    onSuccess: () => {
      toast.success("Gestionnaire créé et affecté à la structure");
      queryClient.invalidateQueries({ queryKey: ["admin-gestionnaires"] });
      closeModal();
    },
    onError: (e) => {
      const errors = e.response?.data?.errors;
      if (errors) {
        Object.values(errors)
          .flat()
          .forEach((msg) => toast.error(msg));
      } else {
        toast.error(e.response?.data?.message || "Erreur lors de la création");
      }
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      !form.nom.trim() ||
      !form.prenoms.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.sexe ||
      !form.structure_id
    ) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Veuillez saisir un email valide");
      return;
    }
    createMutation.mutate({
      nom: form.nom.trim(),
      prenoms: form.prenoms.trim(),
      email: form.email.trim(),
      password: form.password,
      telephone_1: form.telephone_1 || null,
      telephone_2: form.telephone_2 || null,
      sexe: form.sexe,
      structure_id: Number(form.structure_id),
    });
  };

  const gestionnaires = data?.data ?? [];
  const structures = structuresData?.data?.data || structuresData?.data || [];
  const structureOptions = structures.map((s) => ({
    value: String(s.id),
    label: s.name || s.libelle,
  }));

  if (isLoading)
    return (
      <AppLayout title="Gestionnaires">
        <LoadingPage />
      </AppLayout>
    );

  return (
    <AppLayout title="Gestionnaires de structure">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestionnaires de structure
            </h1>
            <p className="text-gray-500 mt-1">
              {gestionnaires.length} gestionnaire(s) enregistré(s)
            </p>
          </div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowModal(true)}
          >
            Nouveau gestionnaire
          </Button>
        </div>

        {/* Recherche */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Liste */}
        {gestionnaires.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="Aucun gestionnaire"
            description="Créez un gestionnaire et affectez-le à une structure sanitaire."
            action={
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => setShowModal(true)}
              >
                Créer un gestionnaire
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {gestionnaires.map((g) => (
              <Card key={g.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                        <UserCog className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {g.prenoms ?? g.first_name} {g.nom ?? g.last_name}
                        </h3>
                        <span className="text-xs text-gray-500">{g.email}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        g.status === "actif" || g.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {g.status === "actif" || g.status === "active"
                        ? "Actif"
                        : "Inactif"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-600">
                    {(g.telephone_1 || g.phone) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{g.telephone_1 || g.phone}</span>
                      </div>
                    )}
                    {(g.structure || g.structure_name) && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">
                          {g.structure?.libelle ||
                            g.structure?.name ||
                            g.structure_name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de création */}
        <Modal
          open={showModal}
          onClose={closeModal}
          title="Nouveau gestionnaire"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Annuler
              </Button>
              <Button
                variant="primary"
                icon={Save}
                loading={createMutation.isPending}
                onClick={handleSubmit}
              >
                Créer
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nom *"
                placeholder="OUEDRAOGO"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
              <Input
                label="Prénom(s) *"
                placeholder="Aminata"
                value={form.prenoms}
                onChange={(e) => setForm({ ...form, prenoms: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email *"
                type="email"
                placeholder="gestionnaire@structure.bf"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                icon={Mail}
                required
              />
              <Input
                label="Mot de passe *"
                type="password"
                placeholder="Min. 8 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Sexe *"
                value={form.sexe}
                onChange={(e) => setForm({ ...form, sexe: e.target.value })}
                options={[
                  { value: "M", label: "Masculin" },
                  { value: "F", label: "Féminin" },
                ]}
                placeholder="Sélectionner"
              />
              <Select
                label="Structure d'affectation *"
                value={form.structure_id}
                onChange={(e) =>
                  setForm({ ...form, structure_id: e.target.value })
                }
                options={structureOptions}
                placeholder="Sélectionner une structure"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Téléphone 1"
                type="tel"
                placeholder="70 XX XX XX"
                value={form.telephone_1}
                onChange={(e) =>
                  setForm({ ...form, telephone_1: e.target.value })
                }
                icon={Phone}
              />
              <Input
                label="Téléphone 2"
                type="tel"
                placeholder="76 XX XX XX"
                value={form.telephone_2}
                onChange={(e) =>
                  setForm({ ...form, telephone_2: e.target.value })
                }
                icon={Phone}
              />
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
