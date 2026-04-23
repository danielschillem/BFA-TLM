import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  Heart,
  Stethoscope,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api";
import liptakoIcon from "@/assets/liptako-icon.jpeg";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export default function Login() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth, setTwoFactorPending } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const body = res.data;
      const requiresTwoFactor =
        body.requires_two_factor ?? body.data?.requires_two_factor;
      const pendingUserId =
        body.data?.user?.id ?? body.user_id ?? body.data?.user_id;
      const pendingToken = body.data?.token;

      if (requiresTwoFactor) {
        if (!pendingUserId || !pendingToken) {
          throw new Error("Réponse 2FA incomplète");
        }
        setTwoFactorPending(pendingUserId, pendingToken);
        navigate("/two-factor");
        toast.info(body.message ?? "Code de vérification envoyé.");
        return;
      }

      const user = body.data?.user;
      if (!user) {
        throw new Error("Réponse de connexion incomplète");
      }

      setAuth(user);
      toast.success("Connexion réussie !");

      const role = user.roles?.[0];
      navigate(role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.message ?? err.message ?? "Identifiants invalides.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panneau Gauche : Image Médecin Africain ───────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Image de fond */}
        <img
          src="/african-doctor-bg.jpg"
          alt="Médecin africain"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-primary-900/70" />

        {/* Contenu superposé */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo en haut */}
          <div className="flex items-center gap-3">
            <img
              src={liptakoIcon}
              alt="LiptakoCare"
              className="w-12 h-12 rounded-lg object-cover border border-white/20"
            />
            <div>
              <h2 className="text-white font-bold text-xl tracking-tight">
                Plateforme TLM
              </h2>
              <p className="text-white/60 text-xs">e-Santé & Télémédecine</p>
            </div>
          </div>

          {/* Message central */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              La santé connectée
              <br />
              <span className="text-primary-200">
                au service du Burkina Faso
              </span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              Accédez à la téléconsultation, la téléexpertise et le suivi
              médical à distance. Une plateforme moderne pour rapprocher
              médecins et patients.
            </p>
          </div>

          {/* Badges en bas */}
          <div className="flex items-center gap-4">
            {[
              { icon: Shield, label: "Données sécurisées" },
              { icon: Heart, label: "Suivi continu" },
              { icon: Stethoscope, label: "Téléexpertise" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2"
              >
                <Icon className="w-4 h-4 text-primary-200" />
                <span className="text-white/80 text-xs font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panneau Droit : Formulaire ────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo mobile uniquement */}
          <div className="lg:hidden text-center mb-8">
            <img
              src={liptakoIcon}
              alt="LiptakoCare"
              className="w-14 h-14 rounded-lg object-cover shadow-md mb-4 mx-auto"
            />
            <h1 className="text-2xl font-bold text-gray-900">Plateforme TLM</h1>
            <p className="text-gray-500 text-sm mt-1">
              e-Santé & Télémédecine — Burkina Faso
            </p>
          </div>

          {/* Carte du formulaire */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900">
                Bon retour !
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Connectez-vous à votre espace santé
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Adresse email"
                type="email"
                placeholder="vous@exemple.com"
                icon={Mail}
                error={errors.email?.message}
                {...register("email")}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-11"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full !py-3 !text-base"
                size="lg"
              >
                Se connecter
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Pas encore de compte ?{" "}
                <Link
                  to="/register"
                  className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
