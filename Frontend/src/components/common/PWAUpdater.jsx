import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export default function PWAUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Vérifier les mises à jour toutes les heures
      if (r) {
        setInterval(
          () => {
            r.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast("Mise à jour disponible", {
        description: "Une nouvelle version de BFA TLM est disponible.",
        duration: Infinity,
        action: {
          label: "Mettre à jour",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
