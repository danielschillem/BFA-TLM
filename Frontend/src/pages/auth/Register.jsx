import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Mail, Lock, Phone, Heart, Shield } from "lucide-react";
import { authApi } from "@/api";
import liptakoIcon from "@/assets/liptako-icon.jpeg";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";

const schema = z
  .object({
    first_name: z.string().min(2, "Prénom requis").max(255),
    last_name: z.string().min(2, "Nom requis").max(255),
    email: z.string().email("Email invalide"),
    phone: z.string().max(20, "Max 20 caractères").optional().or(z.literal("")),
    gender: z.enum(["male", "female"]).optional(),
    birth_date: z.string().optional(),
    password: z
      .string()
      .min(8, "Au moins 8 caractères")
      .regex(/[A-Z]/, "Une majuscule requise")
      .regex(/[a-z]/, "Une minuscule requise")
      .regex(/[0-9]/, "Un chiffre requis"),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  });

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        nom: data.last_name,
        prenoms: data.first_name,
        email: data.email,
        password: data.password,
        password_confirmation: data.password_confirmation,
        telephone_1: data.phone || undefined,
        sexe:
          data.gender === "male"
            ? "M"
            : data.gender === "female"
              ? "F"
              : undefined,
        date_naissance: data.birth_date || undefined,
        role: "patient",
      };
      await authApi.register(payload);
      toast.success("Compte créé ! Vous pouvez vous connecter.");
      navigate("/login");
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors)
          .flat()
          .forEach((m) => toast.error(m));
      } else {
        toast.error(
          err.response?.data?.message ?? "Erreur lors de l'inscription.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panneau Gauche : Image ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <img
          src="/register-bg.jpg"
          alt="Médecin et patient"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-900/80 via-primary-800/60 to-primary-900/70" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <img
              src={liptakoIcon}
              alt="LiptakoCare"
              className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-lg"
            />
            <div>
              <h2 className="text-white font-bold text-xl tracking-tight">
                Plateforme TLM
              </h2>
              <p className="text-white/60 text-xs">e-Santé & Télémédecine</p>
            </div>
          </div>

          <div className="max-w-sm">
            <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
              Rejoignez la communauté
              <span className="text-secondary-300"> e-Santé</span>
            </h1>
            <p className="text-white/70 text-sm leading-relaxed">
              Créez votre compte pour accéder aux services de télémédecine et de
              suivi médical à distance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {[
              { icon: Shield, label: "Inscription sécurisée" },
              { icon: Heart, label: "Soins accessibles" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
              >
                <Icon className="w-4 h-4 text-secondary-300" />
                <span className="text-white/80 text-xs font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panneau Droit : Formulaire ────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-secondary-50/20 p-6 lg:p-12 relative overflow-y-auto">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />

        <div className="w-full max-w-lg relative z-10 animate-fade-in">
          <div className="lg:hidden text-center mb-6">
            <img
              src={liptakoIcon}
              alt="LiptakoCare"
              className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-primary-500/25 mb-3 mx-auto"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              Créer un compte
            </h1>
            <p className="text-gray-500 text-sm">
              Plateforme TLM — Burkina Faso
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/60 border border-white/60 p-8 lg:p-10">
            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Créer un compte
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Remplissez le formulaire pour commencer
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prénom"
                  placeholder="Fatimata"
                  icon={User}
                  error={errors.first_name?.message}
                  {...register("first_name")}
                />
                <Input
                  label="Nom"
                  placeholder="Sawadogo"
                  error={errors.last_name?.message}
                  {...register("last_name")}
                />
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="vous@exemple.com"
                icon={Mail}
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                label="Téléphone (optionnel)"
                type="tel"
                placeholder="+226 70 00 00 00"
                icon={Phone}
                error={errors.phone?.message}
                {...register("phone")}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Genre"
                  {...register("gender")}
                  options={[
                    { value: "male", label: "Homme" },
                    { value: "female", label: "Femme" },
                  ]}
                  placeholder="Sélectionner"
                />
                <Input
                  label="Date de naissance"
                  type="date"
                  error={errors.birth_date?.message}
                  {...register("birth_date")}
                />
              </div>

              <Input
                label="Mot de passe"
                type="password"
                placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
                icon={Lock}
                error={errors.password?.message}
                {...register("password")}
              />
              <Input
                label="Confirmer le mot de passe"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                error={errors.password_confirmation?.message}
                {...register("password_confirmation")}
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full !rounded-xl !py-3 !text-base"
                size="lg"
              >
                Créer mon compte
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Déjà un compte ?{" "}
                <Link
                  to="/login"
                  className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
