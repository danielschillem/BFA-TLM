import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, ArrowLeft, Search, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { certificatsDecesApi, patientsApi, icd11Api } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import Button from "@/components/ui/Button";
import Input, { Textarea, Select } from "@/components/ui/Input";

const MANNER_OPTIONS = [
  { value: "naturelle", label: "Mort naturelle" },
  { value: "accident", label: "Accident" },
  { value: "suicide", label: "Suicide" },
  { value: "homicide", label: "Homicide" },
  { value: "indeterminee", label: "Indéterminée" },
  { value: "en_attente_enquete", label: "En attente d'enquête" },
];

const SEXE_OPTIONS = [
  { value: "M", label: "Masculin" },
  { value: "F", label: "Féminin" },
];

const PREGNANCY_OPTIONS = [
  { value: "non_applicable", label: "Non applicable" },
  { value: "non_enceinte", label: "Non enceinte" },
  { value: "enceinte", label: "Enceinte au moment du décès" },
  {
    value: "moins_42_jours_postpartum",
    label: "Moins de 42 jours après la fin de grossesse",
  },
  {
    value: "43_jours_a_1_an_postpartum",
    label: "Entre 43 jours et 1 an après",
  },
];

const INITIAL_FORM = {
  patient_id: "",
  nom_defunt: "",
  prenoms_defunt: "",
  date_naissance_defunt: "",
  sexe_defunt: "",
  lieu_naissance_defunt: "",
  adresse_defunt: "",
  nationalite_defunt: "Burkinabè",
  profession_defunt: "",
  date_deces: "",
  heure_deces: "",
  lieu_deces: "",
  // WHO Part I — Causal chain
  cause_directe: "",
  code_icd11_cause_directe: "",
  intervalle_cause_directe: "",
  cause_antecedente_1: "",
  code_icd11_cause_antecedente_1: "",
  intervalle_cause_antecedente_1: "",
  cause_antecedente_2: "",
  code_icd11_cause_antecedente_2: "",
  intervalle_cause_antecedente_2: "",
  cause_initiale: "",
  code_icd11_cause_initiale: "",
  intervalle_cause_initiale: "",
  // Part II
  autres_conditions: "",
  // Circumstances
  circonstances_deces: "naturelle",
  autopsie_pratiquee: false,
  resultats_autopsie: "",
  grossesse_contribue: "non_applicable",
  chirurgie_recente: false,
  date_chirurgie: "",
  raison_chirurgie: "",
  // Notes
  notes: "",
};

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toTimeInput(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function mapApiGenderToForm(gender) {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return gender ?? "";
}

function mapCertificatToForm(cert) {
  return {
    ...INITIAL_FORM,
    patient_id: cert.patient_id ?? cert.patient?.id ?? "",
    nom_defunt: cert.nom_defunt ?? "",
    prenoms_defunt: cert.prenoms_defunt ?? "",
    date_naissance_defunt: toDateInput(cert.date_naissance_defunt),
    sexe_defunt: cert.sexe_defunt ?? "",
    lieu_naissance_defunt: cert.lieu_naissance_defunt ?? "",
    adresse_defunt: cert.adresse_defunt ?? "",
    nationalite_defunt: cert.nationalite_defunt ?? "Burkinabè",
    profession_defunt: cert.profession_defunt ?? "",
    date_deces: toDateInput(cert.date_deces),
    heure_deces: toTimeInput(cert.heure_deces),
    lieu_deces: cert.lieu_deces ?? "",
    cause_directe: cert.cause_directe ?? "",
    code_icd11_cause_directe: cert.code_icd11_cause_directe ?? "",
    intervalle_cause_directe: cert.intervalle_cause_directe ?? "",
    cause_antecedente_1: cert.cause_antecedente_1 ?? "",
    code_icd11_cause_antecedente_1: cert.code_icd11_cause_antecedente_1 ?? "",
    intervalle_cause_antecedente_1: cert.intervalle_cause_antecedente_1 ?? "",
    cause_antecedente_2: cert.cause_antecedente_2 ?? "",
    code_icd11_cause_antecedente_2: cert.code_icd11_cause_antecedente_2 ?? "",
    intervalle_cause_antecedente_2: cert.intervalle_cause_antecedente_2 ?? "",
    cause_initiale: cert.cause_initiale ?? "",
    code_icd11_cause_initiale: cert.code_icd11_cause_initiale ?? "",
    intervalle_cause_initiale: cert.intervalle_cause_initiale ?? "",
    autres_conditions:
      cert.autres_conditions ?? cert.autres_etats_morbides ?? "",
    circonstances_deces:
      cert.circonstances_deces ?? cert.maniere_deces ?? "naturelle",
    autopsie_pratiquee: !!cert.autopsie_pratiquee,
    resultats_autopsie: cert.resultats_autopsie ?? "",
    grossesse_contribue: cert.statut_grossesse ?? "non_applicable",
    chirurgie_recente: !!cert.chirurgie_recente,
    date_chirurgie: toDateInput(cert.date_chirurgie),
    raison_chirurgie: cert.raison_chirurgie ?? "",
    notes: cert.notes ?? cert.observations ?? "",
  };
}

function Icd11SearchField({ label, value, onChange, onCodeSelect }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: results } = useQuery({
    queryKey: ["icd11", "search", query],
    queryFn: () => icd11Api.search({ q: query, limit: 10 }).then((r) => r.data),
    enabled: query.length >= 2,
  });

  const entities =
    results?.data ?? results?.destinationEntities ?? results ?? [];

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Description de la cause…"
          className="input-field flex-1 text-sm"
        />
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Code ICD-11"
            className="input-field w-32 text-sm font-mono"
          />
          {showResults && Array.isArray(entities) && entities.length > 0 && (
            <div className="absolute z-50 top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {entities.map((e, i) => (
                <button
                  key={e.theCode ?? e.code ?? i}
                  type="button"
                  onClick={() => {
                    onCodeSelect(e.theCode ?? e.code);
                    onChange(e.title ?? e.display ?? value);
                    setQuery(e.theCode ?? e.code);
                    setShowResults(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs border-b border-gray-50"
                >
                  <span className="font-mono text-gray-500 mr-2">
                    {e.theCode ?? e.code}
                  </span>
                  <span className="text-gray-800">{e.title ?? e.display}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CertificatDecesForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState(INITIAL_FORM);
  const [patientSearch, setPatientSearch] = useState("");

  // Load existing cert for edit
  const { isLoading: loadingCert } = useQuery({
    queryKey: ["certificat-deces", id],
    queryFn: () =>
      certificatsDecesApi.get(id).then((r) => {
        const cert = r.data.data ?? r.data;
        setForm(mapCertificatToForm(cert));
        return cert;
      }),
    enabled: isEdit,
  });

  // Patient search
  const { data: patientsData } = useQuery({
    queryKey: ["patients-search", patientSearch],
    queryFn: () =>
      patientsApi
        .list({ search: patientSearch })
        .then((r) => r.data.data ?? []),
    enabled: patientSearch.length >= 2,
  });

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e?.target?.value ?? e }));
  const setBool = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.checked }));

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? certificatsDecesApi.update(id, data)
        : certificatsDecesApi.create(data),
    onSuccess: (res) => {
      toast.success(isEdit ? "Certificat mis à jour" : "Certificat créé");
      queryClient.invalidateQueries({ queryKey: ["certificats-deces"] });
      const certId = res.data?.data?.id ?? res.data?.id ?? id;
      navigate(`/certificats-deces/${certId}`);
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? "Erreur lors de la sauvegarde";
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Grossesse: split en boolean + statut
    const PREGNANCY_CONTRIBUTING = [
      "enceinte",
      "moins_42_jours_postpartum",
      "43_jours_a_1_an_postpartum",
    ];

    const payload = {
      // Patient (optionnel)
      ...(form.patient_id ? { patient_id: form.patient_id } : {}),
      nom_defunt: form.nom_defunt,
      prenoms_defunt: form.prenoms_defunt,
      date_naissance_defunt: form.date_naissance_defunt || undefined,
      lieu_naissance_defunt: form.lieu_naissance_defunt || undefined,
      nationalite_defunt: form.nationalite_defunt || undefined,
      profession_defunt: form.profession_defunt || undefined,
      adresse_defunt: form.adresse_defunt || undefined,
      // Circonstances
      date_deces: form.date_deces,
      heure_deces: form.heure_deces || undefined,
      lieu_deces: form.lieu_deces || undefined,
      sexe_defunt: form.sexe_defunt || undefined,
      // Partie I — Chaîne causale (noms backend)
      cause_directe: form.cause_directe,
      cause_directe_code_icd11: form.code_icd11_cause_directe || undefined,
      cause_directe_delai: form.intervalle_cause_directe || undefined,
      cause_antecedente_1: form.cause_antecedente_1 || undefined,
      cause_antecedente_1_code_icd11:
        form.code_icd11_cause_antecedente_1 || undefined,
      cause_antecedente_1_delai:
        form.intervalle_cause_antecedente_1 || undefined,
      cause_antecedente_2: form.cause_antecedente_2 || undefined,
      cause_antecedente_2_code_icd11:
        form.code_icd11_cause_antecedente_2 || undefined,
      cause_antecedente_2_delai:
        form.intervalle_cause_antecedente_2 || undefined,
      cause_initiale: form.cause_initiale || undefined,
      cause_initiale_code_icd11: form.code_icd11_cause_initiale || undefined,
      cause_initiale_delai: form.intervalle_cause_initiale || undefined,
      // Partie II
      autres_etats_morbides: form.autres_conditions || undefined,
      // Circonstances
      maniere_deces: form.circonstances_deces || undefined,
      autopsie_pratiquee: !!form.autopsie_pratiquee,
      resultats_autopsie: form.resultats_autopsie || undefined,
      // Grossesse (boolean + enum)
      grossesse_contribue: PREGNANCY_CONTRIBUTING.includes(
        form.grossesse_contribue,
      ),
      statut_grossesse: form.grossesse_contribue || "non_applicable",
      // Chirurgie
      chirurgie_recente: !!form.chirurgie_recente,
      date_chirurgie: form.date_chirurgie || undefined,
      raison_chirurgie: form.raison_chirurgie || undefined,
      // Notes
      observations: form.notes || undefined,
    };

    // Retirer les clés undefined
    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k],
    );
    saveMutation.mutate(payload);
  };

  const selectPatient = (p) => {
    setForm((f) => ({
      ...f,
      patient_id: p.id,
      nom_defunt: p.nom ?? p.last_name ?? "",
      prenoms_defunt: p.prenoms ?? p.first_name ?? "",
      date_naissance_defunt: p.date_naissance ?? p.date_of_birth ?? "",
      sexe_defunt: p.sexe ?? mapApiGenderToForm(p.gender),
      lieu_naissance_defunt: p.lieu_naissance ?? "",
      adresse_defunt: p.adresse ?? "",
      nationalite_defunt: p.nationalite ?? "Burkinabè",
    }));
    setPatientSearch("");
  };

  if (isEdit && loadingCert)
    return (
      <AppLayout title="Certificat de décès">
        <LoadingPage />
      </AppLayout>
    );

  return (
    <AppLayout
      title={
        isEdit
          ? "Modifier le certificat de décès"
          : "Nouveau certificat de décès"
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 animate-fade-in max-w-4xl"
      >
        {/* Back */}
        <Button
          type="button"
          variant="ghost"
          icon={ArrowLeft}
          onClick={() => navigate("/certificats-deces")}
        >
          Retour
        </Button>

        {/* Patient search */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">
              Lier à un patient existant (optionnel)
            </h3>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Rechercher un patient par nom, IPP…"
                className="input-field pl-9 w-full text-sm"
              />
            </div>
            {Array.isArray(patientsData) &&
              patientsData.length > 0 &&
              patientSearch && (
                <div className="mt-2 border rounded-lg max-h-32 overflow-y-auto">
                  {patientsData.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50"
                    >
                      {p.prenoms ?? p.first_name} {p.nom ?? p.last_name}
                      {p.ipp && (
                        <span className="ml-2 text-xs font-mono text-gray-400">
                          {p.ipp}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            {form.patient_id && (
              <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Patient lié (ID:{" "}
                {form.patient_id})
              </p>
            )}
          </CardContent>
        </Card>

        {/* Identité du défunt */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Identité du défunt</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nom *"
                value={form.nom_defunt}
                onChange={set("nom_defunt")}
                required
              />
              <Input
                label="Prénom(s) *"
                value={form.prenoms_defunt}
                onChange={set("prenoms_defunt")}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Date de naissance *"
                type="date"
                value={form.date_naissance_defunt}
                onChange={set("date_naissance_defunt")}
                required
              />
              <Select
                label="Sexe *"
                value={form.sexe_defunt}
                onChange={set("sexe_defunt")}
                options={SEXE_OPTIONS}
                placeholder="Sélectionner"
              />
              <Input
                label="Lieu de naissance"
                value={form.lieu_naissance_defunt}
                onChange={set("lieu_naissance_defunt")}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Nationalité"
                value={form.nationalite_defunt}
                onChange={set("nationalite_defunt")}
              />
              <Input
                label="Profession"
                value={form.profession_defunt}
                onChange={set("profession_defunt")}
              />
              <Input
                label="Adresse"
                value={form.adresse_defunt}
                onChange={set("adresse_defunt")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Circonstances du décès */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Circonstances du décès</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Date du décès *"
                type="date"
                value={form.date_deces}
                onChange={set("date_deces")}
                required
              />
              <Input
                label="Heure du décès"
                type="time"
                value={form.heure_deces}
                onChange={set("heure_deces")}
              />
              <Input
                label="Lieu du décès *"
                value={form.lieu_deces}
                onChange={set("lieu_deces")}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Circonstances *"
                value={form.circonstances_deces}
                onChange={set("circonstances_deces")}
                options={MANNER_OPTIONS}
              />
              <Select
                label="Grossesse"
                value={form.grossesse_contribue}
                onChange={set("grossesse_contribue")}
                options={PREGNANCY_OPTIONS}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.autopsie_pratiquee}
                  onChange={setBool("autopsie_pratiquee")}
                  className="rounded"
                />
                Autopsie pratiquée
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.chirurgie_recente}
                  onChange={setBool("chirurgie_recente")}
                  className="rounded"
                />
                Chirurgie récente
              </label>
            </div>
            {form.autopsie_pratiquee && (
              <Textarea
                label="Résultats de l'autopsie"
                value={form.resultats_autopsie}
                onChange={set("resultats_autopsie")}
                rows={2}
              />
            )}
            {form.chirurgie_recente && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date de chirurgie"
                  type="date"
                  value={form.date_chirurgie}
                  onChange={set("date_chirurgie")}
                />
                <Input
                  label="Raison de la chirurgie"
                  value={form.raison_chirurgie}
                  onChange={set("raison_chirurgie")}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partie I OMS — Chaîne causale */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">
              Partie I — Chaîne causale (modèle OMS)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              De la cause directe (a) à la cause initiale (d)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-5">
                a
              </span>
              <div className="flex-1">
                <Icd11SearchField
                  label="Cause directe du décès *"
                  value={form.cause_directe}
                  onChange={(v) => setForm((f) => ({ ...f, cause_directe: v }))}
                  onCodeSelect={(code) =>
                    setForm((f) => ({ ...f, code_icd11_cause_directe: code }))
                  }
                />
                <Input
                  label="Intervalle (début → décès)"
                  className="mt-2"
                  value={form.intervalle_cause_directe}
                  onChange={set("intervalle_cause_directe")}
                  placeholder="Ex: 2 heures"
                />
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-5">
                b
              </span>
              <div className="flex-1">
                <Icd11SearchField
                  label="Due à (cause antécédente 1)"
                  value={form.cause_antecedente_1}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, cause_antecedente_1: v }))
                  }
                  onCodeSelect={(code) =>
                    setForm((f) => ({
                      ...f,
                      code_icd11_cause_antecedente_1: code,
                    }))
                  }
                />
                <Input
                  label="Intervalle"
                  className="mt-2"
                  value={form.intervalle_cause_antecedente_1}
                  onChange={set("intervalle_cause_antecedente_1")}
                  placeholder="Ex: 3 jours"
                />
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-5">
                c
              </span>
              <div className="flex-1">
                <Icd11SearchField
                  label="Due à (cause antécédente 2)"
                  value={form.cause_antecedente_2}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, cause_antecedente_2: v }))
                  }
                  onCodeSelect={(code) =>
                    setForm((f) => ({
                      ...f,
                      code_icd11_cause_antecedente_2: code,
                    }))
                  }
                />
                <Input
                  label="Intervalle"
                  className="mt-2"
                  value={form.intervalle_cause_antecedente_2}
                  onChange={set("intervalle_cause_antecedente_2")}
                  placeholder="Ex: 6 mois"
                />
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-5">
                d
              </span>
              <div className="flex-1">
                <Icd11SearchField
                  label="Cause initiale (sous-jacente)"
                  value={form.cause_initiale}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, cause_initiale: v }))
                  }
                  onCodeSelect={(code) =>
                    setForm((f) => ({ ...f, code_icd11_cause_initiale: code }))
                  }
                />
                <Input
                  label="Intervalle"
                  className="mt-2"
                  value={form.intervalle_cause_initiale}
                  onChange={set("intervalle_cause_initiale")}
                  placeholder="Ex: 5 ans"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partie II — Autres conditions */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">
              Partie II — Autres états morbides ayant contribué au décès
            </h3>
          </CardHeader>
          <CardContent>
            <Textarea
              label="Conditions supplémentaires"
              value={form.autres_conditions}
              onChange={set("autres_conditions")}
              rows={3}
              placeholder="Conditions ayant contribué au décès mais ne faisant pas partie de la chaîne causale…"
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent>
            <Textarea
              label="Notes internes"
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Notes ou observations complémentaires…"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/certificats-deces")}
          >
            Annuler
          </Button>
          <Button type="submit" icon={Save} loading={saveMutation.isPending}>
            {isEdit ? "Mettre à jour" : "Enregistrer le brouillon"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
