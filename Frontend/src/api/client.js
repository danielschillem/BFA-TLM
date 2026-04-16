import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { mockClient } from "./mockAdapter";
import { apiUrl, apiOrigin } from "@/config/appConfig";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

// Détection du mode gateway (Hostinger CDN) : VITE_API_URL se termine par /index.php
const isGatewayMode = apiUrl.endsWith("/index.php");

/**
 * Initialise le cookie CSRF (Sanctum SPA).
 * À appeler une fois avant login/register.
 */
export async function fetchCsrfCookie() {
  const base = apiOrigin || window.location.origin;
  await axios.get(`${base}/sanctum/csrf-cookie`, { withCredentials: true });
}

// Client Axios réel — cookies httpOnly (Sanctum SPA)
const axiosClient = axios.create({
  baseURL: apiUrl,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: true,
  withXSRFToken: true,
  timeout: 30000,
});

// Intercepteur : ajout Accept header adapté pour blob + gateway CDN (cookies httpOnly = pas de Bearer)
axiosClient.interceptors.request.use((config) => {
  // Pour les requêtes blob (PDF, fichiers), Accept doit être */* et non application/json
  if (config.responseType === "blob") {
    config.headers.Accept = "*/*";
  }
  // Mode gateway (Hostinger CDN) : transmettre le chemin API via header
  // et envoyer toutes les requêtes vers /api.php
  if (isGatewayMode && config.url) {
    config.headers["X-Api-Path"] = config.url;
    config.url = "";
  }
  return config;
});

// Intercepteur : gestion globale des erreurs
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // Pour les requêtes blob, l'erreur est aussi un blob — extraire le message JSON
    if (
      error.response?.data instanceof Blob &&
      error.response.data.type?.includes("json")
    ) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        error.response.data = json;
        if (json.message) {
          toast.error(json.message);
          return Promise.reject(error);
        }
      } catch {
        /* ignore parse failure */
      }
    }

    // Ne pas rediriger sur 401 pour les routes d'auth publiques
    const isPublicAuth = /\/auth\/(login|register|password)/.test(url);

    if (status === 401 && !isPublicAuth) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    } else if (status === 403) {
      toast.error("Accès refusé. Permissions insuffisantes.");
    } else if (status === 422) {
      // Les erreurs de validation sont gérées localement dans les formulaires
    } else if (status === 429) {
      toast.error("Trop de requêtes. Veuillez patienter quelques instants.");
    } else if (status >= 500) {
      toast.error("Erreur serveur. Veuillez réessayer.");
    } else if (!error.response) {
      toast.error(
        "Impossible de joindre le serveur. Vérifiez votre connexion.",
      );
    }

    return Promise.reject(error);
  },
);

// Exporter le client approprié selon l'environnement
export const apiClient = USE_MOCKS ? mockClient : axiosClient;

export default apiClient;
