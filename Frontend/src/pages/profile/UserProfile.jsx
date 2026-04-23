import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Edit3,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getInitials } from "@/utils/helpers";

const profileSchema = z.object({
  first_name: z.string().min(2, "Prénom requis").max(255),
  last_name: z.string().min(2, "Nom requis").max(255),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9+\s()-]{6,20}$/.test(val), {
      message: "Format de téléphone invalide",
    }),
});

const pwdSchema = z
  .object({
    current_password: z.string().min(1, "Mot de passe actuel requis"),
    password: z
      .string()
      .min(8, "Min. 8 caractères")
      .regex(/[A-Z]/, "1 majuscule")
      .regex(/[0-9]/, "1 chiffre"),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  });

export default function UserProfile() {
  const { user, setUser } = useAuthStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const queryClient = useQueryClient();

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
    },
  });

  const pwdForm = useForm({ resolver: zodResolver(pwdSchema) });

  const profileMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: (res) => {
      setUser(res.data.data);
      toast.success("Profil mis à jour");
      setEditingProfile(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const pwdMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success("Mot de passe modifié !");
      pwdForm.reset();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const role = user?.roles?.[0] ?? "";
  const roleLabels = {
    patient: "Patient",
    doctor: "Médecin téléconsultant",
    specialist: "Médecin spécialiste",
    health_professional: "Professionnel de santé",
    admin: "Administrateur",
    structure_manager: "Gestionnaire de structure",
  };

  return (
    <AppLayout title="Mon profil">
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        {/* Avatar & résumé */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                {getInitials(
                  `${user?.first_name ?? ""} ${user?.last_name ?? ""}`,
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-primary-600 text-sm font-medium">
                  {roleLabels[role] ?? role}
                </p>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                {user?.identifiant_national && (
                  <p className="text-xs font-mono text-primary-600 bg-primary-50 rounded px-2 py-0.5 mt-1 inline-block">
                    {user.identifiant_national}
                  </p>
                )}
                {user?.two_factor_enabled && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 bg-green-50 rounded-full px-2.5 py-0.5">
                    <CheckCircle className="w-3 h-3" /> 2FA activé
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="section-title">Informations personnelles</h3>
              {!editingProfile && (
                <Button
                  onClick={() => setEditingProfile(true)}
                  variant="outline"
                  size="sm"
                  icon={Edit3}
                >
                  Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingProfile ? (
              <form
                onSubmit={profileForm.handleSubmit((d) =>
                  profileMutation.mutate(d),
                )}
                className="space-y-4"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    icon={User}
                    error={profileForm.formState.errors.first_name?.message}
                    {...profileForm.register("first_name")}
                  />
                  <Input
                    label="Nom"
                    error={profileForm.formState.errors.last_name?.message}
                    {...profileForm.register("last_name")}
                  />
                </div>
                <Input
                  label="Téléphone"
                  type="tel"
                  icon={Phone}
                  {...profileForm.register("phone")}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setEditingProfile(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    loading={profileMutation.isPending}
                    icon={Save}
                  >
                    Sauvegarder
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {[
                  { icon: User, label: "Prénom", value: user?.first_name },
                  { icon: User, label: "Nom", value: user?.last_name },
                  { icon: Mail, label: "Email", value: user?.email },
                  {
                    icon: Phone,
                    label: "Téléphone",
                    value: user?.phone ?? "Non renseigné",
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-400 w-20">{label}</span>
                    <span className="text-sm text-gray-800 font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Changer mot de passe */}
        <Card>
          <CardHeader>
            <h3 className="section-title flex items-center gap-2">
              <Lock className="w-4 h-4" /> Sécurité
            </h3>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={pwdForm.handleSubmit((d) => pwdMutation.mutate(d))}
              className="space-y-4"
            >
              <Input
                label="Mot de passe actuel"
                type="password"
                icon={Lock}
                error={pwdForm.formState.errors.current_password?.message}
                {...pwdForm.register("current_password")}
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                icon={Lock}
                error={pwdForm.formState.errors.password?.message}
                {...pwdForm.register("password")}
              />
              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                icon={Lock}
                error={pwdForm.formState.errors.password_confirmation?.message}
                {...pwdForm.register("password_confirmation")}
              />
              <Button
                type="submit"
                loading={pwdMutation.isPending}
                variant="outline"
                className="w-full"
                icon={Lock}
              >
                Changer le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
