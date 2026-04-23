import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Phone,
  Mail,
  Calendar,
  UserPlus,
  FolderOpen,
} from "lucide-react";
import { patientsApi, referentielsApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { formatDate } from "@/utils/helpers";
import { toast } from "sonner";

const EMPTY_FORM = {
  nom: "",
  prenoms: "",
  sexe: "",
  date_naissance: "",
  lieu_naissance: "",
  telephone_1: "",
  email: "",
  localite_id: "",
  pays_id: "",
  nom_personne_prevenir: "",
  filiation_personne_prevenir: "",
  telephone_personne_prevenir: "",
};

export default function PatientSearch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleSearch = (value) => {
    setSearch(value);
    clearTimeout(window.__patientSearchTimer);
    window.__patientSearchTimer = setTimeout(
      () => setDebouncedSearch(value),
      400,
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ["patients", debouncedSearch],
    queryFn: () =>
      patientsApi
        .list({ search: debouncedSearch || undefined })
        .then((r) => r.data.data ?? r.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (data) => patientsApi.create(data),
    onSuccess: (res) => {
      toast.success("Patient créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      const patient = res.data?.data;
      if (patient?.id) navigate(`/patients/${patient.id}/record`);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Erreur lors de la création";
      toast.error(msg);
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenoms.trim()) {
      toast.error("Le nom et les prénoms sont requis");
      return;
    }
    if (!form.sexe) {
      toast.error("Le sexe est requis");
      return;
    }
    if (!form.date_naissance) {
      toast.error("La date de naissance est requise");
      return;
    }
    if (form.date_naissance > new Date().toISOString().split("T")[0]) {
      toast.error("La date de naissance ne peut pas être dans le futur");
      return;
    }
    if (!form.lieu_naissance.trim()) {
      toast.error("Le lieu de naissance est requis");
      return;
    }
    if (!form.telephone_1.trim()) {
      toast.error("Le téléphone principal est requis");
      return;
    }
    if (!form.nom_personne_prevenir.trim()) {
      toast.error("Le nom de la personne à prévenir est requis");
      return;
    }
    if (!form.filiation_personne_prevenir.trim()) {
      toast.error("La filiation est requise");
      return;
    }
    if (!form.telephone_personne_prevenir.trim()) {
      toast.error("Le téléphone de la personne à prévenir est requis");
      return;
    }
    const payload = { ...form };
    if (!payload.localite_id) delete payload.localite_id;
    delete payload.pays_id;
    createMutation.mutate(payload);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const patients = Array.isArray(data) ? data : [];

  // Référentiels pays / localités
  const { data: paysData } = useQuery({
    queryKey: ["pays"],
    queryFn: () =>
      referentielsApi.pays().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 1000 * 60 * 30,
  });
  const { data: localitesData } = useQuery({
    queryKey: ["localites", form.pays_id],
    queryFn: () =>
      referentielsApi
        .localites(form.pays_id ? { pays_id: form.pays_id } : {})
        .then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!form.pays_id,
    staleTime: 1000 * 60 * 10,
  });

  const paysOptions = (paysData || []).map((p) => ({
    value: String(p.id),
    label: p.nom,
  }));
  const localiteOptions = (localitesData || []).map((l) => ({
    value: String(l.id),
    label: [l.commune, l.province, l.region].filter(Boolean).join(", "),
  }));

  return (
    <AppLayout title="Recherche de patients">
      <div className="space-y-5 animate-fade-in">
        {/* Search bar + Create button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher par nom, prénom, téléphone…"
              className="input-field pl-10"
            />
          </div>
          <Button icon={UserPlus} onClick={() => setShowCreate(true)}>
            Nouveau patient
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <LoadingPage />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun patient trouvé"
            description={
              debouncedSearch
                ? "Essayez un autre terme de recherche."
                : "Les patients de votre structure apparaîtront ici."
            }
            action={
              <Button icon={UserPlus} onClick={() => setShowCreate(true)}>
                Créer un patient
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white rounded-lg border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/patients/${patient.id}/record`)}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-sm">
                    {(patient.first_name?.[0] ?? "").toUpperCase()}
                    {(patient.last_name?.[0] ?? "").toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    {patient.first_name} {patient.last_name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                    {patient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {patient.phone}
                      </span>
                    )}
                    {patient.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {patient.email}
                      </span>
                    )}
                    {patient.date_of_birth && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{" "}
                        {formatDate(patient.date_of_birth)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/patients/${patient.id}/record`);
                  }}
                >
                  Dossier
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Création Patient */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Ajouter un patient"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button loading={createMutation.isPending} onClick={handleCreate}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-5">
          {/* ─ Dossier administratif ─ */}
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Dossier administratif
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom *"
              value={form.nom}
              onChange={(e) => setField("nom", e.target.value)}
              placeholder="OUEDRAOGO"
            />
            <Input
              label="Prénoms *"
              value={form.prenoms}
              onChange={(e) => setField("prenoms", e.target.value)}
              placeholder="Aminata"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Sexe *"
              value={form.sexe}
              onChange={(e) => setField("sexe", e.target.value)}
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
              onChange={(e) => setField("date_naissance", e.target.value)}
            />
            <Input
              label="Lieu de naissance *"
              value={form.lieu_naissance}
              onChange={(e) => setField("lieu_naissance", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Téléphone principal *"
              value={form.telephone_1}
              onChange={(e) => setField("telephone_1", e.target.value)}
              placeholder="+226 70 00 00 00"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="patient@email.bf"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Pays *"
              value={form.pays_id}
              onChange={(e) => {
                setField("pays_id", e.target.value);
                setField("localite_id", "");
              }}
              options={paysOptions}
              placeholder="Sélectionner un pays…"
            />
            <Select
              label="Localité"
              value={form.localite_id}
              onChange={(e) => setField("localite_id", e.target.value)}
              options={localiteOptions}
              placeholder="Sélectionner une localité…"
            />
          </div>

          {/* ─ Personne à prévenir ─ */}
          <h3 className="text-sm font-semibold text-gray-700 pt-2 border-t">
            Personne à prévenir en cas de besoin
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Nom et Prénoms *"
              value={form.nom_personne_prevenir}
              onChange={(e) =>
                setField("nom_personne_prevenir", e.target.value)
              }
            />
            <Input
              label="Filiation *"
              value={form.filiation_personne_prevenir}
              onChange={(e) =>
                setField("filiation_personne_prevenir", e.target.value)
              }
              hint="mère, frère, …"
            />
            <Input
              label="Téléphone *"
              value={form.telephone_personne_prevenir}
              onChange={(e) =>
                setField("telephone_personne_prevenir", e.target.value)
              }
            />
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
