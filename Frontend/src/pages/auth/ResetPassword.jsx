import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronLeft, KeyRound, Lock, Mail } from "lucide-react";
import { authApi } from "@/api";
import liptakoIcon from "@/assets/liptako-icon.jpeg";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !token || !password || !passwordConfirmation) {
      toast.error("Tous les champs sont requis.");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      toast.error(
        "Le mot de passe doit contenir une majuscule et une minuscule.",
      );
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error("Le mot de passe doit contenir au moins un chiffre.");
      return;
    }

    if (password !== passwordConfirmation) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });

      setDone(true);
      toast.success("Mot de passe réinitialisé avec succès.");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const firstError = apiErrors ? Object.values(apiErrors).flat()[0] : null;
      toast.error(
        firstError ??
          err.response?.data?.message ??
          "Erreur lors de la réinitialisation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img
            src={liptakoIcon}
            alt="LiptakoCare"
            className="w-14 h-14 rounded-2xl object-cover shadow-lg mb-4 mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Réinitialiser le mot de passe
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Saisissez le token reçu par email et définissez un nouveau mot de
            passe.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Votre mot de passe a été mis à jour. Vous pouvez maintenant vous
                connecter.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Aller à la connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Adresse email"
                type="email"
                placeholder="vous@exemple.com"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Token de réinitialisation"
                type="text"
                placeholder="Token reçu par email"
                icon={KeyRound}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                placeholder="Min. 8 car., 1 majuscule, 1 minuscule, 1 chiffre"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Input
                label="Confirmer le mot de passe"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
                required
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Réinitialiser le mot de passe
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:underline flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
