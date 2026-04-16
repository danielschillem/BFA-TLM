import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { useAuthStore } from "@/stores/authStore";
import {
  apiOrigin,
  apiUrl,
  reverbAppKey,
  reverbHost,
  reverbPort,
  reverbScheme,
} from "@/config/appConfig";

// Pusher est requis par Laravel Echo pour le protocole WebSocket Reverb
window.Pusher = Pusher;

let echoInstance = null;
const isGatewayMode = /\/index\.php$/i.test(apiUrl);

function resolveAuthEndpoint() {
  if (isGatewayMode) return apiUrl;
  if (apiOrigin) return `${apiOrigin}/broadcasting/auth`;
  return "/broadcasting/auth";
}

/**
 * Initialise et retourne l'instance Laravel Echo (singleton).
 * Connexion au serveur Reverb via le protocole Pusher.
 */
export function getEcho() {
  if (echoInstance) return echoInstance;

  const key = reverbAppKey;
  if (!key) {
    console.warn(
      "[Echo] VITE_REVERB_APP_KEY non définie — WebSocket désactivé",
    );
    return null;
  }

  const authHeaders = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (isGatewayMode) {
    authHeaders["X-Api-Path"] = "/broadcasting/auth";
  }

  echoInstance = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: reverbHost,
    wsPort: reverbPort || 8080,
    wssPort: reverbPort || 443,
    forceTLS: reverbScheme === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: resolveAuthEndpoint(),
    auth: {
      headers: authHeaders,
      withCredentials: true,
    },
  });

  return echoInstance;
}

/**
 * Déconnecte et réinitialise l'instance Echo.
 * À appeler lors du logout.
 */
export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

export default getEcho;
