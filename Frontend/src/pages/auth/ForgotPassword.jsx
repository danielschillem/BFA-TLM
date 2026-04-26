import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Mail, ChevronLeft, Check } from "lucide-react";
import { authApi } from "@/api";
import bfaLogo from "@/assets/bfa-tlm-logo.svg";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
      toast.success("Email de réinitialisation envoyé !");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const firstError = apiErrors ? Object.values(apiErrors).flat()[0] : null;
      toast.error(
        firstError ?? err.response?.data?.message ?? "Erreur lors de l'envoi",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img
            src={bfaLogo}
            alt="BFA TLM"
            className="w-16 h-16 rounded-xl object-contain bg-white p-2 shadow-md mb-4 mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Mot de passe oublié
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {sent
              ? "Vérifiez votre boîte mail"
              : "Entrez votre email pour recevoir un lien de réinitialisation"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Un email a été envoyé à <strong>{email}</strong> avec les
                instructions pour réinitialiser votre mot de passe.
              </p>
              <p className="text-xs text-gray-400">
                Si vous ne recevez pas l'email, vérifiez votre dossier spam.
              </p>
              <Button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                variant="outline"
                className="w-full"
              >
                Renvoyer l'email
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
              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
                icon={Mail}
              >
                Envoyer le lien
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
            <Link
              to="/reset-password"
              className="mt-2 inline-block text-xs text-gray-500 hover:text-primary-600 hover:underline"
            >
              J'ai déjà un token de réinitialisation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
