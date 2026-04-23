import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Archive,
  Info,
  AlertTriangle,
  AlertCircle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input, { Select, Textarea } from "@/components/ui/Input";
import { formatDateTime } from "@/utils/helpers";

const TYPE_CONFIG = {
  info: { label: "Information", icon: Info, color: "text-blue-700 bg-blue-50" },
  warning: {
    label: "Avertissement",
    icon: AlertTriangle,
    color: "text-yellow-700 bg-yellow-50",
  },
  urgent: {
    label: "Urgent",
    icon: AlertCircle,
    color: "text-red-700 bg-red-50",
  },
  maintenance: {
    label: "Maintenance",
    icon: Settings,
    color: "text-gray-700 bg-gray-100",
  },
};

const STATUS_CONFIG = {
  brouillon: { label: "Brouillon", color: "text-gray-600 bg-gray-100" },
  publie: { label: "Publié", color: "text-green-700 bg-green-50" },
  archive: { label: "Archivé", color: "text-orange-700 bg-orange-50" },
};

const STATUS_TABS = [
  { value: "", label: "Toutes" },
  { value: "brouillon", label: "Brouillons" },
  { value: "publie", label: "Publiées" },
  { value: "archive", label: "Archivées" },
];

const EMPTY_FORM = {
  titre: "",
  contenu: "",
  type: "info",
  statut: "brouillon",
  date_publication: "",
  date_expiration: "",
};

export default function AnnouncementsAdmin() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements", statusFilter],
    queryFn: () =>
      adminApi
        .announcements({ status: statusFilter || undefined })
        .then((r) => r.data.data ?? []),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? adminApi.updateAnnouncement(editing.id, data)
        : adminApi.createAnnouncement(data),
    onSuccess: () => {
      toast.success(editing ? "Annonce mise à jour" : "Annonce créée");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Annonce supprimée");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      titre: a.title ?? "",
      contenu: a.content ?? "",
      type: a.type ?? "info",
      statut: a.status ?? "brouillon",
      date_publication: a.published_at ? a.published_at.slice(0, 16) : "",
      date_expiration: a.expires_at ? a.expires_at.slice(0, 16) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titre || !form.contenu) {
      toast.error("Titre et contenu requis");
      return;
    }
    const payload = { ...form };
    if (!payload.date_publication) delete payload.date_publication;
    if (!payload.date_expiration) delete payload.date_expiration;
    saveMutation.mutate(payload);
  };

  const publishNow = (a) => {
    adminApi
      .updateAnnouncement(a.id, { statut: "publie" })
      .then(() => {
        toast.success("Annonce publiée");
        queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      })
      .catch(() => toast.error("Erreur"));
  };

  const archiveItem = (a) => {
    adminApi
      .updateAnnouncement(a.id, { statut: "archive" })
      .then(() => {
        toast.success("Annonce archivée");
        queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      })
      .catch(() => toast.error("Erreur"));
  };

  return (
    <AppLayout title="Annonces système">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">
            Gérez les annonces diffusées à tous les utilisateurs.
          </p>
          <Button icon={Plus} onClick={() => setShowModal(true)}>
            Nouvelle annonce
          </Button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingPage />
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Aucune annonce"
            description="Créez une annonce pour informer les utilisateurs de la plateforme."
            action={
              <Button onClick={() => setShowModal(true)}>
                Créer une annonce
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => {
              const typeCfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
              const TypeIcon = typeCfg.icon;
              const statusCfg =
                STATUS_CONFIG[a.status] ?? STATUS_CONFIG.brouillon;
              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4 hover:shadow-sm transition-all"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${typeCfg.color}`}
                  >
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{a.title}</p>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${statusCfg.color}`}
                      >
                        {statusCfg.label}
                      </span>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${typeCfg.color}`}
                      >
                        {typeCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {a.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {a.author && <span>Par {a.author.name}</span>}
                      {a.published_at && (
                        <>
                          <span>·</span>
                          <span>Publié {formatDateTime(a.published_at)}</span>
                        </>
                      )}
                      {a.expires_at && (
                        <>
                          <span>·</span>
                          <span>Expire {formatDateTime(a.expires_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setShowPreview(a)}
                      className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {a.status === "brouillon" && (
                      <button
                        onClick={() => publishNow(a)}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"
                        title="Publier"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {a.status === "publie" && (
                      <button
                        onClick={() => archiveItem(a)}
                        className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-600"
                        title="Archiver"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Supprimer cette annonce ?"))
                          deleteMutation.mutate(a.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editing ? "Modifier l'annonce" : "Nouvelle annonce"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Titre"
            value={form.titre}
            onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
            required
          />
          <Textarea
            label="Contenu"
            rows={4}
            value={form.contenu}
            onChange={(e) =>
              setForm((f) => ({ ...f, contenu: e.target.value }))
            }
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="info">Information</option>
              <option value="warning">Avertissement</option>
              <option value="urgent">Urgent</option>
              <option value="maintenance">Maintenance</option>
            </Select>
            <Select
              label="Statut"
              value={form.statut}
              onChange={(e) =>
                setForm((f) => ({ ...f, statut: e.target.value }))
              }
            >
              <option value="brouillon">Brouillon</option>
              <option value="publie">Publié</option>
              <option value="archive">Archivé</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date de publication"
              type="datetime-local"
              value={form.date_publication}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_publication: e.target.value }))
              }
            />
            <Input
              label="Date d'expiration"
              type="datetime-local"
              value={form.date_expiration}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_expiration: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Annuler
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview modal */}
      <Modal
        open={!!showPreview}
        onClose={() => setShowPreview(null)}
        title="Aperçu de l'annonce"
      >
        {showPreview && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">
              {showPreview.title}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${(TYPE_CONFIG[showPreview.type] ?? TYPE_CONFIG.info).color}`}
              >
                {(TYPE_CONFIG[showPreview.type] ?? TYPE_CONFIG.info).label}
              </span>
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${(STATUS_CONFIG[showPreview.status] ?? STATUS_CONFIG.brouillon).color}`}
              >
                {
                  (STATUS_CONFIG[showPreview.status] ?? STATUS_CONFIG.brouillon)
                    .label
                }
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {showPreview.content}
            </p>
            <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              {showPreview.author && <span>Par {showPreview.author.name}</span>}
              {showPreview.published_at && (
                <span>
                  {" "}
                  · Publié {formatDateTime(showPreview.published_at)}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
