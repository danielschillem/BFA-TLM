import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  BookOpen,
  ChevronRight,
  Check,
  X,
  Activity,
  TreePine,
  Globe,
  Pill,
  FlaskConical,
  Heart,
  ArrowRight,
} from "lucide-react";
import { terminologyApi, icd11Api } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const TABS = [
  { id: "snomed", label: "SNOMED CT", icon: BookOpen, color: "blue" },
  { id: "icd11", label: "ICD-11 OMS", icon: Globe, color: "green" },
  { id: "atc", label: "ATC", icon: Pill, color: "purple" },
];

const SNOMED_DOMAINS = [
  { id: "disorders", label: "Maladies", icon: Heart },
  { id: "procedures", label: "Procédures", icon: FlaskConical },
  { id: "findings", label: "Constatations", icon: Search },
  { id: "substances", label: "Substances", icon: Pill },
  { id: "body-structures", label: "Structures anat.", icon: Activity },
];

function ConceptCard({ code, display, system, extra, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{display}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono text-gray-500">{code}</span>
          {system && (
            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
              {system}
            </span>
          )}
          {extra && <span className="text-xs text-gray-400">{extra}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
    </div>
  );
}

function SnomedTab() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState(null);
  const [selected, setSelected] = useState(null);
  const [validateCode, setValidateCode] = useState("");

  const searchFn = domain
    ? () =>
        terminologyApi
          .snomedDomainSearch(domain, { q: query, limit: 30 })
          .then((r) => r.data)
    : () =>
        terminologyApi
          .snomedSearch({ q: query, limit: 30 })
          .then((r) => r.data);

  const { data: results, isLoading } = useQuery({
    queryKey: ["snomed", "search", query, domain],
    queryFn: searchFn,
    enabled: query.length >= 2,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["snomed", "lookup", selected],
    queryFn: () => terminologyApi.snomedLookup(selected).then((r) => r.data),
    enabled: !!selected,
  });

  const { data: validation } = useQuery({
    queryKey: ["snomed", "validate", validateCode],
    queryFn: () =>
      terminologyApi.snomedValidate(validateCode).then((r) => r.data),
    enabled: validateCode.length >= 3,
  });

  const concepts = results?.data ?? results?.items ?? results ?? [];

  return (
    <div className="space-y-4">
      {/* Domain filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDomain(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            !domain
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tous
        </button>
        {SNOMED_DOMAINS.map((d) => (
          <button
            key={d.id}
            onClick={() => setDomain(d.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1 ${
              domain === d.id
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <d.icon className="w-3 h-3" />
            {d.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un concept SNOMED CT…"
          className="input-field pl-9 w-full"
        />
      </div>

      {/* Validate */}
      <div className="flex items-center gap-2">
        <input
          value={validateCode}
          onChange={(e) => setValidateCode(e.target.value)}
          placeholder="Valider un code SNOMED (ex: 73211009)"
          className="input-field flex-1 text-sm"
        />
        {validateCode.length >= 3 && validation && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${validation.valid ? "text-green-600" : "text-red-600"}`}
          >
            {validation.valid ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            {validation.valid ? "Valide" : "Invalide"}
          </span>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <LoadingPage />
      ) : query.length < 2 ? (
        <EmptyState
          icon={BookOpen}
          title="Recherche SNOMED CT"
          description="Entrez au moins 2 caractères pour rechercher."
        />
      ) : Array.isArray(concepts) && concepts.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucun résultat"
          description="Aucun concept trouvé pour cette recherche."
        />
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {(Array.isArray(concepts) ? concepts : []).map((c, i) => (
            <ConceptCard
              key={c.conceptId ?? c.id ?? i}
              code={c.conceptId ?? c.id ?? c.code}
              display={c.pt?.term ?? c.fsn?.term ?? c.display ?? c.term}
              system="SNOMED CT"
              extra={c.fsn?.term !== c.pt?.term ? c.fsn?.term : null}
              onClick={() => setSelected(c.conceptId ?? c.id)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title="Détail SNOMED CT"
          size="md"
        >
          {detailLoading ? (
            <LoadingPage />
          ) : detail ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">
                  {detail.pt?.term ?? detail.fsn?.term ?? detail.display}
                </p>
                <p className="text-xs text-blue-700 font-mono mt-1">
                  ID: {detail.conceptId ?? detail.id}
                </p>
                {detail.fsn?.term && (
                  <p className="text-xs text-blue-600 mt-1">
                    FSN: {detail.fsn.term}
                  </p>
                )}
              </div>
              {detail.descriptions && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Descriptions
                  </h4>
                  <div className="space-y-1">
                    {detail.descriptions?.slice(0, 10).map((d, i) => (
                      <p key={i} className="text-sm text-gray-700">
                        {d.term}{" "}
                        <span className="text-xs text-gray-400">
                          ({d.type})
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

function Icd11Tab() {
  const [query, setQuery] = useState("");
  const [crosswalkCode, setCrosswalkCode] = useState("");
  const [selected, setSelected] = useState(null);
  const [validateCode, setValidateCode] = useState("");

  const { data: results, isLoading } = useQuery({
    queryKey: ["icd11", "search", query],
    queryFn: () => icd11Api.search({ q: query, limit: 30 }).then((r) => r.data),
    enabled: query.length >= 2,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["icd11", "lookup", selected],
    queryFn: () => icd11Api.lookup(selected).then((r) => r.data),
    enabled: !!selected,
  });

  const { data: crosswalk, isLoading: crosswalkLoading } = useQuery({
    queryKey: ["icd11", "crosswalk", crosswalkCode],
    queryFn: () => icd11Api.crosswalk(crosswalkCode).then((r) => r.data),
    enabled: crosswalkCode.length >= 3,
  });

  const { data: validation } = useQuery({
    queryKey: ["icd11", "validate", validateCode],
    queryFn: () => icd11Api.validate(validateCode).then((r) => r.data),
    enabled: validateCode.length >= 2,
  });

  const entities =
    results?.data ?? results?.destinationEntities ?? results ?? [];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans ICD-11 (ex: paludisme, diabète)…"
          className="input-field pl-9 w-full"
        />
      </div>

      {/* Validate + Crosswalk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Valider un code ICD-11
          </label>
          <div className="flex items-center gap-2">
            <input
              value={validateCode}
              onChange={(e) => setValidateCode(e.target.value)}
              placeholder="Ex: 5A11"
              className="input-field flex-1 text-sm"
            />
            {validateCode.length >= 2 && validation && (
              <span
                className={`flex items-center gap-1 text-xs font-medium ${validation.valid ? "text-green-600" : "text-red-600"}`}
              >
                {validation.valid ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                {validation.valid ? "Valide" : "Invalide"}
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
            Crosswalk ICD-10 <ArrowRight className="w-3 h-3" /> ICD-11
          </label>
          <div className="flex items-center gap-2">
            <input
              value={crosswalkCode}
              onChange={(e) => setCrosswalkCode(e.target.value)}
              placeholder="Code ICD-10 (ex: E11.9)"
              className="input-field flex-1 text-sm"
            />
            {crosswalkLoading && (
              <span className="text-xs text-gray-400">…</span>
            )}
          </div>
          {crosswalk && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 flex items-center gap-1">
                <span className="font-semibold">{crosswalkCode}</span>{" "}
                <ArrowRight className="w-3 h-3" />{" "}
                <span className="font-semibold">
                  {crosswalk.icd11_code ?? crosswalk.data?.icd11_code}
                </span>
              </p>
              <p className="text-xs text-green-600">
                {crosswalk.icd11_title ?? crosswalk.data?.icd11_title}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <LoadingPage />
      ) : query.length < 2 ? (
        <EmptyState
          icon={Globe}
          title="Recherche ICD-11"
          description="Entrez au moins 2 caractères pour rechercher dans la CIM-11."
        />
      ) : (Array.isArray(entities) ? entities : []).length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Aucun résultat"
          description="Aucune entité trouvée."
        />
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {(Array.isArray(entities) ? entities : []).map((e, i) => (
            <ConceptCard
              key={e.theCode ?? e.id ?? i}
              code={e.theCode ?? e.code ?? e.id}
              display={e.title ?? e.display ?? e.term}
              system="ICD-11"
              onClick={() => setSelected(e.theCode ?? e.code)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title="Détail ICD-11"
          size="md"
        >
          {detailLoading ? (
            <LoadingPage />
          ) : detail ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-semibold text-green-900">
                  {detail.title ?? detail.data?.title}
                </p>
                <p className="text-xs text-green-700 font-mono mt-1">
                  Code: {detail.theCode ?? detail.data?.theCode ?? selected}
                </p>
                {(detail.definition ?? detail.data?.definition) && (
                  <p className="text-xs text-green-600 mt-2">
                    {detail.definition ?? detail.data?.definition}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

function AtcTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [validateCode, setValidateCode] = useState("");

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ["atc", "tree"],
    queryFn: () => terminologyApi.atcTree().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["atc", "search", query],
    queryFn: () => terminologyApi.atcSearch({ q: query }).then((r) => r.data),
    enabled: query.length >= 2,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["atc", "lookup", selected],
    queryFn: () => terminologyApi.atcLookup(selected).then((r) => r.data),
    enabled: !!selected,
  });

  const { data: validation } = useQuery({
    queryKey: ["atc", "validate", validateCode],
    queryFn: () => terminologyApi.atcValidate(validateCode).then((r) => r.data),
    enabled: validateCode.length >= 1,
  });

  const treeData = tree?.data ?? tree ?? [];
  const searchResults = results?.data ?? results ?? [];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher médicament / classe ATC…"
          className="input-field pl-9 w-full"
        />
      </div>

      {/* Validate */}
      <div className="flex items-center gap-2">
        <input
          value={validateCode}
          onChange={(e) => setValidateCode(e.target.value)}
          placeholder="Valider un code ATC (ex: A10B)"
          className="input-field flex-1 text-sm"
        />
        {validateCode.length >= 1 && validation && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${validation.valid ? "text-green-600" : "text-red-600"}`}
          >
            {validation.valid ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            {validation.valid ? "Valide" : "Invalide"}
          </span>
        )}
      </div>

      {/* Results or Tree */}
      {query.length >= 2 ? (
        isLoading ? (
          <LoadingPage />
        ) : (Array.isArray(searchResults) ? searchResults : []).length === 0 ? (
          <EmptyState
            icon={Pill}
            title="Aucun résultat"
            description="Aucune classe ATC trouvée."
          />
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {(Array.isArray(searchResults) ? searchResults : []).map((c, i) => (
              <ConceptCard
                key={c.code ?? i}
                code={c.code}
                display={c.name ?? c.display ?? c.label}
                system="ATC"
                onClick={() => setSelected(c.code)}
              />
            ))}
          </div>
        )
      ) : treeLoading ? (
        <LoadingPage />
      ) : (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Classification ATC — Niveau 1
          </h4>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {(Array.isArray(treeData) ? treeData : []).map((group, i) => (
              <ConceptCard
                key={group.code ?? i}
                code={group.code}
                display={group.name ?? group.label ?? group.display}
                system="ATC"
                onClick={() => setSelected(group.code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title="Détail ATC"
          size="md"
        >
          {detailLoading ? (
            <LoadingPage />
          ) : detail ? (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-semibold text-purple-900">
                  {detail.name ?? detail.data?.name ?? detail.display}
                </p>
                <p className="text-xs text-purple-700 font-mono mt-1">
                  Code: {detail.code ?? detail.data?.code ?? selected}
                </p>
                {(detail.level ?? detail.data?.level) && (
                  <p className="text-xs text-purple-600 mt-1">
                    Niveau: {detail.level ?? detail.data?.level}
                  </p>
                )}
              </div>
              {(detail.children ?? detail.data?.children) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Sous-classes
                  </h4>
                  <div className="space-y-1">
                    {(detail.children ?? detail.data?.children)
                      ?.slice(0, 20)
                      .map((ch, i) => (
                        <p key={i} className="text-sm text-gray-700">
                          <span className="font-mono text-xs text-gray-500 mr-2">
                            {ch.code}
                          </span>
                          {ch.name ?? ch.display}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

export default function TerminologyBrowser() {
  const [activeTab, setActiveTab] = useState("snomed");

  return (
    <AppLayout title="Terminologies médicales">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Navigateur de terminologies
                </h2>
                <p className="text-xs text-gray-500">
                  SNOMED CT · ICD-11 (OMS) · ATC — Recherche, validation et
                  navigation
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tab selector */}
        <div className="flex gap-2">
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                activeTab === id
                  ? `bg-${color}-50 border-${color}-300 text-${color}-700 shadow-sm`
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <Card>
          <CardContent>
            {activeTab === "snomed" && <SnomedTab />}
            {activeTab === "icd11" && <Icd11Tab />}
            {activeTab === "atc" && <AtcTab />}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
