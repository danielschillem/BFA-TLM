import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  File,
  Image,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { documentsApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDateTime, downloadBlob } from "@/utils/helpers";

const DOC_TYPES = [
  { value: "", label: "Tous les types" },
  { value: "lab_result", label: "Résultats de laboratoire" },
  { value: "imaging", label: "Imagerie médicale" },
  { value: "prescription", label: "Ordonnances" },
  { value: "consultation", label: "Comptes-rendus" },
  { value: "other", label: "Autres" },
];

const TYPE_LABELS = {
  lab_result: "Résultat labo",
  imaging: "Imagerie",
  prescription: "Ordonnance",
  consultation: "Compte-rendu",
  other: "Autre",
};

function getFileIcon(mimeType) {
  if (!mimeType) return FileText;
  if (mimeType.startsWith("image/")) return Image;
  return FileText;
}

export default function DocumentList() {
  const queryClient = useQueryClient();
  const { isDoctor } = useAuthStore();
  const [typeFilter, setTypeFilter] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadType, setUploadType] = useState("other");
  const [uploadNote, setUploadNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["documents", typeFilter],
    queryFn: () =>
      documentsApi
        .list(typeFilter ? { type: typeFilter } : {})
        .then((r) => r.data.data?.data ?? []),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      // Backend accepts single file per request
      for (const f of uploadFiles) {
        const formData = new FormData();
        formData.append("file", f);
        formData.append("titre", f.name.replace(/\.[^.]+$/, ""));
        if (uploadNote) formData.append("description", uploadNote);
        formData.append("niveau_confidentialite", "normal");
        await documentsApi.upload(formData);
      }
    },
    onSuccess: () => {
      toast.success("Document(s) uploadé(s) avec succès");
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadNote("");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Erreur lors de l'upload"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success("Document supprimé");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const downloadDoc = async (doc) => {
    try {
      const res = await documentsApi.download(doc.id);
      downloadBlob(res.data, doc.title ?? `document-${doc.id}`);
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const onDrop = useCallback((accepted) => {
    setUploadFiles((prev) => [...prev, ...accepted].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/msword": [".doc", ".docx"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
  });

  const documents = data ?? [];

  return (
    <AppLayout title="Documents médicaux">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {DOC_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  typeFilter === value
                    ? "bg-primary-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-primary-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowUploadModal(true)} icon={Upload}>
            Ajouter
          </Button>
        </div>

        {/* Liste */}
        {isLoading ? (
          <LoadingPage />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description="Vos documents médicaux apparaîtront ici."
            action={
              <Button onClick={() => setShowUploadModal(true)} icon={Upload}>
                Ajouter un document
              </Button>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.mime_type);
              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(doc.created_at)}
                      </p>
                      {doc.confidentiality &&
                        doc.confidentiality !== "normal" && (
                          <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 rounded-md px-2 py-0.5">
                            {doc.confidentiality === "confidentiel"
                              ? "Confidentiel"
                              : "Très confidentiel"}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => downloadDoc(doc)}
                      variant="outline"
                      size="xs"
                      icon={Download}
                      className="flex-1"
                    >
                      Télécharger
                    </Button>
                    <Button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      variant="ghost"
                      size="xs"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadFiles([]);
        }}
        title="Ajouter des documents"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFiles([]);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              loading={uploadMutation.isPending}
              disabled={uploadFiles.length === 0}
              icon={Upload}
            >
              Uploader ({uploadFiles.length})
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary-400 bg-primary-50"
                : "border-gray-200 hover:border-primary-300"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {isDragActive
                ? "Déposez ici…"
                : "Glissez-déposez vos fichiers ou cliquez pour sélectionner"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF, images, Word — max 10 Mo par fichier (5 max)
            </p>
          </div>

          {/* Files list */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              {uploadFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
                >
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-600 truncate">
                    {f.name}
                  </span>
                  <button
                    onClick={() =>
                      setUploadFiles((fs) => fs.filter((_, idx) => idx !== i))
                    }
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de document
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="input-field w-full"
              >
                {DOC_TYPES.slice(1).map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (optionnel)
              </label>
              <input
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                className="input-field w-full"
                placeholder="Description…"
              />
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
