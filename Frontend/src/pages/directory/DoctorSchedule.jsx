import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Trash2, Clock, Video, Users } from "lucide-react";
import { toast } from "sonner";
import { directoryApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";
import { formatDate, formatTime } from "@/utils/helpers";

const TYPE_LABELS = {
  teleconsultation: {
    label: "Téléconsultation",
    icon: Video,
    color: "text-primary-700 bg-primary-50",
  },
  presentiel: {
    label: "Présentiel",
    icon: Users,
    color: "text-green-700 bg-green-50",
  },
  both: {
    label: "Les deux",
    icon: Users,
    color: "text-purple-700 bg-purple-50",
  },
};

const JOURS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export default function DoctorSchedule() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    date: "",
    jour_semaine: "",
    start_time: "",
    end_time: "",
    type: "both",
    tarif: "",
    duree_creneau: "30",
  });
  const [mode, setMode] = useState("date"); // 'date' ou 'recurring'

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["doctor-schedule"],
    queryFn: () =>
      directoryApi.mySchedule().then((r) => r.data.data ?? r.data ?? {}),
  });

  const slots =
    scheduleData?.disponibilites ??
    (Array.isArray(scheduleData) ? scheduleData : []);
  const appointments = scheduleData?.appointments ?? [];

  const createMutation = useMutation({
    mutationFn: (data) => directoryApi.createSchedule(data),
    onSuccess: () => {
      toast.success("Créneau ajouté");
      queryClient.invalidateQueries({ queryKey: ["doctor-schedule"] });
      setShowCreate(false);
      setForm({
        date: "",
        start_time: "",
        end_time: "",
        type: "teleconsultation",
      });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Erreur lors de la création"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => directoryApi.deleteSchedule(id),
    onSuccess: () => {
      toast.success("Créneau supprimé");
      queryClient.invalidateQueries({ queryKey: ["doctor-schedule"] });
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message ?? "Erreur lors de la suppression",
      ),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "date" && !form.date) {
      toast.error("Veuillez indiquer une date");
      return;
    }
    if (mode === "recurring" && form.jour_semaine === "") {
      toast.error("Veuillez choisir un jour de la semaine");
      return;
    }
    if (!form.start_time || !form.end_time) {
      toast.error("Veuillez remplir les heures");
      return;
    }
    const payload = {
      start_time: form.start_time,
      end_time: form.end_time,
      type: form.type,
      duree_creneau: Number(form.duree_creneau) || 30,
      tarif: Number(form.tarif) || 0,
    };
    if (mode === "date") payload.date = form.date;
    else payload.jour_semaine = Number(form.jour_semaine);
    createMutation.mutate(payload);
  };

  // Group by date or jour_semaine label
  const grouped = slots.reduce((acc, slot) => {
    const label = slot.date
      ? slot.date
      : slot.jour_semaine != null
        ? `Chaque ${JOURS[slot.jour_semaine]}`
        : "Non défini";
    if (!acc[label]) acc[label] = [];
    acc[label].push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <AppLayout title="Mon agenda – Créneaux">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">
            Gérez vos créneaux de disponibilité pour les rendez-vous.
          </p>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            Nouveau créneau
          </Button>
        </div>

        {/* Slots list */}
        {isLoading ? (
          <LoadingPage />
        ) : sortedDates.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Aucun créneau"
            description="Ajoutez des créneaux pour permettre aux patients de prendre rendez-vous."
            action={
              <Button icon={Plus} onClick={() => setShowCreate(true)}>
                Ajouter un créneau
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <Card key={date}>
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <h3 className="font-semibold text-gray-900">
                    {date.startsWith("Chaque") ? date : formatDate(date)}
                  </h3>
                  <span className="text-xs text-gray-400 ml-auto">
                    {grouped[date].length} créneau(x)
                  </span>
                </div>
                <CardContent className="divide-y divide-gray-50">
                  {grouped[date].map((slot) => {
                    const typeCfg =
                      TYPE_LABELS[slot.type] ?? TYPE_LABELS.teleconsultation;
                    const TypeIcon = typeCfg.icon;
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center gap-4 py-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {slot.start_time ?? slot.heure_debut} –{" "}
                            {slot.end_time ?? slot.heure_fin}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={`text-xs rounded-full px-2 py-0.5 inline-flex items-center gap-1 ${typeCfg.color}`}
                            >
                              <TypeIcon className="w-3 h-3" />
                              {typeCfg.label}
                            </span>
                            {slot.tarif > 0 && (
                              <span className="text-xs text-primary-600 font-medium">
                                {Number(slot.tarif).toLocaleString()} FCFA
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {slot.duree_creneau ?? 30} min
                            </span>
                          </div>
                        </div>
                        <Button
                          size="xs"
                          variant="outline"
                          icon={Trash2}
                          onClick={() => deleteMutation.mutate(slot.id)}
                          loading={deleteMutation.isPending}
                          className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                          Supprimer
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Ajouter une disponibilité"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode: date spécifique ou récurrent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de planification
            </label>
            <div className="flex gap-3">
              <label
                className={`flex-1 p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${mode === "date" ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="date"
                  checked={mode === "date"}
                  onChange={() => setMode("date")}
                  className="sr-only"
                />
                <p className="text-sm font-medium">Date précise</p>
              </label>
              <label
                className={`flex-1 p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${mode === "recurring" ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="recurring"
                  checked={mode === "recurring"}
                  onChange={() => setMode("recurring")}
                  className="sr-only"
                />
                <p className="text-sm font-medium">Récurrent (hebdo)</p>
              </label>
            </div>
          </div>

          {mode === "date" ? (
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jour de la semaine
              </label>
              <select
                value={form.jour_semaine}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jour_semaine: e.target.value }))
                }
                className="input-field w-full"
              >
                <option value="">Choisir…</option>
                {JOURS.map((j, i) => (
                  <option key={i} value={i}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Heure début"
              type="time"
              value={form.start_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_time: e.target.value }))
              }
              required
            />
            <Input
              label="Heure fin"
              type="time"
              value={form.end_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, end_time: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="both">Télé + Présentiel</option>
              <option value="teleconsultation">Téléconsultation seule</option>
              <option value="presentiel">Présentiel seul</option>
            </Select>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée créneau (min)
              </label>
              <select
                value={form.duree_creneau}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duree_creneau: e.target.value }))
                }
                className="input-field w-full"
              >
                <option value="15">15 min</option>
                <option value="20">20 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </div>
          </div>

          <Input
            label="Tarif consultation (FCFA)"
            type="number"
            min="0"
            value={form.tarif}
            onChange={(e) => setForm((f) => ({ ...f, tarif: e.target.value }))}
            placeholder="Ex : 5000"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
