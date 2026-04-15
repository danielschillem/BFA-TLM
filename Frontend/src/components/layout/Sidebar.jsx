import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Video,
  FileText,
  Stethoscope,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  Activity,
  Search,
  ClipboardList,
  Bell,
  Building2,
  PlusCircle,
  UserCog,
  Globe,
  ScrollText,
  Key,
  Cog,
  X,
} from "lucide-react";
import logoImg from "@/assets/liptako-icon.jpeg";

const navItemsByRole = {
  patient: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/directory", icon: Search, label: "Trouver un médecin" },
    { to: "/appointments", icon: Calendar, label: "Mes rendez-vous" },
    { to: "/consultations", icon: Video, label: "Mes consultations" },
    { to: "/documents", icon: FileText, label: "Mes documents" },
    { to: "/prescriptions", icon: ClipboardList, label: "Ordonnances" },
    { to: "/payments", icon: CreditCard, label: "Paiements" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/consentements", icon: ShieldCheck, label: "Consentements" },
    { to: "/messages", icon: MessageSquare, label: "Messagerie" },
    { to: "/profile", icon: Settings, label: "Mon profil" },
  ],
  doctor: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/appointments/new", icon: PlusCircle, label: "Nouveau RDV" },
    { to: "/schedule", icon: Calendar, label: "Mon agenda" },
    { to: "/appointments", icon: Calendar, label: "Rendez-vous" },
    { to: "/patients", icon: Users, label: "Patients" },
    { to: "/consultations", icon: Video, label: "Consultations" },
    { to: "/teleexpertise", icon: Stethoscope, label: "Téléexpertise" },
    { to: "/certificats-deces", icon: ScrollText, label: "Certificats décès" },
    { to: "/documents", icon: FileText, label: "Documents" },
    { to: "/prescriptions", icon: ClipboardList, label: "Ordonnances" },
    { to: "/interop", icon: Globe, label: "Interopérabilité" },
    { to: "/payments", icon: CreditCard, label: "Paiements" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/messages", icon: MessageSquare, label: "Messagerie" },
    { to: "/profile", icon: Settings, label: "Mon profil" },
  ],
  specialist: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/appointments/new", icon: PlusCircle, label: "Nouveau RDV" },
    { to: "/schedule", icon: Calendar, label: "Mon agenda" },
    { to: "/teleexpertise", icon: Stethoscope, label: "Téléexpertise" },
    { to: "/appointments", icon: Calendar, label: "Agenda" },
    { to: "/patients", icon: Users, label: "Patients" },
    { to: "/consultations", icon: Video, label: "Consultations" },
    { to: "/certificats-deces", icon: ScrollText, label: "Certificats décès" },
    { to: "/documents", icon: FileText, label: "Documents" },
    { to: "/prescriptions", icon: ClipboardList, label: "Ordonnances" },
    { to: "/interop", icon: Globe, label: "Interopérabilité" },
    { to: "/payments", icon: CreditCard, label: "Paiements" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/messages", icon: MessageSquare, label: "Messagerie" },
    { to: "/profile", icon: Settings, label: "Mon profil" },
  ],
  health_professional: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/appointments/new", icon: PlusCircle, label: "Nouveau RDV" },
    { to: "/schedule", icon: Calendar, label: "Mon agenda" },
    { to: "/appointments", icon: Calendar, label: "Rendez-vous" },
    { to: "/patients", icon: Users, label: "Patients" },
    { to: "/consultations", icon: Video, label: "Consultations" },
    { to: "/teleexpertise", icon: Stethoscope, label: "Téléexpertise" },
    { to: "/certificats-deces", icon: ScrollText, label: "Certificats décès" },
    { to: "/documents", icon: FileText, label: "Documents" },
    { to: "/prescriptions", icon: ClipboardList, label: "Ordonnances" },
    { to: "/interop", icon: Globe, label: "Interopérabilité" },
    { to: "/payments", icon: CreditCard, label: "Paiements" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/messages", icon: MessageSquare, label: "Messagerie" },
    { to: "/profile", icon: Settings, label: "Mon profil" },
  ],
  structure_manager: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/gestionnaire", icon: Building2, label: "Ma structure" },
    { to: "/messages", icon: MessageSquare, label: "Messagerie" },
    { to: "/profile", icon: Settings, label: "Mon profil" },
  ],
  admin: [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/admin/users", icon: Users, label: "Utilisateurs" },
    { to: "/admin/structures", icon: Building2, label: "Structures" },
    { to: "/admin/gestionnaires", icon: UserCog, label: "Gestionnaires" },
    { to: "/admin/stats", icon: Activity, label: "Statistiques" },
    { to: "/admin/audit", icon: ShieldCheck, label: "Audit & Logs" },
    { to: "/admin/announcements", icon: Bell, label: "Annonces" },
    { to: "/admin/roles", icon: ShieldCheck, label: "Rôles & Permissions" },
    { to: "/admin/licenses", icon: Key, label: "Licences" },
    { to: "/admin/settings", icon: Cog, label: "Paramètres" },
    { to: "/certificats-deces", icon: ScrollText, label: "Certificats décès" },
    { to: "/interop", icon: Globe, label: "Interopérabilité" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/messages", icon: MessageSquare, label: "Messagerie" },
    { to: "/profile", icon: Settings, label: "Mon profil" },
  ],
};

export default function Sidebar() {
  const { user, logout, hasRole } = useAuthStore();
  const { sidebarOpen, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } =
    useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.roles?.[0] ?? "patient";
  const navItems = navItemsByRole[role] ?? navItemsByRole.patient;
  const fullName =
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
    user?.name ||
    user?.full_name ||
    "Utilisateur";
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();

  // Fermer le drawer mobile lors d'un changement de route
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  const handleLogout = async () => {
    try {
      const { authApi } = await import("@/api");
      await authApi.logout();
    } catch {}
    logout();
    navigate("/login");
  };

  const sidebarContent = (isMobile) => {
    const isOpen = isMobile ? true : sidebarOpen;

    return (
      <>
        {/* Logo */}
        <div className="flex items-center justify-between px-3 h-16 border-b border-white/15">
          {isOpen ? (
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="LiptakoCare"
                className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-black/20"
              />
              <div>
                <span className="text-sm font-bold text-white tracking-wide block">
                  LiptakoCare
                </span>
                <span className="text-2xs text-white/70">e-Santé BFA</span>
              </div>
            </div>
          ) : (
            <img
              src={logoImg}
              alt="LiptakoCare"
              className="w-9 h-9 rounded-xl object-cover mx-auto shadow-lg shadow-black/20"
            />
          )}
          {isMobile ? (
            <button
              onClick={closeMobileSidebar}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-1.5 rounded-lg hover:bg-white/15 text-white transition-all duration-200",
                !isOpen && "hidden",
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/20 text-white font-semibold shadow-inner-glow border border-white/20"
                    : "text-white hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Icon
                className={cn(
                  "flex-shrink-0 w-[18px] h-[18px]",
                  !isOpen && "mx-auto",
                )}
              />
              {isOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer : profil + déconnexion */}
        <div className="border-t border-white/15 p-2.5">
          {isOpen ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all duration-200">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">
                  {fullName}
                </p>
                <p className="text-[11px] text-white/70 truncate capitalize">
                  {role?.replace("_", " ")}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white hover:text-red-300 transition-all duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2.5 rounded-xl hover:bg-red-500/20 text-white hover:text-red-300 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Copyright & Version */}
        {isOpen && (
          <div className="px-4 py-2.5 border-t border-white/15 text-center">
            <p className="text-[10px] text-white/60">
              &copy; {new Date().getFullYear()} LiptakoCare
            </p>
            <p className="text-[10px] text-white/50">
              v3.0.0 — Plateforme TLM BFA
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen flex-col transition-all duration-300 z-40 shadow-xl hidden lg:flex",
          sidebarOpen ? "w-60" : "w-16",
        )}
        style={{
          background: "linear-gradient(180deg, #1e40af 0%, #2563eb 100%)",
        }}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-72 flex flex-col z-50 shadow-2xl lg:hidden transition-transform duration-300 ease-out",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          background: "linear-gradient(180deg, #1e40af 0%, #2563eb 100%)",
        }}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
}
