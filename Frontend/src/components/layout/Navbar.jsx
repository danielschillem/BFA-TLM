import { Bell, Menu, Search, ChevronDown, CheckCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { messagesApi, notificationsApi } from "@/api";
import { getInitials, fromNow } from "@/utils/helpers";
import { cn } from "@/utils/cn";

export default function Navbar({ title }) {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, openMobileSidebar } = useUIStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: unread } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () =>
      notificationsApi
        .unreadCount()
        .then((r) => r.data?.data?.unread_count ?? 0),
    refetchInterval: 30000,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () =>
      notificationsApi.list({ per_page: 8 }).then((r) => ({
        items: r.data?.data ?? [],
        unread_count: r.data?.meta?.unread_count ?? 0,
      })),
    enabled: notifOpen,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const handleLogout = async () => {
    try {
      const { authApi } = await import("@/api");
      await authApi.logout();
    } catch {}
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-primary-100 h-14 px-3 sm:px-5 flex items-center justify-between">
      {/* Gauche */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile: ouvrir le drawer */}
        <button
          onClick={openMobileSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Desktop: toggle sidebar collapse */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors hidden lg:block"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm sm:text-base font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-none">
          {title}
        </h1>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((o) => !o);
              setProfileOpen(false);
            }}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-2xs rounded-full flex items-center justify-center font-medium">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">
                  Notifications
                </span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-xs text-primary-500 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Tout lire
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/messages")}
                    className="text-xs text-primary-500 hover:underline"
                  >
                    Messages
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifData?.items?.length > 0 ? (
                  notifData.items.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        if (!notif.read_at) markReadMutation.mutate(notif.id);
                        setNotifOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                        !notif.read_at && "bg-primary-50/40",
                      )}
                    >
                      <p className="text-[13px] text-gray-700 line-clamp-2">
                        {notif.data?.message ?? "Nouvelle notification"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {fromNow(notif.created_at)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="py-6 text-center text-gray-400 text-[13px]">
                    Aucune notification
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profil */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((o) => !o);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-medium text-xs">
              {getInitials(
                `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
                  user?.name ||
                  user?.full_name,
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-medium text-gray-900 leading-none">
                {user?.first_name ?? user?.name ?? user?.full_name}
              </p>
              <p className="text-[11px] text-gray-500 capitalize">
                {user?.roles?.[0]?.replace("_", " ")}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden animate-slide-up">
              <div className="py-1.5">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors rounded-lg mx-1"
                  style={{ width: "calc(100% - 8px)" }}
                >
                  Mon profil
                </button>
                <hr className="my-1 border-gray-100 mx-3" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors rounded-lg mx-1"
                  style={{ width: "calc(100% - 8px)" }}
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fermer les menus en cliquant ailleurs */}
      {(notifOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setNotifOpen(false);
            setProfileOpen(false);
          }}
        />
      )}
    </header>
  );
}
