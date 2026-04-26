import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Database,
  Mail,
  Clock,
  Save,
  RotateCcw,
  Info,
  Server,
  Palette,
  Lock,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { adminApi } from "@/api";

const SECTIONS = [
  { key: "general", label: "Général", icon: Globe },
  { key: "fees", label: "Frais & Paiements", icon: CreditCard },
  { key: "security", label: "Sécurité", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "email", label: "Email", icon: Mail },
  { key: "maintenance", label: "Maintenance", icon: Server },
  { key: "appearance", label: "Apparence", icon: Palette },
];

const DEFAULT_SETTINGS = {
  general: {
    app_name: "BFA TLM",
    app_locale: "fr",
    timezone: "Africa/Ouagadougou",
    pagination_size: 15,
    max_upload_size_mb: 10,
  },
  fees: {
    platform_fee: 500,
    mobile_money_rate: 1.5,
    platform_fee_enabled: true,
    free_cancellation_hours: 24,
  },
  security: {
    two_factor_enabled: true,
    session_lifetime_minutes: 120,
    max_login_attempts: 5,
    lockout_minutes: 15,
    password_min_length: 8,
    require_password_change_days: 90,
  },
  notifications: {
    email_notifications: true,
    sms_notifications: false,
    push_notifications: false,
    appointment_reminder_hours: 24,
    consultation_reminder_minutes: 15,
  },
  email: {
    mail_driver: "smtp",
    mail_from_name: "BFA TLM",
    mail_from_address: "noreply@bfa-tlm.bf",
  },
  maintenance: {
    maintenance_mode: false,
    debug_mode: false,
    log_level: "error",
    cache_driver: "database",
  },
  appearance: {
    primary_color: "#2563eb",
    logo_text: "BFA TLM",
    footer_text: "e-Santé & Télémédecine — Burkina Faso",
  },
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("general");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);

  // Charger les paramètres de frais depuis l'API
  const { data: feeSettings, isLoading: feesLoading } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: () => adminApi.getSettings().then((r) => r.data.data),
    staleTime: 60_000,
  });

  // Synchroniser les paramètres de frais avec le state local
  useEffect(() => {
    if (feeSettings?.fees) {
      setSettings((prev) => ({
        ...prev,
        fees: {
          platform_fee: Number(feeSettings.fees.platform_fee?.value ?? 500),
          mobile_money_rate: Number(
            feeSettings.fees.mobile_money_rate?.value ?? 1.5,
          ),
          platform_fee_enabled:
            feeSettings.fees.platform_fee_enabled?.value === "true" ||
            feeSettings.fees.platform_fee_enabled?.value === true,
          free_cancellation_hours: Number(
            feeSettings.fees.free_cancellation_hours?.value ?? 24,
          ),
        },
      }));
    }
  }, [feeSettings]);

  // Mutation pour sauvegarder les paramètres de frais
  const saveFeesMutation = useMutation({
    mutationFn: (feesData) => adminApi.updateSettings(feesData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
      toast.success("Paramètres de frais sauvegardés");
      setDirty(false);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ?? "Erreur lors de la sauvegarde",
      );
    },
  });

  const updateField = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    if (activeSection === "fees") {
      // Sauvegarder les frais via l'API
      const feesData = Object.entries(settings.fees).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      saveFeesMutation.mutate(feesData);
    } else {
      // Placeholder pour les autres sections
      toast.success("Paramètres sauvegardés (mode local)");
      setDirty(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setDirty(false);
    toast.info("Paramètres réinitialisés");
  };

  const currentSettings = settings[activeSection] ?? {};

  return (
    <AppLayout title="Paramètres système">
      <div className="space-y-5 animate-fade-in">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Paramètres système
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Ces paramètres sont enregistrés localement. La persistance côté
              serveur sera disponible dans une version ultérieure.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-5">
          {/* Sidebar sections */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-2 space-y-0.5">
                {SECTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeSection === key
                        ? "bg-primary-50 text-primary-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Settings form */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-400" />
                    {SECTIONS.find((s) => s.key === activeSection)?.label}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={handleReset}
                      disabled={!dirty}
                    >
                      Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      icon={Save}
                      onClick={handleSave}
                      disabled={!dirty}
                      loading={saveFeesMutation.isPending}
                    >
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(currentSettings).map(([key, value]) => (
                    <SettingField
                      key={key}
                      fieldKey={key}
                      value={value}
                      onChange={(v) => updateField(activeSection, key, v)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Champ de paramètre générique ──────────────────────────────────────────────
const FIELD_LABELS = {
  app_name: "Nom de l'application",
  app_locale: "Langue",
  timezone: "Fuseau horaire",
  pagination_size: "Éléments par page",
  max_upload_size_mb: "Taille max upload (Mo)",
  two_factor_enabled: "Authentification 2FA",
  session_lifetime_minutes: "Durée de session (min)",
  max_login_attempts: "Max tentatives de connexion",
  lockout_minutes: "Durée de blocage (min)",
  password_min_length: "Longueur min. mot de passe",
  require_password_change_days: "Renouvellement mot de passe (jours)",
  email_notifications: "Notifications par email",
  sms_notifications: "Notifications par SMS",
  push_notifications: "Notifications push",
  appointment_reminder_hours: "Rappel RDV (heures avant)",
  consultation_reminder_minutes: "Rappel consultation (min avant)",
  mail_driver: "Driver email",
  mail_from_name: "Nom expéditeur",
  mail_from_address: "Adresse expéditeur",
  maintenance_mode: "Mode maintenance",
  debug_mode: "Mode debug",
  log_level: "Niveau de log",
  cache_driver: "Driver de cache",
  primary_color: "Couleur principale",
  logo_text: "Texte du logo",
  footer_text: "Texte du pied de page",
  // Frais & Paiements
  platform_fee: "Frais de service plateforme (FCFA)",
  mobile_money_rate: "Taux Mobile Money (%)",
  platform_fee_enabled: "Frais de plateforme activés",
  free_cancellation_hours: "Annulation gratuite (heures)",
};

function SettingField({ fieldKey, value, onChange }) {
  const label = FIELD_LABELS[fieldKey] ?? fieldKey.replace(/_/g, " ");

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between py-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-primary-600" : "bg-gray-200"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : ""}`}
          />
        </button>
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">
          {label}
        </label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
    );
  }

  if (fieldKey === "primary_color") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    );
  }

  if (fieldKey === "log_level") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
        >
          {["debug", "info", "warning", "error", "critical"].map((l) => (
            <option key={l} value={l}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (fieldKey === "app_locale") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-700">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>
  );
}
