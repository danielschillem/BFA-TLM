import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  FileCode2,
  Download,
  CheckCircle2,
  XCircle,
  FileSearch,
  User,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import { cdaApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";

function XmlViewer({ xml }) {
  if (!xml) return null;

  // Basic XML syntax highlighting
  const highlighted = xml
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /(&lt;\/?[\w:.-]+)/g,
      '<span class="text-blue-700 font-medium">$1</span>',
    )
    .replace(
      /([\w:-]+)=(&quot;|")/g,
      '<span class="text-orange-600">$1</span>=<span class="text-green-700">"</span>',
    );

  return (
    <pre
      className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto max-h-[60vh] leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export default function CdaViewer() {
  const [docType, setDocType] = useState("ccd");
  const [entityId, setEntityId] = useState("");
  const [xmlContent, setXmlContent] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const generateMutation = useMutation({
    mutationFn: () => {
      if (docType === "ccd") return cdaApi.patientCcd(entityId);
      if (docType === "summary") return cdaApi.patientSummary(entityId);
      return cdaApi.consultationNote(entityId);
    },
    onSuccess: (res) => {
      setXmlContent(
        typeof res.data === "string"
          ? res.data
          : (res.data?.xml ?? JSON.stringify(res.data, null, 2)),
      );
      setValidationResult(null);
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => cdaApi.validate(xmlContent),
    onSuccess: (res) => setValidationResult(res.data),
  });

  const downloadXml = () => {
    if (!xmlContent) return;
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}_${entityId}_${new Date().toISOString().split("T")[0]}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DOC_TYPES = [
    {
      value: "ccd",
      label: "CCD (Continuity of Care)",
      icon: User,
      idLabel: "ID Patient",
    },
    {
      value: "summary",
      label: "Patient Summary",
      icon: User,
      idLabel: "ID Patient",
    },
    {
      value: "consultation",
      label: "Note de consultation",
      icon: Stethoscope,
      idLabel: "ID Consultation",
    },
  ];

  const activeDoc = DOC_TYPES.find((d) => d.value === docType);

  return (
    <AppLayout title="CDA R2 — Documents cliniques">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <FileCode2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  HL7 CDA R2 / C-CDA 2.1
                </h2>
                <p className="text-xs text-gray-500">
                  Génération et validation de documents cliniques structurés XML
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Document type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DOC_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setDocType(value);
                setXmlContent(null);
                setValidationResult(null);
              }}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                docType === value
                  ? "bg-purple-50 border-purple-300 text-purple-700 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Generator */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">
              Générer un document {activeDoc?.label}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder={activeDoc?.idLabel ?? "ID"}
                className="input-field flex-1"
              />
              <Button
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
                disabled={!entityId}
                variant="primary"
                size="sm"
              >
                Générer
              </Button>
            </div>
            {generateMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                Erreur :{" "}
                {generateMutation.error?.response?.data?.message ||
                  "Impossible de générer le document."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* XML Output */}
        {xmlContent && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Document XML généré
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => validateMutation.mutate()}
                    variant="outline"
                    size="sm"
                    icon={FileSearch}
                    loading={validateMutation.isPending}
                  >
                    Valider
                  </Button>
                  <Button
                    onClick={downloadXml}
                    variant="outline"
                    size="sm"
                    icon={Download}
                  >
                    Télécharger
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Validation result */}
              {validationResult && (
                <div
                  className={`p-3 rounded-lg mb-4 flex items-start gap-2 ${
                    validationResult.valid
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-medium ${validationResult.valid ? "text-green-700" : "text-red-700"}`}
                    >
                      {validationResult.valid
                        ? "Document valide"
                        : "Document invalide"}
                    </p>
                    {validationResult.errors?.length > 0 && (
                      <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                        {validationResult.errors.map((e, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 flex-shrink-0" /> {e}
                          </li>
                        ))}
                      </ul>
                    )}
                    {validationResult.warnings?.length > 0 && (
                      <ul className="text-xs text-yellow-600 mt-1 space-y-0.5">
                        {validationResult.warnings.map((w, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />{" "}
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              <XmlViewer xml={xmlContent} />
            </CardContent>
          </Card>
        )}

        {!xmlContent && !generateMutation.isPending && (
          <EmptyState
            icon={FileCode2}
            title="Aucun document"
            description="Sélectionnez un type et entrez un ID pour générer un document CDA."
          />
        )}
        {generateMutation.isPending && <LoadingPage />}
      </div>
    </AppLayout>
  );
}
