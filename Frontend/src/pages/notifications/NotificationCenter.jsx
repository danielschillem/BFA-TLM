import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Calendar,
  Video,
  MessageSquare,
  FileText,
  CreditCard,
  Stethoscope,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "@/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingPage } from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/ui/Button";
import { fromNow } from "@/utils/helpers";

const TYPE_CONFIG = {
  appointment: { icon: Calendar, color: "bg-blue-100 text-blue-600" },
  consultation: { icon: Video, color: "bg-green-100 text-green-600" },
  message: { icon: MessageSquare, color: "bg-purple-100 text-purple-600" },
  prescription: { icon: FileText, color: "bg-indigo-100 text-indigo-600" },
  payment: { icon: CreditCard, color: "bg-yellow-100 text-yellow-600" },
  teleexpertise: { icon: Stethoscope, color: "bg-teal-100 text-teal-600" },
  alert: { icon: AlertTriangle, color: "bg-red-100 text-red-600" },
  default: { icon: Bell, color: "bg-gray-100 text-gray-600" },
};

function getNotifConfig(notif) {
  const type = notif.type?.split("\\")?.pop()?.toLowerCase() ?? "";
  if (type.includes("appointment")) return TYPE_CONFIG.appointment;
  if (type.includes("consultation")) return TYPE_CONFIG.consultation;
  if (type.includes("message")) return TYPE_CONFIG.message;
  if (type.includes("prescription")) return TYPE_CONFIG.prescription;
  if (type.includes("payment")) return TYPE_CONFIG.payment;
  if (type.includes("teleexpertise")) return TYPE_CONFIG.teleexpertise;
  if (type.includes("alert")) return TYPE_CONFIG.alert;
  return TYPE_CONFIG.default;
}

function getNotifLink(notif) {
  const data = notif.data ?? {};
  if (data.appointment_id) return `/appointments/${data.appointment_id}`;
  if (data.consultation_id)
    return `/consultations/${data.consultation_id}/detail`;
  if (data.teleexpertise_id) return `/teleexpertise/${data.teleexpertise_id}`;
  if (data.message_user_id) return `/messages/${data.message_user_id}`;
  return null;
}

const TABS = [
  { value: "all", label: "Toutes" },
  { value: "unread", label: "Non lues" },
];

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", activeTab],
    queryFn: () =>
      notificationsApi
        .list({
          unread_only: activeTab === "unread" ? true : undefined,
        })
        .then((r) => r.data.data ?? r.data ?? []),
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      notificationsApi
        .unreadCount()
        .then((r) => r.data.data?.count ?? r.data.count ?? r.data ?? 0),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      toast.success("Toutes les notifications marquées comme lues");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = Array.isArray(data) ? data : [];

  const handleClick = (notif) => {
    if (!notif.read_at) {
      markReadMutation.mutate(notif.id);
    }
    const link = getNotifLink(notif);
    if (link) navigate(link);
  };

  return (
    <AppLayout title="Notifications">
      <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Centre de notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              loading={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              Tout marquer lu
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-100 p-1 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.value
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {tab.value === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingPage />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={
              activeTab === "unread"
                ? "Aucune notification non lue"
                : "Aucune notification"
            }
            description="Vous êtes à jour !"
          />
        ) : (
          <div className="space-y-1.5">
            {notifications.map((notif) => {
              const config = getNotifConfig(notif);
              const Icon = config.icon;
              const isUnread = !notif.read_at;
              const title =
                notif.data?.title ??
                notif.data?.message ??
                notif.type?.split("\\")?.pop() ??
                "Notification";
              const body = notif.data?.body ?? notif.data?.description ?? "";

              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    isUnread
                      ? "bg-primary-50/50 border border-primary-100"
                      : "bg-white border border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm ${
                          isUnread
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-700"
                        }`}
                      >
                        {title}
                      </p>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {fromNow(notif.created_at)}
                      </span>
                    </div>
                    {body && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {body}
                      </p>
                    )}
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
