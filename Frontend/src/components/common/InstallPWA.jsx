import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/utils/cn";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installée
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Vérifier si l'utilisateur a déjà rejeté la bannière récemment
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Re-proposer après 7 jours
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50",
        "bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/60",
        "p-4 animate-slide-up",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">
            Installer LiptakoCare
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Accédez rapidement à la plateforme depuis votre écran d'accueil
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="btn-primary text-xs px-4 py-2"
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
