import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { teleexpertiseApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import {
  TeleexpertiseBadge,
  UrgencyBadge,
} from "@/components/common/StatusBadge";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import { formatDateLabel } from "@/utils/helpers";

const TABS = [
  { value: "", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "accepted", label: "Acceptées" },
  { value: "responded", label: "Répondues" },
];

export default function TeleexpertiseList() {
  const navigate = useNavigate();
  const { isDoctor, isPatient } = useAuthStore();
  const [activeTab, setActiveTab] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teleexpertise", activeTab],
    queryFn: () =>
      teleexpertiseApi
        .list(activeTab ? { status: activeTab } : {})
        .then((r) => r.data.data?.data ?? []),
  });

  const requests = data ?? [];

  return (
    <AppLayout title="Téléexpertise">
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div />
          {isDoctor() && (
            <Button onClick={() => navigate("/teleexpertise/new")} icon={Plus}>
              Nouvelle demande
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.value
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {isLoading ? (
          <LoadingPage />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucune demande de téléexpertise"
            description="Les demandes de téléexpertise apparaîtront ici."
            action={
              isDoctor() ? (
                <Button
                  onClick={() => navigate("/teleexpertise/new")}
                  icon={Plus}
                >
                  Nouvelle demande
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onClick={() => navigate(`/teleexpertise/${req.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function RequestCard({ request: req, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-primary-100 cursor-pointer transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 truncate">
                {req.title ?? req.reason}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                {req.requesting_doctor?.last_name}{" "}
                <ArrowRight className="w-3 h-3" />{" "}
                {req.specialist?.last_name ?? "Spécialiste non assigné"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <TeleexpertiseBadge status={req.status} />
              {req.urgency_level !== "normal" && (
                <UrgencyBadge urgency={req.urgency_level} />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span>{req.specialty_requested}</span>
            <span>·</span>
            <span>{formatDateLabel(req.created_at)}</span>
          </div>
          {req.clinical_summary && (
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
              {req.clinical_summary}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}
